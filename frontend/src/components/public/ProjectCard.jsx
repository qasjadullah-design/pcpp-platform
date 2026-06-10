import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bolt,
  Building2,
  Cpu,
  FlaskConical,
  GraduationCap,
  Grid2X2,
  Heart,
  MapPin,
  Truck,
} from 'lucide-react';
import { getSectorColor, getStatusAccent } from '../../utils/designTokens';
import { formatCurrency, getProjectStatusLabel } from '../../utils/constants';
import Tooltip from '../common/Tooltip';
import { trlText } from '../../utils/trl';

const sectorIconMap = {
  energy: Bolt,
  transport: Truck,
  health: Heart,
  education: GraduationCap,
  water: FlaskConical,
  technology: Cpu,
  agriculture: Grid2X2,
  industry: Building2,
};

const getSectorIcon = (sector = '') => {
  const normalized = sector.toLowerCase();
  const match = Object.entries(sectorIconMap).find(([key]) => normalized.includes(key));
  return match?.[1] || Building2;
};

export default function ProjectCard({ project, toneIndex = 0 }) {
  const sector = project.primary_sector || project.sector || project.primary_sector?.[0] || 'Project';
  const title = project.title;
  const organization = project.organization_name || project.organization || 'N/A';
  const location = project.district || project.province || project.city || 'Pakistan';
  const trl = project.trl_level || project.trl;
  const cost = project.total_cost ?? project.cost;
  const fundingGap = project.funding_gap ?? project.fundingGap;
  const roi = project.expected_roi ?? project.roi;
  const statusRaw = project.status || project.status_label || 'draft';
  const statusLabel = getProjectStatusLabel(statusRaw);
  const accentColor = getSectorColor(sector);
  const statusColor = getStatusAccent(statusRaw);
  const detailLink = project.id ? `/projects/${project.id}` : '/projects';
  const SectorIcon = getSectorIcon(sector);
  const subtleTone = toneIndex % 2 === 1;

  return (
    <div
      className="rounded-card border border-pcpp-border p-5 shadow-sm hover:shadow-xl transition-shadow flex flex-col gap-4"
      style={{
        backgroundColor: subtleTone ? `${accentColor}08` : '#FFFFFF',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            <SectorIcon size={24} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-pcpp-pine leading-tight line-clamp-2" title={title}>{title}</h3>
            <p className="text-sm text-ink-secondary">{organization}</p>
          </div>
        </div>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
          style={{ backgroundColor: `${statusColor}19`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-sm text-ink-secondary line-clamp-2">{project.abstract || project.description || 'High-impact project ready for strategic investment partnerships.'}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pcpp-mist text-ink-secondary">
          <MapPin size={14} strokeWidth={1.75} />
          {location}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pcpp-mist text-ink-secondary">
          {sector}
        </span>
        {trl && (
          <Tooltip content={trlText(trl)}>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pcpp-water/10 text-pcpp-water cursor-help">
              TRL-{trl}
            </span>
          </Tooltip>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-pcpp-border pt-4 text-sm">
        <div>
          <p className="text-xs text-ink-secondary mb-1">Project Cost</p>
          <p className="font-semibold text-pcpp-pine">{formatCurrency(cost)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary mb-1">Funding Gap</p>
          <p className="font-semibold" style={{ color: accentColor }}>{formatCurrency(fundingGap)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary mb-1">Expected ROI</p>
          <p className="font-semibold text-pcpp-harvest">{roi ? `${roi}`.includes('%') ? roi : `${roi}%` : 'N/A'}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Link
          to={detailLink}
          className="flex-1 inline-flex items-center justify-center gap-2 border border-pcpp-border text-ink-secondary py-2.5 rounded-control text-sm font-medium hover:bg-pcpp-mist"
        >
          View Details
        </Link>
        <Link
          to={detailLink}
          className="flex-1 inline-flex items-center justify-center gap-2 text-white py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow"
          style={{ backgroundColor: accentColor }}
        >
          Invest Now
        </Link>
      </div>
    </div>
  );
}
