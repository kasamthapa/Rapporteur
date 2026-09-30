import { randomUUID } from "node:crypto";
import { Router } from "express";
import { generateMeetingJson } from "../lib/gemini.js";
import { buildPrompt } from "../lib/promptBuilder.js";
import { validateLlmResult } from "../lib/resultSchema.js";
import { parseTranscript } from "../lib/transcriptParser.js";
import type { MeetingResult } from "../types/meeting.js";

export const meetingsRouter = Router();

meetingsRouter.post("/", async (req, res, next) => {
  try {
    const { title, agenda, transcript } = req.body as {
      title: string;
      agenda?: string[];
      transcript: string;
    };

    const lines = parseTranscript(transcript);
    const prompt = buildPrompt(title, agenda, lines);
    const raw = await generateMeetingJson(prompt);
    const validation = validateLlmResult(raw, agenda ?? []);

    if (!validation.success) {
      console.error("ValidationError", validation.error);
      res.status(502).json({ error: validation.error });
      return;
    }

    const result: MeetingResult = {
      ...validation.data,
      meta: {
        transcriptLineCount: lines.length,
        generatedAt: new Date().toISOString(),
      },
    };

    res.status(201).json({ id: randomUUID(), result });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.name, err.message);
    }
    next(err);
  }
});
