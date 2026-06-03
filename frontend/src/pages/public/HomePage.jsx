import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  FolderOpen,
  Globe2,
  Grid3X3,
  Plus,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { projectsAPI } from '../../services/api';
import ProjectCard from '../../components/public/ProjectCard';
import Spinner from '../../components/common/Spinner';
import { MOCK_FEATURED_PROJECTS, MOCK_SECTORS, MOCK_STATS } from '../../data/designMocks';
import { BRAND_COLORS, getSectorColor } from '../../utils/designTokens';

const statBlueprint = [
  { key: 'totalProjects', label: 'Total projects', icon: FolderOpen, formatter: (v) => formatCount(v) },
  { key: 'totalInvestment', label: 'Total investment', icon: Wallet, formatter: (v) => formatPkr(v) },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: Users, formatter: (v) => formatCompact(v) },
  { key: 'investors', label: 'Active investors', icon: Briefcase, formatter: (v) => formatCount(v) },
];

const formatCount = (value) => (Number(value) || 0).toLocaleString();

const formatCompact = (value) => {
  const num = Number(value) || 0;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return num.toLocaleString();
};

const formatPkr = (value) => {
  const num = Number(value) || 0;
  if (Math.abs(num) >= 1e12) return `PKR ${(num / 1e12).toLocaleString(undefined, { maximumFractionDigits: 1 })}T`;
  if (Math.abs(num) >= 1e9) return `PKR ${(num / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
  if (Math.abs(num) >= 1e6) return `PKR ${(num / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  return `PKR ${num.toLocaleString()}`;
};

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    projectsAPI
      .getStats()
      .then((s) => setStats(s))
      .catch(() => setStats(null));

    projectsAPI
      .getAll({ limit: 6 })
      .then((res) => setProjects(Array.isArray(res) ? res : (res?.projects || [])))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  const resolvedProjects = projects.length ? projects.slice(0, 6) : MOCK_FEATURED_PROJECTS;

  return (
    <div className="min-h-screen bg-pcpp-mist">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-pcpp-pine to-pcpp-emerald text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full mb-6 border border-white/20">
            <Building2 size={16} strokeWidth={1.75} />
            <span className="text-sm">Pakistan&apos;s Official Project Investment Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Pakistan Country
            <br />
            <span className="text-pcpp-harvest">Project Platform</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10">
            Connecting visionary development projects with strategic investors to build a prosperous Pakistan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link className="inline-flex items-center gap-2 bg-white text-pcpp-emerald px-8 py-4 rounded-control font-semibold shadow-lg hover:-translate-y-0.5 transition" to="/projects">
              <Search size={20} strokeWidth={1.75} />
              Explore Projects
              <ArrowRight size={20} strokeWidth={1.75} />
            </Link>
            <Link className="inline-flex items-center gap-2 bg-pcpp-harvest text-white px-8 py-4 rounded-control font-semibold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition" to="/register">
              <Grid3X3 size={20} strokeWidth={1.75} />
              Start Investing
              <ArrowRight size={20} strokeWidth={1.75} />
            </Link>
            <Link className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-control font-semibold hover:bg-white/20 transition" to="/dashboard/submit">
              <Plus size={20} strokeWidth={1.75} />
              Submit Your Project
            </Link>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0,0 C150,80 350,80 600,50 C850,20 1050,80 1200,50 L1200,120 L0,120 Z" fill={BRAND_COLORS.surface} />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statBlueprint.map(({ key, label, icon: Icon, formatter }) => {
              const rawValue =
                key === 'totalProjects'
                  ? stats?.total_projects ?? MOCK_STATS.totalProjects
                  : key === 'totalInvestment'
                  ? stats?.total_funding ?? MOCK_STATS.totalInvestment
                  : key === 'beneficiaries'
                  ? stats?.total_beneficiaries ?? MOCK_STATS.beneficiaries
                  : stats?.active_investors ?? MOCK_STATS.investors;
              const formattedValue = formatter(rawValue);
              return (
                <div key={key} className="bg-pcpp-card rounded-card p-5 border border-pcpp-border hover:shadow-sm transition-shadow flex items-start gap-4">
                  <div className="w-12 h-12 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald flex items-center justify-center">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-pcpp-pine tabular-nums">
                      {formattedValue}
                    </div>
                    <p className="text-sm text-ink-secondary mt-1">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-pcpp-emerald text-sm font-medium mb-2">
                <CheckCircle size={16} strokeWidth={1.75} />
                Featured Opportunities
              </div>
              <h2 className="text-3xl font-semibold text-pcpp-pine">Investment Ready Projects</h2>
              <p className="text-ink-secondary">Verified high-impact projects seeking strategic partnerships.</p>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-2 text-pcpp-emerald font-semibold">
              View All Projects
              <ArrowRight size={20} strokeWidth={1.75} />
            </Link>
          </div>
          {loadingProjects && !projects.length ? (
            <div className="py-16 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resolvedProjects.map((project) => (
                <ProjectCard key={project.id || project.title} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sectors */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-pcpp-emerald text-sm font-medium mb-2">
              <Globe2 size={16} strokeWidth={1.75} />
              Diverse Sectors
            </div>
            <h2 className="text-3xl font-semibold text-pcpp-pine">Investment Sectors</h2>
            <p className="text-ink-secondary mt-2">Explore projects across key development sectors in Pakistan.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MOCK_SECTORS.map((sector) => (
              <Link
                key={sector.name}
                to={`/projects?sector=${encodeURIComponent(sector.name)}`}
                className="bg-pcpp-mist border border-pcpp-border rounded-card p-5 hover:shadow-sm hover:border-pcpp-emerald transition"
              >
                <p className="text-sm font-semibold text-pcpp-pine">{sector.name}</p>
                <p className="text-xs text-ink-secondary">{Number(sector.count).toLocaleString()} projects</p>
                <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: getSectorColor(sector.name) }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-pcpp-pine to-pcpp-emerald rounded-card text-white text-center p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">Ready to Make an Impact?</h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Join Pakistan&apos;s largest project investment platform and help build a prosperous future.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link className="bg-white text-pcpp-emerald px-8 py-4 rounded-control font-semibold shadow-lg" to="/register">
                  Get Started Free
                </Link>
                <Link className="bg-white/10 border border-white/30 text-white px-8 py-4 rounded-control font-semibold" to="/projects">
                  Browse Projects
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
