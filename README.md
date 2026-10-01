# Rapporteur

Meeting notes that show their receipts. Paste a transcript, get decisions, action items and off-agenda talk, and click any quote to jump to the exact line it came from. No bot joins your call.

- Live: https://rapporteur.vercel.app
- Repo: https://github.com/kasamthapa/Rapporteur

## Why this exists

Fathom gave me a timestamp link for each claim, not the words. Rapporteur shows the words next to the claim and checks them.

On my sample meeting, Fathom's action items were 7 in total: 4 about food, 3 real (screenshot: docs/fathom-action-items-before.png). Rapporteur is agenda-aware: you give it the agenda, everything is grouped under it, and anything else goes into a separate "off-agenda" section.

## How it works

1. The transcript is cleaned and split into numbered lines (server/src/lib/transcriptParser.ts). It handles four formats: Fathom's "M:SS - Speaker (email)" export, initials plus a standalone timestamp, "[0:12] Name: text", and "Name (0:12): text".
2. A prompt asks Gemini for JSON only: for each decision or action item, an exact quote and the line number it came from.
3. The JSON is validated with zod. If it is invalid, there is one retry with the error attached.
4. The server checks each quote: does the text appear word for word on the cited line? That sets the "Exact words found" badge.
5. The client shows each claim with its quote, and a button that scrolls the transcript to that line.

## What "exact words found" means

It means the quote exists word for word on the line the model cited. It does not mean the claim is true. A quote can be found and still be misread. Going the other way, the idea can be right while the model paraphrased, and then the quote shows as a mismatch.

In the seed meeting, 9 of 10 quotes were found word for word. The one flagged quote paraphrased line 270: the idea is supported, the words differ.

## What is built

- Transcript parsing (4 formats)
- Agenda-aware extraction with a closed set of agenda items
- Word-for-word quote check on the cited line
- Click-to-line navigation with transcript highlight
- A landing page and one seed meeting (results generated once and served from a file, so the demo does not need a live model call)

## What is not built

- Accounts or saved meetings. I did not verify whether submitted meetings are kept on the server or can be reopened.
- Live recording or call integration.
- A database. Supabase was in the plan and I cut it (see docs/DECISIONS.md).
- URL routes. A refresh returns to the landing page, and a meeting cannot be linked.

## Known limits

- Gemini free tier limits are per model and shared by everyone using the key. On 30 Sep, my AI Studio table showed Flash models at 5 requests/min and 20/day, and Flash-Lite at 15/min and 500/day. Heavy use will hit "rate limited, retry in Xs".
- Larger Gemini models sometimes return 503 "high demand". That is why the seed result was generated once and committed.
- The server is on Render's free plan, which can sleep when idle. First loads took about 2-3 seconds in my tests (not stopwatch-measured; a true cold start may be longer).
- Flash-Lite can under-extract. The model sometimes cites a line off by one; the quote check flags it.
- Cost per analysis: not measured.
- The seed meeting is a real meeting from my team, shared with the participants' agreement.

## Run locally

Server: `cd server && npm install`, copy `.env.example` to `.env` and add `GEMINI_API_KEY` by hand, then `npm run dev`.
Client: `cd client && npm install`, set `VITE_API_BASE_URL` in `client/.env`, then `npm run dev`.

## How this was built

I built it with Claude Code agents, one task per prompt, with manual approval for commands. Session logs are in .agent-logs/. Honest gaps:

- Planning happened in a separate Claude chat that is not captured in the logs.
- I planned a Codex review pass (AGENTS.md exists) but never ran it.
- Supabase was planned and cut.
- The UI direction (a minute-taker's paper pad with window-style cards) was my choice; the art and copy are original.
