import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, adminAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { STATUS_COLORS, SECTORS } from '../../utils/constants';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const NEXT_STATUS = {
  under_review: { label: 'Approve', value: 'approved', color: 'bg-emerald-600 hover:bg-emerald-700' },
  approved: { label: 'Archive', value: 'archived', color: 'bg-gray-600 hover:bg-gray-700' },
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(null);
  const [filters, setFilters] = useState({ search:'', status:'', sector:'', page:1 });
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ under_review: 0, approved: 0, archived: 0 });

  const fetchProjects = () => {
    setLoading(true);
    projectsAPI.getAll({ ...filters, limit: 10 })
      .then(r => {
        setProjects(r.data);
        setTotal(r.count);
        const s = { under_review: 0, approved: 0, archived: 0 };
        r.data.forEach(p => { if (s[p.status] !== undefined) s[p.status]++; });
        setStats(s);
      })
      .catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, [filters]);

  const handleStatusChange = async (projectId, newStatus) => {
    setChanging(projectId);
    try {
      await adminAPI.changeProjectStatus(projectId, newStatus);
      toast.success(`Project ${newStatus === 'approved' ? 'approved' : 'archived'} successfully!`);
      fetchProjects();
    } catch (e) {
      toast.error(e.message || 'Failed to change status');
    } finally {
      setChanging(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">All Projects</h1><p className="text-sm text-gray-500">Manage and monitor all platform projects</p></div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Export</button>
          <Link to="/dashboard/submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">+ Add Project</Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ['Total', total, 'blue'],
          ['Under Review', stats.under_review, 'yellow'],
          ['Approved', stats.approved, 'green'],
          ['Archived', stats.archived, 'gray'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by project name, organization, or sector..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value,page:1}))} />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value,page:1}))}>
            <option value="">All Status</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.sector} onChange={e=>setFilters(f=>({...f,sector:e.target.value,page:1}))}>
            <option value="">All Sectors</option>
            {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Project','Organization','Sector','Status','Cost','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const next = NEXT_STATUS[p.status];
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-900">{p.title}</div><div className="text-xs text-gray-400">ID: {p.id.slice(0,8)}</div></td>
                    <td className="px-4 py-3 text-gray-600">{p.organization_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.primary_sector}</td>
                    <td className="px-4 py-3"><Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status]||'gray'} dot/></td>
                    <td className="px-4 py-3 text-gray-600">{p.total_cost ? `PKR ${(Number(p.total_cost)/1e9).toFixed(1)}B` : 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link to={`/projects/${p.id}`} className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">View</Link>
                        {next && (
                          <button
                            onClick={() => handleStatusChange(p.id, next.value)}
                            disabled={changing === p.id}
                            className={`text-xs text-white px-3 py-1 rounded-lg ${next.color} disabled:opacity-50`}
                          >
                            {changing === p.id ? '...' : next.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
