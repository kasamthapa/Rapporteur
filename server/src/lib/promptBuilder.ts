import type { ParsedLine } from "../types/meeting.js";

function formatLines(lines: ParsedLine[]): string {
  return lines
    .map((l) => `[${l.lineNumber}] ${l.speaker} (${l.timestamp}): ${l.text}`)
    .join("\n");
}

export function buildPrompt(
  title: string,
  agenda: string[] | undefined,
  lines: ParsedLine[],
  previousError?: string,
): string {
  const agendaGiven = agenda !== undefined && agenda.length > 0;

  const agendaSection = agendaGiven
    ? `The agenda was given by the user. Set "agendaGiven": true and "agendaInferred": false. The "agenda" field in your output must be exactly this list, in this order:\n${agenda!.map((t) => `- ${t}`).join("\n")}`
    : `No agenda was given. Infer 3 to 7 short topics covering the main business of the meeting. Casual talk (food, greetings, jokes, scheduling chit-chat) is NOT a topic and must go in offAgenda. Put the inferred topics in the "agenda" field. Set "agendaGiven": false and "agendaInferred": true.`;

  return `You are generating structured meeting notes for a meeting titled "${title}".

TRANSCRIPT (numbered lines, format "[lineNumber] Speaker (timestamp): text"):
${formatLines(lines)}

AGENDA
${agendaSection}

OUTPUT FORMAT
Respond with JSON only. No prose, no markdown code fences, no explanation before or after. The JSON must match this exact shape (do NOT include a "meta" field — the server adds that separately):

{
  "meetingTitle": string,
  "agendaGiven": boolean,
  "agendaInferred": boolean,
  "agenda": string[],
  "summaryByAgendaItem": [ { "agendaItem": string, "summary": string } ],
  "decisions": [ { "text": string, "evidenceQuote": string, "sourceLine": number, "agendaItem": string } ],
  "actionItems": [ { "text": string, "owner": string, "deadline": string, "status": "committed" | "suggested", "evidenceQuote": string, "sourceLine": number, "agendaItem": string } ],
  "offAgenda": [ { "text": string, "kind": "action" | "decision" | "other", "owner": string, "evidenceQuote": string, "sourceLine": number, "agendaItem": "Off-agenda" } ],
  "agendaCoverage": [ { "item": string, "discussed": boolean } ]
}

EVIDENCE RULES
- Every entry in "decisions", "actionItems", and "offAgenda" must have "sourceLine" set to the lineNumber of the transcript line it came from, and "evidenceQuote" set to an exact, character-for-character substring of THAT line's text — at most 25 words, never paraphrased, never combined from multiple lines.
- If you cannot find an exact substring quote to support an item, leave that item out entirely. Do not guess or approximate.

AGENDA ITEM RULES
- "agendaItem" on every decision, actionItem, and summaryByAgendaItem entry must be exactly one of the agenda topics listed above (character-for-character), never invented, never "Off-agenda".
- Anything not related to an agenda topic is off-topic: put it ONLY in "offAgenda" (with "agendaItem": "Off-agenda", plus "kind" and "owner"). Never duplicate an off-agenda item into "decisions" or "actionItems".
- "summaryByAgendaItem" and "agendaCoverage" must each contain exactly one entry per agenda topic, in the same order as "agenda" — no duplicates, none omitted. For "agendaCoverage", set "discussed": false for any topic that was never actually talked about in the transcript (still include it, with an empty or minimal summary in "summaryByAgendaItem").

OWNER / DEADLINE / STATUS RULES
- Never invent an owner or deadline. If the transcript does not state one, use "unassigned" for owner and "none" for deadline.
- Never invent a decision or action item that wasn't actually said.
- Language like "maybe", "should we", "we could" is not a commitment: set "status": "suggested". A clear commitment ("I will...", "we're doing...", "let's go with...") is "status": "committed".
- If a decision is reversed later in the transcript, report only the final decision, and write "reversed from X to Y" inside its "text".

ARRAY RULES
- Never omit any field. Use empty arrays ([]) for decisions, actionItems, or offAgenda if there genuinely are none — do not invent filler entries.

LANGUAGE
- The transcript may mix Nepali and English. Keep any non-English quotes in their original script exactly as written (for evidenceQuote, this is required since it must be an exact substring). Write all summary and text fields in English. Never drop or ignore non-English content when summarizing.
${previousError ? `\nYour previous answer was rejected because: ${previousError}; fix it.` : ""}`;
}
