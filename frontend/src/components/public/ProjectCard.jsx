import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  BoltIcon,
  TruckIcon,
  HeartIcon,
  AcademicCapIcon,
  BeakerIcon,
  CpuChipIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { getSectorColor, getStatusAccent } from '../../utils/designTokens';

const sectorIconMap = {
  energy: BoltIcon,
  transport: TruckIcon,
  health: HeartIcon,
  education: AcademicCapIcon,
  water: BeakerIcon,
  technology: CpuChipIcon,
  agriculture: Squares2X2Icon,
  industry: BuildingOffice2Icon,
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'string' && /B$/i.test(value)) return `Rs ${value}`;
  if (typeof value === 'string' && /M$/i.test(value)) return `Rs ${value}`;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (Math.abs(num) >= 1e9) return `Rs ${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `Rs ${(num / 1e6).toFixed(1)}M`;
  return `Rs ${num.toLocaleString()}`;
};

export default function ProjectCard({ project }) {
  const sector = project.primary_sector || project.sector || project.primary_sector?.[0] || 'Project';
  const title = project.title;
  const organization = project.organization_name || project.organization || '—';
  const location = project.district || project.province || project.city || 'Pakistan';
  const trl = project.trl_level || project.trl;
  const cost = project.total_cost ?? project.cost;
  const fundingGap = project.funding_gap ?? project.fundingGap;
  const roi = project.expected_roi ?? project.roi;
  const statusRaw = project.status || project.status_label || 'draft';
  const statusLabel = statusRaw.replace(/_/g, ' ');
  const accentColor = project.accentColor || getSectorColor(sector);
  const statusColor = getStatusAccent(statusRaw);
  const detailLink = project.id ? `/projects/${project.id}` : '/projects';
  const SectorIcon = sectorIconMap[sector?.toLowerCase?.()] || BuildingOffice2Icon;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-xl transition-shadow flex flex-col gap-4"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            <SectorIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">{title}</h3>
            <p className="text-sm text-gray-500">{organization}</p>
          </div>
        </div>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
          style={{ backgroundColor: `${statusColor}19`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{project.abstract || project.description || 'High-impact project ready for strategic investment partnerships.'}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          <MapPinIcon className="w-3.5 h-3.5" />
          {location}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          {sector}
        </span>
        {trl && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            TRL-{trl}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">Project Cost</p>
          <p className="font-semibold text-gray-900">{formatCurrency(cost)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Funding Gap</p>
          <p className="font-semibold" style={{ color: accentColor }}>{formatCurrency(fundingGap)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Expected ROI</p>
          <p className="font-semibold text-[#F59E0B]">{roi ? `${roi}`.includes('%') ? roi : `${roi}%` : 'N/A'}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Link
          to={detailLink}
          className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          View Details
        </Link>
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-2 text-white py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow"
          style={{ backgroundColor: accentColor }}
        >
          Invest Now
        </button>
      </div>
    </div>
  );
}
