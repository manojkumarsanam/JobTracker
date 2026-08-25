//! Document storage commands.
//!
//! PDF mode: the picked file is copied into `<data_dir>/documents/` under a
//! collision-safe name; the application row stores the relative path.
//! LaTeX mode: the source text lives directly in the database (it is only
//! kilobytes), so there is nothing to copy.

use crate::config;
use chrono::Local;
use std::path::PathBuf;

fn documents_dir() -> Result<PathBuf, String> {
    let cfg = config::load();
    let data_dir = cfg.data_dir.ok_or("no data directory configured")?;
    let dir = data_dir.join("documents");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn sanitize(part: &str) -> String {
    let cleaned: String = part
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    let trimmed = cleaned.trim_matches('-');
    if trimmed.is_empty() {
        "untitled".into()
    } else {
        trimmed.to_string()
    }
}

/// Copy a user-picked PDF into the data folder.
///
/// Returns the path relative to the data directory, which is what gets
/// stored on the application row (keeping the whole data folder portable).
#[tauri::command]
pub fn import_pdf(
    source: PathBuf,
    company: String,
    role: String,
    doc_type: String,
) -> Result<String, String> {
    let dir = documents_dir()?;
    let date = Local::now().format("%Y-%m-%d");
    let base = format!(
        "{date}_{}_{}_{}",
        sanitize(&company),
        sanitize(&role),
        sanitize(&doc_type)
    );

    let mut name = format!("{base}.pdf");
    let mut n = 1;
    while dir.join(&name).exists() {
        n += 1;
        name = format!("{base}-{n}.pdf");
    }

    std::fs::copy(&source, dir.join(&name)).map_err(|e| e.to_string())?;
    Ok(format!("documents/{name}"))
}

/// Resolve a stored relative document path to an absolute one.
#[tauri::command]
pub fn resolve_document_path(relative: String) -> Result<PathBuf, String> {
    let cfg = config::load();
    let data_dir = cfg.data_dir.ok_or("no data directory configured")?;
    Ok(data_dir.join(relative))
}
