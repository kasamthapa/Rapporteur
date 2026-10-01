import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  analyzeMeeting,
  TranscriptParseError,
  ValidationFailedError,
} from "../lib/analyzeMeeting.js";
import {
  GeminiApiError,
  GeminiConfigError,
  GeminiRateLimitError,
} from "../lib/gemini.js";

export const meetingsRouter = Router();

const TITLE_MAX_LENGTH = 200;
const TRANSCRIPT_MAX_LENGTH = 200_000;
const AGENDA_MAX_ITEMS = 10;
const AGENDA_ITEM_MAX_LENGTH = 100;

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

meetingsRouter.post("/", async (req, res, next) => {
  try {
    const validated = validateMeetingInput(req.body);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    const { title, agenda, transcript } = validated;

    const result = await analyzeMeeting(title, agenda, transcript);

    res.status(201).json({ id: randomUUID(), result });
  } catch (err) {
    if (err instanceof TranscriptParseError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationFailedError) {
      res.status(502).json({
        error: "AI returned an invalid response after retry, please try again",
      });
      return;
    }
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
