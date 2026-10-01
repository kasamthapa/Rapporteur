import type { CSSProperties, ReactNode } from "react";
import type { WindowAccent } from "./FloatingWindow";

interface WindowChromeProps {
  accent: WindowAccent;
  caption: string;
  ariaLabel: string;
  tiltDeg?: number;
  className?: string;
  children: ReactNode;
}

export function WindowChrome({
  accent,
  caption,
  ariaLabel,
  tiltDeg = 0,
  className,
  children,
}: WindowChromeProps) {
  return (
    <figure
      className={`fw fw-accent-${accent}${className ? ` ${className}` : ""}`}
      style={{ "--fw-tilt": `${tiltDeg}deg` } as CSSProperties}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="fw-bar">
        <span className="fw-dot fw-dot-red" aria-hidden="true" />
        <span className="fw-dot fw-dot-yellow" aria-hidden="true" />
        <span className="fw-dot fw-dot-green" aria-hidden="true" />
      </div>
      <div className="fw-body">{children}</div>
      <figcaption className="fw-caption">{caption}</figcaption>
    </figure>
  );
}
