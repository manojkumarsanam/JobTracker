/** Platform detection for display-only differences (e.g. Option vs Alt). */

export function isMac(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

const MAC_LABELS: Record<string, string> = {
  Alt: "⌥ Option",
  Control: "⌃ Control",
  Shift: "⇧ Shift",
  Super: "⌘ Command",
};

const OTHER_LABELS: Record<string, string> = {
  Alt: "Alt",
  Control: "Ctrl",
  Shift: "Shift",
  Super: "Win",
};

/** Render a stored shortcut string (e.g. "Alt+Shift+J") for display. */
export function formatHotkey(value: string): string {
  if (!value.trim()) return "Not set";
  const labels = isMac() ? MAC_LABELS : OTHER_LABELS;
  return value
    .split("+")
    .map((part) => labels[part] ?? part)
    .join(isMac() ? "" : "+");
}
