"use client";

/** Jumps to the join form with the right "I am a" choice already made. */
export default function ReserveButton({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <a
      href="#join"
      className="btn btn-ghost w-full !min-h-12 text-center"
      onClick={() => window.dispatchEvent(new CustomEvent("graas:kind", { detail: kind }))}
    >
      {children}
    </a>
  );
}
