mod commands;
mod config;
mod db;
mod hotkeys;

use db::Db;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A second launch just fronts the existing dashboard.
            hotkeys::show_dashboard(app);
        }))
        .setup(|app| {
            // Reopen the database automatically when a data directory was
            // chosen in an earlier run; otherwise the frontend shows the
            // first-run setup wizard.
            let cfg = config::load();
            let conn = cfg.data_dir.as_deref().and_then(|dir| {
                db::open(dir)
                    .map_err(|e| eprintln!("failed to open database: {e}"))
                    .ok()
            });

            let (add, dash) = match &conn {
                Some(c) => (
                    setting(c, "hotkey_add")
                        .unwrap_or_else(|| hotkeys::DEFAULT_ADD_SHORTCUT.into()),
                    setting(c, "hotkey_dashboard")
                        .unwrap_or_else(|| hotkeys::DEFAULT_DASHBOARD_SHORTCUT.into()),
                ),
                None => (
                    hotkeys::DEFAULT_ADD_SHORTCUT.into(),
                    hotkeys::DEFAULT_DASHBOARD_SHORTCUT.into(),
                ),
            };
            if let Err(e) = hotkeys::register(app.handle(), &add, &dash) {
                eprintln!("{e}");
            }

            app.manage(Db(Mutex::new(conn)));

            // Tray icon so the app stays reachable while backgrounded —
            // closing the dashboard hides it, and the global hotkeys keep
            // working until the user explicitly quits.
            let open = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
            let add = MenuItem::with_id(app, "add", "Add Application", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Job Tracker", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &add, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => hotkeys::show_dashboard(app),
                    "add" => hotkeys::show_popup(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the dashboard hides it instead of quitting, so the
            // hotkeys stay live. Quit comes from the tray menu.
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::setup::get_setup_state,
            commands::setup::set_data_dir,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::fields::list_fields,
            commands::fields::save_fields,
            commands::applications::create_application,
            commands::applications::list_applications,
            commands::applications::update_status,
            commands::applications::update_application,
            commands::applications::delete_application,
            commands::applications::list_status_events,
            commands::documents::import_pdf,
            commands::documents::resolve_document_path,
            commands::export::export_csv,
            commands::export::export_xlsx,
            commands::compile::tex_engine_available,
            commands::compile::compile_tex,
            commands::compile::read_document,
            commands::compile::save_pdf_as,
            commands::anomalies::list_anomaly_notes,
            commands::anomalies::save_anomaly_note,
            hotkeys::apply_hotkeys,
            hotkeys::close_popup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setting(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [key],
        |r| r.get(0),
    )
    .ok()
}
