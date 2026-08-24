mod commands;
mod config;
mod db;
mod hotkeys;

use db::Db;
use std::sync::Mutex;
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
            Ok(())
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
