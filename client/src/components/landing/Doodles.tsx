// Original, hand-drawn SVG doodles for the landing page desktop scene.

export function FolderIcon({ label }: { label: string }) {
  return (
    <div className="doodle-folder" aria-hidden="true">
      <svg viewBox="0 0 64 48" width="56" height="42">
        <path d="M2 10 h18 l4 6 h38 v28 a3 3 0 0 1 -3 3 h-54 a3 3 0 0 1 -3 -3 z" fill="var(--color-manila)" stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
        <path d="M2 10 a3 3 0 0 1 3 -3 h14 l5 5 h-22 z" fill="#f3e8c8" stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
      </svg>
      <span className="doodle-label">{label}</span>
    </div>
  );
}

export function TrashIcon() {
  return (
    <div className="doodle-trash" aria-hidden="true">
      <svg viewBox="0 0 48 56" width="40" height="46">
        <rect x="10" y="4" width="28" height="6" rx="2" fill="#ddd3bd" stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
        <rect x="4" y="10" width="40" height="6" rx="2" fill="#ece4d0" stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
        <path d="M8 17 h32 l-3 34 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 z" fill="#f5efe1" stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
        <line x1="18" y1="23" x2="19" y2="49" stroke="rgba(28,37,65,0.22)" strokeWidth="1.5" />
        <line x1="24" y1="23" x2="24" y2="49" stroke="rgba(28,37,65,0.22)" strokeWidth="1.5" />
        <line x1="30" y1="23" x2="29" y2="49" stroke="rgba(28,37,65,0.22)" strokeWidth="1.5" />
      </svg>
      <span className="doodle-label">trash</span>
    </div>
  );
}

const FACES: Record<"happy" | "wink" | "calm", { eyes: string; mouth: string }> = {
  happy: { eyes: "M16 22 q2 -3 4 0 M28 22 q2 -3 4 0", mouth: "M15 29 q9 8 18 0" },
  wink: { eyes: "M16 22 h4 M30 19 q2 -3 4 0", mouth: "M15 28 q9 6 18 0" },
  calm: { eyes: "M16 22 q2 -2 4 0 M28 22 q2 -2 4 0", mouth: "M17 30 h14" },
};

export function Emoticon({
  variant = "happy",
  tint = "var(--color-pastel-sand)",
}: {
  variant?: "happy" | "wink" | "calm";
  tint?: string;
}) {
  const face = FACES[variant];
  return (
    <svg className="doodle-emoticon" viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill={tint} stroke="rgba(28,37,65,0.18)" strokeWidth="1.5" />
      <path d={face.eyes} fill="none" stroke="#1c2541" strokeWidth="2.2" strokeLinecap="round" />
      <path d={face.mouth} fill="none" stroke="#1c2541" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
