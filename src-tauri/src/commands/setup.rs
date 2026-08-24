//! First-run setup and app-config commands.

use crate::config::{self, AppConfig};
use crate::db::Db;
use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

#[derive(Serialize)]
pub struct SetupState {
    /// Whether a data directory has been chosen and the DB is open.
    pub ready: bool,
    pub data_dir: Option<PathBuf>,
}

#[tauri::command]
pub fn get_setup_state(db: State<Db>) -> SetupState {
    let cfg = config::load();
    let ready = db.0.lock().unwrap().is_some();
    SetupState {
        ready,
        data_dir: cfg.data_dir,
    }
}

/// Point the app at a data directory (chosen by the user in the setup
/// wizard, or an existing folder from a previous install) and open its
/// database, creating it on first use.
#[tauri::command]
pub fn set_data_dir(path: PathBuf, db: State<Db>) -> Result<(), String> {
    let conn = crate::db::open(&path)?;
    config::save(&AppConfig {
        data_dir: Some(path),
    })?;
    *db.0.lock().unwrap() = Some(conn);
    Ok(())
}
