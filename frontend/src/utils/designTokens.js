/** JS mirror of the PCPP design tokens (see tailwind.config.js / index.css).
 *  Use these for Chart.js datasets and inline styles where Tailwind classes don't reach.
 *  Never hardcode a hex in a component — import a token from here.
 */
export const TOKENS = {
  pine: '#0E3A2F',
  pine700: '#14503F',
  emerald: '#1D9E75',
  emerald600: '#178363',
  mist: '#F4F6F3',
  water: '#2E86C1',
  energy: '#1D9E75',
  food: '#E9A23B',
  harvest: '#E9A23B',
  textPrimary: '#1A2520',
  textSecondary: '#5B6B64',
  textTertiary: '#8A968F',
  card: '#FFFFFF',
  border: 'rgba(14,58,47,0.10)',
};

// WEF nexus / sector colors — Water=blue, Energy=emerald, Food=amber, everything else grey.
// Pass these EXPLICITLY to Chart.js; never let it auto-assign sector colors.
export const WEF_COLORS = {
  Water: '#2E86C1',
  Energy: '#1D9E75',
  Food: '#E9A23B',
  Other: '#8A968F',
};

// Lifecycle + workflow status colors (fixed mapping, use everywhere).
export const STATUS_COLORS_HEX = {
  ongoing: '#1D9E75',   // under_implementation
  pipeline: '#E9A23B',  // approved / under_review / etc.
  completed: '#6B8F84', // muted pine-grey
  review: '#2E86C1',    // under_review workflow badge
  rejected: '#A32D2D',
};

// Back-compat alias for older imports.
export const BRAND_COLORS = {
  primary: TOKENS.emerald,
  primaryDark: TOKENS.emerald600,
  accent: TOKENS.food,
  accentWarm: TOKENS.harvest,
  surface: TOKENS.mist,
};

// Map any sector/nexus label to a WEF color (keyword-based, so it works for
// both "Energy" and "Energy & Power", "Agriculture & Food", etc.).
export const getSectorColor = (sector = '') => {
  const s = (sector || '').toString().toLowerCase();
  if (s.includes('water')) return WEF_COLORS.Water;
  if (s.includes('energy') || s.includes('power')) return WEF_COLORS.Energy;
  if (s.includes('food') || s.includes('agri')) return WEF_COLORS.Food;
  return WEF_COLORS.Other;
};

// Map a project status to its accent color.
export const getStatusAccent = (status = '') => {
  const s = (status || '').toString().toLowerCase();
  if (s === 'under_implementation') return STATUS_COLORS_HEX.ongoing;
  if (s === 'completed') return STATUS_COLORS_HEX.completed;
  if (s === 'rejected') return STATUS_COLORS_HEX.rejected;
  if (s === 'under_review') return STATUS_COLORS_HEX.review;
  return STATUS_COLORS_HEX.pipeline; // approved / changes_requested / draft / archived
};
