import { useRef, useState, type KeyboardEvent } from "react";
import { ApiError, createMeeting, type CreateMeetingResponse } from "../api/meetings";
import { SAMPLE_AGENDA, SAMPLE_TITLE, SAMPLE_TRANSCRIPT } from "../data/sampleMeeting";

interface NewMeetingFormProps {
  onCreated: (response: CreateMeetingResponse) => void;
}

const AGENDA_MAX_ITEMS = 10;

export function NewMeetingForm({ onCreated }: NewMeetingFormProps) {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState<string[]>([]);
  const [agendaInput, setAgendaInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddAgendaItem = agenda.length < AGENDA_MAX_ITEMS;

  const addAgendaItem = () => {
    const trimmed = agendaInput.trim();
    if (!trimmed || !canAddAgendaItem) return;
    setAgenda((prev) => [...prev, trimmed]);
    setAgendaInput("");
  };

  const removeAgendaItem = (index: number) => {
    setAgenda((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAgendaKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAgendaItem();
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTranscript(text);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fillSample = () => {
    setTitle(SAMPLE_TITLE);
    setAgenda(SAMPLE_AGENDA);
    setTranscript(SAMPLE_TRANSCRIPT);
    setError(null);
  };

  const canSubmit = title.trim().length > 0 && transcript.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await createMeeting({
        title,
        agenda: agenda.length > 0 ? agenda : undefined,
        transcript,
      });
      onCreated(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? "The free AI quota is busy, try again in a moment"
            : err.message,
        );
      } else {
        setError("something went wrong, please try again");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">New meeting</h1>
        <button
          type="button"
          onClick={fillSample}
          disabled={submitting}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try a sample
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            placeholder="e.g. Q3 Roadmap Sync"
          />
        </div>

        <div>
          <label htmlFor="agenda-input" className="block text-sm font-medium text-gray-700">
            Agenda topics <span className="text-gray-400">(optional)</span>
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {agenda.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeAgendaItem(i)}
                  disabled={submitting}
                  aria-label={`Remove ${item}`}
                  className="rounded-full text-teal-600 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            id="agenda-input"
            type="text"
            value={agendaInput}
            onChange={(e) => setAgendaInput(e.target.value)}
            onKeyDown={handleAgendaKeyDown}
            disabled={submitting || !canAddAgendaItem}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            placeholder={
              canAddAgendaItem
                ? "Type a topic and press Enter"
                : `Maximum ${AGENDA_MAX_ITEMS} topics`
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            No agenda? Leave this empty — topics will be inferred from the transcript.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
              Transcript
            </label>
            <label className="cursor-pointer text-sm font-medium text-teal-700 hover:text-teal-900">
              Upload .txt
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFilePick}
                disabled={submitting}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={submitting}
            rows={12}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            placeholder="Paste your transcript here…"
          />
          <p className="mt-1 text-xs text-gray-500">
            Tip: Fathom's "Copy" button output pastes straight in here — no reformatting needed.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {submitting && (
          <p className="text-sm text-gray-600" role="status">
            Analyzing… this can take up to a minute.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Analyzing…" : "Analyze meeting"}
        </button>
      </form>
    </div>
  );
}
