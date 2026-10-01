# Product decisions

## What I learned using Fathom (30 Sep 2026)

- Recorded a real 49-min planning meeting with friends (3 speakers) + a 2-min solo call.
- Fathom summarized well and caught every point, but it gave off-topic talk the same
  weight as the actual plan. 4 of its 7 action items were snacks for the hackathon
  (noodles, momo + induction cooker, Coke Zero, Korean snacks); only 3 were the real
  work (judge research, Day 1 mentor coordination, MVP plan).
  → My headline feature: agenda-aware notes. Off-topic is labeled, not deleted.
  (screenshot: fathom-action-items-before.png)
- Language: we spoke mostly English with some Nepali. It only properly captured the
  English parts. It ignored the parts spoken in Nepali language.
- Templates: tried "Project kickoff" — gave a much more structured summary
  (proper headings, standard project-plan shape). Worth keeping 4 templates.
- Playback: clicking a transcript line landed at the right moment in the recording.
- Action items: each has an owner and a timestamp, but not the quoted line, and
  nothing checks it. Mine shows the exact quote and verifies it on the server.
- Search: "Ask Fathom" across All Calls failed to find the food discussion
  ("couldn't find any calls..."), but asking inside "This Call" found it. The content
  was captured; cross-meeting retrieval missed it. Its failure state also just says
  "start a new session".
  → Mine: plain full-text search over full transcripts, matching lines with context,
  and a clear empty state.
- Annoyance: the live in-call overlay was a big black box floating on my screen
  during the meeting, and the bot stayed visibly in the call. I'd make it small
  and translucent, closer to a Siri-style compact indicator. We cut the live`
  capture layer, so this is out of scope — but it's the reason the no-bot,
  after-the-meeting approach is a real product decision, not only a shortcut.

## Keep / Change / Cut

| Fathom feature                | Decision                                                  | Why                                                                    |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Recording bot + calendar      | CUT (stubbed: upload/paste)                               | Days of work; brief allows stubbing; bot is also Fathom's #1 complaint |
| AI summary                    | CHANGE: grouped by agenda                                 | Off-topic noise mixed into real notes (my test)                        |
| Action items                  | CHANGE: evidence + verified badge, committed vs suggested | Trust: never show an unsupported item as fact                          |
| Templates                     | KEEP (4)                                                  | Cheap, useful                                                          |
| Playback synced to transcript | KEEP if time (audio ≤15 min)                              | Nice, not core                                                         |
| Search across meetings        | CHANGE: full-text over full transcripts                   | Fathom's global search missed content it had captured                  |
| Share clip                    | CHANGE: share whole meeting read-only link                | Simpler, covers the main need                                          |
| Highlights, CRM, teams        | CUT                                                       | Not core for 24h                                                       |

## Seed data

- Pre-hackathon planning meeting, 49 min (3 speakers) — consent for public: yes
- 2-min solo test call

## Honest limits

- No live capture; single shared Gemini free-tier quota (per-minute and daily limits).
- Only 3 speakers in my longest seed meeting; the 1-hour, 8-speaker case is untested on real data.
- [add more as found]

## Nepali and English in transcripts
Transcripts can mix Nepali and English. The prompt tells the model to quote in the original language and not translate, so the exact-words check still works. Not tested beyond the seed meeting.

## Cut: Supabase
Planned for storing meetings. Cut because seed results served from files meet the demo need, and every extra service is another failure point inside a 24h window. Revisit if time allows.

## Closed set for agenda items
The model may only assign claims to agenda items from the list the user gave, plus "Off-agenda". Free-form agenda labels made grouping inconsistent.

## Quote check is word-for-word on the cited line only
Chosen over searching the whole transcript: a search would be more work and would match similar-sounding lines elsewhere, which hides a wrong citation. The cost: correct ideas with paraphrased quotes get flagged.
