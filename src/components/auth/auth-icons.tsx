import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function EyeIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.8 5.3A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7C3.6 8.8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4.1-.9" />
    </svg>
  );
}

export function ArrowRight(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function SpinnerIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
