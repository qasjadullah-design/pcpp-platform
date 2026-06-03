import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { interestsAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { FolderOpen, MessageCircle, Send } from 'lucide-react';

export default function MyInterestsPage() {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interestsAPI.getMine().then(r => setInterests(Array.isArray(r) ? r : r?.interests || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">My Interests</h1><p className="text-sm text-gray-500">Projects you have expressed interest in</p></div>

      {loading ? <p>Loading...</p> : interests.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Send size={40} strokeWidth={1.75} className="mx-auto mb-4 text-ink-secondary" />
          <p className="font-medium">No interests yet</p>
          <Link to="/projects" className="text-emerald-600 hover:underline text-sm">Browse projects to invest →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interests.map(i => (
            <div key={i.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><FolderOpen size={20} strokeWidth={1.75} /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{i.project_title || i.project?.title}</h3>
                  <p className="text-xs text-gray-500">Expressed: {new Date(i.created_at).toLocaleDateString()}</p>
                  {i.owner_response && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><MessageCircle size={13} strokeWidth={1.75} /> {i.owner_response}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={i.status === 'owner_replied' ? 'Owner Replied' : 'Pending Response'} color={i.status === 'owner_replied' ? 'green' : 'yellow'} dot />
                <Link to={`/projects/${i.project_id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">View Project</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
