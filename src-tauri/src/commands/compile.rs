//! On-demand LaTeX → PDF compilation via Tectonic.
//!
//! The engine is resolved in order:
//! 1. a `tectonic` binary bundled next to the app executable (release builds)
//! 2. `tectonic` on the user's PATH (dev builds, or a user install)
//!
//! Compilation happens in a temp dir; only the PDF bytes leave it.

use std::path::PathBuf;
use std::process::Command;

fn tectonic_binary() -> Option<PathBuf> {
    // Bundled sidecar (same directory as the app binary).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let name = if cfg!(windows) { "tectonic.exe" } else { "tectonic" };
            let candidate = dir.join(name);
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    // PATH lookup.
    let finder = if cfg!(windows) { "where" } else { "which" };
    let output = Command::new(finder).arg("tectonic").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout);
        let first = path.lines().next()?.trim();
        if !first.is_empty() {
            return Some(PathBuf::from(first));
        }
    }
    None
}

#[tauri::command]
pub fn tex_engine_available() -> bool {
    tectonic_binary().is_some()
}

/// Compile LaTeX source and return the PDF bytes.
#[tauri::command]
pub fn compile_tex(tex: String) -> Result<Vec<u8>, String> {
    let engine = tectonic_binary().ok_or(
        "No LaTeX engine found. Install Tectonic (https://tectonic-typesetting.github.io) \
         — on macOS: `brew install tectonic` — and try again.",
    )?;

    let work_dir = std::env::temp_dir().join(format!(
        "jobtracker-tex-{}",
        std::process::id()
    ));
    std::fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;
    let tex_path = work_dir.join("document.tex");
    std::fs::write(&tex_path, &tex).map_err(|e| e.to_string())?;

    let output = Command::new(&engine)
        .arg("-X")
        .arg("compile")
        .arg(&tex_path)
        .arg("--outdir")
        .arg(&work_dir)
        .output()
        .map_err(|e| format!("failed to run tectonic: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Surface the tail of the log — LaTeX errors are at the end.
        let tail: String = stderr
            .lines()
            .rev()
            .take(15)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join("\n");
        let _ = std::fs::remove_dir_all(&work_dir);
        return Err(format!("LaTeX compilation failed:\n{tail}"));
    }

    let pdf = std::fs::read(work_dir.join("document.pdf")).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_dir_all(&work_dir);
    Ok(pdf)
}

/// Read a stored document (path relative to the data dir) as bytes.
#[tauri::command]
pub fn read_document(relative: String) -> Result<Vec<u8>, String> {
    let cfg = crate::config::load();
    let data_dir = cfg.data_dir.ok_or("no data directory configured")?;
    std::fs::read(data_dir.join(relative)).map_err(|e| e.to_string())
}

/// Write PDF bytes to a user-chosen location (from the native save dialog).
#[tauri::command]
pub fn save_pdf_as(path: PathBuf, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}
