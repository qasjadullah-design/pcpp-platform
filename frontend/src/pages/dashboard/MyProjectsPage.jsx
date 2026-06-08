import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { interestsAPI, projectsAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { STATUS_COLORS, formatCurrency } from '../../utils/constants';
import toast from 'react-hot-toast';
import { FolderOpen, Mail, MessageCircle, Phone } from 'lucide-react';

const formatRange = (min, max) => {
  if (!min && !max) return 'Not specified';
  return `${formatCurrency(min)} to ${formatCurrency(max)}`;
};

export default function MyProjectsPage() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openProjectId, setOpenProjectId] = useState('');
  const [projectInterests, setProjectInterests] = useState({});
  const [loadingInterests, setLoadingInterests] = useState('');
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState('');

  useEffect(() => {
    projectsAPI.getMine().then(r => setProjects(Array.isArray(r) ? r : r?.projects || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const loadProjectInterests = async (projectId) => {
    if (projectInterests[projectId]) return;

    setLoadingInterests(projectId);
    try {
      const result = await interestsAPI.getForProject(projectId);
      setProjectInterests(prev => ({ ...prev, [projectId]: Array.isArray(result) ? result : result?.interests || [] }));
    } catch(e) {
      toast.error(e.message || 'Failed to load project interests');
    } finally {
      setLoadingInterests('');
    }
  };

  useEffect(() => {
    const projectId = searchParams.get('project');
    const shouldOpenInterests = searchParams.get('interests') === '1';
    if (!projectId || !shouldOpenInterests) return;

    setOpenProjectId(projectId);
    loadProjectInterests(projectId);
  }, [searchParams]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await projectsAPI.delete(id); setProjects(p => p.filter(x => x.id !== id)); toast.success('Project deleted'); }
    catch(e) { toast.error(e.message || 'Failed to delete'); }
  };

  const toggleInterests = async (projectId) => {
    if (openProjectId === projectId) {
      setOpenProjectId('');
      return;
    }

    setOpenProjectId(projectId);
    loadProjectInterests(projectId);
  };

  const handleReply = async (interestId, projectId) => {
    const response = replyText[interestId]?.trim();
    if (!response) {
      toast.error('Please write a response first');
      return;
    }

    setReplying(interestId);
    try {
      const updated = await interestsAPI.respond(interestId, response);
      setProjectInterests(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(i => i.id === interestId ? { ...i, ...updated } : i),
      }));
      setReplyText(prev => ({ ...prev, [interestId]: '' }));
      toast.success('Response sent to investor');
    } catch(e) {
      toast.error(e.message || 'Failed to send response');
    } finally {
      setReplying('');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">My Projects</h1><p className="text-sm text-gray-500">Projects you have submitted</p></div>
        <Link to="/dashboard/submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">+ Add New</Link>
      </div>

      {loading ? <p>Loading...</p> : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FolderOpen size={40} strokeWidth={1.75} className="mx-auto mb-4 text-ink-secondary" />
          <p className="font-medium">No projects yet</p>
          <Link to="/dashboard/submit" className="text-emerald-600 hover:underline text-sm">Submit your first project</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const interests = projectInterests[p.id] || [];
            const expanded = openProjectId === p.id;

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">{p.primary_sector?.[0]}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{p.title}</h3>
                        <Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status]||'gray'}/>
                      </div>
                      <p className="text-xs text-gray-500">{p.district || 'No district'} - {p.primary_sector || 'No sector'}</p>
                      {p.admin_feedback && <p className="text-xs text-orange-600 mt-1 flex items-center gap-1"><MessageCircle size={13} strokeWidth={1.75} /> {p.admin_feedback}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button onClick={() => toggleInterests(p.id)} className="text-sm border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                      {expanded ? 'Hide Interests' : 'View Interests'}
                    </button>
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

                {expanded && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Investor Interests</h4>
                    {loadingInterests === p.id ? <p className="text-sm text-gray-500">Loading interests...</p> : interests.length === 0 ? (
                      <p className="text-sm text-gray-500">No investor interests for this project yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {interests.map(i => (
                          <div key={i.id} className="border border-gray-200 rounded-xl p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-gray-900">{i.first_name} {i.last_name}</p>
                                  <Badge label={i.status === 'owner_replied' ? 'Replied' : 'Pending'} color={i.status === 'owner_replied' ? 'green' : 'yellow'} dot />
                                </div>
                                <p className="text-xs text-gray-500">{i.organization || 'Investor'} - {formatRange(i.investment_range_min, i.investment_range_max)}</p>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                  {i.email && <span className="inline-flex items-center gap-1"><Mail size={12} strokeWidth={1.75} /> {i.email}</span>}
                                  {i.phone && <span className="inline-flex items-center gap-1"><Phone size={12} strokeWidth={1.75} /> {i.phone}</span>}
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString()}</span>
                            </div>
                            {i.message && <p className="mt-3 text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg p-3">{i.message}</p>}
                            {i.owner_response && <p className="mt-3 text-sm text-emerald-800 whitespace-pre-line bg-emerald-50 border border-emerald-100 rounded-lg p-3">{i.owner_response}</p>}
                            <div className="mt-3 flex gap-2">
                              <textarea
                                rows={2}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Reply to this investor..."
                                value={replyText[i.id] || ''}
                                onChange={e => setReplyText(prev => ({ ...prev, [i.id]: e.target.value }))}
                              />
                              <button onClick={() => handleReply(i.id, p.id)} disabled={replying === i.id} className="self-start bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                                {replying === i.id ? 'Sending...' : 'Reply'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
