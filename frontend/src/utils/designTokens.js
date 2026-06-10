/** JS mirror of the PCPP design tokens (see tailwind.config.js / index.css).
 * Use these for Chart.js datasets and inline styles where Tailwind classes do not reach.
 * Never hardcode a hex in a component: import a token from here.
 */
export const TOKENS = {
  pine: '#0B3D33',
  pine700: '#14503F',
  pine800: '#082F28',
  emerald: '#1D9E75',
  emerald600: '#178363',
  emerald700: '#0D6B57',
  mist: '#F4F6F3',
  water: '#1F7A9B',
  water600: '#17637E',
  waterSoft: '#DFF4F8',
  energy: '#1D9E75',
  energy600: '#178363',
  energySoft: '#DFF5EC',
  food: '#A56516',
  food600: '#8A4F10',
  foodSoft: '#FFF0D2',
  harvest: '#A56516',
  climate: '#3F7E44',
  infrastructure: '#6D5BD0',
  industry: '#9C4E97',
  social: '#B52E5E',
  neutral: '#6B8F84',
  textPrimary: '#1A2520',
  textSecondary: '#5B6B64',
  textTertiary: '#8A968F',
  card: '#FFFFFF',
  border: 'rgba(11,61,51,0.10)',
};

export const WEF_PALETTE = {
  Water: {
    main: TOKENS.water,
    dark: TOKENS.water600,
    soft: TOKENS.waterSoft,
    text: '#0E445A',
  },
  Energy: {
    main: TOKENS.energy,
    dark: TOKENS.energy600,
    soft: TOKENS.energySoft,
    text: '#0D4F3F',
  },
  Food: {
    main: TOKENS.food,
    dark: TOKENS.food600,
    soft: TOKENS.foodSoft,
    text: '#653809',
  },
};

export const WEF_COLORS = {
  Water: WEF_PALETTE.Water.main,
  Energy: WEF_PALETTE.Energy.main,
  Food: WEF_PALETTE.Food.main,
  Other: TOKENS.neutral,
};

export const SECTOR_COLOR_MAP = {
  'Energy & Power': TOKENS.energy600,
  'Water & Sanitation': TOKENS.water,
  'Agriculture & Food': TOKENS.food,
  'Health & Medical': '#3F7E44',
  'Education & Training': '#8C4F9F',
  'Transport & Logistics': '#B45309',
  'Technology & IT': '#2563A8',
  Infrastructure: TOKENS.infrastructure,
  'Housing & Real Estate': '#6B5E4E',
  'Industry & Manufacturing': TOKENS.industry,
  'Tourism & Hospitality': '#A33D4D',
  'Environment & Climate': TOKENS.climate,
  'Finance & Banking': '#49617A',
  'Telecoms & Communications': '#5A5FB8',
  'Retail & Commerce': '#A94465',
  Construction: '#7A5A1C',
  'Arts & Culture': '#8B4E78',
  'Media & Entertainment': '#A23A57',
  'Social Services': TOKENS.social,
  'Research & Development': '#4B6B88',
  'Defense & Security': '#4E5E53',
  'Sports & Recreation': '#2F7A70',
  'Mining & Minerals': '#695849',
  'Fisheries & Coastal': '#177C8F',
  'CPEC Infrastructure': '#7157B8',
  Other: TOKENS.neutral,
};

export const STATUS_COLORS_HEX = {
  ongoing: TOKENS.energy600,
  pipeline: TOKENS.food,
  completed: TOKENS.neutral,
  review: TOKENS.water,
  rejected: '#A32D2D',
};

export const CHART_COLORS = {
  categorical: [
    TOKENS.water,
    TOKENS.energy600,
    TOKENS.food,
    TOKENS.infrastructure,
    TOKENS.industry,
    TOKENS.social,
    TOKENS.climate,
    TOKENS.neutral,
  ],
  grid: 'rgba(11,61,51,0.08)',
  axis: TOKENS.textSecondary,
  tooltipBackground: TOKENS.pine800,
};

// Back-compat alias for older imports.
export const BRAND_COLORS = {
  primary: TOKENS.emerald,
  primaryDark: TOKENS.emerald600,
  accent: TOKENS.food,
  accentWarm: TOKENS.harvest,
  surface: TOKENS.mist,
};

export const getWefColor = (label = '') => {
  const s = (label || '').toString().toLowerCase();
  if (s.includes('water')) return WEF_COLORS.Water;
  if (s.includes('energy') || s.includes('power')) return WEF_COLORS.Energy;
  if (s.includes('food') || s.includes('agri')) return WEF_COLORS.Food;
  return WEF_COLORS.Other;
};

export const getSectorColor = (sector = '') => {
  if (SECTOR_COLOR_MAP[sector]) return SECTOR_COLOR_MAP[sector];
  const s = (sector || '').toString().toLowerCase();
  if (s.includes('water')) return TOKENS.water;
  if (s.includes('energy') || s.includes('power')) return TOKENS.energy600;
  if (s.includes('food') || s.includes('agri')) return TOKENS.food;
  if (s.includes('climate') || s.includes('environment')) return TOKENS.climate;
  if (s.includes('infrastructure') || s.includes('transport')) return TOKENS.infrastructure;
  if (s.includes('health') || s.includes('social')) return TOKENS.social;
  return TOKENS.neutral;
};

export const getStatusAccent = (status = '') => {
  const s = (status || '').toString().toLowerCase();
  if (s === 'under_implementation') return STATUS_COLORS_HEX.ongoing;
  if (s === 'completed') return STATUS_COLORS_HEX.completed;
  if (s === 'rejected') return STATUS_COLORS_HEX.rejected;
  if (s === 'under_review') return STATUS_COLORS_HEX.review;
  return STATUS_COLORS_HEX.pipeline;
};

const mergeChartPlugins = (basePlugins, extraPlugins = {}) => ({
  ...basePlugins,
  ...extraPlugins,
  legend: {
    ...basePlugins.legend,
    ...extraPlugins.legend,
    labels: {
      ...basePlugins.legend?.labels,
      ...extraPlugins.legend?.labels,
    },
  },
  tooltip: {
    ...basePlugins.tooltip,
    ...extraPlugins.tooltip,
    callbacks: {
      ...basePlugins.tooltip?.callbacks,
      ...extraPlugins.tooltip?.callbacks,
    },
  },
});

const mergeChartScales = (baseScales, extraScales = {}) => {
  const next = { ...baseScales };
  Object.entries(extraScales).forEach(([axis, value]) => {
    next[axis] = {
      ...(baseScales[axis] || {}),
      ...value,
      grid: {
        ...(baseScales[axis]?.grid || {}),
        ...(value?.grid || {}),
      },
      ticks: {
        ...(baseScales[axis]?.ticks || {}),
        ...(value?.ticks || {}),
      },
    };
  });
  return next;
};

export const getChartOptions = (extra = {}) => {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: CHART_COLORS.axis,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: CHART_COLORS.tooltipBackground,
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        displayColors: true,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: CHART_COLORS.grid, drawBorder: false },
        ticks: { color: CHART_COLORS.axis, font: { size: 11 } },
      },
      y: {
        grid: { color: CHART_COLORS.grid, drawBorder: false },
        ticks: { color: CHART_COLORS.axis, font: { size: 11 } },
      },
    },
  };

  return {
    ...base,
    ...extra,
    plugins: mergeChartPlugins(base.plugins, extra.plugins),
    scales: extra.scales === null ? undefined : mergeChartScales(base.scales, extra.scales),
  };
};
