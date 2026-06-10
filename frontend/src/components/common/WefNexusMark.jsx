import React from 'react';
import { Droplets, Wheat, Zap } from 'lucide-react';
import { WEF_PALETTE, getWefColor } from '../../utils/designTokens';

const ICONS = {
  Water: Droplets,
  Energy: Zap,
  Food: Wheat,
};

export function WefNexusMark({ size = 34, className = '' }) {
  const ring = Math.max(9, Math.round(size * 0.32));
  const stroke = Math.max(2, Math.round(size * 0.07));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle cx="18" cy="19" r={ring} stroke={WEF_PALETTE.Water.main} strokeWidth={stroke} />
      <circle cx="30" cy="19" r={ring} stroke={WEF_PALETTE.Energy.main} strokeWidth={stroke} />
      <circle cx="24" cy="30" r={ring} stroke={WEF_PALETTE.Food.main} strokeWidth={stroke} />
    </svg>
  );
}

export function WefNexusBadge({ value, selected = false, className = '' }) {
  const Icon = ICONS[value] || Droplets;
  const color = getWefColor(value);
  const palette = WEF_PALETTE[value] || WEF_PALETTE.Water;

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-control border px-3 py-2 text-sm font-medium transition',
        selected ? 'text-white shadow-sm' : 'bg-white',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        color: selected ? '#FFFFFF' : color,
        backgroundColor: selected ? color : palette.soft,
        borderColor: selected ? color : `${color}55`,
      }}
    >
      <Icon size={16} strokeWidth={1.9} />
      {value}
    </span>
  );
}
