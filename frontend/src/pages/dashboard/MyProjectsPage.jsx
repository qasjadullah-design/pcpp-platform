import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { STATUS_COLORS } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function MyProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getMine().then(r => setProjects(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await projectsAPI.delete(id); setProjects(p => p.filter(x => x.id !== id)); toast.success('Project deleted'); }
    catch(e) { toast.error(e.message || 'Failed to delete'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">My Projects</h1><p className="text-sm text-gray-500">Projects you have submitted</p></div>
        <Link to="/dashboard/submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">+ Add New</Link>
      </div>

      {loading ? <p>Loading...</p> : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📁</p>
          <p className="font-medium">No projects yet</p>
          <Link to="/dashboard/submit" className="text-emerald-600 hover:underline text-sm">Submit your first project →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">{p.primary_sector?.[0]}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status]||'gray'}/>
                  </div>
                  <p className="text-xs text-gray-500">{p.district} • {p.primary_sector}</p>
                  {p.admin_feedback && <p className="text-xs text-orange-600 mt-1">💬 {p.admin_feedback}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/projects/${p.id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">View</Link>
                {['draft','changes_requested'].includes(p.status) && (
                  <>
                    <Link to={`/dashboard/submit?edit=${p.id}`} className="text-sm border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</Link>
                    {p.status === 'draft' && <button onClick={()=>handleDelete(p.id)} className="text-sm border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">Delete</button>}
                    {p.status === 'changes_requested' && <button onClick={()=>projectsAPI.submit(p.id).then(()=>{toast.success('Resubmitted!');setProjects(ps=>ps.map(x=>x.id===p.id?{...x,status:'under_review'}:x))})} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">Resubmit</button>}
                  </>
                )}
                {p.status === 'approved' && (
                  <Link to={`/dashboard/projects/${p.id}/update`} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">Post Update</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
