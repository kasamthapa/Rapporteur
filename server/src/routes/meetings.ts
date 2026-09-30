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
import { validateLlmResult } from "../lib/resultSchema.js";
import { parseTranscript } from "../lib/transcriptParser.js";
import type { MeetingResult, ParsedLine } from "../types/meeting.js";

export const meetingsRouter = Router();

type LlmMeetingResult = Omit<MeetingResult, "meta">;
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
    const { title, agenda, transcript } = req.body as {
      title: string;
      agenda?: string[];
      transcript: string;
    };

    const lines = parseTranscript(transcript);

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

    const result: MeetingResult = {
      ...normalized,
      meta: {
        transcriptLineCount: lines.length,
        generatedAt: new Date().toISOString(),
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
