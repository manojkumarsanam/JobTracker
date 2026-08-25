<p align="center">
  <b>Job Tracker</b><br/>
  <sub>Created by MJKR</sub>
</p>

# Job Tracker

**Remember exactly what you applied with, for every job.**

Job Tracker is a free, open-source desktop app for macOS and Windows that logs your job applications with one keyboard shortcut — the resume you sent, the salary you quoted, the portal you used — and turns your search into a real dashboard: streaks, forecasts, response rates, and more. Everything stays on your computer. No account, no cloud, no tracking.

## Download

**[⬇ Get the latest release](../../releases/latest)** — installers for macOS and Windows.

Having trouble opening it? See [Fixing the "unidentified developer" / "malware" warning](#fixing-the-unidentified-developer--malware-warning) below — it's expected and takes 30 seconds to fix.

## Why this exists

If you tailor a resume and cover letter for every job, you already know the annoying part isn't applying — it's remembering afterward. What salary did you tell this company? Which phone number? Did you already apply here? Job Tracker replaces the spreadsheet-and-folder juggling with one hotkey: press it, fill in a short form, done. It's saved, filed, and counted.

## Features

- **Global hotkey, anywhere** — press your shortcut while browsing any job site and a small form pops up. The app keeps running quietly in your system tray so the hotkey always works, even with the window closed.
- **Your form, your fields** — the popup asks whatever you want it to. Add, rename, reorder, or remove fields freely. Removing a field never deletes data you already saved.
- **Keep the exact resume you sent** — paste your LaTeX source (a few KB instead of a multi-MB PDF, turned into a PDF only when you want to look at it) or attach the PDF directly. Your choice, every time.
- **A dashboard that shows your real progress** — a GitHub-style activity calendar, weekly and monthly views, a goal forecast that tells you if you're on pace, a map of where you're applying, which portals actually respond, and more.
- **Make it yours** — rearrange or hide any chart, or build your own from your data: bar charts, pie charts, histograms, and more.
- **Track outcomes** — mark each application Applied, Screening, Interview, Offer, Rejected, or Ghosted with one click; see your funnel and response rates.
- **Ask questions about your own data** — optionally connect a local [Ollama](https://ollama.com) model and ask things like "which portal has the best response rate?" It only ever discusses your application data, and it never leaves your machine.
- **Export any time** — one click to CSV or Excel, no lock-in.

## Your privacy

Everything lives in one file on your computer, in a folder you choose during setup. Job Tracker has no servers, no accounts, and sends nothing anywhere — except, if you turn it on, questions to an Ollama model you're running yourself. Move the folder, back it up, or delete it; it's entirely yours.

## Installing

1. Download the installer for your OS from [Releases](../../releases/latest).
2. **macOS**: open the `.dmg`, drag **Job Tracker** into Applications.
3. **Windows**: run the `.msi` installer.
4. On first launch, your OS will warn you it can't verify the app — this is normal for free/open-source apps without a paid developer certificate. See below to get past it.
5. Follow the setup wizard: pick a folder for your data, choose how you want to store resumes (LaTeX or PDF), and confirm your hotkeys.

### Fixing the "unidentified developer" / "malware" warning

Job Tracker isn't signed with a paid Apple developer certificate ($99/year), so macOS Gatekeeper and Windows SmartScreen both flag it on first run. The app is fully open source — you (or anyone) can read every line in this repository and confirm there's nothing malicious in it.

**On macOS**, if you see *"Apple could not verify that this app is free of malware"*:

1. Try right-click (or Control-click) the app in Applications → **Open** → **Open** in the dialog. This alone fixes it on many Mac setups.
2. If that dialog doesn't offer an "Open" option, or it still refuses: open **System Settings → Privacy & Security**, scroll down to the Security section, and you'll see *"Job Tracker was blocked..."* with an **Open Anyway** button. Click it, enter your password if asked, then try opening the app again.
3. If it still won't open, the download may have a quarantine flag your Mac won't clear through the UI. Open **Terminal** and run:
   ```sh
   xattr -cr "/Applications/Job Tracker.app"
   ```
   Then open the app normally. This removes the "downloaded from the internet" flag Gatekeeper checks — it does not disable any real security scanning.

**On Windows**, if SmartScreen says *"Windows protected your PC"*:

1. Click **More info**.
2. Click **Run anyway**.

You'll only need to do this once per install.

### Optional: LaTeX resume previews

If you store resumes as LaTeX source, install [Tectonic](https://tectonic-typesetting.github.io) to preview them as PDFs inside the app:

```sh
# macOS
brew install tectonic

# Windows
winget install TectonicProject.Tectonic
```

Everything else works without it — you just won't be able to compile `.tex` previews until it's installed.

## Uninstalling

Job Tracker touches exactly three places on your computer:

1. **The app** — macOS: drag it from Applications to the Trash. Windows: Settings → Apps → Job Tracker → Uninstall.
2. **Your data folder** — wherever you chose during setup (your database and any attached documents). Export to CSV/Excel first if you want a copy, or just keep the folder if you might come back.
3. **A small preferences file** that only remembers where your data folder is:
   - macOS: `~/Library/Application Support/JobTracker`
   - Windows: `%APPDATA%\JobTracker`

Delete all three and there's no trace left.

## Questions or problems?

Open an [issue](../../issues) — bug reports, feature requests, and questions are all welcome.

---

## For developers

<details>
<summary>Building from source, architecture, and contributing</summary>

### Running locally

Prerequisites: [Node.js](https://nodejs.org) ≥ 20 and [Rust](https://rustup.rs) (stable).

```sh
npm install        # frontend dependencies
npm run tauri dev  # run the app with hot reload
```

```sh
npm run lint         # ESLint + TypeScript checks
npm run tauri build  # produce a release installer for your OS
```

Backend checks: `cargo fmt --check` and `cargo clippy` inside `src-tauri/` (CI enforces both).

Dependency updates: `npm update` for the frontend, `cargo update` inside `src-tauri/` for the backend.

### Architecture

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

### Releasing

Push a tag like `v0.1.0` and GitHub Actions builds the macOS (universal) and Windows installers and attaches them to a draft release.

### Website

The landing page lives in [`website/`](website) as a single self-contained HTML file. Pushing changes to it on `main` auto-deploys via GitHub Pages (Settings → Pages → Source: GitHub Actions). It also drops straight into Cloudflare Pages or Netlify — point them at the `website/` folder, no build step needed.

</details>

## License

[MIT](LICENSE)
