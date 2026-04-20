import React, { useEffect, useState } from 'react';
import { projectsAPI, adminAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

export default function AdminReviewPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    projectsAPI.getAll({ status: 'under_review', limit: 20 })
      .then(r => setProjects(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleReview = async () => {
    setSubmitting(true);
    try {
      await adminAPI.reviewProject(selected.id, { action, feedback });
      toast.success(`Project ${action}d successfully!`);
      setProjects(p => p.filter(x => x.id !== selected.id));
      setSelected(null);
    } catch(e) { toast.error(e.message||'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Review</h1>
          <p className="text-sm text-gray-500">{projects.length} projects waiting for your approval</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Urgent (&lt;3 hrs)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>Medium (3-12 hrs)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Normal (&gt;12 hrs)</span>
        </div>
      </div>

      {loading ? <Spinner/> : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">✅</p><p className="font-medium">No projects pending review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const hrs = Math.abs(new Date() - new Date(p.created_at)) / 36e5;
            const urgency = hrs < 3 ? 'red' : hrs < 12 ? 'yellow' : 'green';
            return (
              <div key={p.id} className={`bg-white border-l-4 ${urgency==='red'?'border-l-red-500':urgency==='yellow'?'border-l-yellow-500':'border-l-green-500'} border border-gray-200 rounded-2xl p-5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">{p.primary_sector?.[0]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{p.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgency==='red'?'bg-red-100 text-red-700':urgency==='yellow'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{urgency==='red'?'Urgent':urgency==='yellow'?'Medium':'Normal'}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.primary_sector}</span>
                      </div>
                      <p className="text-xs text-gray-500">🏢 {p.organization_name} • Rs. {p.total_cost?(Number(p.total_cost)/1e9).toFixed(1)+'B':'N/A'} • TRL-{p.trl_level} • ⏱ Submitted {Math.round(hrs)} hrs ago</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setSelected(p);setAction('');setFeedback('');}} className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">Quick Preview</button>
                    <button onClick={()=>{setSelected(p);setAction('approve');setFeedback('');}} className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700">Start Review →</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={`Review: ${selected?.title}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
              <p><b>Organization:</b> {selected.organization_name}</p>
              <p><b>Sector:</b> {selected.primary_sector} • <b>District:</b> {selected.district}</p>
              <p><b>Cost:</b> Rs. {selected.total_cost?(Number(selected.total_cost)/1e9).toFixed(1)+'B':'N/A'} • <b>TRL:</b> {selected.trl_level}</p>
              <p><b>Abstract:</b> {selected.abstract}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Action</p>
              <div className="flex gap-3">
                {[['approve','✅ Approve','green'],['reject','❌ Reject','red'],['request_changes','🔄 Request Changes','yellow']].map(([v,l,c])=>(
                  <button key={v} onClick={()=>setAction(v)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${action===v ? c==='green'?'bg-green-600 text-white border-green-600':c==='red'?'bg-red-600 text-white border-red-600':'bg-yellow-500 text-white border-yellow-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback / Notes</label>
              <textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Provide detailed feedback to the project owner..." value={feedback} onChange={e=>setFeedback(e.target.value)}/>
            </div>
            <Button className="w-full justify-center" disabled={!action} loading={submitting} onClick={handleReview}>Submit Review</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
