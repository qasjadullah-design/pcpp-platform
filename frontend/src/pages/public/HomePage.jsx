import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ArrowRightIcon,
  PlusIcon,
  FolderIcon,
  BanknotesIcon,
  UsersIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  RectangleGroupIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { projectsAPI } from '../../services/api';
import ProjectCard from '../../components/public/ProjectCard';
import Spinner from '../../components/common/Spinner';
import { MOCK_FEATURED_PROJECTS, MOCK_SECTORS, MOCK_STATS } from '../../data/designMocks';
import { BRAND_COLORS, getSectorColor } from '../../utils/designTokens';

const statBlueprint = [
  { key: 'totalProjects', label: 'Total Projects', icon: FolderIcon, suffix: '', formatter: (v) => v },
  { key: 'totalInvestment', label: 'Total Investment', icon: BanknotesIcon, suffix: 'B', formatter: (v) => (v / 1e9).toFixed(1) },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: UsersIcon, suffix: 'M', formatter: (v) => (v / 1e6).toFixed(1) },
  { key: 'investors', label: 'Active Investors', icon: BriefcaseIcon, suffix: '', formatter: (v) => v },
];

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    projectsAPI
      .getStats()
      .then((s) => setStats(s.data))
      .catch(() => setStats(null));

    projectsAPI
      .getAll({ limit: 6 })
      .then((res) => setProjects(Array.isArray(res) ? res : (res?.projects || [])))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  const resolvedProjects = projects.length ? projects.slice(0, 6) : MOCK_FEATURED_PROJECTS;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#047857] via-[#059669] to-[#10b981] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full mb-6 border border-white/20">
            <BuildingOffice2Icon className="w-4 h-4" />
            <span className="text-sm">Pakistan&apos;s Official Project Investment Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Pakistan Country
            <br />
            <span className="text-[#F59E0B]">Project Platform</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10">
            Connecting visionary development projects with strategic investors to build a prosperous Pakistan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link className="inline-flex items-center gap-2 bg-white text-[#059669] px-8 py-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 transition" to="/projects">
              <MagnifyingGlassIcon className="w-5 h-5" />
              Explore Projects
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link className="inline-flex items-center gap-2 bg-[#F59E0B] text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:bg-[#D97706] hover:-translate-y-0.5 transition" to="/register">
              <RectangleGroupIcon className="w-5 h-5" />
              Start Investing
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition" to="/dashboard/submit">
              <PlusIcon className="w-5 h-5" />
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
            {statBlueprint.map(({ key, label, icon: Icon, suffix, formatter }) => {
              const rawValue =
                key === 'totalProjects'
                  ? stats?.total_projects ?? MOCK_STATS.totalProjects
                  : key === 'totalInvestment'
                  ? stats?.total_investment ?? MOCK_STATS.totalInvestment
                  : key === 'beneficiaries'
                  ? stats?.total_beneficiaries ?? MOCK_STATS.beneficiaries
                  : stats?.active_investors ?? MOCK_STATS.investors;
              const formattedValue = formatter(rawValue);
              return (
                <div key={key} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#059669]/10 text-[#059669] flex items-center justify-center">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {formattedValue}{suffix}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{label}</p>
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
              <div className="inline-flex items-center gap-2 text-[#059669] text-sm font-medium mb-2">
                <CheckCircleIcon className="w-4 h-4" />
                Featured Opportunities
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Investment Ready Projects</h2>
              <p className="text-gray-600">Verified high-impact projects seeking strategic partnerships.</p>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-2 text-[#059669] font-semibold">
              View All Projects
              <ArrowRightIcon className="w-5 h-5" />
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
            <div className="inline-flex items-center gap-2 text-[#059669] text-sm font-medium mb-2">
              <GlobeAltIcon className="w-4 h-4" />
              Diverse Sectors
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Investment Sectors</h2>
            <p className="text-gray-600 mt-2">Explore projects across key development sectors in Pakistan.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MOCK_SECTORS.map((sector) => (
              <Link
                key={sector.name}
                to={`/projects?sector=${encodeURIComponent(sector.name)}`}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-[#059669] transition"
              >
                <p className="text-sm font-semibold text-gray-900">{sector.name}</p>
                <p className="text-xs text-gray-500">{sector.count} Projects</p>
                <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: getSectorColor(sector.name) }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#059669] to-[#10b981] rounded-3xl text-white text-center p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">Ready to Make an Impact?</h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Join Pakistan&apos;s largest project investment platform and help build a prosperous future.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link className="bg-white text-[#059669] px-8 py-4 rounded-xl font-semibold shadow-lg" to="/register">
                  Get Started Free
                </Link>
                <Link className="bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-semibold" to="/projects">
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
