import React from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, MapPin } from 'lucide-react';
import { formatCurrency, getProjectStatusLabel } from '../../utils/constants';
import { TOKENS, getSectorColor } from '../../utils/designTokens';

const BOUNDS = {
  minLatitude: 23,
  maxLatitude: 38,
  minLongitude: 60,
  maxLongitude: 78,
};

const hasValidCoordinates = (project) => {
  const latitude = Number(project?.latitude);
  const longitude = Number(project?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= BOUNDS.minLatitude && latitude <= BOUNDS.maxLatitude
    && longitude >= BOUNDS.minLongitude && longitude <= BOUNDS.maxLongitude;
};

const coordinatePercent = (value, min, max) => {
  if (max === min) return 50;
  return Math.min(97, Math.max(3, ((value - min) / (max - min)) * 100));
};

export default function ProjectLocationMap({ projects = [], total = 0 }) {
  const mappedProjects = projects.filter(hasValidCoordinates);
  const missingCount = Math.max(0, projects.length - mappedProjects.length);

  return (
    <section className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-pcpp-pine flex items-center gap-2">
            <MapPin size={18} strokeWidth={1.75} className="text-pcpp-emerald" />
            Project locations
          </h2>
          <p className="text-xs text-ink-secondary mt-1">
            Hover a pinpoint to preview the project and open its detail page.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <div className="rounded-control bg-pcpp-mist px-3 py-2">
            <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{mappedProjects.length.toLocaleString()}</div>
            <div className="text-[11px] text-ink-secondary">mapped</div>
          </div>
          <div className="rounded-control bg-pcpp-mist px-3 py-2">
            <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{missingCount.toLocaleString()}</div>
            <div className="text-[11px] text-ink-secondary">unmapped</div>
          </div>
          <div className="rounded-control bg-pcpp-mist px-3 py-2">
            <div className="text-sm font-semibold text-pcpp-pine tabular-nums">{Number(total || projects.length).toLocaleString()}</div>
            <div className="text-[11px] text-ink-secondary">results</div>
          </div>
        </div>
      </div>

      <div className="relative min-h-[340px] rounded-card border border-pcpp-border bg-pcpp-mist overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${TOKENS.border} 1px, transparent 1px), linear-gradient(90deg, ${TOKENS.border} 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute inset-4 rounded-card border border-pcpp-border bg-white/55" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-control bg-white px-3 py-2 text-xs text-ink-secondary shadow-sm">
          <LocateFixed size={14} strokeWidth={1.75} className="text-pcpp-emerald" />
          Pakistan project coordinate preview
        </div>

        {mappedProjects.map((project) => {
          const latitude = Number(project.latitude);
          const longitude = Number(project.longitude);
          const left = coordinatePercent(longitude, BOUNDS.minLongitude, BOUNDS.maxLongitude);
          const top = 100 - coordinatePercent(latitude, BOUNDS.minLatitude, BOUNDS.maxLatitude);
          const sector = project.primary_sector || project.sector || 'Other';
          const color = getSectorColor(sector);

          return (
            <div
              key={project.id || project.title}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <Link
                to={project.id ? `/projects/${project.id}` : '/projects'}
                aria-label={project.title}
                className="block h-4 w-4 rounded-full border-2 border-white shadow-sm ring-1 ring-pcpp-pine/10 transition hover:scale-125 hover:ring-2 hover:ring-pcpp-emerald focus:outline-none focus:ring-2 focus:ring-pcpp-emerald"
                style={{ backgroundColor: color }}
              />
              <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-3 hidden w-72 -translate-x-1/2 rounded-card border border-pcpp-border bg-white p-3 text-left shadow-lg group-hover:block group-focus-within:block">
                <div className="text-sm font-semibold text-pcpp-pine leading-snug">{project.title}</div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-ink-secondary">
                  <span>Location</span>
                  <span className="font-medium text-ink">{[project.district, project.province].filter(Boolean).join(', ') || 'Pakistan'}</span>
                  <span>Sector</span>
                  <span className="font-medium text-ink">{sector}</span>
                  <span>Status</span>
                  <span className="font-medium text-ink">{getProjectStatusLabel(project.status)}</span>
                  <span>Cost</span>
                  <span className="font-medium text-ink tabular-nums">{formatCurrency(project.total_cost, project.currency)}</span>
                  <span>Funding gap</span>
                  <span className="font-medium text-ink tabular-nums">{formatCurrency(project.funding_gap, project.currency)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {mappedProjects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-card border border-pcpp-border bg-white px-4 py-3 text-center text-sm text-ink-secondary shadow-sm">
              No mapped project coordinates are available for the current results.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
