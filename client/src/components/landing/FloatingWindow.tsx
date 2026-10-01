import { useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { useDraggable } from "./hooks";
import { WindowChrome } from "./WindowChrome";

export type WindowAccent = "green" | "blue" | "pink" | "teal" | "sand";

interface FloatingWindowProps {
  id: string;
  accent: WindowAccent;
  caption: string;
  anchorPct: { x: number; y: number };
  tiltDeg: number;
  floatIndex: number;
  zIndex: number;
  isDesktopLayout: boolean;
  stageRef: RefObject<HTMLElement | null>;
  onBringToFront: (id: string) => void;
  ariaLabel: string;
  children: ReactNode;
}

export function FloatingWindow({
  id,
  accent,
  caption,
  anchorPct,
  tiltDeg,
  floatIndex,
  zIndex,
  isDesktopLayout,
  stageRef,
  onBringToFront,
  ariaLabel,
  children,
}: FloatingWindowProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const didInit = useRef(false);
  const { pos, setPos, dragging, handlers } = useDraggable(stageRef, outerRef, isDesktopLayout);

  useLayoutEffect(() => {
    if (!isDesktopLayout || didInit.current) return;
    const stage = stageRef.current;
    const el = outerRef.current;
    if (!stage || !el) return;
    const stageRect = stage.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = Math.min(Math.max(0, stageRect.width * anchorPct.x), Math.max(0, stageRect.width - w));
    const y = Math.min(Math.max(0, stageRect.height * anchorPct.y), Math.max(0, stageRect.height - h));
    setPos({ x, y });
    didInit.current = true;
  }, [isDesktopLayout, anchorPct, setPos, stageRef]);

  return (
    <div
      ref={outerRef}
      className={`fw-float${dragging ? " fw-dragging" : ""}`}
      style={
        isDesktopLayout
          ? {
              left: pos.x,
              top: pos.y,
              zIndex,
              animationDelay: `${floatIndex * 0.7}s`,
            }
          : undefined
      }
      onPointerDown={(e) => {
        onBringToFront(id);
        handlers.onPointerDown(e);
      }}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
    >
      <WindowChrome accent={accent} caption={caption} ariaLabel={ariaLabel} tiltDeg={tiltDeg}>
        {children}
      </WindowChrome>
    </div>
  );
}
