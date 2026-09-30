# Rapporteur — agenda-aware, bot-free AI meeting notes (8x sprint, 24h window)

## Product

Reference: fathom.video. Our difference:

- Agenda-aware: the meeting's purpose (agenda) is set first. Notes are grouped by
  agenda item. Off-topic talk is LABELED "Off-agenda" and collapsed — never discarded.
- Trust: every decision and action item shows the exact transcript line it came from,
  and the server VERIFIES the quote exists. Unverified items are flagged, never shown as fact.
- No bot: capture layer is stubbed. User pastes/uploads a transcript (or short audio)
  after the meeting. (Brief explicitly allows stubbing capture.)

## Scope IN (build in this order; stop where time ends)

1. New meeting flow: title + agenda (optional list of topics) → paste/upload transcript
   (lines with speaker + timestamp). Output JSON: summary grouped by agenda item;
   decisions and action items (owner, deadline, status committed/suggested,
   evidenceQuote, agendaItem); offAgenda section; agendaCoverage (items never discussed).
   No agenda given → group by topics the model infers, and say so in the UI.
2. Evidence verification: server checks each evidenceQuote exists in the transcript
   (normalized whitespace/case) → verified / unverified badge.
3. Meeting page UI: agenda sections left (summary, decisions, action items per item,
   collapsed Off-agenda, coverage), transcript right. Click any item → transcript
   scrolls to and highlights source line. Off-agenda lines dimmed. Speaker filter.
   Must stay usable for a 1-hour, 8-speaker transcript.
4. Summary templates: General / Sales / 1:1 / Standup (prompt variants, switchable).
5. Meetings list + search across meetings (Postgres full-text search).
6. Public read-only share link per meeting (no login).
7. Seed data: real meetings (see docs/DECISIONS.md).
8. Audio upload (≤15 min) → Gemini transcription → same pipeline; audio player synced to transcript.
9. Deploy: Vercel (client) + Render (server). Live link must work signed-out.

## Scope OUT (do not build, do not suggest)

Recording bot, calendar, CRM, Slack, teams, auth/login, billing, live transcription.

## Stack

client: React + Vite + TypeScript + Tailwind
server: Node + Express + TypeScript
DB: Supabase Postgres — table meetings (id, title, agenda jsonb, transcript text,
result jsonb, template text, created_at, share_id)
LLM: Gemini gemini-2.5-flash, structured JSON output
Deploy: Vercel + Render

## Rules

- One task per request. Anything touching >1 file: show a short plan and WAIT for my OK.
- Ask before adding any dependency.
- No silent catch blocks. Every failure returns a real HTTP error with a clear message.
- Validate LLM output against a schema. Invalid → retry once → then return an error.
- Gemini free tier has per-minute and daily limits. On 429 return "rate limited, retry in Xs".
  Never fake success.
- Never invent owners, deadlines, decisions. Missing = "unassigned" / "none".
- UI: clean, readable, keyboard accessible, works at 375px and desktop.
- Keep it simple. No abstractions "for later".
- Commit .agent-logs/ with every commit.

## After EVERY task, report in exactly this format

1. What I built (plain language, 2–3 lines)
2. How the data flows now (request → ... → response)
3. Files changed
4. How to test it manually (exact steps + expected result)
5. Edge cases handled / NOT handled yet
   Then append 2–3 plain-language lines to docs/LEARNING.md explaining the concept used.

## Edge cases (must be handled by the end)

empty/too-short transcript; no agenda given; agenda item never discussed;
meeting with no decisions or action items (say so); item with no owner;
"maybe/should we" vs real commitment; decision reversed later in meeting;
very long transcript (1h, 8 speakers); mixed Nepali/English; invalid LLM JSON;
429 rate limit; evidence quote not found (→ unverified).
