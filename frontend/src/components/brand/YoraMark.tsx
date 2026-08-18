import { useId } from "react";

type YoraMarkProps = {
  className?: string;
  title?: string;
};

/** Geometric Y mark — same family language as Yoradm (gold terminals on charcoal). */
export function YoraMark({ className = "h-9 w-9", title = "YORA PET" }: YoraMarkProps) {
  const uid = useId().replace(/:/g, "");
  const bgId = `yp-bg-${uid}`;
  const markId = `yp-mark-${uid}`;

  return (
    <svg
      className={`shrink-0 ${className}`.trim()}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="10"
          y1="6"
          x2="54"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0e0f12" />
          <stop stopColor="#3d2e16" />
        </linearGradient>
        <linearGradient
          id={markId}
          x1="18"
          y1="16"
          x2="46"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e0b878" />
          <stop stopColor="#d4a35c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bgId})`} />
      <rect
        x="1.25"
        y="1.25"
        width="61.5"
        height="61.5"
        rx="14.75"
        stroke="#d4a35c"
        strokeOpacity="0.32"
      />
      <circle cx="32" cy="32" r="21" fill="#d4a35c" fillOpacity="0.1" />
      <path
        d="M20 19 L32 37 L44 19"
        stroke={`url(#${markId})`}
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 37 V47"
        stroke={`url(#${markId})`}
        strokeWidth="4.25"
        strokeLinecap="round"
      />
      <circle cx="20" cy="19" r="3.25" fill="#e0b878" />
      <circle cx="44" cy="19" r="3.25" fill="#e0b878" />
      <circle cx="32" cy="47" r="3.75" fill="#e8c992" />
    </svg>
  );
}
