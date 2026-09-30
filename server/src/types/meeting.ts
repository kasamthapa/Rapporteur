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
