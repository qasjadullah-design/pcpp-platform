import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BarChart3, CircleDollarSign, Download, ExternalLink, FolderOpen, Leaf, LocateFixed, Map as MapIcon, MapPin, RefreshCw, Wallet } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import { formatCurrency, getProjectStatusLabel } from '../../utils/constants';
import { CHART_COLORS, STATUS_COLORS_HEX, TOKENS, getChartOptions, getWefColor } from '../../utils/designTokens';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, ChartTooltip, Legend);

const num = (value) => (Number(value) || 0).toLocaleString();
const formatTco2e = (value) => {
  const numValue = Number(value) || 0;
  if (Math.abs(numValue) >= 1000000) return `${(numValue / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MtCO2e`;
  if (Math.abs(numValue) >= 1000) return `${(numValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} ktCO2e`;
  return `${numValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO2e`;
};

const lifecycleOrder = ['Pipeline', 'Ongoing', 'Completed'];
const lifecycleColors = {
  Pipeline: STATUS_COLORS_HEX.pipeline,
  Ongoing: STATUS_COLORS_HEX.ongoing,
  Completed: STATUS_COLORS_HEX.completed,
};

const wefColor = (sector) => getWefColor(sector);

const emptyChart = (rows) => !rows || rows.length === 0 || rows.every((row) => Number(row.count || row.investment || 0) === 0);

const sectorBucket = (project) => {
  const sector = (project.primary_sector || '').toLowerCase();
  if (sector.includes('water')) return 'Water';
  if (sector.includes('energy') || sector.includes('power')) return 'Energy';
  if (sector.includes('food') || sector.includes('agri')) return 'Food';
  return 'Other';
};

const lifecycleBucket = (project) => {
  if (project.status === 'under_implementation') return 'Ongoing';
  if (project.status === 'completed') return 'Completed';
  return 'Pipeline';
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const parsedValue = (ctx) => {
  if (typeof ctx.parsed === 'number') return ctx.parsed;
  if (typeof ctx.parsed?.x === 'number') return ctx.parsed.x;
  if (typeof ctx.parsed?.y === 'number') return ctx.parsed.y;
  return 0;
};

const mapFallbackBounds = {
  min_latitude: 23,
  max_latitude: 38,
  min_longitude: 60,
  max_longitude: 78,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const coordinatePercent = (value, min, max) => {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 3, 97);
};

const pointSize = (project) => clamp(8 + Math.log10(Number(project.total_cost || 0) + 1) * 1.8, 9, 22);

const statusLabel = (status) => getProjectStatusLabel(status);

const districtKey = (row) => `${row.province || 'Unspecified'}::${row.district || 'Unspecified'}`;

const matchesProjectFilters = (project, activeFilter, tableFilters) => {
  if (activeFilter?.type === 'sector' && sectorBucket(project) !== activeFilter.value) return false;
  if (activeFilter?.type === 'lifecycle' && lifecycleBucket(project) !== activeFilter.value) return false;
  if (activeFilter?.type === 'province' && (project.province || 'Unspecified') !== activeFilter.value) return false;
  if (activeFilter?.type === 'trl' && Number(project.trl_level) !== Number(activeFilter.value)) return false;
  if (activeFilter?.type === 'partial_support' && !(Number(project.funding_gap || 0) > 0 && Number(project.total_cost || 0) > 0)) return false;
  if (tableFilters.sector && sectorBucket(project) !== tableFilters.sector) return false;
  if (tableFilters.lifecycle && lifecycleBucket(project) !== tableFilters.lifecycle) return false;
  if (tableFilters.trl && Number(project.trl_level) !== Number(tableFilters.trl)) return false;
  if (tableFilters.province && (project.province || 'Unspecified') !== tableFilters.province) return false;
  if (tableFilters.district && (project.district || 'Unspecified') !== tableFilters.district) return false;
  return true;
};

function chartBaseOptions(extra = {}) {
  return getChartOptions({
    ...extra,
    plugins: {
      ...extra.plugins,
      tooltip: {
        ...extra.plugins?.tooltip,
        callbacks: {
          ...extra.plugins?.tooltip?.callbacks,
          label: (ctx) => `${ctx.dataset.label || ctx.label}: ${num(parsedValue(ctx))}`,
        },
      },
    },
  });
}

function KpiCard({ Icon, label, value, accent = false, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-pcpp-card rounded-card border p-5 text-left ${accent ? 'border-pcpp-harvest/40' : 'border-pcpp-border'} ${onClick ? 'transition hover:border-pcpp-emerald hover:shadow-sm' : ''}`}
    >
      <span className={`w-10 h-10 rounded-control flex items-center justify-center mb-3 ${accent ? 'bg-pcpp-harvest/10 text-pcpp-harvest' : 'bg-pcpp-emerald/10 text-pcpp-emerald'}`}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="text-2xl font-semibold text-pcpp-pine mb-1 tabular-nums">{value}</div>
      <div className="text-sm text-ink-secondary">{label}</div>
    </Wrapper>
  );
}

function ChartPanel({ title, caption, children, empty }) {
  return (
    <section className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-pcpp-pine">{title}</h2>
        {caption && <p className="text-xs text-ink-secondary mt-1">{caption}</p>}
      </div>
      {empty ? (
        <div className="h-64 flex items-center justify-center text-sm text-ink-tertiary bg-pcpp-mist rounded-card">
          No data available
        </div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </section>
  );
}

function ProjectsMapPanel({ data, isProvince, visibleProjects, missingProjects, selectedDistrictKey, onDistrictSelect, onClearDistrict, onExportMissing }) {
  const mapData = data?.map || {};
  const bounds = { ...mapFallbackBounds, ...(mapData.bounds || {}) };
  const districtRows = mapData.districts || [];
  const totalProjects = Number(data?.summary?.total_projects || 0);
  const geocodedCount = districtRows.reduce((sum, row) => sum + Number(row.geocoded_count || 0), 0);
  const missingCoordinates = missingProjects?.length ?? Math.max(0, totalProjects - geocodedCount);
  const districtCount = districtRows.filter((row) => Number(row.count || 0) > 0).length;
  const geocodedDistrictCount = districtRows.filter((row) => Number(row.geocoded_count || 0) > 0).length;
  const rankedDistricts = [...districtRows]
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 12);

  return (
    <section className="bg-pcpp-card border border-pcpp-border rounded-card p-5 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-pcpp-pine flex items-center gap-2">
            <MapIcon size={18} strokeWidth={1.75} className="text-pcpp-emerald" />
            Project map
          </h2>
          <p className="text-xs text-ink-secondary mt-1">
            {isProvince ? `${data.province} project locations by district` : 'National project locations by province and district'}
          </p>
          {selectedDistrictKey && (
            <button
              type="button"
              onClick={onClearDistrict}
              className="mt-2 inline-flex items-center rounded-control bg-pcpp-emerald/10 px-3 py-1.5 text-xs text-pcpp-emerald"
            >
              District selected: clear
            </button>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="bg-pcpp-mist rounded-control px-3 py-2">
              <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{num(visibleProjects.length)}</div>
              <div className="text-[11px] text-ink-secondary">visible points</div>
            </div>
            <div className="bg-pcpp-mist rounded-control px-3 py-2">
              <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{num(geocodedCount)}</div>
              <div className="text-[11px] text-ink-secondary">geocoded</div>
            </div>
            <div className="bg-pcpp-mist rounded-control px-3 py-2">
              <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{num(missingCoordinates)}</div>
              <div className="text-[11px] text-ink-secondary">missing</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onExportMissing}
            disabled={!missingProjects?.length}
            className="inline-flex items-center justify-center gap-2 rounded-control border border-pcpp-border bg-white px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-pcpp-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} strokeWidth={1.75} />
            Export missing coordinates
          </button>
          {!isProvince && (
            <Link
              to="/admin/projects?coordinate_status=missing"
              className="inline-flex items-center justify-center gap-2 rounded-control bg-pcpp-emerald px-3 py-2 text-xs font-medium text-white hover:bg-pcpp-emerald-600"
            >
              <ExternalLink size={14} strokeWidth={1.75} />
              Fix in admin
            </Link>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="relative min-h-[420px] rounded-card border border-pcpp-border bg-pcpp-mist">
          <div
            className="absolute inset-0 rounded-card"
            style={{
              backgroundImage: `linear-gradient(${TOKENS.border} 1px, transparent 1px), linear-gradient(90deg, ${TOKENS.border} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute inset-4 rounded-card border border-pcpp-border bg-white/60" />
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-control bg-white px-3 py-2 text-xs text-ink-secondary shadow-sm">
            <LocateFixed size={14} strokeWidth={1.75} className="text-pcpp-emerald" />
            Lat {bounds.min_latitude}-{bounds.max_latitude}, Long {bounds.min_longitude}-{bounds.max_longitude}
          </div>
          <div className="absolute bottom-5 left-5 flex flex-wrap gap-2 rounded-control bg-white px-3 py-2 shadow-sm">
            {['Water', 'Energy', 'Food', 'Other'].map((sector) => (
              <span key={sector} className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: wefColor(sector) }} />
                {sector}
              </span>
            ))}
          </div>

          {visibleProjects.map((project) => {
            const latitude = Number(project.latitude);
            const longitude = Number(project.longitude);
            const left = coordinatePercent(longitude, bounds.min_longitude, bounds.max_longitude);
            const top = 100 - coordinatePercent(latitude, bounds.min_latitude, bounds.max_latitude);
            const size = pointSize(project);
            const sector = sectorBucket(project);

            return (
              <div
                key={project.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <Link
                  to={`/projects/${project.id}`}
                  aria-label={project.title}
                  className="block rounded-full border-2 border-white shadow-sm ring-1 ring-pcpp-pine/10 transition hover:scale-125 hover:ring-2 hover:ring-pcpp-emerald focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
                  style={{ width: size, height: size, backgroundColor: wefColor(sector) }}
                />
                <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-3 hidden w-72 -translate-x-1/2 rounded-card border border-pcpp-border bg-white p-3 text-left shadow-lg group-hover:block group-focus-within:block">
                  <div className="text-sm font-semibold text-pcpp-pine leading-snug">{project.title}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-ink-secondary">
                    <span>District</span>
                    <span className="font-medium text-ink">{project.district || 'Unspecified'}</span>
                    {!isProvince && (
                      <>
                        <span>Province</span>
                        <span className="font-medium text-ink">{project.province || 'Unspecified'}</span>
                      </>
                    )}
                    <span>Sector</span>
                    <span className="font-medium text-ink">{project.primary_sector || sector}</span>
                    <span>Status</span>
                    <span className="font-medium text-ink capitalize">{statusLabel(project.status)}</span>
                    <span>Position</span>
                    <span className="font-medium text-ink tabular-nums">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                    <span>Cost</span>
                    <span className="font-medium text-ink tabular-nums">{formatCurrency(project.total_cost)}</span>
                    <span>Gap</span>
                    <span className="font-medium text-ink tabular-nums">{formatCurrency(project.funding_gap)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {visibleProjects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-card border border-pcpp-border bg-white px-4 py-3 text-sm text-ink-secondary shadow-sm">
                No mapped project points match the current filters.
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-card border border-pcpp-border bg-white overflow-hidden">
          <div className="p-4 border-b border-pcpp-border">
            <h3 className="text-sm font-semibold text-pcpp-pine flex items-center gap-2">
              <MapPin size={16} strokeWidth={1.75} className="text-pcpp-emerald" />
              District coverage
            </h3>
            <p className="text-xs text-ink-secondary mt-1">
              {num(geocodedDistrictCount)} of {num(districtCount)} districts have mapped project coordinates.
            </p>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {rankedDistricts.map((district) => {
              const selected = selectedDistrictKey === districtKey(district);

              return (
                <button
                  key={`${district.province}-${district.district}`}
                  type="button"
                  onClick={() => onDistrictSelect(district)}
                  className={`block w-full px-4 py-3 text-left border-b border-pcpp-border last:border-0 hover:bg-pcpp-mist ${selected ? 'bg-pcpp-emerald/10' : 'bg-white'}`}
                >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-pcpp-pine">{district.district}</div>
                    {!isProvince && <div className="text-[11px] text-ink-secondary">{district.province}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{num(district.count)}</div>
                    <div className="text-[11px] text-ink-secondary">projects</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-secondary">
                  <span>{num(district.geocoded_count)} mapped</span>
                  <span className="tabular-nums">{formatCurrency(district.investment)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-pcpp-mist overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pcpp-emerald"
                    style={{ width: `${district.count ? clamp((district.geocoded_count / district.count) * 100, 0, 100) : 0}%` }}
                  />
                </div>
                </button>
              );
            })}
            {rankedDistricts.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-tertiary">
                District data is not available for this scope.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [tableFilters, setTableFilters] = useState({ sector: '', lifecycle: '', trl: '', province: '', district: '' });

  useEffect(() => {
    analyticsAPI.getOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const isProvince = data?.scope === 'province';

  const sectorRows = data?.by_sector || [];
  const lifecycleRows = lifecycleOrder.map((label) => {
    const found = (data?.by_lifecycle || []).find((row) => row.lifecycle === label);
    return { lifecycle: label, count: found?.count || 0 };
  });
  const trlRows = data?.by_trl || [];
  const provinceRows = data?.by_province || [];
  const projectRows = data?.projects || [];
  const mapProjectRows = data?.map?.projects || [];
  const missingMapProjectRows = data?.map?.missing_projects || [];

  const filterOptions = useMemo(() => ({
    sectors: Array.from(new Set(projectRows.map(sectorBucket))).sort(),
    lifecycles: lifecycleOrder,
    trls: Array.from(new Set(projectRows.map((project) => project.trl_level).filter(Boolean))).sort((a, b) => Number(a) - Number(b)),
    provinces: Array.from(new Set(projectRows.map((project) => project.province || 'Unspecified'))).sort(),
    districts: Array.from(new Set(projectRows
      .filter((project) => !tableFilters.province || (project.province || 'Unspecified') === tableFilters.province)
      .map((project) => project.district || 'Unspecified'))).sort(),
  }), [projectRows, tableFilters.province]);

  const filteredProjects = useMemo(() => {
    return projectRows.filter((project) => matchesProjectFilters(project, activeFilter, tableFilters));
  }, [activeFilter, projectRows, tableFilters]);

  const visibleMapProjects = useMemo(() => {
    return mapProjectRows.filter((project) => matchesProjectFilters(project, activeFilter, tableFilters));
  }, [activeFilter, mapProjectRows, tableFilters]);

  const filteredMissingMapProjects = useMemo(() => {
    return missingMapProjectRows.filter((project) => matchesProjectFilters(project, activeFilter, tableFilters));
  }, [activeFilter, missingMapProjectRows, tableFilters]);

  const selectedDistrictKey = tableFilters.district
    ? `${tableFilters.province || (isProvince ? data?.province : 'Unspecified')}::${tableFilters.district}`
    : '';

  const clearFilters = () => {
    setActiveFilter(null);
    setTableFilters({ sector: '', lifecycle: '', trl: '', province: '', district: '' });
  };

  const clearDistrictFilter = () => {
    setTableFilters((current) => ({ ...current, district: '' }));
  };

  const handleDistrictSelect = (district) => {
    setTableFilters((current) => ({
      ...current,
      province: isProvince ? current.province : district.province,
      district: district.district,
    }));
  };

  const handleExport = () => {
    const headers = ['Project', !isProvince && 'Province', 'Sector', 'Lifecycle', 'Status', 'Cost', 'Funding gap'].filter(Boolean);
    const rows = filteredProjects.map((project) => ([
      project.title,
      !isProvince && (project.province || 'Unspecified'),
      project.primary_sector || 'Unspecified',
      lifecycleBucket(project),
      getProjectStatusLabel(project.status),
      project.total_cost || 0,
      project.funding_gap || 0,
    ].filter((cell) => cell !== false)));
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcpp-analytics-${isProvince ? data.province : 'national'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMissingCoordinatesExport = () => {
    const headers = ['Project', !isProvince && 'Province', 'District', 'City', 'Sector', 'Status', 'Latitude', 'Longitude', 'Cost', 'Funding gap'].filter(Boolean);
    const rows = filteredMissingMapProjects.map((project) => ([
      project.title,
      !isProvince && (project.province || 'Unspecified'),
      project.district || 'Unspecified',
      project.city || '',
      project.primary_sector || 'Unspecified',
      getProjectStatusLabel(project.status),
      project.latitude ?? '',
      project.longitude ?? '',
      project.total_cost || 0,
      project.funding_gap || 0,
    ].filter((cell) => cell !== false)));
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcpp-missing-coordinates-${isProvince ? data.province : 'national'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner size="lg" />;

  if (!data) {
    return (
      <div className="p-8">
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-8 text-center text-ink-secondary">
          Analytics data is not available.
        </div>
      </div>
    );
  }

  const summary = data.summary || {};
  const funding = data.funding_breakdown || {};
  const mitigation = data.mitigation || {};
  const partialSupport = data.partial_support || {};
  const mitigationRows = mitigation.by_basis || [];

  const sectorChart = {
    labels: sectorRows.map((row) => row.sector),
    datasets: [{
      data: sectorRows.map((row) => row.count),
      backgroundColor: sectorRows.map((row) => wefColor(row.sector)),
      borderWidth: 0,
    }],
  };

  const lifecycleChart = {
    labels: lifecycleRows.map((row) => row.lifecycle),
    datasets: [{
      data: lifecycleRows.map((row) => row.count),
      backgroundColor: lifecycleRows.map((row) => lifecycleColors[row.lifecycle]),
      borderWidth: 0,
    }],
  };

  const provinceChart = {
    labels: provinceRows.map((row) => row.province),
    datasets: [{
      label: 'Projects',
      data: provinceRows.map((row) => row.count),
      backgroundColor: provinceRows.map((_, index) => CHART_COLORS.categorical[index % CHART_COLORS.categorical.length]),
      borderRadius: 6,
    }],
  };

  const trlChart = {
    labels: trlRows.map((row) => `TRL ${row.trl_level}`),
    datasets: [{
      label: 'Projects',
      data: trlRows.map((row) => row.count),
      backgroundColor: trlRows.map((_, index) => CHART_COLORS.categorical[index % CHART_COLORS.categorical.length]),
      borderRadius: 6,
    }],
  };

  const fundingChart = {
    labels: ['Portfolio funding'],
    datasets: [
      { label: 'Secured', data: [funding.secured || 0], backgroundColor: TOKENS.emerald, borderRadius: 6 },
      { label: 'Gap', data: [funding.gap || 0], backgroundColor: TOKENS.harvest, borderRadius: 6 },
    ],
  };

  const mitigationChart = {
    labels: mitigationRows.map((row) => row.basis === 'annual' ? 'Annual' : row.basis === 'lifetime' ? 'Lifetime' : 'Unspecified'),
    datasets: [{
      label: 'tCO2e',
      data: mitigationRows.map((row) => row.tco2e),
      backgroundColor: mitigationRows.map((_, index) => CHART_COLORS.categorical[index % CHART_COLORS.categorical.length]),
      borderRadius: 6,
    }],
  };

  return (
    <div className="p-8 bg-pcpp-mist min-h-screen">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-pcpp-pine">Analytics</h1>
          <p className="text-sm text-ink-secondary">
            {isProvince ? `${data.province} portfolio analytics` : 'National portfolio analytics'}
          </p>
        </div>
        {isProvince && (
          <div className="bg-pcpp-card border border-pcpp-border rounded-card px-4 py-3 text-right">
            <div className="text-xs text-ink-secondary">National rank</div>
            <div className="text-xl font-semibold text-pcpp-pine tabular-nums">
              {data.province_rank ? `#${data.province_rank.rank}` : 'N/A'}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard Icon={FolderOpen} label="Total projects" value={num(summary.total_projects)} />
        <KpiCard Icon={Wallet} label="Total investment" value={formatCurrency(summary.total_investment)} />
        <KpiCard Icon={CircleDollarSign} label="Funding gap" value={formatCurrency(summary.funding_gap)} accent />
        <KpiCard Icon={RefreshCw} label="Ongoing" value={num(summary.ongoing)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard Icon={Leaf} label="Mapped CO2e mitigation" value={formatTco2e(mitigation.total_tco2e)} />
        <KpiCard Icon={BarChart3} label="Mitigation projects" value={num(mitigation.projects_with_mitigation)} />
        <KpiCard
          Icon={CircleDollarSign}
          label="Partially supported"
          value={num(partialSupport.count)}
          accent
          onClick={() => setActiveFilter({ type: 'partial_support', value: 'partial', label: 'Partially supported' })}
        />
        <KpiCard Icon={Wallet} label="Partial-support gap" value={formatCurrency(partialSupport.funding_gap)} accent />
      </div>

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-ink-secondary">Chart filter:</span>
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className="px-3 py-1.5 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald text-sm"
          >
            {activeFilter.label} clear
          </button>
        </div>
      )}

      <ProjectsMapPanel
        data={data}
        isProvince={isProvince}
        visibleProjects={visibleMapProjects}
        missingProjects={filteredMissingMapProjects}
        selectedDistrictKey={selectedDistrictKey}
        onDistrictSelect={handleDistrictSelect}
        onClearDistrict={clearDistrictFilter}
        onExportMissing={handleMissingCoordinatesExport}
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartPanel title="WEF nexus" caption="Water, energy, and food balance across the portfolio." empty={emptyChart(sectorRows)}>
          <Doughnut
            data={sectorChart}
            options={chartBaseOptions({
              scales: null,
              onClick: (_, elements) => {
                if (elements.length) {
                  const value = sectorRows[elements[0].index]?.sector;
                  setActiveFilter({ type: 'sector', value, label: `Sector: ${value}` });
                }
              },
            })}
          />
        </ChartPanel>

        <ChartPanel title="Lifecycle" caption="Pipeline, ongoing, and completed project flow." empty={emptyChart(lifecycleRows)}>
          <Doughnut
            data={lifecycleChart}
            options={chartBaseOptions({
              scales: null,
              onClick: (_, elements) => {
                if (elements.length) {
                  const value = lifecycleRows[elements[0].index]?.lifecycle;
                  setActiveFilter({ type: 'lifecycle', value, label: `Lifecycle: ${value}` });
                }
              },
            })}
          />
        </ChartPanel>

        {isProvince ? (
          <ChartPanel title="Province comparison" caption="Your province's standing without exposing other province details.">
            <div className="h-full flex flex-col justify-center">
              <div className="text-sm text-ink-secondary mb-2">Projects in {data.province}</div>
              <div className="text-4xl font-semibold text-pcpp-pine tabular-nums">{num(data.province_rank?.count || summary.total_projects)}</div>
              <div className="text-sm text-ink-secondary mt-2">
                {data.province_rank ? `Ranked #${data.province_rank.rank} nationally by project count.` : 'Rank unavailable for this province.'}
              </div>
            </div>
          </ChartPanel>
        ) : (
          <ChartPanel title="Province comparison" caption="Breadth and equity by province." empty={emptyChart(provinceRows)}>
            <Bar
              data={provinceChart}
              options={chartBaseOptions({
                indexAxis: 'y',
                scales: { x: { beginAtZero: true }, y: { ticks: { color: TOKENS.textSecondary } } },
                onClick: (_, elements) => {
                  if (elements.length) {
                    const value = provinceRows[elements[0].index]?.province;
                    setActiveFilter({ type: 'province', value, label: `Province: ${value}` });
                  }
                },
              })}
            />
          </ChartPanel>
        )}

        <ChartPanel title="TRL distribution" caption="Technology readiness across the portfolio." empty={emptyChart(trlRows)}>
          <Bar
            data={trlChart}
            options={chartBaseOptions({
              scales: { y: { beginAtZero: true }, x: { ticks: { color: TOKENS.textSecondary } } },
              onClick: (_, elements) => {
                if (elements.length) {
                  const value = trlRows[elements[0].index]?.trl_level;
                  setActiveFilter({ type: 'trl', value, label: `TRL ${value}` });
                }
              },
            })}
          />
        </ChartPanel>

        <ChartPanel title="Funding secured vs gap" caption="Portfolio ask for center and investors.">
          <Bar
            data={fundingChart}
            options={chartBaseOptions({
              plugins: { legend: { display: true, position: 'bottom' } },
              scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
            })}
          />
        </ChartPanel>

        <ChartPanel title="Mitigation potential" caption="Annual and lifetime CO2e values submitted by project owners." empty={!mitigationRows.length || mitigationRows.every((row) => Number(row.tco2e || 0) === 0)}>
          <Bar
            data={mitigationChart}
            options={chartBaseOptions({
              scales: { y: { beginAtZero: true } },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${formatTco2e(parsedValue(ctx))}`,
                  },
                },
              },
            })}
          />
        </ChartPanel>

        <ChartPanel title="NDC mitigation summary" caption={mitigation.data_status || 'NDC target pending stakeholder source.'}>
          <div className="h-full flex flex-col justify-center gap-4">
            <div>
              <div className="text-sm text-ink-secondary">Currently mapped project mitigation</div>
              <div className="text-3xl font-semibold text-pcpp-pine tabular-nums">{formatTco2e(mitigation.total_tco2e)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-control bg-pcpp-mist px-3 py-2">
                <div className="text-xs text-ink-secondary">Annual</div>
                <div className="font-semibold text-pcpp-pine tabular-nums">{formatTco2e(mitigation.annual_tco2e)}</div>
              </div>
              <div className="rounded-control bg-pcpp-mist px-3 py-2">
                <div className="text-xs text-ink-secondary">Lifetime</div>
                <div className="font-semibold text-pcpp-pine tabular-nums">{formatTco2e(mitigation.lifetime_tco2e)}</div>
              </div>
            </div>
            <div className="rounded-control border border-pcpp-border bg-white px-3 py-2 text-xs text-ink-secondary">
              National NDC target comparison will appear when a target value and source are configured.
            </div>
          </div>
        </ChartPanel>

        <ChartPanel title="Top districts" caption="Indicative only: district data still needs normalization." empty={emptyChart(data.by_district)}>
          <Bar
            data={{
              labels: (data.by_district || []).map((row) => row.district),
              datasets: [{ label: 'Projects', data: (data.by_district || []).map((row) => row.count), backgroundColor: (data.by_district || []).map((_, index) => CHART_COLORS.categorical[index % CHART_COLORS.categorical.length]), borderRadius: 6 }],
            }}
            options={chartBaseOptions({ indexAxis: 'y', scales: { x: { beginAtZero: true } } })}
          />
        </ChartPanel>
      </div>

      <section className="bg-pcpp-card border border-pcpp-border rounded-card overflow-hidden">
        <div className="p-5 border-b border-pcpp-border flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-pcpp-pine flex items-center gap-2">
                <BarChart3 size={18} strokeWidth={1.75} className="text-pcpp-emerald" />
                Project drill-down
              </h2>
              <p className="text-xs text-ink-secondary">{num(filteredProjects.length)} projects shown</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredProjects.length === 0}
              className="inline-flex items-center gap-2 bg-pcpp-emerald text-white px-4 py-2 rounded-control text-sm font-medium hover:bg-pcpp-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} strokeWidth={1.75} />
              Export CSV
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
              value={tableFilters.sector}
              onChange={(event) => setTableFilters((current) => ({ ...current, sector: event.target.value }))}
            >
              <option value="">All sectors</option>
              {filterOptions.sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
            </select>
            <select
              className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
              value={tableFilters.lifecycle}
              onChange={(event) => setTableFilters((current) => ({ ...current, lifecycle: event.target.value }))}
            >
              <option value="">All lifecycle stages</option>
              {filterOptions.lifecycles.map((lifecycle) => <option key={lifecycle} value={lifecycle}>{lifecycle}</option>)}
            </select>
            <select
              className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
              value={tableFilters.trl}
              onChange={(event) => setTableFilters((current) => ({ ...current, trl: event.target.value }))}
            >
              <option value="">All TRLs</option>
              {filterOptions.trls.map((trl) => <option key={trl} value={trl}>TRL {trl}</option>)}
            </select>
            {!isProvince ? (
              <select
                className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
                value={tableFilters.province}
                onChange={(event) => setTableFilters((current) => ({ ...current, province: event.target.value }))}
              >
                <option value="">All provinces</option>
                {filterOptions.provinces.map((province) => <option key={province} value={province}>{province}</option>)}
              </select>
            ) : (
              <select
                className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
                value={tableFilters.district}
                onChange={(event) => setTableFilters((current) => ({ ...current, district: event.target.value }))}
              >
                <option value="">All districts</option>
                {filterOptions.districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            )}
            {!isProvince && (
              <select
                className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
                value={tableFilters.district}
                onChange={(event) => setTableFilters((current) => ({ ...current, district: event.target.value }))}
              >
                <option value="">All districts</option>
                {filterOptions.districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            )}
            {isProvince && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white hover:bg-pcpp-mist"
              >
                Clear filters
              </button>
            )}
          </div>
          {!isProvince && (
            <div>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 border border-pcpp-border rounded-control text-sm text-ink-secondary bg-white hover:bg-pcpp-mist"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pcpp-mist border-b border-pcpp-border">
              <tr>
                {['Project', !isProvince && 'Province', 'Sector', 'Lifecycle', 'Status', 'Cost', 'Funding gap'].filter(Boolean).map((heading) => (
                  <th key={heading} className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-pcpp-border last:border-0 hover:bg-pcpp-mist">
                  <td className="px-4 py-3 font-medium text-pcpp-pine">
                    <Link to={`/projects/${project.id}`} className="hover:text-pcpp-emerald hover:underline">
                      {project.title}
                    </Link>
                  </td>
                  {!isProvince && <td className="px-4 py-3 text-ink-secondary">{project.province || 'Unspecified'}</td>}
                  <td className="px-4 py-3 text-ink-secondary">{project.primary_sector || 'Unspecified'}</td>
                  <td className="px-4 py-3 text-ink-secondary">{lifecycleBucket(project)}</td>
                  <td className="px-4 py-3 text-ink-secondary">{getProjectStatusLabel(project.status)}</td>
                  <td className="px-4 py-3 text-ink-secondary tabular-nums">{formatCurrency(project.total_cost)}</td>
                  <td className="px-4 py-3 text-ink-secondary tabular-nums">{formatCurrency(project.funding_gap)}</td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={isProvince ? 6 : 7} className="px-4 py-10 text-center text-ink-tertiary">
                    {isProvince ? `No projects in ${data.province} match these filters.` : 'No projects match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
