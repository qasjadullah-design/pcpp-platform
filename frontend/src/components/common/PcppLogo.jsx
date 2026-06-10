import React from 'react';
import { WefNexusMark } from './WefNexusMark';

/**
 * PCPP wordmark + interlocking-circles "nexus" mark, as inline SVG so it scales
 * crisply and recolors via token.
 *   variant="dark"  -> on pine surfaces (sidebar): white text + emerald/mint mark
 *   variant="light" -> on white (login/headers): pine text + emerald mark
 */
export default function PcppLogo({ variant = 'dark', showTagline = true, className = '' }) {
  const onDark = variant === 'dark';
  const titleColor = onDark ? 'text-white' : 'text-pcpp-pine';
  const tagColor = onDark ? 'text-white/70' : 'text-ink-secondary';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <WefNexusMark size={34} />
      <div className="leading-tight">
        <div className={`font-semibold text-base ${titleColor}`}>PCPP</div>
        {showTagline && <div className={`text-[11px] ${tagColor}`}>Pakistan Country Project Platform</div>}
      </div>
    </div>
  );
}
