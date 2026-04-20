export const BRAND_COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  accent: '#F59E0B',
  accentWarm: '#D97706',
  surface: '#F8FAFC',
};

const SECTOR_COLOR_MAP = {
  energy: '#f97316',
  transport: '#3b82f6',
  health: '#ec4899',
  education: '#a855f7',
  water: '#06b6d4',
  technology: '#ef4444',
  agriculture: '#84cc16',
  industry: '#475569',
};

const STATUS_COLOR_MAP = {
  planning: '#f59e0b',
  under_review: '#f59e0b',
  approved: '#16a34a',
  under_implementation: '#2563eb',
  completed: '#0f172a',
  archived: '#6b7280',
};

export const getSectorColor = (sector = '') => {
  const key = sector?.toLowerCase?.() || '';
  return SECTOR_COLOR_MAP[key] || BRAND_COLORS.primary;
};

export const getStatusAccent = (status = '') => {
  const key = status?.toLowerCase?.() || '';
  return STATUS_COLOR_MAP[key] || '#64748b';
};
