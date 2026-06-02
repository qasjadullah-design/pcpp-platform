import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import { PROJECT_STATUSES, formatCurrency } from '../../utils/constants';

const StatBox = ({ icon, value, label, color }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4`}>
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-2xl`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getDashboard().then(r => setData(r)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-xl"/><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl"/>)}</div></div>;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="text-green-200 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
          <p className="text-green-300 text-sm">{user?.organization}</p>
        </div>
        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl">👤</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon="❤️" value={data?.stats?.interests_sent || 0} label="Interests Sent" color="bg-red-50" />
        <StatBox icon="📁" value={data?.stats?.projects_submitted || 0} label="My Projects" color="bg-blue-50" />
        <StatBox icon="🏦" value={data?.stats?.interests_received || 0} label="Interests Received" color="bg-green-50" />
        <StatBox icon="⭐" value={data?.stats?.saved_projects || 0} label="Saved Projects" color="bg-yellow-50" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/projects" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-500 hover:shadow-sm transition-all flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">🔍</div>
            <div>
              <div className="font-medium text-gray-900">Browse Projects & Invest</div>
              <div className="text-xs text-gray-500">Discover verified development projects</div>
            </div>
            <span className="ml-auto text-gray-400">↗</span>
          </Link>
          <Link to="/dashboard/projects/new" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-500 hover:shadow-sm transition-all flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">➕</div>
            <div>
              <div className="font-medium text-gray-900">Submit a New Project</div>
              <div className="text-xs text-gray-500">Add your development project to attract investors</div>
            </div>
            <span className="ml-auto text-gray-400">↗</span>
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Interests */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Recent Interests</h3>
            <Link to="/dashboard/interests" className="text-sm text-green-600 hover:underline">View All →</Link>
          </div>
          {!data?.recent_interests?.length ? (
            <p className="text-gray-400 text-sm text-center py-4">No interests yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_interests.map(i => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">🏗️</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">{i.project_title}</div>
                      <div className="text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${i.status === 'owner_replied' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {i.status === 'owner_replied' ? 'Owner Replied' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Projects */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Projects</h3>
            <Link to="/dashboard/projects" className="text-sm text-green-600 hover:underline">View All →</Link>
          </div>
          {!data?.my_projects?.length ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-3">No projects yet</p>
              <Link to="/dashboard/projects/new" className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800">Submit First Project</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.my_projects.slice(0, 4).map(p => {
                const status = PROJECT_STATUSES[p.status] || PROJECT_STATUSES.draft;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm">📁</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 line-clamp-1">{p.title}</div>
                        <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
