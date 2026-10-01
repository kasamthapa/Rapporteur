// All content below is fictional, invented for this landing page demo.
// Speakers Asha, Raj and Priya are not real people; "Lumen" is a made-up product.

export const decisionLines = [
  "decisions.md",
  "",
  "- Launch date moves to March 14.",
  "  committed — Raj, 00:12:03",
  "",
  "- Beta ships without a paywall.",
  "  committed — Asha, 00:18:47",
];

export const actionLines = [
  "actions.txt",
  "",
  "[ ] Asha   — write launch brief — due Fri",
  "[ ] unassigned — line up a reviewer — due none",
  "[ ] Priya  — ping design re: icons — due Mon",
];

export const offAgendaLines = [
  "off-agenda.txt",
  "",
  "00:31:02 — the office coffee machine (4m)",
  "00:41:19 — Raj's dog says hello",
  "00:46:50 — a tangent about parking",
];

export const transcriptTypewriterLines = [
  "00:12:03 Raj: so — march 14, locking that in?",
  "00:12:11 Asha: locking it in. committed, not a maybe.",
  "00:18:47 Asha: beta ships without the paywall.",
  "00:24:10 Priya: nepali onboarding slips to v2, agreed.",
];

export const stickyNotes: { quote: string; source: string; tone: "committed" | "suggested" }[] = [
  {
    quote: "locking it in. committed, not a maybe.",
    source: "Asha · 00:12:11",
    tone: "committed",
  },
  {
    quote: "maybe we revisit pricing in Q2?",
    source: "Priya · 00:52:30 (suggested only)",
    tone: "suggested",
  },
];

export const receiptCard = {
  quote: "beta ships without the paywall.",
  source: "Asha · 00:18:47",
  status: "verified" as const,
};

export const chatExchange: { from: "a" | "b"; text: string }[] = [
  { from: "a", text: "did we actually decide on march 14?" },
  { from: "b", text: "yep — committed, not just floated" },
];

export const howItWorks = [
  {
    caption: "paste.txt",
    accent: "blue" as const,
    title: "1. paste a transcript",
    body: "Speaker + timestamp lines, pasted or uploaded. No bot, no integration.",
  },
  {
    caption: "sorted.json",
    accent: "pink" as const,
    title: "2. get decisions, actions, off-agenda",
    body: "Grouped by agenda item, with owners and status — committed vs. suggested.",
  },
  {
    caption: "click.gif",
    accent: "teal" as const,
    title: "3. click a quote, see the exact line",
    body: "Every claim links back to the transcript line it came from.",
  },
];

export const builtList = [
  "Transcript parsing",
  "Agenda-aware extraction",
  "Word-for-word quote check",
  "Click-to-line navigation",
];

export const notBuiltList = [
  "Accounts or logins",
  "Saving your own meetings",
  "Live recording or bots",
  "Calendar, Slack or CRM integrations",
];

export const faqItems: { q: string; a: string }[] = [
  {
    q: "What is this?",
    a: "Rapporteur turns a meeting transcript into agenda-grouped notes: decisions, action items, and an off-agenda pile — with the exact line each claim came from.",
  },
  {
    q: "Does a bot join my call?",
    a: "No. There's no bot and nothing joins your meeting. You paste or upload a transcript after the call is already over.",
  },
  {
    q: "What does \"exact words found\" mean?",
    a: "It means the quoted text appears word-for-word on the cited transcript line. That checks the citation is real — it doesn't check that the claim itself is true.",
  },
  {
    q: "Why is the first load slow?",
    a: "The demo runs on free hosting that sleeps when idle. The first request can take a few seconds while the server wakes up.",
  },
];

export const marqueeWords = ["decisions", "actions", "receipts"];
