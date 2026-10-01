import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ApiError, getMeeting } from "../api/meetings";
import type {
  ActionItem,
  Decision,
  EvidenceRef,
  MeetingResult,
  ParsedLine,
} from "../types/meeting";

const WINDOW_ACCENTS = [
  "var(--color-pastel-green)",
  "var(--color-pastel-blue)",
  "var(--color-pastel-pink)",
  "var(--color-pastel-teal)",
  "var(--color-pastel-sand)",
];

function WindowDots() {
  return (
    <div className="mv-window-dots" aria-hidden="true">
      <span className="mv-dot mv-dot-red" />
      <span className="mv-dot mv-dot-yellow" />
      <span className="mv-dot mv-dot-green" />
    </div>
  );
}

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
      <button type="button" onClick={onBack} className="btn-flat btn-flat-secondary btn-flat-sm">
        <span aria-hidden="true">←</span> Back to meetings
      </button>

      {state.status === "loading" && (
        <p className="mt-6 text-sm text-soft" role="status">
          Loading meeting…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-6 banner banner-error">
          <p className="text-sm">{state.message}</p>
          {source.kind === "id" && (
            <button type="button" onClick={load} className="btn-flat btn-flat-sm mt-3">
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
    return <span className="tag tag-green">Exact words found</span>;
  }
  return (
    <span className="tag tag-amber">Words don't match this line - check the transcript</span>
  );
}

function StatusBadge({ status }: { status: ActionItem["status"] }) {
  if (status === "committed") {
    return <span className="tag tag-blue">Agreed</span>;
  }
  return <span className="tag tag-neutral">Proposed</span>;
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
  const titleLabel = line
    ? `Line ${evidence.sourceLine} - ${line.speaker} - ${line.timestamp}`
    : `Line ${evidence.sourceLine}`;
  const visibleLabel = line
    ? `Show in transcript · ${line.timestamp} · ${line.speaker}`
    : `Show in transcript`;

  return (
    <button
      type="button"
      onClick={() => onClick(evidence.sourceLine)}
      aria-pressed={isHighlighted}
      title={titleLabel}
      aria-label={`${titleLabel} — scroll transcript to this line`}
      className={`btn-evidence${isHighlighted ? " is-active" : ""}`}
    >
      {visibleLabel}
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
      <blockquote
        className="mt-2 pl-3 text-sm italic text-soft"
        style={{ borderLeft: "2px solid var(--color-line)" }}
      >
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
        <h1 className="heading-serif text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-soft">{formatDateTime(createdAt)}</p>
        <p className="mt-2 text-sm font-medium">
          {totalClaims > 0
            ? `${result.meta.verifiedCount} of ${totalClaims} quotes found word for word`
            : "No verifiable claims in this meeting"}
        </p>
        {totalClaims > 0 && (
          <p className="mt-1 text-xs text-soft">
            Exact words found means the quote appears word for word on the line it cites. It
            does not prove the claim is true.
          </p>
        )}
        {result.agendaInferred && (
          <p className="banner banner-info mt-3 inline-flex items-center px-3 py-1.5 text-sm">
            Agenda was inferred by the AI
          </p>
        )}
      </header>

      <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
        <section aria-label="Meeting analysis" className="flex flex-col gap-6">
          {result.agenda.map((item, idx) => {
            const discussed = coverageByItem.get(item) ?? true;
            const decisions = decisionsByItem.get(item) ?? [];
            const actionItems = actionItemsByItem.get(item) ?? [];

            return (
              <section
                key={item}
                aria-labelledby={`agenda-${item}`}
                className="mv-window"
                style={{ "--mv-accent": WINDOW_ACCENTS[idx % WINDOW_ACCENTS.length] } as CSSProperties}
              >
                <div className="mv-window-bar">
                  <WindowDots />
                  <h2 id={`agenda-${item}`} className="mv-window-title">
                    {item}
                  </h2>
                  <span className="mv-window-title-spacer" aria-hidden="true" />
                </div>
                <div className="mv-window-body">
                  <p className="text-sm text-soft">{summaryByItem.get(item) ?? ""}</p>

                  {!discussed ? (
                    <p className="mt-3 text-sm italic text-soft">Not discussed</p>
                  ) : decisions.length === 0 && actionItems.length === 0 ? (
                    <p className="mt-3 text-sm text-soft">
                      No decisions or action items recorded for this topic.
                    </p>
                  ) : (
                    <>
                      {decisions.length > 0 && (
                        <div className="mt-4">
                          <h3 className="mv-section-label">Decisions</h3>
                          <ul className="mt-2 flex flex-col gap-3">
                            {decisions.map((d, i) => (
                              <li key={i} className="mv-card">
                                <p className="text-sm">{d.text}</p>
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
                          <h3 className="mv-section-label">Action items</h3>
                          <ul className="mt-2 flex flex-col gap-3">
                            {actionItems.map((a, i) => (
                              <li key={i} className="mv-card">
                                <p className="text-sm">{a.text}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-soft">
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
                </div>
              </section>
            );
          })}

          <details className="mv-window">
            <summary className="mv-window-bar mv-window-summary">
              <WindowDots />
              <span className="mv-window-caption">off-agenda.txt</span>
              <span className="text-xs text-soft">({result.offAgenda.length})</span>
              <span className="mv-window-chevron" aria-hidden="true" />
            </summary>
            <div className="mv-window-body">
              {result.offAgenda.length === 0 ? (
                <p className="text-sm text-soft">No off-agenda talk recorded.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {result.offAgenda.map((o, i) => (
                    <li key={i} className="mv-card">
                      <p className="text-sm">{o.text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-soft">
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

        <section aria-label="Transcript" className="lg:sticky lg:top-6">
          <div className="mv-window lg:flex lg:max-h-[calc(100vh-3rem)] lg:flex-col">
            <div className="mv-window-bar lg:shrink-0">
              <WindowDots />
              <span className="mv-window-caption">transcript.txt</span>
              <span className="mv-window-title-spacer" aria-hidden="true" />
            </div>
            <div className="mv-window-body lg:flex lg:min-h-0 lg:flex-col">
              <h2 className="sr-only">Transcript</h2>

              <div
                role="group"
                aria-label="Filter transcript by speaker"
                className="flex flex-wrap gap-2 lg:shrink-0"
              >
                {speakers.map((speaker) => {
                  const active = enabledSpeakers.has(speaker);
                  return (
                    <button
                      key={speaker}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSpeaker(speaker)}
                      className={`chip${active ? " is-active" : ""}`}
                    >
                      {speaker}
                    </button>
                  );
                })}
              </div>

              <ol className="mt-3 flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
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
                      className={`mv-line${isHighlighted ? " is-highlighted" : ""}`}
                    >
                      <p className="mv-line-meta">
                        {line.timestamp} · {line.speaker}
                      </p>
                      <p className="mv-line-text text-sm">{line.text}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
