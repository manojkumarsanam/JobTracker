/**
 * The main window: first-run setup wizard until a data folder is chosen,
 * then the dashboard shell — Insights, Applications, and Settings.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import SetupWizard from "../views/SetupWizard";
import Applications from "../views/Applications";
import Insights from "../views/Insights";
import Settings from "../views/Settings";
import "./Dashboard.css";

type Tab = "insights" | "applications" | "settings";

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
        <span className="dashboard-credit">by MJKR</span>
      </nav>
      <main className="dashboard-main">
        {tab === "insights" && <Insights />}
        {tab === "applications" && <Applications />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
}
