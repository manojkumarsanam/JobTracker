/**
 * Text sanitizing for model output. Some models pad short answers with
 * near-invisible filler — lines of non-breaking/zero-width space, or
 * empty markdown list markers with nothing after them — that a plain
 * blank-line collapse misses, rendering as a stack of empty paragraphs
 * or list items. Mirrors (and extends) the backend's clean_answer.
 */

// Built from code points rather than embedded literally, so the source
// file itself doesn't carry invisible characters.
const ZERO_WIDTH_CHARS = [0x200b, 0x200c, 0x200d].map((cp) =>
  String.fromCharCode(cp),
);

// A bare list/quote marker with nothing after it: "-", "*", "+", ">",
// "1.", "1)" — visually near-empty once rendered as a list item.
const BARE_MARKER = /^(?:[-*+>]|\d+[.)])$/;

function isVisuallyBlank(line: string): boolean {
  let stripped = line;
  for (const ch of ZERO_WIDTH_CHARS) stripped = stripped.split(ch).join("");
  stripped = stripped.trim();
  // \s already covers non-breaking space (U+00A0) and BOM (U+FEFF).
  return stripped.length === 0 || BARE_MARKER.test(stripped);
}

export function sanitizeAssistantText(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let blankRun = 0;
  for (const line of lines) {
    if (isVisuallyBlank(line)) {
      blankRun++;
      if (blankRun > 1) continue;
      out.push("");
    } else {
      blankRun = 0;
      out.push(line.trimEnd());
    }
  }
  return out.join("\n").trim();
}
