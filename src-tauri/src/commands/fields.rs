//! Form-field configuration commands.
//!
//! The add-entry form renders from these definitions. Built-in fields map
//! to fixed columns on `applications`; custom fields live in its `extra`
//! JSON column. Deleting or hiding a field only stops the form from asking
//! for it — previously stored values are never removed.

use crate::db::Db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub id: Option<i64>,
    pub key: String,
    pub label: String,
    pub field_type: String,
    /// JSON array of choices for `select` fields.
    pub options: Option<String>,
    pub required: bool,
    pub sort_order: i64,
    pub visible: bool,
    pub builtin: bool,
}

fn with_conn<T>(
    db: &State<Db>,
    f: impl FnOnce(&rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let guard = db.0.lock().unwrap();
    let conn = guard.as_ref().ok_or("database not initialized")?;
    f(conn)
}

#[tauri::command]
pub fn list_fields(db: State<Db>) -> Result<Vec<FieldDefinition>, String> {
    with_conn(&db, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, key, label, field_type, options, required, sort_order, visible, builtin
                 FROM field_definitions ORDER BY sort_order",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| {
                Ok(FieldDefinition {
                    id: Some(r.get(0)?),
                    key: r.get(1)?,
                    label: r.get(2)?,
                    field_type: r.get(3)?,
                    options: r.get(4)?,
                    required: r.get::<_, i64>(5)? != 0,
                    sort_order: r.get(6)?,
                    visible: r.get::<_, i64>(7)? != 0,
                    builtin: r.get::<_, i64>(8)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    })
}

/// Replace the full field configuration in one transaction.
///
/// Rows for removed *custom* fields are deleted from `field_definitions`
/// only — the values already saved on applications stay in their `extra`
/// JSON untouched. Built-in fields can be hidden or relabeled but never
/// deleted, so their rows are upserted by key.
#[tauri::command]
pub fn save_fields(fields: Vec<FieldDefinition>, db: State<Db>) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute_batch("BEGIN").map_err(|e| e.to_string())?;
        let result = (|| -> Result<(), String> {
            let keys: Vec<String> = fields.iter().map(|f| f.key.clone()).collect();
            let placeholders = vec!["?"; keys.len()].join(",");
            // Custom fields absent from the new configuration are dropped
            // from the form; built-ins always survive.
            let sql = if keys.is_empty() {
                "DELETE FROM field_definitions WHERE builtin = 0".to_string()
            } else {
                format!(
                    "DELETE FROM field_definitions WHERE builtin = 0 AND key NOT IN ({placeholders})"
                )
            };
            conn.execute(&sql, rusqlite::params_from_iter(keys.iter()))
                .map_err(|e| e.to_string())?;

            let mut stmt = conn
                .prepare(
                    "INSERT INTO field_definitions
                     (key, label, field_type, options, required, sort_order, visible, builtin)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                     ON CONFLICT (key) DO UPDATE SET
                       label = excluded.label,
                       field_type = excluded.field_type,
                       options = excluded.options,
                       required = excluded.required,
                       sort_order = excluded.sort_order,
                       visible = excluded.visible",
                )
                .map_err(|e| e.to_string())?;
            for f in &fields {
                stmt.execute(params![
                    f.key,
                    f.label,
                    f.field_type,
                    f.options,
                    f.required as i64,
                    f.sort_order,
                    f.visible as i64,
                    f.builtin as i64,
                ])
                .map_err(|e| e.to_string())?;
            }
            Ok(())
        })();

        match result {
            Ok(()) => conn.execute_batch("COMMIT").map_err(|e| e.to_string()),
            Err(e) => {
                let _ = conn.execute_batch("ROLLBACK");
                Err(e)
            }
        }
    })
}
