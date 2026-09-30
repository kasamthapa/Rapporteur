import type { ParsedLine } from "../types/meeting.js";

const ACTION_ITEM_RE = /ACTION ITEM:[\s\S]*?-\s*WATCH:\s*\S+/g;

const HEADER_RE = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(.+)$/;
const BLOCK_TIMESTAMP_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const BRACKET_LINE_RE = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*([^:]{1,80}):\s*(.+)$/;
const PAREN_TIME_LINE_RE = /^([^(]{1,80})\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.+)$/;

function stripSpeakerEmail(raw: string): string {
  const name = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return name.length > 0 ? name : "Unknown";
}

/** Format 1: real Fathom "copy" export — "M:SS - Speaker (email)" turn headers. */
function parseFormat1(cleaned: string): ParsedLine[] | null {
  const chunks = cleaned
    .split(/\r?\n|[ ]{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const dividerIndex = chunks.indexOf("---");
  if (dividerIndex === -1) return null;

  const body = chunks.slice(dividerIndex + 1);
  const lines: ParsedLine[] = [];
  let current: { timestamp: string; speaker: string } | null = null;

  for (const chunk of body) {
    const headerMatch = chunk.match(HEADER_RE);
    if (headerMatch) {
      current = { timestamp: headerMatch[1], speaker: stripSpeakerEmail(headerMatch[2]) };
      continue;
    }
    if (chunk === "---" || !current) continue;
    lines.push({
      lineNumber: lines.length + 1,
      timestamp: current.timestamp,
      speaker: current.speaker,
      text: chunk,
    });
  }

  return lines.length > 0 ? lines : null;
}

/** Format 2: initials + name + standalone timestamp, then paragraphs. */
function parseFormat2(cleaned: string): ParsedLine[] | null {
  const rawLines = cleaned.split(/\r?\n/);
  const isBlank = (s: string) => s.trim().length === 0;
  const isInitialsLike = (s: string) => /^[A-Z]{1,4}$/.test(s);

  const anchorIndexes: number[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (BLOCK_TIMESTAMP_RE.test(rawLines[i].trim())) anchorIndexes.push(i);
  }
  if (anchorIndexes.length === 0) return null;

  const anchors = anchorIndexes.map((index) => {
    const candidates: { index: number; text: string }[] = [];
    let cursor = index - 1;
    while (cursor >= 0 && candidates.length < 2) {
      const text = rawLines[cursor].trim();
      if (!isBlank(rawLines[cursor])) {
        candidates.push({ index: cursor, text });
      } else if (candidates.length > 0) {
        break;
      }
      cursor--;
    }
    const named = candidates.filter((c) => !isInitialsLike(c.text));
    const speaker = named.length > 0 ? named[0].text : "Unknown";
    const timestamp = rawLines[index].trim();
    const consumed = candidates.map((c) => c.index);
    return { index, timestamp, speaker, headerStart: consumed.length > 0 ? Math.min(...consumed) : index };
  });

  const lines: ParsedLine[] = [];
  for (let a = 0; a < anchors.length; a++) {
    const { index, timestamp, speaker } = anchors[a];
    const end = a + 1 < anchors.length ? anchors[a + 1].headerStart : rawLines.length;
    for (let i = index + 1; i < end; i++) {
      const text = rawLines[i].trim();
      if (text.length === 0) continue;
      lines.push({ lineNumber: lines.length + 1, timestamp, speaker, text });
    }
  }

  return lines.length > 0 ? lines : null;
}

function parseSingleLineFormat(
  cleaned: string,
  regex: RegExp,
  groups: { timestamp: number; speaker: number; text: number },
): ParsedLine[] | null {
  const lines: ParsedLine[] = [];
  for (const rawLine of cleaned.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) continue;
    const match = trimmed.match(regex);
    if (!match) continue;
    lines.push({
      lineNumber: lines.length + 1,
      timestamp: match[groups.timestamp],
      speaker: match[groups.speaker].trim() || "Unknown",
      text: match[groups.text].trim(),
    });
  }
  return lines.length > 0 ? lines : null;
}

export function parseTranscript(raw: string): ParsedLine[] {
  if (raw.trim().length === 0) return [];

  const cleaned = raw.replace(ACTION_ITEM_RE, "");

  return (
    parseFormat1(cleaned) ??
    parseFormat2(cleaned) ??
    parseSingleLineFormat(cleaned, BRACKET_LINE_RE, { timestamp: 1, speaker: 2, text: 3 }) ??
    parseSingleLineFormat(cleaned, PAREN_TIME_LINE_RE, { timestamp: 2, speaker: 1, text: 3 }) ??
    []
  );
}
