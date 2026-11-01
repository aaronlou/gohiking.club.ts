import { cn } from "@/lib/utils";

export function ContourMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("contour-mark", className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="24" cy="24" r="22" opacity=".35" />
      <path d="M6.5 31c5.4-2.1 7.5-8.2 12.7-9.2 4.5-.9 6.1 3.9 10.3 3.4 4.8-.6 6.4-7.2 12-8.3" />
      <path d="M3.5 37.5c6.2-2 9.1-8.8 15.4-9.3 4.2-.4 5.8 3.2 9.5 2.8 5.2-.5 8-6.2 14.2-7.3" />
      <path d="M13 24.7c3.9-3.4 4.4-9.2 9.9-10.1 4.7-.8 7.7 5.5 13.7 2.9 3.1-1.4 4.6-4.1 6.4-6.5" />
      <path d="m19.5 39 4.5-13 4.6 13" />
      <path d="m24 27 8.2-7.4" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <span className="wordmark__zh">山行档案</span>
      {!compact && (
        <span className="wordmark__en">
          GOHIKING<span>.</span>CLUB
        </span>
      )}
    </span>
  );
}
