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

// Only one recorder should ever be listening for keys at a time — if a
// second box starts recording (or the user clicks anywhere else on the
// page), the previous one must stop immediately so a stray keypress
// elsewhere can never be captured as its shortcut.
let activeStop: (() => void) | null = null;

export default function HotkeyRecorder({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const boxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;

    const stop = () => setRecording(false);
    activeStop = stop;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        stop();
        return;
      }
      const shortcut = buildShortcut(e);
      if (shortcut) {
        onChange(shortcut);
        stop();
      }
    };

    const onOutsideMouseDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) stop();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onOutsideMouseDown, true);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onOutsideMouseDown, true);
      window.removeEventListener("blur", stop);
      if (activeStop === stop) activeStop = null;
    };
  }, [recording, onChange]);

  const startRecording = () => {
    activeStop?.();
    setRecording(true);
  };

  return (
    <button
      ref={boxRef}
      type="button"
      className={`hotkey-recorder ${recording ? "recording" : ""}`}
      onClick={startRecording}
    >
      {recording ? "Press a key combo…" : formatHotkey(value)}
    </button>
  );
}
