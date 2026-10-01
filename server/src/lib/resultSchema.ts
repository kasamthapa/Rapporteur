import { z } from "zod";

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

// The model's raw output shape — distinct from MeetingResult, which adds
// server-only fields (verified, meta) the model never produces.
export type LlmMeetingResult = z.infer<typeof llmMeetingResultSchema>;

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

  const data = parsed.data;
  const topicErrors = checkAgendaTopics(data, requestAgenda);
  if (topicErrors.length > 0) {
    return { success: false, error: topicErrors.join("; ") };
  }

  return { success: true, data };
}
