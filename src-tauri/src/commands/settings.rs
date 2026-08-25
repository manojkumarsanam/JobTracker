//! Key-value settings stored inside the user's database.
//!
//! Known keys (all optional):
//! - `doc_mode`         — `"tex"` or `"pdf"`, the default document mode
//! - `hotkey_add`       — global shortcut for the add-entry popup
//! - `hotkey_dashboard` — global shortcut for the dashboard window
//! - `goal_count`       — application-count goal for the forecast chart
//! - `goal_deadline`    — optional ISO date the goal should be reached by

use crate::db::Db;
use rusqlite::params;
use std::collections::HashMap;
use tauri::State;

fn with_conn<T>(
    db: &State<Db>,
    f: impl FnOnce(&rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let guard = db.0.lock().unwrap();
    let conn = guard.as_ref().ok_or("database not initialized")?;
    f(conn)
}

#[tauri::command]
pub fn get_settings(db: State<Db>) -> Result<HashMap<String, String>, String> {
    with_conn(&db, |conn| {
        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn set_setting(key: String, value: String, db: State<Db>) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}
