"use client";

interface SpectrumLoaderProps {
  direction: "left" | "right";
}

export default function SpectrumLoader({ direction }: SpectrumLoaderProps) {
  const isLeft = direction === "left";

  // Needle animation class
  const needleClass = isLeft ? "needle-swing-left" : "needle-swing-right";

  // Colors
  const glowColor = isLeft ? "#ef4444" : "#3b82f6";
  const needleFill = isLeft ? "#dc2626" : "#2563eb";

  return (
    <div className="flex flex-col items-center py-4">
      <svg
        width="100%"
        height="48"
        viewBox="0 0 280 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-[280px]"
      >
        <defs>
          {/* Spectrum gradient */}
          <linearGradient id={`spectrum-${direction}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="35%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="65%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`glow-${direction}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={glowColor} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Spectrum bar */}
        <rect
          x="20"
          y="20"
          width="240"
          height="6"
          rx="3"
          fill={`url(#spectrum-${direction})`}
          opacity="0.8"
        />

        {/* Tick marks */}
        <line x1="20" y1="16" x2="20" y2="32" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="140" y1="14" x2="140" y2="34" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="260" y1="16" x2="260" y2="32" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

        {/* Labels */}
        <text x="20" y="44" textAnchor="middle" fontSize="8" fill="#ef4444" opacity="0.6" fontWeight="600">L</text>
        <text x="260" y="44" textAnchor="middle" fontSize="8" fill="#3b82f6" opacity="0.6" fontWeight="600">R</text>

        {/* Needle group — animated via CSS */}
        <g
          className={needleClass}
          filter={`url(#glow-${direction})`}
          style={{ transformOrigin: "140px 20px" }}
        >
          {/* Needle triangle (pointing down) */}
          <polygon
            points="140,8 134,0 146,0"
            fill={needleFill}
          />
          {/* Needle line */}
          <line
            x1="140"
            y1="8"
            x2="140"
            y2="28"
            stroke={needleFill}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Needle dot */}
          <circle
            cx="140"
            cy="23"
            r="4"
            fill={needleFill}
            className="needle-pulse"
          />
        </g>
      </svg>

      {/* Label */}
      <span className={`text-xs font-medium mt-1 ${isLeft ? "text-red-400" : "text-blue-400"}`}>
        переписываю…
      </span>
    </div>
  );
}
