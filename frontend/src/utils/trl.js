import { TRL_LEVELS } from './constants';

// Look up a TRL level definition (accepts number or numeric string).
export const getTrl = (level) => TRL_LEVELS.find((t) => t.level === Number(level));

// Human-readable tooltip text for a TRL level, or null if unknown.
export const trlText = (level) => {
  const t = getTrl(level);
  return t ? `TRL ${t.level}: ${t.name} — ${t.desc}` : null;
};
