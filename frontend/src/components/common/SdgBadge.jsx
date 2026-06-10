import React from 'react';
import { SDG_GOALS } from '../../utils/constants';

const getGoal = (goal) => {
  if (typeof goal === 'object' && goal !== null) return goal;
  return SDG_GOALS.find((item) => Number(item.id) === Number(goal));
};

export default function SdgBadge({
  goal,
  selected = false,
  compact = false,
  showName = true,
  className = '',
}) {
  const sdg = getGoal(goal);
  if (!sdg) return null;

  const label = `SDG ${sdg.id}: ${sdg.name}`;

  return (
    <span
      className={[
        'inline-flex items-center overflow-hidden text-white shadow-sm transition',
        compact ? 'min-h-[34px] rounded-control' : 'min-h-[58px] rounded-card',
        selected ? 'ring-2 ring-offset-2 ring-pcpp-pine/30' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ backgroundColor: sdg.color }}
      aria-label={label}
      title={label}
    >
      <span className={[
        'flex shrink-0 items-center justify-center border-r border-white/25 font-bold tabular-nums',
        compact ? 'h-[34px] w-9 text-sm' : 'h-[58px] w-12 text-xl',
      ].join(' ')}>
        {sdg.id}
      </span>
      {showName && (
        <span className={[
          'min-w-0 font-semibold uppercase leading-tight tracking-normal',
          compact ? 'px-2 text-[10px]' : 'px-3 text-[11px]',
        ].join(' ')}>
          {sdg.name}
        </span>
      )}
    </span>
  );
}
