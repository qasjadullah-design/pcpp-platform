import React, { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/api';
import ProjectCard from '../../components/public/ProjectCard';
import Spinner from '../../components/common/Spinner';
import { SECTORS } from '../../utils/constants';
import { MOCK_FEATURED_PROJECTS, PROVINCE_OPTIONS, STATUS_OPTIONS } from '../../data/designMocks';

const sectorOptions = ['All Sectors', ...Array.from(new Set([...SECTORS, ...MOCK_FEATURED_PROJECTS.map((p) => p.sector || p.primary_sector)]))];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', sector: '', region: '', status: '', page: 1 });

  useEffect(() => {
    const params = {
      search: filters.search || undefined,
      sector: filters.sector || undefined,
      district: filters.region || undefined,
      status: filters.status || undefined,
      page: filters.page,
      limit: 9,
    };

    setLoading(true);
    setError(false);
    projectsAPI
      .getAll(params)
      .then((res) => {
        const data = res.data || res;
        setProjects(data);
        setTotal(res.count || data.length);
        setTotalPages(res.total_pages || 1);
      })
      .catch(() => {
        setError(true);
        setProjects(MOCK_FEATURED_PROJECTS);
        setTotal(MOCK_FEATURED_PROJECTS.length);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const handleFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const displayProjects = projects.length ? projects : MOCK_FEATURED_PROJECTS;
  const resolvedTotal = total || displayProjects.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="bg-gradient-to-br from-[#047857] via-[#059669] to-[#10b981] text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-sm uppercase tracking-wide text-white/80 mb-2">Opportunities</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse Investment Projects</h1>
          <p className="text-white/80 text-lg">
            Discover {resolvedTotal}+ verified development projects across Pakistan. Use smart filters to find the right opportunity.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <div className="sticky top-16 z-40 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
              placeholder="Search by project name, description, or organization"
              value={filters.search}
              onChange={(e) => handleFilter('search', e.target.value)}
            />
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
              value={filters.sector}
              onChange={(e) => handleFilter('sector', e.target.value === 'All Sectors' ? '' : e.target.value)}
            >
              {sectorOptions.map((option) => (
                <option key={option} value={option === 'All Sectors' ? '' : option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
              value={filters.region}
              onChange={(e) => handleFilter('region', e.target.value === 'All Provinces' ? '' : e.target.value)}
            >
              {PROVINCE_OPTIONS.map((province) => (
                <option key={province} value={province === 'All Provinces' ? '' : province}>
                  {province}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
              value={filters.status}
              onChange={(e) => handleFilter('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => {
                const value = status === 'All Status' ? '' : status.toLowerCase().replace(/\s/g, '_');
                return (
                  <option key={status} value={value}>
                    {status}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing <strong>{displayProjects.length}</strong> of <strong>{resolvedTotal}</strong> projects
          </p>
          <span className="text-xs text-[#059669] font-semibold">● Verified Projects</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((project) => (
              <ProjectCard key={project.id || project.title} project={project} />
            ))}
          </div>
        )}

        {!loading && !displayProjects.length && (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <p className="text-lg font-semibold text-gray-900 mb-2">No projects found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search keywords or filters.</p>
          </div>
        )}

        {!error && totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx}
                onClick={() => setFilters((prev) => ({ ...prev, page: idx + 1 }))}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                  filters.page === idx + 1 ? 'bg-[#059669] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
