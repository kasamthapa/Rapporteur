interface LogoProps {
  onClick?: () => void;
  className?: string;
}

export function Logo({ onClick, className }: LogoProps) {
  return (
    <button
      type="button"
      className={`logo${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label="rapporteur home"
    >
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="var(--color-ink)" />
        <text
          x="13"
          y="19"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="15"
          fill="#fdf8ec"
        >
          r
        </text>
        <path
          d="M6,22.5 Q14,26 22,22.5"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-word">rapporteur</span>
    </button>
  );
}
