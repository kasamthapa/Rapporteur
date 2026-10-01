import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useIsDesktopLayout(): boolean {
  return useMediaQuery("(min-width: 860px)");
}

export function useClock(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function useTypewriter(lines: string[], reducedMotion: boolean): string {
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (reducedMotion) {
      setText(lines[0] ?? "");
      return;
    }

    const currentLine = lines[lineIndex % lines.length] ?? "";
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      charIndex += 1;
      setText(currentLine.slice(0, charIndex));
      if (charIndex < currentLine.length) {
        timeoutId = setTimeout(typeNext, 32);
      } else {
        timeoutId = setTimeout(() => setLineIndex((i) => i + 1), 1700);
      }
    };

    setText("");
    timeoutId = setTimeout(typeNext, 220);
    return () => clearTimeout(timeoutId);
  }, [lineIndex, lines, reducedMotion]);

  return text;
}

interface Point {
  x: number;
  y: number;
}

export function useDraggable(
  stageRef: RefObject<HTMLElement | null>,
  elRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Point | null>(null);

  const clamp = (x: number, y: number): Point => {
    const stage = stageRef.current;
    const el = elRef.current;
    if (!stage || !el) return { x, y };
    const stageRect = stage.getBoundingClientRect();
    const maxX = Math.max(0, stageRect.width - el.offsetWidth);
    const maxY = Math.max(0, stageRect.height - el.offsetHeight);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!enabled) return;
    const el = elRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragOffset.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - dragOffset.current.x;
    const y = e.clientY - stageRect.top - dragOffset.current.y;
    setPos(clamp(x, y));
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    setDragging(false);
    const el = elRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  return {
    pos,
    setPos,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
