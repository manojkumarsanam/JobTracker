//! Import applications from a user-picked CSV or Excel file.
//!
//! Parsing happens here (not in the frontend) so we can use vetted,
//! actively-maintained parsers (`csv`, `calamine`) rather than a
//! JS library with known unpatched vulnerabilities. The frontend drives
//! an interactive column-mapping wizard on top of the parsed table.

use crate::db::Db;
use calamine::{open_workbook_auto, Data, Reader};
use chrono::Local;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct ParsedTable {
    pub headers: Vec<String>,
    /// Row values, same length/order as `headers`.
    pub rows: Vec<Vec<String>>,
}

fn parse_csv(path: &Path) -> Result<ParsedTable, String> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(path)
        .map_err(|e| e.to_string())?;
    let headers = reader
        .headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(str::to_string)
        .collect();
    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|e| e.to_string())?;
        rows.push(record.iter().map(str::to_string).collect());
    }
    Ok(ParsedTable { headers, rows })
}

fn parse_spreadsheet(path: &Path) -> Result<ParsedTable, String> {
    let mut workbook = open_workbook_auto(path).map_err(|e| e.to_string())?;
    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or("the file has no sheets")?;
    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| e.to_string())?;

    let mut rows_iter = range.rows();
    let headers: Vec<String> = rows_iter
        .next()
        .ok_or("the sheet is empty")?
        .iter()
        .map(data_to_string)
        .collect();
    let rows = rows_iter
        .map(|row| row.iter().map(data_to_string).collect())
        .collect();
    Ok(ParsedTable { headers, rows })
}

fn data_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => f.to_string(),
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::DateTime(dt) => dt
            .as_datetime()
            .map(|d| d.format("%Y-%m-%d").to_string())
            .unwrap_or_default(),
        Data::DateTimeIso(s) | Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("#ERROR: {e:?}"),
    }
}

#[tauri::command]
pub fn parse_import_file(path: PathBuf) -> Result<ParsedTable, String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();
    match ext.as_str() {
        "csv" => parse_csv(&path),
        "xlsx" | "xls" | "xlsb" | "ods" => parse_spreadsheet(&path),
        other => Err(format!("unsupported file type: .{other}")),
    }
}

/// One row ready to import, after the user has mapped columns and
/// resolved the date. Unlike normal entry creation, `created_at` is
/// explicit here — imported rows are historical by nature.
#[derive(Debug, Deserialize)]
pub struct ImportRow {
    pub created_at: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub job_id: String,
    #[serde(default)]
    pub portal: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub address_used: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub salary_expectation: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub extra: HashMap<String, serde_json::Value>,
    /// Absolute path on disk to a resume PDF to copy in, if mapped.
    #[serde(default)]
    pub resume_source_path: Option<String>,
    #[serde(default)]
    pub cover_source_path: Option<String>,
    /// Set when the user chose "Replace" for a detected duplicate.
    #[serde(default)]
    pub replace_id: Option<i64>,
}

#[derive(Debug, Serialize, Default)]
pub struct ImportSummary {
    pub inserted: usize,
    pub replaced: usize,
    pub errors: Vec<String>,
}

fn copy_import_document(
    data_dir: &Path,
    source: &str,
    company: &str,
    role: &str,
    doc_type: &str,
) -> Option<String> {
    let source_path = PathBuf::from(source);
    if !source_path.exists() {
        return None;
    }
    let dir = data_dir.join("documents");
    std::fs::create_dir_all(&dir).ok()?;
    let sanitize = |s: &str| {
        let cleaned: String = s
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { '-' })
            .collect();
        let trimmed = cleaned.trim_matches('-').to_string();
        if trimmed.is_empty() {
            "untitled".to_string()
        } else {
            trimmed
        }
    };
    let base = format!(
        "{}_{}_{}_{}",
        Local::now().format("%Y-%m-%d"),
        sanitize(company),
        sanitize(role),
        doc_type
    );
    let mut name = format!("{base}.pdf");
    let mut n = 1;
    while dir.join(&name).exists() {
        n += 1;
        name = format!("{base}-{n}.pdf");
    }
    std::fs::copy(&source_path, dir.join(&name)).ok()?;
    Some(format!("documents/{name}"))
}

#[tauri::command]
pub fn import_applications(
    rows: Vec<ImportRow>,
    db: tauri::State<Db>,
) -> Result<ImportSummary, String> {
    let cfg = crate::config::load();
    let data_dir = cfg.data_dir.ok_or("no data directory configured")?;

    let guard = db.0.lock().unwrap();
    let conn = guard.as_ref().ok_or("database not initialized")?;

    let mut summary = ImportSummary::default();

    for row in rows {
        let result = (|| -> Result<(), String> {
            let extra = serde_json::to_string(&row.extra).map_err(|e| e.to_string())?;
            let status = row.status.clone().unwrap_or_else(|| "applied".to_string());
            if !crate::commands::applications::STATUSES.contains(&status.as_str()) {
                return Err(format!("unknown status: {status}"));
            }

            let resume = row.resume_source_path.as_deref().and_then(|src| {
                copy_import_document(&data_dir, src, &row.company, &row.role, "Resume")
            });
            let cover = row.cover_source_path.as_deref().and_then(|src| {
                copy_import_document(&data_dir, src, &row.company, &row.role, "CoverLetter")
            });

            if let Some(id) = row.replace_id {
                let updated = conn
                    .execute(
                        "UPDATE applications SET
                           created_at = ?1, company = ?2, role = ?3, job_id = ?4,
                           portal = ?5, location = ?6, address_used = ?7, phone = ?8,
                           salary_expectation = ?9, status = ?10, notes = ?11, extra = ?12,
                           resume_kind = COALESCE(?13, resume_kind),
                           resume_path = COALESCE(?14, resume_path),
                           cover_kind = COALESCE(?15, cover_kind),
                           cover_path = COALESCE(?16, cover_path)
                         WHERE id = ?17",
                        params![
                            row.created_at,
                            row.company,
                            row.role,
                            row.job_id,
                            row.portal,
                            row.location,
                            row.address_used,
                            row.phone,
                            row.salary_expectation,
                            status,
                            row.notes,
                            extra,
                            resume.as_ref().map(|_| "pdf"),
                            resume,
                            cover.as_ref().map(|_| "pdf"),
                            cover,
                            id,
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                if updated == 0 {
                    return Err(format!("no application with id {id} to replace"));
                }
                conn.execute(
                    "INSERT INTO status_events (application_id, status, changed_at)
                     VALUES (?1, ?2, ?3)",
                    params![id, status, row.created_at],
                )
                .map_err(|e| e.to_string())?;
                summary.replaced += 1;
            } else {
                conn.execute(
                    "INSERT INTO applications
                     (created_at, company, role, job_id, portal, location, address_used,
                      phone, salary_expectation, status, notes, extra,
                      resume_kind, resume_path, cover_kind, cover_path)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                             ?13, ?14, ?15, ?16)",
                    params![
                        row.created_at,
                        row.company,
                        row.role,
                        row.job_id,
                        row.portal,
                        row.location,
                        row.address_used,
                        row.phone,
                        row.salary_expectation,
                        status,
                        row.notes,
                        extra,
                        resume.as_ref().map(|_| "pdf"),
                        resume,
                        cover.as_ref().map(|_| "pdf"),
                        cover,
                    ],
                )
                .map_err(|e| e.to_string())?;
                let id = conn.last_insert_rowid();
                conn.execute(
                    "INSERT INTO status_events (application_id, status, changed_at)
                     VALUES (?1, ?2, ?3)",
                    params![id, status, row.created_at],
                )
                .map_err(|e| e.to_string())?;
                summary.inserted += 1;
            }
            Ok(())
        })();

        if let Err(e) = result {
            summary.errors.push(e);
        }
    }

    Ok(summary)
}
