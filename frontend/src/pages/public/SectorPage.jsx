import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { projectsAPI } from '../../services/api';
import ProjectCard from '../../components/public/ProjectCard';

export default function SectorPage() {
  const { sector } = useParams(); const name = decodeURIComponent(sector); const [projects, setProjects] = useState([]);
  useEffect(() => { projectsAPI.getAll({ priority: 'WEF', status: 'approved', sector: name, limit: 100 }).then(r => setProjects(r.projects || [])).catch(() => setProjects([])); }, [name]);
  return <div className="min-h-screen bg-pcpp-mist"><div className="max-w-7xl mx-auto px-4 py-10"><Link to="/invest" className="text-sm text-pcpp-emerald">← All WEF sectors</Link><h1 className="text-3xl font-bold mt-3 mb-2">{name}</h1><p className="text-gray-500 mb-7">Approved WEF Nexus investment projects</p><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{projects.map(project=><ProjectCard key={project.id} project={project}/>)}</div>{!projects.length&&<p className="text-gray-500">No approved WEF projects in this sector.</p>}</div></div>;
}
