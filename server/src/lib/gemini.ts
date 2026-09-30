import { GoogleGenAI, ApiError } from "@google/genai";

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiRateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GeminiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

export class GeminiInvalidJsonError extends Error {
  rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = "GeminiInvalidJsonError";
    this.rawText = rawText;
  }
}

// ApiError.message is the full JSON-stringified error body (see @google/genai's
// throwErrorIfNotOK), e.g. {"error":{"details":[{"@type":".../RetryInfo","retryDelay":"13s"}]}}
function parseRetryAfterSeconds(apiErrorMessage: string): number | undefined {
  try {
    const body = JSON.parse(apiErrorMessage) as {
      error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> };
    };
    const retryInfo = body.error?.details?.find((d) =>
      d["@type"]?.endsWith("RetryInfo"),
    );
    const match = retryInfo?.retryDelay?.match(/^([\d.]+)s$/);
    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMeetingJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey) {
    throw new GeminiConfigError("GEMINI_API_KEY is not set");
  }
  if (!model) {
    throw new GeminiConfigError("GEMINI_MODEL is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    text = response.text;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 429) {
        throw new GeminiRateLimitError(
          "Gemini API rate limit exceeded",
          parseRetryAfterSeconds(err.message),
        );
      }
      throw new GeminiApiError(err.message, err.status);
    }
    throw err;
  }

  if (!text) {
    throw new GeminiInvalidJsonError("Gemini returned an empty response", "");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiInvalidJsonError(
      "Gemini response was not valid JSON",
      text,
    );
  }
}
