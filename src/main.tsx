import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import Dashboard from "./windows/Dashboard";
import Popup from "./windows/Popup";

// Two windows share one bundle; the hash decides which UI this window hosts.
const isPopup = window.location.hash.startsWith("#/popup");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isPopup ? <Popup /> : <Dashboard />}</React.StrictMode>,
);
