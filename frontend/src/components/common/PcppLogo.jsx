import React from 'react';
import { TOKENS } from '../../utils/designTokens';

/**
 * PCPP wordmark + interlocking-circles "nexus" mark, as inline SVG so it scales
 * crisply and recolors via token.
 *   variant="dark"  -> on pine surfaces (sidebar): white text + emerald/mint mark
 *   variant="light" -> on white (login/headers): pine text + emerald mark
 */
export default function PcppLogo({ variant = 'dark', showTagline = true, className = '' }) {
  const onDark = variant === 'dark';
  const ring1 = TOKENS.emerald;
  const ring2 = onDark ? TOKENS.mist : TOKENS.emerald600;
  const ring3 = onDark ? TOKENS.card : TOKENS.pine;
  const titleColor = onDark ? 'text-white' : 'text-pcpp-pine';
  const tagColor = onDark ? 'text-white/70' : 'text-ink-secondary';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="shrink-0">
        <circle cx="18" cy="19" r="10" stroke={ring1} strokeWidth="2.5" />
        <circle cx="30" cy="19" r="10" stroke={ring2} strokeWidth="2.5" />
        <circle cx="24" cy="30" r="10" stroke={ring3} strokeWidth="2.5" />
      </svg>
      <div className="leading-tight">
        <div className={`font-semibold text-base ${titleColor}`}>PCPP</div>
        {showTagline && <div className={`text-[11px] ${tagColor}`}>Pakistan Country Project Platform</div>}
      </div>
    </div>
  );
}
