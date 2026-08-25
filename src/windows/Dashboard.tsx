/**
 * The main window: first-run setup wizard until a data folder is chosen,
 * then the dashboard shell — Insights, Applications, and Settings.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import SetupWizard from "../views/SetupWizard";
import ThemeToggle from "../components/ThemeToggle";
import Applications from "../views/Applications";
import Assistant from "../views/Assistant";
import Insights from "../views/Insights";
import Settings from "../views/Settings";
import "./Dashboard.css";

type Tab = "insights" | "applications" | "assistant" | "settings";

export default function Dashboard() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("insights");

  const refresh = useCallback(() => {
    api
      .getSetupState()
      .then((s) => setReady(s.ready))
      .catch(() => setReady(false));
  }, []);

  useEffect(refresh, [refresh]);

  if (ready === null) return null;
  if (!ready) return <SetupWizard onComplete={refresh} />;

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="dashboard-brand">
          <span className="dashboard-logo">JT</span>
          <span className="dashboard-name">Job Tracker</span>
        </div>
        <div className="dashboard-tabs">
          {(
            [
              ["insights", "Insights"],
              ["applications", "Applications"],
              ["assistant", "Assistant"],
              ["settings", "Settings"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`dashboard-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="primary dashboard-add"
          onClick={() => api.openPopup()}
          title="Log a new application (same as the global hotkey)"
        >
          + New Application
        </button>
        <span className="dashboard-credit">by MJKR</span>
        <ThemeToggle />
      </nav>
      <main className="dashboard-main">
        {tab === "insights" && <Insights />}
        {tab === "applications" && <Applications />}
        {tab === "assistant" && <Assistant />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
}
