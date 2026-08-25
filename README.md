# Job Tracker

A privacy-first, fully local desktop app for tracking your job applications — the details you submitted, the exact resume and cover letter you used, and real analytics over your whole search.

**Created by MJKR.**

## Why

Applying to jobs means customizing a resume and cover letter for every posting, then trying to remember what you told each company: the salary you quoted, the phone number and address you used, which portal it went through. Job Tracker turns that bookkeeping into a single global hotkey — press it anywhere, fill in one popup form, done.

## Features

- **Global hotkeys** — add an application (`Alt+Shift+J`) or open the dashboard (`Alt+Shift+D`) from anywhere. The app lives in your system tray; closing the window keeps the hotkeys alive.
- **Configurable form** — add, rename, reorder, hide, or require fields. Hiding or removing a field never deletes data you already saved.
- **Resume & cover letter storage** — paste LaTeX source (kilobytes per entry, compiled to PDF only when you view it) or attach PDF files. Choose your default at setup, switch any time, override per document.
- **Document viewer** — click any entry's resume to preview the PDF in-app and download it as `Date_Company_Role.pdf` wherever you choose.
- **Status tracking** — Applied → Screening → Interview → Offer / Rejected / Ghosted. Colored badges in the table; hover to change; every transition is timestamped. Timestamps themselves are immutable in-app.
- **Customizable Insights dashboard**:
  - Today / total / streak headline stats and a GitHub-style activity calendar (always on)
  - Weekly bar chart, momentum with 7-day rolling average, time-of-day heatmap with best slots
  - Forecast: set a goal (deadline optional), see your projected finish date, required pace, and whether you're on track
  - Portal effectiveness (response/interview/offer rates), status funnel, salary trend
  - Interactive map — world view or zoomed to one country, hover dots for details
  - Anomaly detection: unusual spikes or drops get flagged, and your explanation is saved with the data
  - **Customize mode**: hide any chart, drag to reorder, and build your own — bar, pie, donut, line, area, histogram, box plot, or KDE over any field, including your custom ones
- **Export** — CSV or Excel, one click, including every custom field you ever used.
- **Local AI assistant (optional)** — connect your own [Ollama](https://ollama.com) and ask questions about your data in plain language ("which portal responds the most?"). The assistant is locked to your application data — the system prompt is compiled into the app, can't be changed, and refuses anything off-topic. Your data goes only to the Ollama URL you configure (normally localhost), nowhere else.
- **Private by design** — one SQLite database in a folder you choose. No accounts, no telemetry, no network calls. Move the folder and your data moves with it.

## Install

Download the latest release for your OS from [Releases](../../releases).

### macOS

The app is not code-signed (no $99/year Apple certificate), so Gatekeeper will warn you on first launch:

1. Open the `.dmg` and drag **Job Tracker** to Applications.
2. Right-click the app → **Open** → **Open** (only needed once), or allow it under **System Settings → Privacy & Security**.

### Windows

SmartScreen may warn about an unrecognized app: click **More info → Run anyway**.

### LaTeX previews (optional)

To preview `.tex` resumes as PDFs, install [Tectonic](https://tectonic-typesetting.github.io) — a small, self-contained LaTeX engine:

```sh
# macOS
brew install tectonic

# Windows
winget install TectonicProject.Tectonic
```

Everything else works without it; you just won't be able to compile `.tex` previews.

## Uninstall

Job Tracker touches exactly three places — remove them and it's gone without a trace:

1. **The app** — macOS: drag it from Applications to the Trash. Windows: Settings → Apps → Job Tracker → Uninstall.
2. **Your data folder** — the folder you chose at setup (database + documents). Keep it if you might return; export to CSV/Excel first if you want a portable copy.
3. **App preferences** — one small file remembering where your data folder is:
   - macOS: `~/Library/Application Support/JobTracker`
   - Windows: `%APPDATA%\JobTracker`

## Development

Prerequisites: [Node.js](https://nodejs.org) ≥ 20 and [Rust](https://rustup.rs) (stable).

```sh
npm install        # frontend dependencies
npm run tauri dev  # run the app with hot reload
```

Other useful commands:

```sh
npm run lint         # ESLint + TypeScript checks
npm run tauri build  # produce a release installer for your OS
```

Backend checks: `cargo fmt --check` and `cargo clippy` inside `src-tauri/` (CI enforces both).

Dependency updates: `npm update` for the frontend, `cargo update` inside `src-tauri/` for the backend.

## Architecture

- **Shell**: [Tauri 2](https://tauri.app) — Rust backend, native webview, ~10 MB installers for macOS and Windows from one codebase.
- **Frontend**: React 19 + TypeScript + Vite, [Recharts](https://recharts.org) for charts, [d3-geo](https://d3js.org/d3-geo) for the offline map.
- **Storage**: SQLite (bundled, WAL mode) via `rusqlite`. Built-in fields are real columns; custom fields live in a JSON column so schema changes never destroy data. Documents are either `.tex` text in the DB or PDF files in `<data folder>/documents/`.
- **Analytics**: a pure, side-effect-free TypeScript module (`src/lib/analytics.ts`) — rolling averages, z-score anomaly detection, goal forecasting, funnel and portal conversion.
- **LaTeX**: compiled on demand with Tectonic (bundled sidecar when present, otherwise PATH), in a temp dir, returning only PDF bytes.

```
src/                  React frontend (dashboard + hotkey popup)
  lib/analytics.ts    pure analytics engine
  components/         form renderer, status badges, charts, viewers
  views/              Insights, Applications, Settings, Setup wizard
src-tauri/src/        Rust backend
  db.rs               SQLite schema + migrations
  commands/           IPC commands (CRUD, export, compile, anomalies)
  hotkeys.rs          global shortcuts + window management
```

## Releasing

Push a tag like `v0.1.0` and GitHub Actions builds the macOS (universal) and Windows installers and attaches them to a draft release.

## Website

The landing page lives in [`website/`](website) as a single self-contained HTML file. Pushing changes to it on `main` auto-deploys via GitHub Pages (enable Pages → Source: GitHub Actions in the repo settings once). It also drops straight into Cloudflare Pages or Netlify — point them at the `website/` folder, no build step needed.

## License

[MIT](LICENSE)
