//! Anomaly annotations.
//!
//! Detection happens in the frontend (it already has the full activity
//! series); what's stored here is the user's own explanation for a flagged
//! spike or drop, so the context becomes part of the historical data.

use crate::db::Db;
use chrono::Local;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnomalyNote {
    pub period_start: String,
    pub period_type: String,
    pub direction: String,
    pub note: String,
    pub created_at: String,
}

#[tauri::command]
pub fn list_anomaly_notes(db: State<Db>) -> Result<Vec<AnomalyNote>, String> {
    let guard = db.0.lock().unwrap();
    let conn = guard.as_ref().ok_or("database not initialized")?;
    let mut stmt = conn
        .prepare(
            "SELECT period_start, period_type, direction, note, created_at
             FROM anomaly_notes ORDER BY period_start",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(AnomalyNote {
                period_start: r.get(0)?,
                period_type: r.get(1)?,
                direction: r.get(2)?,
                note: r.get(3)?,
                created_at: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_anomaly_note(
    period_start: String,
    period_type: String,
    direction: String,
    note: String,
    db: State<Db>,
) -> Result<(), String> {
    let guard = db.0.lock().unwrap();
    let conn = guard.as_ref().ok_or("database not initialized")?;
    conn.execute(
        "INSERT INTO anomaly_notes (period_start, period_type, direction, note, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (period_start, period_type) DO UPDATE SET
           direction = excluded.direction,
           note = excluded.note",
        params![
            period_start,
            period_type,
            direction,
            note,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
