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
        <h1 className="heading-serif text-2xl">New meeting</h1>
        <button
          type="button"
          onClick={fillSample}
          disabled={submitting}
          className="btn-flat btn-flat-secondary btn-flat-sm"
        >
          Try a sample
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="field-input"
            placeholder="e.g. Q3 Roadmap Sync"
          />
        </div>

        <div>
          <label htmlFor="agenda-input" className="field-label">
            Agenda topics <span className="text-soft">(optional)</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {agenda.map((item, i) => (
              <span key={`${item}-${i}`} className="chip chip-removable">
                {item}
                <button
                  type="button"
                  onClick={() => removeAgendaItem(i)}
                  disabled={submitting}
                  aria-label={`Remove ${item}`}
                  className="chip-remove"
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
            className="field-input mt-2"
            placeholder={
              canAddAgendaItem
                ? "Type a topic and press Enter"
                : `Maximum ${AGENDA_MAX_ITEMS} topics`
            }
          />
          <p className="field-hint">
            No agenda? Leave this empty — topics will be inferred from the transcript.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="transcript" className="field-label">
              Transcript
            </label>
            <label className="cursor-pointer text-sm font-medium text-[var(--color-ink)] underline decoration-[var(--color-margin)] hover:decoration-current">
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
            className="field-input field-textarea"
            placeholder="Paste your transcript here…"
          />
          <p className="field-hint">
            Tip: Fathom's "Copy" button output pastes straight in here — no reformatting needed.
          </p>
        </div>

        {error && (
          <div className="banner banner-error">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {submitting && (
          <p className="text-sm text-soft" role="status">
            Analyzing… this can take up to a minute.
          </p>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-flat">
          {submitting ? "Analyzing…" : "Analyze meeting"}
        </button>
      </form>
    </div>
  );
}
