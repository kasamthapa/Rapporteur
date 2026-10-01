import type { MeetingResult } from "../types/meeting";

export interface LocalMeetingRecord {
  id: string;
  title: string;
  createdAt: string;
  result: MeetingResult;
}

const STORAGE_KEY = "rapporteur.localMeetings.v1";
const MAX_ENTRIES = 10;

export function listLocalMeetings(): LocalMeetingRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalMeetingRecord[];
  } catch {
    return [];
  }
}

export function saveLocalMeeting(record: LocalMeetingRecord): void {
  try {
    const existing = listLocalMeetings().filter((m) => m.id !== record.id);
    const next = [record, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — the app continues without local persistence
  }
}

export function clearLocalMeetings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}
