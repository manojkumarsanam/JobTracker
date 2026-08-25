/**
 * Click-to-record hotkey input, like Jupyter's shortcut editor: click the
 * box, press the key combo you want, and it fills in automatically —
 * no typing "Alt+Shift+J" by hand.
 */

import { useEffect, useRef, useState } from "react";
import { formatHotkey } from "../lib/platform";
import "./HotkeyRecorder.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  Escape: "Escape",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

function isModifierKey(key: string): boolean {
  return ["Alt", "Control", "Shift", "Meta"].includes(key);
}

function buildShortcut(e: KeyboardEvent): string | null {
  if (isModifierKey(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");
  if (parts.length === 0) return null;

  const main = KEY_ALIASES[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  parts.push(main);
  return parts.join("+");
}

export default function HotkeyRecorder({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const boxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      const shortcut = buildShortcut(e);
      if (shortcut) {
        onChange(shortcut);
        setRecording(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  useEffect(() => {
    if (!recording) return;
    const box = boxRef.current;
    const onBlur = () => setRecording(false);
    box?.addEventListener("blur", onBlur);
    return () => box?.removeEventListener("blur", onBlur);
  }, [recording]);

  return (
    <button
      ref={boxRef}
      type="button"
      className={`hotkey-recorder ${recording ? "recording" : ""}`}
      onClick={() => setRecording(true)}
    >
      {recording ? "Press a key combo…" : formatHotkey(value)}
    </button>
  );
}
