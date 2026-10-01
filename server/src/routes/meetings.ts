import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  GeminiApiError,
  GeminiConfigError,
  GeminiInvalidJsonError,
  GeminiRateLimitError,
  generateMeetingJson,
} from "../lib/gemini.js";
import { buildPrompt } from "../lib/promptBuilder.js";
import { validateLlmResult, type LlmMeetingResult } from "../lib/resultSchema.js";
import { parseTranscript } from "../lib/transcriptParser.js";
import { verifyEvidence } from "../lib/verifyEvidence.js";
import type { MeetingResult, ParsedLine } from "../types/meeting.js";

export const meetingsRouter = Router();

const TITLE_MAX_LENGTH = 200;
const TRANSCRIPT_MAX_LENGTH = 200_000;
const AGENDA_MAX_ITEMS = 10;
const AGENDA_ITEM_MAX_LENGTH = 100;

const TRANSCRIPT_FORMAT_HELP =
  'could not parse transcript. Expected one of: Fathom-style turn headers ' +
  '("0:12 - Speaker (email@example.com)" lines after a "---" divider); ' +
  'bracketed lines ("[0:12] Speaker: text"); parenthesized-timestamp lines ' +
  '("Speaker (0:12): text"); or blocks of a name/initials line followed by a ' +
  "standalone timestamp line and paragraphs of text.";

interface ValidatedInput {
  title: string;
  transcript: string;
  agenda: string[] | undefined;
}

function validateMeetingInput(body: unknown): ValidatedInput | string {
  if (typeof body !== "object" || body === null) {
    return "body: must be a JSON object";
  }
  const { title, transcript, agenda } = body as {
    title?: unknown;
    transcript?: unknown;
    agenda?: unknown;
  };

  if (typeof title !== "string") {
    return "title: must be a string";
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    return "title: must not be empty";
  }
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    return `title: must be ${TITLE_MAX_LENGTH} characters or fewer`;
  }

  if (typeof transcript !== "string") {
    return "transcript: must be a string";
  }
  const trimmedTranscript = transcript.trim();
  if (trimmedTranscript.length === 0) {
    return "transcript: must not be empty";
  }
  if (trimmedTranscript.length > TRANSCRIPT_MAX_LENGTH) {
    return `transcript: must be ${TRANSCRIPT_MAX_LENGTH} characters or fewer`;
  }

  let normalizedAgenda: string[] | undefined;
  if (agenda !== undefined) {
    if (!Array.isArray(agenda)) {
      return "agenda: must be an array of strings";
    }
    if (agenda.length > 0) {
      if (agenda.length > AGENDA_MAX_ITEMS) {
        return `agenda: must contain at most ${AGENDA_MAX_ITEMS} items`;
      }
      const trimmedItems: string[] = [];
      for (let i = 0; i < agenda.length; i++) {
        const item = agenda[i];
        if (typeof item !== "string") {
          return `agenda[${i}]: must be a string`;
        }
        const trimmedItem = item.trim();
        if (trimmedItem.length === 0) {
          return `agenda[${i}]: must not be empty`;
        }
        if (trimmedItem.length > AGENDA_ITEM_MAX_LENGTH) {
          return `agenda[${i}]: must be ${AGENDA_ITEM_MAX_LENGTH} characters or fewer`;
        }
        if (trimmedItem.toLowerCase() === "off-agenda") {
          return `agenda[${i}]: must not be "Off-agenda" (reserved)`;
        }
        trimmedItems.push(trimmedItem);
      }
      const seen = new Set<string>();
      for (let i = 0; i < trimmedItems.length; i++) {
        const key = trimmedItems[i].toLowerCase();
        if (seen.has(key)) {
          return `agenda[${i}]: duplicate agenda item "${trimmedItems[i]}"`;
        }
        seen.add(key);
      }
      normalizedAgenda = trimmedItems;
    }
    // empty agenda array behaves like no agenda — normalizedAgenda stays undefined
  }

  return { title: trimmedTitle, transcript, agenda: normalizedAgenda };
}

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

meetingsRouter.post("/", async (req, res, next) => {
  try {
    const validated = validateMeetingInput(req.body);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    const { title, agenda, transcript } = validated;

    const lines = parseTranscript(transcript);
    if (lines.length === 0) {
      res.status(400).json({ error: `transcript: ${TRANSCRIPT_FORMAT_HELP}` });
      return;
    }

    let attempt = await attemptGeneration(title, agenda, lines);
    if (!attempt.success) {
      console.error("InvalidLlmOutput", attempt.error);
      attempt = await attemptGeneration(title, agenda, lines, attempt.error);
    }
    if (!attempt.success) {
      console.error("InvalidLlmOutput", attempt.error);
      res.status(502).json({
        error: "AI returned an invalid response after retry, please try again",
      });
      return;
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

    const result: MeetingResult = {
      ...verified,
      meta: {
        transcriptLineCount: lines.length,
        generatedAt: new Date().toISOString(),
        verifiedCount,
        unverifiedCount,
      },
    };

    res.status(201).json({ id: randomUUID(), result });
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      res.status(429).json({
        error:
          err.retryAfterSeconds !== undefined
            ? `rate limited, retry in ${err.retryAfterSeconds}s`
            : "rate limited",
      });
      return;
    }
    if (err instanceof GeminiConfigError || err instanceof GeminiApiError) {
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }
    if (err instanceof Error) {
      console.error(err.name, err.message);
    }
    next(err);
  }
});
