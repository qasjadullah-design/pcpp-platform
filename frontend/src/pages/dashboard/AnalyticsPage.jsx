import React, { useEffect, useMemo, useState } from 'react';
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
import { BarChart3, CircleDollarSign, Download, FolderOpen, RefreshCw, Wallet } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import { formatCurrency } from '../../utils/constants';
import { STATUS_COLORS_HEX, TOKENS, WEF_COLORS } from '../../utils/designTokens';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, ChartTooltip, Legend);

const num = (value) => (Number(value) || 0).toLocaleString();

const lifecycleOrder = ['Pipeline', 'Ongoing', 'Completed'];
const lifecycleColors = {
  Pipeline: STATUS_COLORS_HEX.pipeline,
  Ongoing: STATUS_COLORS_HEX.ongoing,
  Completed: STATUS_COLORS_HEX.completed,
};

const wefColor = (sector) => WEF_COLORS[sector] || WEF_COLORS.Other;

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

function chartBaseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label || ctx.label}: ${num(parsedValue(ctx))}`,
        },
      },
    },
    ...extra,
  };
}

function KpiCard({ Icon, label, value, accent = false }) {
  return (
    <div className={`bg-pcpp-card rounded-card border p-5 ${accent ? 'border-pcpp-harvest/40' : 'border-pcpp-border'}`}>
      <span className={`w-10 h-10 rounded-control flex items-center justify-center mb-3 ${accent ? 'bg-pcpp-harvest/10 text-pcpp-harvest' : 'bg-pcpp-emerald/10 text-pcpp-emerald'}`}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="text-2xl font-semibold text-pcpp-pine mb-1 tabular-nums">{value}</div>
      <div className="text-sm text-ink-secondary">{label}</div>
    </div>
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

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [tableFilters, setTableFilters] = useState({ sector: '', lifecycle: '', trl: '', province: '' });

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

  const filterOptions = useMemo(() => ({
    sectors: Array.from(new Set(projectRows.map(sectorBucket))).sort(),
    lifecycles: lifecycleOrder,
    trls: Array.from(new Set(projectRows.map((project) => project.trl_level).filter(Boolean))).sort((a, b) => Number(a) - Number(b)),
    provinces: Array.from(new Set(projectRows.map((project) => project.province || 'Unspecified'))).sort(),
  }), [projectRows]);

  const filteredProjects = useMemo(() => {
    return projectRows.filter((project) => {
      if (activeFilter?.type === 'sector') {
        if (sectorBucket(project) !== activeFilter.value) return false;
      }
      if (activeFilter?.type === 'lifecycle') {
        if (lifecycleBucket(project) !== activeFilter.value) return false;
      }
      if (activeFilter?.type === 'province' && (project.province || 'Unspecified') !== activeFilter.value) return false;
      if (activeFilter?.type === 'trl' && Number(project.trl_level) !== Number(activeFilter.value)) return false;
      if (tableFilters.sector && sectorBucket(project) !== tableFilters.sector) return false;
      if (tableFilters.lifecycle && lifecycleBucket(project) !== tableFilters.lifecycle) return false;
      if (tableFilters.trl && Number(project.trl_level) !== Number(tableFilters.trl)) return false;
      if (tableFilters.province && (project.province || 'Unspecified') !== tableFilters.province) return false;
      return true;
    });
  }, [activeFilter, projectRows, tableFilters]);

  const clearFilters = () => {
    setActiveFilter(null);
    setTableFilters({ sector: '', lifecycle: '', trl: '', province: '' });
  };

  const handleExport = () => {
    const headers = ['Project', !isProvince && 'Province', 'Sector', 'Lifecycle', 'Status', 'Cost', 'Funding gap'].filter(Boolean);
    const rows = filteredProjects.map((project) => ([
      project.title,
      !isProvince && (project.province || 'Unspecified'),
      project.primary_sector || 'Unspecified',
      lifecycleBucket(project),
      project.status?.replace(/_/g, ' ') || '',
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
      backgroundColor: TOKENS.emerald,
      borderRadius: 6,
    }],
  };

  const trlChart = {
    labels: trlRows.map((row) => `TRL ${row.trl_level}`),
    datasets: [{
      label: 'Projects',
      data: trlRows.map((row) => row.count),
      backgroundColor: TOKENS.water,
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

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartPanel title="WEF nexus" caption="Water, energy, and food balance across the portfolio." empty={emptyChart(sectorRows)}>
          <Doughnut
            data={sectorChart}
            options={chartBaseOptions({
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

        <ChartPanel title="Top districts" caption="Indicative only: district data still needs normalization." empty={emptyChart(data.by_district)}>
          <Bar
            data={{
              labels: (data.by_district || []).map((row) => row.district),
              datasets: [{ label: 'Projects', data: (data.by_district || []).map((row) => row.count), backgroundColor: TOKENS.emerald, borderRadius: 6 }],
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
          <div className="grid md:grid-cols-4 gap-3">
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
                  <td className="px-4 py-3 font-medium text-pcpp-pine">{project.title}</td>
                  {!isProvince && <td className="px-4 py-3 text-ink-secondary">{project.province || 'Unspecified'}</td>}
                  <td className="px-4 py-3 text-ink-secondary">{project.primary_sector || 'Unspecified'}</td>
                  <td className="px-4 py-3 text-ink-secondary">{lifecycleBucket(project)}</td>
                  <td className="px-4 py-3 text-ink-secondary capitalize">{project.status?.replace(/_/g, ' ')}</td>
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
