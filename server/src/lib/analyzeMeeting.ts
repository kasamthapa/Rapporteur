import {
  GeminiInvalidJsonError,
  generateMeetingJson,
} from "./gemini.js";
import { buildPrompt } from "./promptBuilder.js";
import { validateLlmResult, type LlmMeetingResult } from "./resultSchema.js";
import { parseTranscript } from "./transcriptParser.js";
import { verifyEvidence } from "./verifyEvidence.js";
import type { MeetingResult, ParsedLine } from "../types/meeting.js";

export class TranscriptParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptParseError";
  }
}

export class ValidationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationFailedError";
  }
}

const TRANSCRIPT_FORMAT_HELP =
  'could not parse transcript. Expected one of: Fathom-style turn headers ' +
  '("0:12 - Speaker (email@example.com)" lines after a "---" divider); ' +
  'bracketed lines ("[0:12] Speaker: text"); parenthesized-timestamp lines ' +
  '("Speaker (0:12): text"); or blocks of a name/initials line followed by a ' +
  "standalone timestamp line and paragraphs of text.";

type GenerationAttempt =
  | { success: true; data: LlmMeetingResult }
  | { success: false; error: string };

async function attemptGeneration(
  title: string,
  agenda: string[] | undefined,
  lines: ParsedLine[],
  previousError?: string,
): Promise<GenerationAttempt> {
  const prompt = buildPrompt(title, agenda, lines, previousError);

  let raw: unknown;
  try {
    raw = await generateMeetingJson(prompt);
  } catch (err) {
    if (err instanceof GeminiInvalidJsonError) {
      return { success: false, error: err.message };
    }
    throw err;
  }

  const validation = validateLlmResult(raw, agenda ?? []);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  return { success: true, data: validation.data };
}

export async function analyzeMeeting(
  title: string,
  agenda: string[] | undefined,
  transcript: string,
): Promise<MeetingResult> {
  const lines = parseTranscript(transcript);
  if (lines.length === 0) {
    throw new TranscriptParseError(`transcript: ${TRANSCRIPT_FORMAT_HELP}`);
  }

  let attempt = await attemptGeneration(title, agenda, lines);
  if (!attempt.success) {
    console.error("InvalidLlmOutput", attempt.error);
    attempt = await attemptGeneration(title, agenda, lines, attempt.error);
  }
  if (!attempt.success) {
    console.error("InvalidLlmOutput", attempt.error);
    throw new ValidationFailedError(attempt.error);
  }

  const hasAgenda = agenda !== undefined && agenda.length > 0;
  const normalized: LlmMeetingResult = hasAgenda
    ? {
        ...attempt.data,
        agenda: agenda!,
        agendaGiven: true,
        agendaInferred: false,
      }
    : {
        ...attempt.data,
        agendaGiven: false,
        agendaInferred: true,
        agenda: attempt.data.agenda.filter((item) => item !== "Off-agenda"),
      };

  const verified = verifyEvidence(normalized, lines);
  const verifiedCount =
    verified.decisions.filter((d) => d.verified).length +
    verified.actionItems.filter((a) => a.verified).length +
    verified.offAgenda.filter((o) => o.verified).length;
  const unverifiedCount =
    verified.decisions.length +
    verified.actionItems.length +
    verified.offAgenda.length -
    verifiedCount;

  return {
    ...verified,
    meta: {
      transcriptLineCount: lines.length,
      generatedAt: new Date().toISOString(),
      verifiedCount,
      unverifiedCount,
    },
  };
}
