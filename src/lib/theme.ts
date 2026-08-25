/**
 * Theme handling: "light" | "dark" | "system", persisted in localStorage
 * (shared by both windows) and applied as a `data-theme` attribute on the
 * root element. With no attribute, CSS falls back to the OS preference.
 */

export type Theme = "light" | "dark" | "system";

const KEY = "jobtracker-theme";

export function storedTheme(): Theme {
  const value = localStorage.getItem(KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function applyTheme(theme: Theme) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(KEY);
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }
}

/** Resolve what's actually on screen right now. */
export function effectiveTheme(): "light" | "dark" {
  const stored = storedTheme();
  if (stored !== "system") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply on module load so windows never flash the wrong theme. */
export function initTheme() {
  applyTheme(storedTheme());
  // Keep every window in sync when the toggle is used in another one.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) applyTheme(storedTheme());
  });
}
