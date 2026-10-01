import { useEffect, useState } from "react";
import { ApiError, listMeetings } from "../api/meetings";
import type { MeetingSummary } from "../types/meeting";

function FolderIcon() {
  return (
    <svg width="28" height="22" viewBox="0 0 64 48" aria-hidden="true" className="ml-row-icon">
      <path
        d="M2 10 h18 l4 6 h38 v28 a3 3 0 0 1 -3 3 h-54 a3 3 0 0 1 -3 -3 z"
        fill="var(--color-manila)"
        stroke="rgba(28,37,65,0.18)"
        strokeWidth="1.5"
      />
      <path
        d="M2 10 a3 3 0 0 1 3 -3 h14 l5 5 h-22 z"
        fill="#f3e8c8"
        stroke="rgba(28,37,65,0.18)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

interface MeetingsListProps {
  onOpenMeeting: (id: string) => void;
  onNewMeeting: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; meetings: MeetingSummary[] };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function countsLabel(counts: MeetingSummary["counts"]): string {
  const decisions = `${counts.decisions} decision${counts.decisions === 1 ? "" : "s"}`;
  const actions = `${counts.actionItems} action${counts.actionItems === 1 ? "" : "s"}`;
  const verified = `${counts.verified} verified`;
  const unverified = `${counts.unverified} unverified`;
  return [decisions, actions, verified, unverified].join(", ");
}

export function MeetingsList({ onOpenMeeting, onNewMeeting }: MeetingsListProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = () => {
    setState({ status: "loading" });
    listMeetings()
      .then((meetings) => setState({ status: "loaded", meetings }))
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "failed to load meetings";
        setState({ status: "error", message });
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-serif text-2xl">Meetings</h1>
        <button type="button" onClick={onNewMeeting} className="btn-flat">
          New meeting
        </button>
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-soft">Loading meetings…</p>
      )}

      {state.status === "error" && (
        <div className="banner banner-error">
          <p className="text-sm">{state.message}</p>
          <button type="button" onClick={load} className="btn-flat btn-flat-sm mt-3">
            Retry
          </button>
        </div>
      )}

      {state.status === "loaded" && state.meetings.length === 0 && (
        <div className="mv-window p-6 text-center">
          <p className="text-sm text-soft">No meetings yet.</p>
        </div>
      )}

      {state.status === "loaded" && state.meetings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.meetings.map((meeting) => (
            <li key={meeting.id}>
              <button
                type="button"
                onClick={() => onOpenMeeting(meeting.id)}
                className="ml-row"
              >
                <FolderIcon />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="ml-row-title truncate">{meeting.title}</h2>
                    <span className="shrink-0 text-xs text-soft">
                      {formatDate(meeting.createdAt)}
                    </span>
                  </div>
                  <p className="ml-row-meta mt-1">{countsLabel(meeting.counts)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
