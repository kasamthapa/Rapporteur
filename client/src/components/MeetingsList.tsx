import { useEffect, useState } from "react";
import { ApiError, listMeetings } from "../api/meetings";
import type { MeetingSummary } from "../types/meeting";

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
        <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
        <button
          type="button"
          onClick={onNewMeeting}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          New meeting
        </button>
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-gray-500">Loading meetings…</p>
      )}

      {state.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.message}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "loaded" && state.meetings.length === 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">No meetings yet.</p>
        </div>
      )}

      {state.status === "loaded" && state.meetings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.meetings.map((meeting) => (
            <li key={meeting.id}>
              <button
                type="button"
                onClick={() => onOpenMeeting(meeting.id)}
                className="w-full rounded-md border border-gray-200 bg-white p-4 text-left hover:border-teal-300 hover:bg-teal-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="truncate font-medium text-gray-900">{meeting.title}</h2>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDate(meeting.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{countsLabel(meeting.counts)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
