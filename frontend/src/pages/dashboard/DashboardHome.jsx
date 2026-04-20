import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI, interestsAPI, notificationsAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { STATUS_COLORS } from '../../utils/constants';

export default function DashboardHome() {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState([]);
  const [myInterests, setMyInterests] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    projectsAPI.getMine().then(r => setMyProjects(r.data)).catch(()=>{});
    interestsAPI.getMine().then(r => setMyInterests(r.data)).catch(()=>{});
    notificationsAPI.getAll().then(r => setNotifications(r.data)).catch(()=>{});
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Dashboard</p>
          <p className="text-xs text-gray-400">Pakistan Country Project Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl cursor-pointer">🔔</span>
            {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unread}</span>}
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="bg-emerald-600 text-white rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-emerald-200">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
          <p className="text-emerald-200 text-sm">{user?.organization}</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">{user?.first_name?.[0]}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '❤️', value: myInterests.length, label: 'Interests Sent', color: 'text-red-500' },
          { icon: '📁', value: myProjects.length, label: 'My Projects', color: 'text-blue-500' },
          { icon: '📬', value: myInterests.filter(i=>i.status==='owner_replied').length, label: 'Interests Received', color: 'text-purple-500' },
          { icon: '⭐', value: 0, label: 'Saved Projects', color: 'text-yellow-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/projects" className="bg-white border rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition flex items-center justify-between group">
            <div><div className="flex items-center gap-2 mb-1"><span className="text-lg">🔍</span><span className="font-medium text-gray-900">Browse Projects & Invest</span></div><p className="text-xs text-gray-500">Discover verified development projects and express your investment interest</p></div>
            <span className="text-gray-400 group-hover:text-emerald-600">↗</span>
          </Link>
          <Link to="/dashboard/submit" className="bg-white border rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition flex items-center justify-between group">
            <div><div className="flex items-center gap-2 mb-1"><span className="text-lg">➕</span><span className="font-medium text-gray-900">Submit a New Project</span></div><p className="text-xs text-gray-500">Add your development project to attract strategic investors</p></div>
            <span className="text-gray-400 group-hover:text-emerald-600">↗</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Recent Interests</h3>
            <Link to="/dashboard/interests" className="text-xs text-emerald-600 hover:underline">View All →</Link>
          </div>
          {myInterests.slice(0,3).map(i => (
            <div key={i.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs">📁</div>
                <div><p className="text-sm font-medium text-gray-900">{i.project?.title}</p><p className="text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString()}</p></div>
              </div>
              <Badge label={i.status === 'owner_replied' ? 'Owner Replied' : 'Pending'} color={i.status === 'owner_replied' ? 'green' : 'yellow'} />
            </div>
          ))}
          {myInterests.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No interests yet</p>}
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Projects</h3>
            <Link to="/dashboard/projects" className="text-xs text-emerald-600 hover:underline">View All →</Link>
          </div>
          {myProjects.slice(0,3).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-xs">⚡</div>
                <div><p className="text-sm font-medium text-gray-900">{p.title}</p><p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p></div>
              </div>
              <Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status] || 'gray'} />
            </div>
          ))}
          {myProjects.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No projects yet. <Link to="/dashboard/submit" className="text-emerald-600 hover:underline">Submit one!</Link></p>}
        </div>
      </div>
    </div>
  );
}
