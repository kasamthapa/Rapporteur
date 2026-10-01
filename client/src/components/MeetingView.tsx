import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, getMeeting } from "../api/meetings";
import type {
  ActionItem,
  Decision,
  EvidenceRef,
  MeetingResult,
  ParsedLine,
} from "../types/meeting";

export type MeetingViewSource =
  | { kind: "id"; id: string }
  | { kind: "result"; id: string; result: MeetingResult };

interface MeetingViewProps {
  source: MeetingViewSource;
  onBack: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; title: string; createdAt: string; result: MeetingResult };

function initialState(source: MeetingViewSource): LoadState {
  if (source.kind === "result") {
    return {
      status: "loaded",
      title: source.result.meetingTitle,
      createdAt: source.result.meta.generatedAt,
      result: source.result,
    };
  }
  return { status: "loading" };
}

export function MeetingView({ source, onBack }: MeetingViewProps) {
  const [state, setState] = useState<LoadState>(() => initialState(source));

  const load = useCallback(() => {
    if (source.kind !== "id") return;
    setState({ status: "loading" });
    getMeeting(source.id)
      .then((detail) =>
        setState({
          status: "loaded",
          title: detail.title,
          createdAt: detail.createdAt,
          result: detail.result,
        }),
      )
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "failed to load meeting";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind, source.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">←</span> Back to meetings
      </button>

      {state.status === "loading" && (
        <p className="mt-6 text-sm text-gray-500" role="status">
          Loading meeting…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.message}</p>
          {source.kind === "id" && (
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {state.status === "loaded" && (
        <MeetingContent
          key={source.id}
          title={state.title}
          createdAt={state.createdAt}
          result={state.result}
        />
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
        Verified quote
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
      Unverified: quote not found on the cited line
    </span>
  );
}

function StatusBadge({ status }: { status: ActionItem["status"] }) {
  if (status === "committed") {
    return (
      <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
        Committed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      Suggested
    </span>
  );
}

function LineButton({
  evidence,
  line,
  isHighlighted,
  onClick,
}: {
  evidence: EvidenceRef;
  line: ParsedLine | undefined;
  isHighlighted: boolean;
  onClick: (lineNumber: number) => void;
}) {
  const label = line
    ? `Line ${evidence.sourceLine} - ${line.speaker} - ${line.timestamp}`
    : `Line ${evidence.sourceLine}`;

  return (
    <button
      type="button"
      onClick={() => onClick(evidence.sourceLine)}
      aria-pressed={isHighlighted}
      aria-label={`${label} — scroll transcript to this line`}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
        isHighlighted
          ? "border-teal-600 bg-teal-50 text-teal-800"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function EvidenceBlock({
  evidence,
  line,
  highlightedLine,
  onGoToLine,
}: {
  evidence: EvidenceRef;
  line: ParsedLine | undefined;
  highlightedLine: number | null;
  onGoToLine: (lineNumber: number) => void;
}) {
  return (
    <>
      <blockquote className="mt-2 border-l-2 border-gray-200 pl-3 text-sm italic text-gray-600">
        “{evidence.evidenceQuote}”
      </blockquote>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VerifiedBadge verified={evidence.verified} />
        <LineButton
          evidence={evidence}
          line={line}
          isHighlighted={highlightedLine === evidence.sourceLine}
          onClick={onGoToLine}
        />
      </div>
    </>
  );
}

interface MeetingContentProps {
  title: string;
  createdAt: string;
  result: MeetingResult;
}

function MeetingContent({ title, createdAt, result }: MeetingContentProps) {
  const speakers = useMemo(
    () => Array.from(new Set(result.transcriptLines.map((l) => l.speaker))),
    [result],
  );
  const linesByNumber = useMemo(
    () => new Map(result.transcriptLines.map((l) => [l.lineNumber, l] as const)),
    [result],
  );

  const [enabledSpeakers, setEnabledSpeakers] = useState<Set<string>>(() => new Set(speakers));
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const lineRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (highlightedLine === null) return;
    const el = lineRefs.current.get(highlightedLine);
    if (!el) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [highlightedLine]);

  const goToLine = useCallback(
    (lineNumber: number) => {
      setHighlightedLine((prev) => (prev === lineNumber ? null : lineNumber));
      const line = linesByNumber.get(lineNumber);
      if (line) {
        setEnabledSpeakers((prev) => {
          if (prev.has(line.speaker)) return prev;
          const next = new Set(prev);
          next.add(line.speaker);
          return next;
        });
      }
    },
    [linesByNumber],
  );

  const toggleSpeaker = (speaker: string) => {
    setEnabledSpeakers((prev) => {
      const next = new Set(prev);
      if (next.has(speaker)) {
        next.delete(speaker);
      } else {
        next.add(speaker);
      }
      return next;
    });
  };

  const decisionsByItem = useMemo(() => {
    const map = new Map<string, Decision[]>();
    for (const d of result.decisions) {
      const list = map.get(d.agendaItem) ?? [];
      list.push(d);
      map.set(d.agendaItem, list);
    }
    return map;
  }, [result]);

  const actionItemsByItem = useMemo(() => {
    const map = new Map<string, ActionItem[]>();
    for (const a of result.actionItems) {
      const list = map.get(a.agendaItem) ?? [];
      list.push(a);
      map.set(a.agendaItem, list);
    }
    return map;
  }, [result]);

  const coverageByItem = useMemo(
    () => new Map(result.agendaCoverage.map((c) => [c.item, c.discussed] as const)),
    [result],
  );

  const summaryByItem = useMemo(
    () => new Map(result.summaryByAgendaItem.map((s) => [s.agendaItem, s.summary] as const)),
    [result],
  );

  const totalClaims = result.meta.verifiedCount + result.meta.unverifiedCount;

  return (
    <div>
      <header className="mt-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{formatDateTime(createdAt)}</p>
        <p className="mt-2 text-sm font-medium text-gray-700">
          {totalClaims > 0
            ? `${result.meta.verifiedCount} of ${totalClaims} claims verified`
            : "No verifiable claims in this meeting"}
        </p>
        {result.agendaInferred && (
          <p className="mt-3 inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-800">
            Agenda was inferred by the AI
          </p>
        )}
      </header>

      <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
        <section aria-label="Meeting analysis" className="flex flex-col gap-6">
          {result.agenda.map((item) => {
            const discussed = coverageByItem.get(item) ?? true;
            const decisions = decisionsByItem.get(item) ?? [];
            const actionItems = actionItemsByItem.get(item) ?? [];

            return (
              <section
                key={item}
                aria-labelledby={`agenda-${item}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <h2 id={`agenda-${item}`} className="text-lg font-semibold text-gray-900">
                  {item}
                </h2>
                <p className="mt-1 text-sm text-gray-700">{summaryByItem.get(item) ?? ""}</p>

                {!discussed ? (
                  <p className="mt-3 text-sm italic text-gray-400">Not discussed</p>
                ) : decisions.length === 0 && actionItems.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No decisions or action items recorded for this topic.
                  </p>
                ) : (
                  <>
                    {decisions.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Decisions
                        </h3>
                        <ul className="mt-2 flex flex-col gap-3">
                          {decisions.map((d, i) => (
                            <li key={i} className="rounded-md border border-gray-200 p-3">
                              <p className="text-sm text-gray-900">{d.text}</p>
                              <EvidenceBlock
                                evidence={d}
                                line={linesByNumber.get(d.sourceLine)}
                                highlightedLine={highlightedLine}
                                onGoToLine={goToLine}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {actionItems.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Action items
                        </h3>
                        <ul className="mt-2 flex flex-col gap-3">
                          {actionItems.map((a, i) => (
                            <li key={i} className="rounded-md border border-gray-200 p-3">
                              <p className="text-sm text-gray-900">{a.text}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span>Owner: {a.owner}</span>
                                <span>Deadline: {a.deadline}</span>
                                <StatusBadge status={a.status} />
                              </div>
                              <EvidenceBlock
                                evidence={a}
                                line={linesByNumber.get(a.sourceLine)}
                                highlightedLine={highlightedLine}
                                onGoToLine={goToLine}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}

          <details className="rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
              Off-agenda ({result.offAgenda.length})
            </summary>
            <div className="border-t border-gray-100 p-4">
              {result.offAgenda.length === 0 ? (
                <p className="text-sm text-gray-500">No off-agenda talk recorded.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {result.offAgenda.map((o, i) => (
                    <li key={i} className="rounded-md border border-gray-200 p-3">
                      <p className="text-sm text-gray-900">{o.text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="capitalize">{o.kind}</span>
                        <span>Owner: {o.owner}</span>
                      </div>
                      <EvidenceBlock
                        evidence={o}
                        line={linesByNumber.get(o.sourceLine)}
                        highlightedLine={highlightedLine}
                        onGoToLine={goToLine}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </section>

        <section
          aria-label="Transcript"
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>

          <div
            role="group"
            aria-label="Filter transcript by speaker"
            className="mt-3 flex flex-wrap gap-2"
          >
            {speakers.map((speaker) => {
              const active = enabledSpeakers.has(speaker);
              return (
                <button
                  key={speaker}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSpeaker(speaker)}
                  className={`rounded-full px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                    active ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {speaker}
                </button>
              );
            })}
          </div>

          <ol className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3">
            {result.transcriptLines.map((line) => {
              const isHighlighted = line.lineNumber === highlightedLine;
              const visible = enabledSpeakers.has(line.speaker) || isHighlighted;
              if (!visible) return null;

              return (
                <li
                  key={line.lineNumber}
                  ref={(el) => {
                    if (el) {
                      lineRefs.current.set(line.lineNumber, el);
                    } else {
                      lineRefs.current.delete(line.lineNumber);
                    }
                  }}
                  id={`transcript-line-${line.lineNumber}`}
                  className={`rounded-md p-2 text-sm ${
                    isHighlighted ? "bg-amber-50 ring-2 ring-amber-400" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500">
                    {line.timestamp} · {line.speaker}
                  </p>
                  <p className="mt-0.5 text-gray-800">{line.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
