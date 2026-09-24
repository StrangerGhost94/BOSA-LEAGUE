/** Cinematic, image-free stadium atmosphere: floodlights, pitch in perspective, haze and light. */
export function StadiumBackdrop({ intensity = 1, className = "" }: { intensity?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#1B2033_0%,#0A0F1E_45%,#060913_100%)]" />
      {/* moving light blooms */}
      <div className="absolute -left-[10%] top-[-20%] h-[70%] w-[60%] rounded-full bg-crimson/25 blur-[100px]" style={{ opacity: 0.8 * intensity }} />
      <div className="absolute -right-[15%] top-[10%] h-[60%] w-[55%] rounded-full bg-gold/15 blur-[100px]" style={{ opacity: intensity }} />
      <div className="absolute bottom-[-30%] left-[20%] h-[60%] w-[60%] rounded-full bg-emerald/15 blur-[100px]" />

      {/* floodlight beams */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FFF6E0" stopOpacity=".55" />
            <stop offset=".6" stopColor="#FFF6E0" stopOpacity=".06" />
            <stop offset="1" stopColor="#FFF6E0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="turf" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0E3B2C" stopOpacity="0" />
            <stop offset=".35" stopColor="#0E3B2C" stopOpacity=".55" />
            <stop offset="1" stopColor="#07251B" stopOpacity=".95" />
          </linearGradient>
          <radialGradient id="lamp">
            <stop offset="0" stopColor="#FFFBEF" />
            <stop offset=".4" stopColor="#FFE9B8" stopOpacity=".7" />
            <stop offset="1" stopColor="#FFE9B8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g>
          <path d="M180 60 L40 1000 L620 1000 Z" fill="url(#beam)" opacity=".35" />
        </g>
        <g>
          <path d="M1420 60 L980 1000 L1560 1000 Z" fill="url(#beam)" opacity=".35" />
        </g>
        <circle cx="180" cy="60" r="60" fill="url(#lamp)" />
        <circle cx="1420" cy="60" r="60" fill="url(#lamp)" />
        {/* pitch */}
        <path d="M300 560 L1300 560 L1700 1000 L-100 1000 Z" fill="url(#turf)" />
        <g stroke="#F6F1E7" strokeOpacity=".16" fill="none" strokeWidth="1.4">
          <path d="M300 560 L1300 560 L1700 1000 L-100 1000 Z" />
          <path d="M800 560 L800 1000" />
          <ellipse cx="800" cy="720" rx="190" ry="55" />
          <path d="M620 560 L600 610 L1000 610 L980 560" />
          <path d="M470 1000 L520 870 L1080 870 L1130 1000" />
        </g>
        {/* stripes */}
        <g fill="#FFFFFF" opacity=".018">
          <path d="M300 560 L425 560 L125 1000 L-100 1000Z" />
          <path d="M550 560 L675 560 L575 1000 L350 1000Z" />
          <path d="M800 560 L925 560 L1025 1000 L800 1000Z" />
          <path d="M1050 560 L1175 560 L1475 1000 L1250 1000Z" />
        </g>
      </svg>
      {/* haze + vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(6,9,19,.85)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,9,19,.7)_100%)]" />
      <div className="pitch-lines absolute inset-0 opacity-40 [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
    </div>
  );
}
