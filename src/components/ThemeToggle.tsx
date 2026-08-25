/** Sun/moon slider that switches light/dark instantly, from any window. */

import { useState } from "react";
import { applyTheme, effectiveTheme } from "../lib/theme";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(effectiveTheme());

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    applyTheme(next);
    setMode(next);
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${mode}`}
      onClick={toggle}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle color theme"
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-icon sun" aria-hidden>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
          </svg>
        </span>
        <span className="theme-toggle-icon moon" aria-hidden>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
          </svg>
        </span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
