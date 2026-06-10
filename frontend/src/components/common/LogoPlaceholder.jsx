import React from 'react';
import { Building2 } from 'lucide-react';
import { getSectorColor } from '../../utils/designTokens';

const initials = (label = '') => {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

export default function LogoPlaceholder({ label, src, tone = 'Other', className = '' }) {
  const color = getSectorColor(tone || label || 'Other');

  if (src) {
    return (
      <img
        src={src}
        alt={label ? `${label} logo` : 'Logo'}
        className={`h-10 w-10 rounded-control border border-pcpp-border bg-white object-contain p-1 ${className}`}
      />
    );
  }

  const text = initials(label);

  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border text-xs font-semibold ${className}`}
      style={{ backgroundColor: `${color}12`, borderColor: `${color}40`, color }}
      title={label}
      aria-label={label ? `${label} logo placeholder` : 'Logo placeholder'}
    >
      {text || <Building2 size={17} strokeWidth={1.8} />}
    </span>
  );
}
