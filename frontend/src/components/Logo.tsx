"use client";

/**
 * zcrX Logo — Geometric Z lettermark (SVG, transparent bg)
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="zg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      {/* Rounded square bg */}
      <rect x="0" y="0" width="48" height="48" rx="12" fill="rgba(99,102,241,0.1)" />
      {/* Z shape */}
      <path
        d="M12 12H36L18 36H36"
        stroke="url(#zg)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoText({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-1px",
        background: "linear-gradient(135deg, #818cf8, #c084fc)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      zcr
      <span
        style={{
          background: "linear-gradient(135deg, #f472b6, #f97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: 900,
          letterSpacing: "0px",
        }}
      >
        X
      </span>
    </span>
  );
}
