import type { LlmMeetingResult } from "./resultSchema.js";
import type { MeetingResult, ParsedLine } from "../types/meeting.js";

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isEvidenceVerified(
  lines: ParsedLine[],
  sourceLine: number,
  evidenceQuote: string,
): boolean {
  const line = lines.find((l) => l.lineNumber === sourceLine);
  if (!line) {
    return false;
  }
  return collapseWhitespace(line.text).includes(collapseWhitespace(evidenceQuote));
}

export function verifyEvidence(
  result: LlmMeetingResult,
  lines: ParsedLine[],
): Omit<MeetingResult, "meta" | "transcriptLines"> {
  return {
    ...result,
    decisions: result.decisions.map((d) => ({
      ...d,
      verified: isEvidenceVerified(lines, d.sourceLine, d.evidenceQuote),
    })),
    actionItems: result.actionItems.map((a) => ({
      ...a,
      verified: isEvidenceVerified(lines, a.sourceLine, a.evidenceQuote),
    })),
    offAgenda: result.offAgenda.map((o) => ({
      ...o,
      verified: isEvidenceVerified(lines, o.sourceLine, o.evidenceQuote),
    })),
  };
}
