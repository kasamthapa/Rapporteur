import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "./Landing.css";
import { FloatingWindow } from "./FloatingWindow";
import { WindowChrome } from "./WindowChrome";
import { Logo } from "./Logo";
import { FolderIcon, TrashIcon, Emoticon } from "./Doodles";
import {
  useClock,
  useInView,
  useIsDesktopLayout,
  usePrefersReducedMotion,
  useTypewriter,
} from "./hooks";
import {
  actionLines,
  builtList,
  chatExchange,
  decisionLines,
  faqItems,
  howItWorks,
  marqueeWords,
  notBuiltList,
  offAgendaLines,
  receiptCard,
  stickyNotes,
  transcriptTypewriterLines,
} from "./data";

interface LandingProps {
  onTryDemo: () => void;
  onPasteTranscript: () => void;
}

const REPO_URL = "https://github.com/kasamthapa/Rapporteur";

const MARGIN_TICK_STEP = [14, 14, 13];
const marginTicks: string[] = (() => {
  const out: string[] = [];
  let total = 0;
  for (let i = 0; i < 150; i++) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    out.push(`${m}:${s.toString().padStart(2, "0")}`);
    total += MARGIN_TICK_STEP[i % MARGIN_TICK_STEP.length];
  }
  return out;
})();

function FadeUp({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`fade-up${inView ? " is-visible" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

export function Landing({ onTryDemo, onPasteTranscript }: LandingProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isDesktopLayout = useIsDesktopLayout();
  const clock = useClock();
  const typed = useTypewriter(transcriptTypewriterLines, reducedMotion);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const howRef = useRef<HTMLDivElement | null>(null);
  const builtRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);

  const [order, setOrder] = useState<string[]>([
    "decisions",
    "actions",
    "offagenda",
    "transcript",
    "receipts",
  ]);
  const bringToFront = (id: string) => setOrder((prev) => [...prev.filter((x) => x !== id), id]);
  const zIndexOf = (id: string) => 10 + order.indexOf(id);

  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set());
  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const scrollTo = (ref: RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className={`landing${reducedMotion ? " reduced-motion" : ""}`}>
      <div className="margin-timeline" aria-hidden="true">
        {marginTicks.map((t, i) => (
          <span className="margin-tick" key={i}>
            {t}
          </span>
        ))}
      </div>

      {/* 1. menubar */}
      <header className="menubar">
        <Logo
          onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}
        />
        <nav className="menubar-nav" aria-label="Page sections">
          <button type="button" className="menubar-link" onClick={() => scrollTo(howRef)}>
            how it works
          </button>
          <button type="button" className="menubar-link" onClick={() => scrollTo(builtRef)}>
            what's built
          </button>
          <button type="button" className="menubar-link" onClick={() => scrollTo(faqRef)}>
            faq
          </button>
        </nav>
        <span className="menubar-clock" aria-label="Current time">
          {clock}
        </span>
      </header>

      {/* 2. hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">rapporteur</h1>
          <p className="hero-subline">
            meeting notes that show their{" "}
            <span className="hl-word">
              receipts
              <span className="hl-mark" aria-hidden="true">
                <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M2,13 C20,7 35,16 50,11 C65,6 80,15 98,9" pathLength="100" />
                </svg>
              </span>
            </span>
          </p>
          <div className="hero-ctas">
            <button type="button" className="pill pill-primary" onClick={onTryDemo}>
              try the demo
            </button>
            <button type="button" className="pill pill-secondary" onClick={onPasteTranscript}>
              paste a transcript
            </button>
          </div>
          <p className="hero-note">
            free demo. first load may take a few seconds while the server wakes.
          </p>
        </div>

        {/* 3. floating desktop scene */}
        <div className="hero-stage" ref={stageRef}>
          <FloatingWindow
            id="decisions"
            accent="green"
            caption="decisions.md"
            anchorPct={{ x: 0.04, y: 0.05 }}
            tiltDeg={-4}
            floatIndex={0}
            zIndex={zIndexOf("decisions")}
            isDesktopLayout={isDesktopLayout}
            stageRef={stageRef}
            onBringToFront={bringToFront}
            ariaLabel="decisions.md window"
          >
            {decisionLines.join("\n")}
          </FloatingWindow>

          <FloatingWindow
            id="actions"
            accent="blue"
            caption="actions.txt"
            anchorPct={{ x: 0.66, y: 0.03 }}
            tiltDeg={3}
            floatIndex={1}
            zIndex={zIndexOf("actions")}
            isDesktopLayout={isDesktopLayout}
            stageRef={stageRef}
            onBringToFront={bringToFront}
            ariaLabel="actions.txt window"
          >
            {actionLines.join("\n")}
          </FloatingWindow>

          <FloatingWindow
            id="offagenda"
            accent="pink"
            caption="off-agenda.txt"
            anchorPct={{ x: 0.37, y: 0.48 }}
            tiltDeg={-2}
            floatIndex={2}
            zIndex={zIndexOf("offagenda")}
            isDesktopLayout={isDesktopLayout}
            stageRef={stageRef}
            onBringToFront={bringToFront}
            ariaLabel="off-agenda.txt window"
          >
            <span className="is-dim">{offAgendaLines.join("\n")}</span>
          </FloatingWindow>

          <FloatingWindow
            id="transcript"
            accent="teal"
            caption="transcript.txt"
            anchorPct={{ x: 0.03, y: 0.64 }}
            tiltDeg={2}
            floatIndex={3}
            zIndex={zIndexOf("transcript")}
            isDesktopLayout={isDesktopLayout}
            stageRef={stageRef}
            onBringToFront={bringToFront}
            ariaLabel="transcript.txt window, playing a transcript line by line"
          >
            <div className="terminal-body">
              {typed}
              {!reducedMotion && <span className="typewriter-cursor" aria-hidden="true" />}
            </div>
          </FloatingWindow>

          <FloatingWindow
            id="receipts"
            accent="sand"
            caption="receipts.png"
            anchorPct={{ x: 0.66, y: 0.6 }}
            tiltDeg={-3}
            floatIndex={4}
            zIndex={zIndexOf("receipts")}
            isDesktopLayout={isDesktopLayout}
            stageRef={stageRef}
            onBringToFront={bringToFront}
            ariaLabel="receipts.png window"
          >
            <div className="receipt-card">
              <span className="receipt-quote">&ldquo;{receiptCard.quote}&rdquo;</span>
              <span className="receipt-badge">✓ verified</span>
              <span className="doodle-label">{receiptCard.source}</span>
            </div>
          </FloatingWindow>

          <div className="sticky-note" style={{ left: "32%", top: "3%" }} aria-hidden="true">
            &ldquo;{stickyNotes[0].quote}&rdquo;
            <span className="sticky-note-source">{stickyNotes[0].source}</span>
          </div>
          <div
            className="sticky-note sticky-note--suggested"
            style={{ left: "29%", top: "86%" }}
            aria-hidden="true"
          >
            &ldquo;{stickyNotes[1].quote}&rdquo;
            <span className="sticky-note-source">{stickyNotes[1].source}</span>
          </div>

          <div style={{ position: "absolute", left: "1%", top: "92%" }}>
            <FolderIcon label="meetings" />
          </div>
          <div style={{ position: "absolute", left: "89%", top: "90%" }}>
            <FolderIcon label="archive" />
          </div>
          <div style={{ position: "absolute", left: "93%", top: "4%" }}>
            <TrashIcon />
          </div>
          <div style={{ position: "absolute", left: "53%", top: "6%" }}>
            <Emoticon variant="happy" tint="var(--color-pastel-teal)" />
          </div>
          <div style={{ position: "absolute", left: "14%", top: "38%" }}>
            <Emoticon variant="wink" tint="var(--color-pastel-pink)" />
          </div>
          <div style={{ position: "absolute", left: "82%", top: "42%" }}>
            <Emoticon variant="calm" tint="var(--color-pastel-sand)" />
          </div>
        </div>
      </section>

      {/* marquee */}
      <FadeUp>
        <div className="marquee-wrap">
          <div className="marquee-track">
            {[...marqueeWords, ...marqueeWords, ...marqueeWords, ...marqueeWords].map((w, i) => (
              <span className="marquee-item" key={`${w}-${i}`}>
                {w}
                <span className="marquee-dot"> · </span>
              </span>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* 5. how it works */}
      <section className="section" ref={howRef}>
        <FadeUp>
          <p className="eyebrow">walkthrough</p>
          <h2 className="section-title">how it works</h2>
          <div className="how-grid">
            <div className="how-card">
              <WindowChrome accent={howItWorks[0].accent} caption={howItWorks[0].caption} ariaLabel="paste transcript example">
                00:12:03 Raj: so — march 14, locking that in?{"\n"}00:12:11 Asha: locking it in. committed.
              </WindowChrome>
              <p className="how-card-title">{howItWorks[0].title}</p>
              <p className="how-card-text">{howItWorks[0].body}</p>
            </div>

            <div className="how-card">
              <WindowChrome accent={howItWorks[1].accent} caption={howItWorks[1].caption} ariaLabel="transcript becomes a structured decision">
                <div className="chat">
                  {chatExchange.map((m, i) => (
                    <span key={i} className={`chat-bubble chat-bubble--${m.from}`}>
                      {m.text}
                    </span>
                  ))}
                </div>
                <div className="chat-arrow">becomes ↓</div>
                <div className="sorted-tags">
                  <span className="sorted-tag">decision</span>
                  <span className="sorted-tag">committed</span>
                  <span className="sorted-tag">launch date</span>
                </div>
              </WindowChrome>
              <p className="how-card-title">{howItWorks[1].title}</p>
              <p className="how-card-text">{howItWorks[1].body}</p>
            </div>

            <div className="how-card">
              <WindowChrome accent={howItWorks[2].accent} caption={howItWorks[2].caption} ariaLabel="click a quote to see the exact transcript line">
                <div className="click-line">
                  → &ldquo;beta ships without the paywall.&rdquo;
                  <br />
                  <span style={{ opacity: 0.6 }}>00:18:47 · Asha</span>
                </div>
              </WindowChrome>
              <p className="how-card-title">{howItWorks[2].title}</p>
              <p className="how-card-text">{howItWorks[2].body}</p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* 6. what's built / not built */}
      <section className="section" ref={builtRef}>
        <FadeUp>
          <p className="eyebrow">status</p>
          <h2 className="section-title">what's built, what's not</h2>
          <WindowChrome accent="sand" caption="status.txt" ariaLabel="what is built and what is not built">
            <div className="built-grid">
              <div>
                <p className="built-col-title is-built">built</p>
                <ul>
                  {builtList.map((item) => (
                    <li key={item}>
                      <span className="built-mark">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="built-col-title is-not-built">not built</p>
                <ul>
                  {notBuiltList.map((item) => (
                    <li key={item}>
                      <span className="built-mark">–</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </WindowChrome>
        </FadeUp>
      </section>

      {/* 7. faq */}
      <section className="section" ref={faqRef}>
        <FadeUp>
          <p className="eyebrow">questions</p>
          <h2 className="section-title">faq</h2>
          <div>
            {faqItems.map((item, i) => {
              const isOpen = openFaq.has(i);
              return (
                <div className="faq-item" key={item.q}>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-question-${i}`}
                    onClick={() => toggleFaq(i)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                  <div
                    className={`faq-panel${isOpen ? " is-open" : ""}`}
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                  >
                    <div className="faq-panel-inner">
                      <p>{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </FadeUp>
      </section>

      {/* 8. footer */}
      <footer className="landing-footer">
        <p>
          © 2026 Rapporteur — a sprint demo, not a real product. {" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            view the repo
          </a>
        </p>
      </footer>
    </div>
  );
}
