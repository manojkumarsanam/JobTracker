# Job Tracker

A privacy-first, fully local desktop app for tracking your job applications — the details you submitted, the exact resume and cover letter you used, and analytics over your whole search.

**Created by MJKR.**

## Why

Applying to jobs means customizing a resume and cover letter for every posting, then trying to remember what you told each company: the salary you quoted, the phone number and address you used, which portal it went through. Job Tracker turns that bookkeeping into a single global hotkey: press it anywhere, fill in one popup form, done.

## Features

- **Global hotkeys** — add an application or open the dashboard from anywhere, even when the app is closed
- **Configurable form** — add, rename, reorder, or hide fields; hidden fields never delete your existing data
- **Resume & cover letter storage** — store LaTeX source (kilobytes, compiled to PDF on demand) or PDF files, your choice
- **Dashboard analytics** — daily/weekly/monthly activity, momentum, forecast toward your goal, time-of-day patterns, portal effectiveness, status funnel, geography, anomaly detection with your own annotations
- **Status tracking** — Applied → Screening → Interview → Offer / Rejected / Ghosted, with colored status icons in the table
- **Export** — CSV or Excel, one click
- **Private by design** — everything lives in a local SQLite database in a folder you choose; no accounts, no telemetry, no network calls

## Development

Prerequisites: [Node.js](https://nodejs.org) ≥ 20, [Rust](https://rustup.rs) ≥ 1.77.

```sh
npm install
npm run tauri dev
```

## Building

```sh
npm run tauri build
```

Produces a `.dmg`/`.app` on macOS and `.msi`/`.exe` on Windows.

## License

[MIT](LICENSE)
