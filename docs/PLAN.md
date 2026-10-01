# Plan: Project setup + Scope IN item 1 (New meeting flow)

## Context

Rapporteur is a from-scratch hackathon project (8x sprint, 24h window). The repo
currently has only docs (`CLAUDE.md`, `AGENTS.md`, `docs/DECISIONS.md`) and two
empty directories, `client/` and `server/` — no code, no dependencies, nothing to
reuse yet. This plan covers project setup plus Scope IN item 1 only: the new-meeting
flow that takes a title + optional agenda + transcript and returns the structured
JSON result (summary per agenda item, decisions, action items, off-agenda, agenda
coverage). Evidence verification (item 2) and the real meeting-page UI (item 3) are
explicitly out of scope for this plan — item 1's schema is shaped so item 2 can add
onto it later without breaking changes.

The transcript format was confirmed with the user against a real Fathom "copy"
export sample: the actual primary shape is `M:SS - Speaker Name (email)` turn
headers followed by indented paragraphs, with a `---` line separating a title/
recording-link header from the transcript body, and Fathom's own `ACTION ITEM: ...

- WATCH: <url>` metadata sometimes embedded mid-transcript that must be stripped
  before anything is numbered or quoted. An earlier assumed block format (initials +
  name + standalone timestamp line) is kept as a secondary fallback, plus two simple
  single-line formats as further fallbacks, since users may paste from other sources.

## 1. Folder structure

```
server/
  package.json
  tsconfig.json
  .env.example              # GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, PORT
  src/
    index.ts                # express app bootstrap, cors, json body parsing, mounts routes, error handler
    routes/
      meetings.ts            # POST /meetings handler
    lib/
      supabase.ts             # supabase client singleton, throws clearly if env missing
      gemini.ts                # gemini client wrapper: generateMeetingResult(prompt)
      transcriptParser.ts       # parseTranscript(raw) -> ParsedLine[] (see section 4)
      promptBuilder.ts           # buildPrompt(title, agenda, parsedLines) -> string
      resultSchema.ts             # zod schema + validateResult()
    types/
      meeting.ts                  # MeetingResult and related types

client/
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.js / postcss.config.js
  index.html
  .env.example              # VITE_API_BASE_URL
  src/
    main.tsx
    App.tsx                  # renders NewMeetingForm + ResultPreview, local state only
    api/
      meetings.ts             # createMeeting(payload) -> typed fetch to POST /meetings
    types/
      meeting.ts               # hand-kept mirror of server types (no shared package — no monorepo tooling exists, adding one is out of scope)
    components/
      NewMeetingForm.tsx        # title, agenda topics (add/remove), transcript textarea + .txt upload, submit, loading/error states
      ResultPreview.tsx          # minimal structured display of MeetingResult — placeholder until item 3 builds the real meeting page
```

No router, no state management library, no shared types package — a single form +
single result view doesn't need them, and CLAUDE.md rules out abstractions "for
later."

## 2. JSON schema for `result`

```ts
type ActionStatus = "committed" | "suggested";

interface EvidenceRef {
  evidenceQuote: string; // verbatim-ish quote from transcript text
  agendaItem: string; // matches an agenda topic, or "Off-agenda"
  // NOTE: no `verified` field in item 1. Item 2 adds `verified: boolean | null`
  // after server-side quote matching — additive, non-breaking. Omitting it now
  // avoids the client ever showing "verified: false" for something that was
  // never actually checked, which would contradict the trust principle.
}

interface Decision extends EvidenceRef {
  text: string;
}

interface ActionItem extends EvidenceRef {
  text: string;
  owner: string; // "unassigned" if not stated — never invented
  deadline: string; // "none" if not stated — never invented
  status: ActionStatus; // "suggested" for maybe/should-we, "committed" for firm commitments
}

interface AgendaSection {
  agendaItem: string;
  summary: string; // prose summary; coverage (discussed or not) lives in agendaCoverage
}

interface AgendaCoverageEntry {
  item: string;
  discussed: boolean; // false = never discussed
}

interface OffAgendaEntry extends EvidenceRef {
  text: string;
} // agendaItem fixed to "Off-agenda"

interface MeetingResult {
  meetingTitle: string;
  agendaGiven: boolean; // true if user supplied topics
  agendaInferred: boolean; // true if agenda was model-generated (agendaGiven === false)
  agenda: string[]; // topics actually used — given or inferred
  summaryByAgendaItem: AgendaSection[];
  decisions: Decision[]; // [] if none — arrays never omitted, client renders "No decisions recorded"
  actionItems: ActionItem[]; // [] if none, same rule
  offAgenda: OffAgendaEntry[];
  agendaCoverage: AgendaCoverageEntry[];
  meta: {
    transcriptLineCount: number;
    generatedAt: string; // ISO timestamp, server-set
  };
}
```

`status` is a strict zod enum — anything else from Gemini is an invalid-schema case
that triggers the retry-once-then-error flow. `owner`/`deadline` are validated as
non-empty strings, not enums, since deadlines are freeform ("next Friday", "none").

## 3. API endpoint

**Single synchronous `POST /meetings`.** No create+poll/job-queue — Gemini 2.5
Flash on an hour-long transcript is expected to respond in low single-digit to
~20s worst case, well within a plain HTTP request. A polling design would add a
status column and client polling logic that CLAUDE.md's "keep it simple" rule
argues against; revisit only if real latency testing proves it's needed.

File upload is handled client-side via the browser's File API (`file.text()`)
reading a `.txt` into the same `transcript` string field — no multer/multipart
needed server-side, since transcripts are plain text (audio upload is item 8, out
of scope).

### Request

```ts
POST /meetings
{ title: string; agenda?: string[]; transcript: string }
```

### Success — `201`

```ts
{
  id: string;
  result: MeetingResult;
}
```

### Errors

| Case                                     | Status | Body                                                                                                                                                                                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing/empty `title`                    | 400    | `{ error: "title is required" }`                                                                                                                                                                                                    |
| Missing `transcript`                     | 400    | `{ error: "transcript is required" }`                                                                                                                                                                                               |
| Transcript has zero parseable turns      | 400    | `{ error: "could not parse transcript. Expected one of: Fathom copy export (\"M:SS - Speaker Name\" turns), speaker blocks (name then timestamp on its own line), \"[HH:MM:SS] Speaker: text\", or \"Speaker (HH:MM:SS): text\"" }` |
| Gemini invalid JSON/schema after 1 retry | 502    | `{ error: "AI returned an invalid response after retry, please try again" }`                                                                                                                                                        |
| Gemini 429                               | 429    | `{ error: "rate limited, retry in Xs" }`                                                                                                                                                                                            |
| Gemini other API error                   | 502    | `{ error: "AI service error: <message>" }`                                                                                                                                                                                          |
| Supabase insert failure                  | 500    | `{ error: "failed to save meeting: <message>" }`                                                                                                                                                                                    |
| Unexpected error                         | 500    | `{ error: "unexpected server error" }`                                                                                                                                                                                              |

Handler flow: validate request → parse transcript → build prompt → call Gemini →
validate result (zod) → retry once if invalid → insert into Supabase (`result` as
jsonb) → return 201. No silent catches — every failure maps to one of the rows above.

## 4. Transcript parsing

Four accepted input shapes, tried in priority order against the pasted/uploaded
text; the document is parsed in one mode, not mixed line-by-line. The transcript is
stored verbatim in the DB regardless of which shape is detected — item 2's future
evidence-quote verification will substring-search the raw stored text directly, not
rely on parser-assigned line numbers, so parsing accuracy here matters for prompt
quality, not for later verification correctness.

```ts
interface ParsedLine {
  lineNumber: number; // 1-based, sequential over parsed spoken-text lines
  // (not raw-file line position — see note below)
  timestamp: string; // turn-level, e.g. "0:00", "6:28", "1:02:05" — inherited by every line in that turn
  speaker: string; // "Unknown" if undeterminable — never guessed
  text: string; // one paragraph of spoken text; ACTION ITEM/WATCH segments already stripped
}
```

`lineNumber` is a sequential index over the final parsed lines, not a raw-file
position — paragraph breaks in the primary format aren't always real newlines (see
below), so raw-line position isn't a stable anchor. This is fine since item 2 will
verify `evidenceQuote` by substring search against the raw stored `transcript`
text, never by looking up this number.

**Format 1 — primary, real Fathom "copy" export.**

```
Pre hackathon meeting - September 30

VIEW RECORDING - 50 mins (No highlights): <link>

---

0:00 - Kasam Thapa (<email>)

Overall project so you can be here so let's summarize...

so and we have...

6:28 - Pawan Pokharel

For this, we have to make more plans...

ACTION ITEM: Research trust/repayment answers for judges - WATCH: <link>

So, we are still processing?
```

Algorithm:

1. Strip every `ACTION ITEM: ... - WATCH: <url>` segment from the raw text first (non-greedy match) — this is Fathom's own inserted metadata, never spoken content, and must never reach numbering or evidence-quote verification.
2. Normalize into chunks: split on real newlines _and_ on runs of 2+ spaces, uniformly — both encode a line break in real Fathom copy output (paragraph breaks are sometimes flattened to double-spaces rather than `\n`). Trim each chunk (absorbs the 2-space text indent for free).
3. Drop every chunk up to and including the first chunk that is exactly `---` (title + recording-link header). If no `---` chunk exists anywhere, this format doesn't match — fall through to Format 2.
4. A turn header chunk matches `^(\d{1,2}:\d{2}(:\d{2})?)\s*-\s*(.+)$`. From the captured rest, strip a trailing `(...)` (the email) to get the speaker name; empty/unparseable name → `"Unknown"`.
5. Every non-header, non-`---` chunk after a header, up to the next header or EOF, becomes one `ParsedLine` inheriting that turn's speaker + timestamp, with the next sequential `lineNumber`.

**Format 2 — secondary block fallback** (used only if Format 1 finds no `M:SS - Speaker` headers). Initials line, then name line (sometimes repeated), then a _standalone_ timestamp line, then paragraphs:

```
SG
Sujan Gurung
0:00

Hey everyone, welcome...
continued paragraph...
```

Find every standalone-timestamp anchor line (`^\s*\d{1,2}:\d{2}(:\d{2})?\s*$`); for each, look backward up to 2 non-blank lines to find the speaker (skip a short initials line, dedupe a repeated name line; no name found → `"Unknown"`). Block text = non-blank lines between this anchor and the next block's header lines, each its own `ParsedLine`.

**Format 3 / 4 — tertiary single-line fallbacks**, used only if neither 1 nor 2 match anywhere: `[HH:MM:SS] Speaker: text` and `Speaker (HH:MM:SS): text`, matched per-line.

**No format matches anywhere** → zero `ParsedLine`s → the 400 error, naming all
accepted shapes so the user knows how to fix their paste.

Handles the required edge cases: 8-speaker/1-hour transcripts are just more turns,
no hardcoded speaker limit; length is well within Gemini's context window, no
chunking needed; mixed Nepali/English text passes through untouched since only
timestamp/name/header/metadata chunks are pattern-matched, never the speech content
itself — the prompt additionally instructs Gemini not to drop non-English content.

## 5. Step order

1. Server scaffold: `package.json`, `tsconfig.json`, `src/index.ts` (Express, CORS, JSON body parsing, `GET /health`, error handler). Deps: `express`, `typescript`, `@types/express`, `@types/node`, `cors`, `@types/cors`, `dotenv`, `tsx`.
2. Client scaffold: Vite React-TS + Tailwind, placeholder `App.tsx`. Deps: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`.
3. Supabase client (`server/src/lib/supabase.ts`) + confirm/create the `meetings` table (manual step in Supabase dashboard — needs the user's project/credentials). Deps: `@supabase/supabase-js`.
4. Shared server types (`server/src/types/meeting.ts`) — the schema from section 2.
5. Zod schema + validator (`server/src/lib/resultSchema.ts`). Deps: `zod`.
6. Transcript parser (`server/src/lib/transcriptParser.ts`) — pure function implementing section 4, unit-testable without a server running.
7. Prompt builder (`server/src/lib/promptBuilder.ts`) — includes the JSON shape instructions, never-invent rule, Nepali/English instruction, committed-vs-suggested guidance.
8. Gemini client wrapper (`server/src/lib/gemini.ts`) — structured JSON output, typed errors distinguishing 429 from other failures. Deps: `@google/genai`.
9. `POST /meetings` happy path only — wired into `index.ts`.
10. `POST /meetings` error handling — retry-once-on-invalid-schema, 429 mapping, other Gemini/Supabase error mapping.
11. `POST /meetings` input validation — empty title, empty/unparseable transcript (separated from AI-response validation above).
12. Client API wrapper (`client/src/api/meetings.ts` + `client/src/types/meeting.ts`).
13. `NewMeetingForm.tsx` — title, agenda list, transcript textarea + `.txt` upload, submit/loading/error states, keyboard accessible, responsive at 375px.
14. `ResultPreview.tsx` + wire into `App.tsx` with local state.
15. Manual end-to-end pass: real transcript (including a short mixed Nepali/English sample and a no-agenda sample), confirm edge cases are visibly handled; append notes to `docs/LEARNING.md` and `docs/DECISIONS.md` per CLAUDE.md's reporting rule.

### Dependencies to ask about, in order introduced

Server: `express`, `typescript`, `@types/express`, `@types/node`, `cors`, `@types/cors`, `dotenv`, `tsx`, `@supabase/supabase-js`, `zod`, `@google/genai`
Client: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`

Each step above touches one concern/one or two files, consistent with CLAUDE.md's
"one task per request" rule — each will be proposed and confirmed individually
before writing code, including the dependency it introduces.

## Verification

- After step 1/2: `GET /health` returns 200 from a running server; Vite dev server renders the placeholder page.
- After step 6: run the parser directly against the real Fathom "copy" sample (title/`---`/email-in-parens/`ACTION ITEM: ... - WATCH:` segments) and a short bracket-format sample; confirm correct speaker/timestamp/text attribution, that the email and ACTION ITEM segments are stripped, and that unparseable input returns an empty array (not a crash).
- After step 11: `curl -X POST localhost:<port>/meetings` with a full real transcript, confirm 201 + a `MeetingResult` matching the schema in section 2; then test each error case (empty title, empty transcript, garbage transcript) and confirm the matching status/body from the table in section 3.
- After step 14: full manual pass through the UI — paste a transcript, submit, see the result rendered; test no-agenda mode and confirm the "agenda inferred" banner appears; test at 375px width.

## Amendments (read this section first, at the start of every step — supersedes the step order from old step 3 onward)

1. **Evidence verification scope.** Future evidence-quote verification (item 2) must run only against the cleaned parsed text (post `ACTION ITEM:`-stripping, post email-stripping) — never against the raw stored `transcript` column. This reverses the earlier plan's assumption that item 2 would substring-search the raw stored text directly.

2. **`EvidenceRef` gains `sourceLine`.** The prompt sent to Gemini shows each `ParsedLine` with its `lineNumber`. `evidenceQuote` must be an exact substring of that specific line, copied character-for-character, never paraphrased.
   ```ts
   interface EvidenceRef {
     evidenceQuote: string;
     sourceLine: number;   // ParsedLine.lineNumber this quote is copied verbatim from
     agendaItem: string;    // one of the agenda topics, or "Off-agenda"
   }
   ```

3. **zod: `agendaItem` is a closed set.** Must validate as one of the actual agenda topics (from `agenda[]`) or the literal string `"Off-agenda"` — anything else is an invalid-schema case, triggering the existing retry-once-then-error flow. (This means the zod schema for `agendaItem` must be built dynamically per-request from that request's `agenda[]`, not a static enum.)

4. **`OffAgendaEntry` revised** — off-agenda actions/decisions live only here, never duplicated into `actionItems[]` or `decisions[]`:
   ```ts
   interface OffAgendaEntry extends EvidenceRef {
     text: string;
     kind: "action" | "decision" | "other";
     owner: string;   // "unassigned" if none
   }
   ```

5. **Reversed decisions — no schema change.** The prompt instructs the model to report only the final decision and note the reversal in `text`, e.g. "Decided X, reversed later to Y."

6. **Skip Supabase for now.** Old step 3 (Supabase client + table) is deferred until after the core pipeline is proven end-to-end via curl on a real transcript. `POST /meetings` initially returns the generated `MeetingResult` directly without persisting it.

7. **New step: seed-results script.** Runs each seed transcript through the pipeline once and saves the output to a file, so the deployed site never depends on a live Gemini call for seed data.

8. **Gemini model name from env.** Read from `GEMINI_MODEL`, never hardcoded in `gemini.ts`.

### Revised `MeetingResult` (supersedes section 2 — only `EvidenceRef` and `OffAgendaEntry` change; `Decision`, `ActionItem`, `AgendaSection`, `AgendaCoverageEntry`, and the top-level envelope are otherwise unchanged from section 2, just inheriting the new `EvidenceRef`)
```ts
interface EvidenceRef {
  evidenceQuote: string;
  sourceLine: number;
  agendaItem: string;
}

interface OffAgendaEntry extends EvidenceRef {
  text: string;
  kind: "action" | "decision" | "other";
  owner: string;
}
```

### Revised step order (supersedes section 5, steps 3 onward)
1. Server scaffold — **done**.
2. Client scaffold — **done**.
3. ~~Supabase client + table~~ — moved, see new step 13.
4. Shared server types (`server/src/types/meeting.ts`) — schema from section 2 + this Amendments section.
5. Zod schema + validator (`server/src/lib/resultSchema.ts`) — includes the dynamic per-request `agendaItem` enum (amendment 3).
6. Transcript parser (`server/src/lib/transcriptParser.ts`) — unchanged, per section 4.
7. Prompt builder (`server/src/lib/promptBuilder.ts`) — numbered-line prompt, exact-substring-per-line quoting instruction, reversed-decision instruction, off-agenda `kind`/`owner` instruction.
8. Gemini client wrapper (`server/src/lib/gemini.ts`) — model name from `GEMINI_MODEL` env var.
9. `POST /meetings` happy path — **no Supabase**, returns `MeetingResult` directly.
10. `POST /meetings` error handling (retry-once, 429, other Gemini errors).
11. `POST /meetings` input validation (empty title, empty/unparseable transcript).
12. Seed-results script — run each seed transcript through the pipeline once, save output to a file.
13. Client API wrapper (`client/src/api/meetings.ts` + `client/src/types/meeting.ts`).
14. `NewMeetingForm.tsx`.
15. `ResultPreview.tsx` + wire into `App.tsx` — client must work end-to-end on the in-memory (non-persisted) result before persistence is added.
16. Supabase client + table + persistence wired into `POST /meetings` (moved from old step 3, and moved again after the client works — per 2026-09-30 amendment).
17. Manual end-to-end pass; update `docs/LEARNING.md` / `docs/DECISIONS.md`.

## Step 4 (done) — `server/src/types/meeting.ts`

Mechanical merge of section 2 with the Amendments' revised `EvidenceRef`/
`OffAgendaEntry`, plus `ParsedLine` (produced by the transcript parser, step 6;
consumed by the prompt builder, step 7 — shared type, belongs here rather than in
`transcriptParser.ts`). No other design decisions — final file content:

```ts
export type ActionStatus = "committed" | "suggested";
export type OffAgendaKind = "action" | "decision" | "other";

export interface ParsedLine {
  lineNumber: number;
  timestamp: string;
  speaker: string;
  text: string;
}

export interface EvidenceRef {
  evidenceQuote: string;
  sourceLine: number; // ParsedLine.lineNumber this quote is copied verbatim from
  agendaItem: string; // one of the agenda topics, or "Off-agenda"
}

export interface Decision extends EvidenceRef {
  text: string;
}

export interface ActionItem extends EvidenceRef {
  text: string;
  owner: string; // "unassigned" if not stated — never invented
  deadline: string; // "none" if not stated — never invented
  status: ActionStatus;
}

export interface AgendaSection {
  agendaItem: string;
  summary: string;
}

export interface AgendaCoverageEntry {
  item: string;
  discussed: boolean;
}

export interface OffAgendaEntry extends EvidenceRef {
  text: string;
  kind: OffAgendaKind;
  owner: string; // "unassigned" if none
}

export interface MeetingResult {
  meetingTitle: string;
  agendaGiven: boolean;
  agendaInferred: boolean;
  agenda: string[];
  summaryByAgendaItem: AgendaSection[];
  decisions: Decision[];
  actionItems: ActionItem[];
  offAgenda: OffAgendaEntry[];
  agendaCoverage: AgendaCoverageEntry[];
  meta: {
    transcriptLineCount: number;
    generatedAt: string;
  };
}
```

Verification: `tsc --noEmit` (or the existing `npm run build` in `server/`) compiles
with no errors — this step adds no logic, so a clean typecheck is the only check
needed.

## Current step: 5 — `server/src/lib/resultSchema.ts`

New dependency: `zod`.

**Design note — `meta` is excluded from what's validated against the LLM's output.**
`meta.generatedAt`/`meta.transcriptLineCount` are server-computed (the route
handler sets them after parsing + validation succeed), never something Gemini
should author — asking the model to invent a timestamp or line count would
violate the "never invent" rule. So this schema validates
`Omit<MeetingResult, "meta">` (named `LlmMeetingResult` below, derived from the
`MeetingResult` type via TypeScript's `Omit`, not a new hand-written type); the
route handler (steps 9-10) merges in `meta` afterward to build the full
`MeetingResult` returned to the client.

**Per the 2026-09-30 session's three rules (corrected — supersedes the earlier
draft of this section):**
1. The closed-set check for `agendaItem`/`item` values uses the **request's**
   `agenda[]` when `agendaGiven` is true, and falls back to the **result's own**
   `agenda[]` only when no agenda was given (`agendaGiven` false, model-inferred
   topics). Since the source-of-truth list depends on the request, not just the
   parsed JSON, this check can't live inside the zod schema's own `superRefine`
   (no access to the request) — it's a separate manual pass run after the zod
   parse succeeds, and `validateLlmResult` takes the request's `agenda: string[]`
   as a second parameter. `summaryByAgendaItem[].agendaItem` and
   `agendaCoverage[].item` are checked against the same list.
   `offAgenda[].agendaItem` is checked separately — it must be exactly the
   literal `"Off-agenda"`, never a real topic (off-agenda content only lives in
   `offAgenda[]`, per Amendment 4).
2. `evidenceQuote: z.string().min(1)` and `sourceLine: z.number().int().positive()`
   are enforced once in the shared `evidenceRefSchema` base, so `decisions`,
   `actionItems`, and `offAgenda` all inherit the check.
3. `status` is `z.enum(["committed", "suggested"])`; `kind` is
   `z.enum(["action", "decision", "other"])` — both closed, no other value
   passes.

Final file content:

```ts
import { z } from "zod";
import type { MeetingResult } from "../types/meeting.js";

type LlmMeetingResult = Omit<MeetingResult, "meta">;

const evidenceRefSchema = z.object({
  evidenceQuote: z.string().min(1),
  sourceLine: z.number().int().positive(),
  agendaItem: z.string().min(1),
});

const decisionSchema = evidenceRefSchema.extend({
  text: z.string().min(1),
});

const actionItemSchema = evidenceRefSchema.extend({
  text: z.string().min(1),
  owner: z.string().min(1),
  deadline: z.string().min(1),
  status: z.enum(["committed", "suggested"]),
});

const agendaSectionSchema = z.object({
  agendaItem: z.string().min(1),
  summary: z.string(),
});

const agendaCoverageEntrySchema = z.object({
  item: z.string().min(1),
  discussed: z.boolean(),
});

const offAgendaEntrySchema = evidenceRefSchema.extend({
  text: z.string().min(1),
  kind: z.enum(["action", "decision", "other"]),
  owner: z.string().min(1),
});

const llmMeetingResultSchema = z.object({
  meetingTitle: z.string().min(1),
  agendaGiven: z.boolean(),
  agendaInferred: z.boolean(),
  agenda: z.array(z.string().min(1)),
  summaryByAgendaItem: z.array(agendaSectionSchema),
  decisions: z.array(decisionSchema),
  actionItems: z.array(actionItemSchema),
  offAgenda: z.array(offAgendaEntrySchema),
  agendaCoverage: z.array(agendaCoverageEntrySchema),
});

function checkAgendaTopics(
  data: LlmMeetingResult,
  requestAgenda: string[],
): string[] {
  const topics = new Set(data.agendaGiven ? requestAgenda : data.agenda);
  const errors: string[] = [];

  const checkTopic = (value: string, path: string) => {
    if (!topics.has(value)) {
      errors.push(
        `${path}: "${value}" is not one of the agenda topics: [${[...topics].join(", ")}]`,
      );
    }
  };

  data.decisions.forEach((d, i) => checkTopic(d.agendaItem, `decisions.${i}.agendaItem`));
  data.actionItems.forEach((a, i) => checkTopic(a.agendaItem, `actionItems.${i}.agendaItem`));
  data.summaryByAgendaItem.forEach((s, i) =>
    checkTopic(s.agendaItem, `summaryByAgendaItem.${i}.agendaItem`),
  );
  data.agendaCoverage.forEach((c, i) => checkTopic(c.item, `agendaCoverage.${i}.item`));

  data.offAgenda.forEach((o, i) => {
    if (o.agendaItem !== "Off-agenda") {
      errors.push(`offAgenda.${i}.agendaItem: must be "Off-agenda", got "${o.agendaItem}"`);
    }
  });

  return errors;
}

export function validateLlmResult(
  json: unknown,
  requestAgenda: string[],
): { success: true; data: LlmMeetingResult } | { success: false; error: string } {
  const parsed = llmMeetingResultSchema.safeParse(json);
  if (!parsed.success) {
    const error = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return { success: false, error };
  }

  const data = parsed.data as LlmMeetingResult;
  const topicErrors = checkAgendaTopics(data, requestAgenda);
  if (topicErrors.length > 0) {
    return { success: false, error: topicErrors.join("; ") };
  }

  return { success: true, data };
}
```

Verification: a small ad-hoc script (or `tsx -e`) calling `validateLlmResult` with
(a) a fully valid object, agenda given → `{ success: true }`; (b) same but
`decisions[0].agendaItem` not in the request's `agenda[]` → `{ success: false }`
mentioning `decisions.0.agendaItem`; (c) `agendaGiven: false` with a topic only
present in the result's own inferred `agenda[]` (not in the — empty — request
agenda) → `{ success: true }`, confirming the fallback works; (d) an
`offAgenda[0].agendaItem` set to a real topic instead of `"Off-agenda"` → fails;
(e) an empty `evidenceQuote` or `sourceLine: 0` → fails; (f) an invalid `status`
or `kind` value → fails. Plus `tsc --noEmit` for a clean typecheck.
