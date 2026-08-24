//! App-level configuration stored in the OS config directory.
//!
//! This is deliberately tiny: it only remembers *where* the user's data
//! folder is (plus first-run state). Everything else — settings, fields,
//! applications, documents — lives inside the data folder so it stays
//! portable and belongs entirely to the user.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppConfig {
    /// Absolute path to the user-chosen data directory.
    pub data_dir: Option<PathBuf>,
}

fn config_file() -> Result<PathBuf, String> {
    let dir = dirs::config_dir()
        .ok_or_else(|| "could not resolve OS config directory".to_string())?
        .join("JobTracker");
    Ok(dir.join("config.json"))
}

pub fn load() -> AppConfig {
    let Ok(path) = config_file() else {
        return AppConfig::default();
    };
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(config: &AppConfig) -> Result<(), String> {
    let path = config_file()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}
