import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Search } from 'lucide-react';
import { projectsAPI } from '../../services/api';
import ProjectCard from '../../components/public/ProjectCard';
import Spinner from '../../components/common/Spinner';

export default function SavedProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getSaved()
      .then(r => setProjects(Array.isArray(r) ? r : r?.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pcpp-pine">Saved Projects</h1>
          <p className="text-sm text-ink-secondary">{projects.length.toLocaleString()} saved investment opportunities</p>
        </div>
        <Link to="/projects" className="inline-flex items-center gap-2 bg-pcpp-emerald text-white px-4 py-2 rounded-control text-sm hover:bg-pcpp-emerald-600">
          <Search size={16} strokeWidth={1.75} />
          Browse projects
        </Link>
      </div>

      {loading ? <Spinner /> : projects.length === 0 ? (
        <div className="text-center py-20 text-ink-secondary bg-pcpp-card border border-pcpp-border rounded-card">
          <Bookmark size={40} strokeWidth={1.75} className="mx-auto mb-4 text-ink-secondary" />
          <p className="font-medium text-ink">No saved projects yet</p>
          <Link to="/projects" className="text-pcpp-emerald hover:underline text-sm">Browse projects</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(project => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </div>
  );
}
