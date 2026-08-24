//! SQLite connection management and schema migrations.
//!
//! The database lives inside the user-chosen data directory as
//! `jobtracker.db`. The path to that directory is stored in a small JSON
//! config file in the OS config location (see [`crate::config`]), so the
//! data folder itself stays fully portable.

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Application-wide handle to the (optional) open database.
///
/// `None` until the user completes first-run setup and picks a data folder.
pub struct Db(pub Mutex<Option<Connection>>);

pub const DB_FILE_NAME: &str = "jobtracker.db";

/// Open (creating if needed) the database inside `data_dir` and run migrations.
pub fn open(data_dir: &Path) -> Result<Connection, String> {
    std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(data_dir.join(DB_FILE_NAME)).map_err(|e| e.to_string())?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| e.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    let version: i64 = conn
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if version < 1 {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS field_definitions (
                id         INTEGER PRIMARY KEY,
                key        TEXT NOT NULL UNIQUE,
                label      TEXT NOT NULL,
                field_type TEXT NOT NULL DEFAULT 'text',
                options    TEXT,
                required   INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                visible    INTEGER NOT NULL DEFAULT 1,
                builtin    INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS applications (
                id                 INTEGER PRIMARY KEY,
                created_at         TEXT NOT NULL,
                company            TEXT NOT NULL DEFAULT '',
                role               TEXT NOT NULL DEFAULT '',
                job_id             TEXT NOT NULL DEFAULT '',
                portal             TEXT NOT NULL DEFAULT '',
                location           TEXT NOT NULL DEFAULT '',
                address_used       TEXT NOT NULL DEFAULT '',
                phone              TEXT NOT NULL DEFAULT '',
                salary_expectation TEXT NOT NULL DEFAULT '',
                status             TEXT NOT NULL DEFAULT 'applied',
                notes              TEXT NOT NULL DEFAULT '',
                extra              TEXT NOT NULL DEFAULT '{}',
                resume_kind        TEXT,
                resume_tex         TEXT,
                resume_path        TEXT,
                cover_kind         TEXT,
                cover_tex          TEXT,
                cover_path         TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_applications_created_at
                ON applications (created_at);

            CREATE TABLE IF NOT EXISTS status_events (
                id             INTEGER PRIMARY KEY,
                application_id INTEGER NOT NULL
                               REFERENCES applications (id) ON DELETE CASCADE,
                status         TEXT NOT NULL,
                changed_at     TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_status_events_application
                ON status_events (application_id);

            CREATE TABLE IF NOT EXISTS anomaly_notes (
                id           INTEGER PRIMARY KEY,
                period_start TEXT NOT NULL,
                period_type  TEXT NOT NULL,
                direction    TEXT NOT NULL,
                note         TEXT NOT NULL DEFAULT '',
                created_at   TEXT NOT NULL,
                UNIQUE (period_start, period_type)
            );

            PRAGMA user_version = 1;
            "#,
        )
        .map_err(|e| e.to_string())?;

        seed_default_fields(conn)?;
    }

    Ok(())
}

/// The built-in form fields every new database starts with.
///
/// Built-in fields map to real columns on `applications`; custom fields the
/// user adds later live in the `extra` JSON column. Hiding a field never
/// touches stored data.
fn seed_default_fields(conn: &Connection) -> Result<(), String> {
    let defaults: [(&str, &str, &str, Option<&str>, i64); 9] = [
        ("company", "Company", "text", None, 1),
        ("role", "Role", "text", None, 1),
        ("job_id", "Job ID", "text", None, 0),
        (
            "portal",
            "Portal",
            "select",
            Some(r#"["Ashby","Greenhouse","Lever","Workday","LinkedIn","Company site","Other"]"#),
            0,
        ),
        ("location", "Location", "text", None, 0),
        ("address_used", "Address Used", "text", None, 0),
        ("phone", "Phone Number", "text", None, 0),
        ("salary_expectation", "Salary Expectation", "text", None, 0),
        ("notes", "Notes", "textarea", None, 0),
    ];

    let mut stmt = conn
        .prepare(
            "INSERT OR IGNORE INTO field_definitions
             (key, label, field_type, options, required, sort_order, visible, builtin)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 1)",
        )
        .map_err(|e| e.to_string())?;

    for (i, (key, label, ftype, options, required)) in defaults.iter().enumerate() {
        stmt.execute(rusqlite::params![key, label, ftype, options, required, i as i64])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
