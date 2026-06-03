import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Send, FolderOpen, Inbox, Bookmark, Search, Plus, Building2 } from 'lucide-react';
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
    // The axios interceptor already unwraps response.data, so `r` IS the body.
    projectsAPI.getMine().then(r => setMyProjects(Array.isArray(r) ? r : r?.projects || [])).catch(()=>{});
    interestsAPI.getMine().then(r => setMyInterests(Array.isArray(r) ? r : r?.interests || [])).catch(()=>{});
    notificationsAPI.getAll().then(r => setNotifications(Array.isArray(r) ? r : r?.notifications || [])).catch(()=>{});
  }, []);

  const unread = (notifications || []).filter(n => !n.is_read).length;

  const stats = [
    { Icon: Send, value: myInterests.length, label: 'Interests sent' },
    { Icon: FolderOpen, value: myProjects.length, label: 'My projects' },
    { Icon: Inbox, value: myInterests.filter(i => i.status === 'owner_replied').length, label: 'Interests received' },
    { Icon: Bookmark, value: 0, label: 'Saved projects' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-ink-secondary">Dashboard</p>
          <p className="text-xs text-ink-tertiary">Pakistan Country Project Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={20} strokeWidth={1.75} className="text-ink-secondary cursor-pointer" />
            {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-status-rejected text-white text-[10px] rounded-full flex items-center justify-center">{unread}</span>}
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="bg-pcpp-emerald text-white rounded-card p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/80">Welcome back,</p>
          <h1 className="text-2xl font-semibold">{user?.first_name} {user?.last_name}</h1>
          <p className="text-white/80 text-sm">{user?.organization}</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-semibold">{user?.first_name?.[0]}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ Icon, value, label }) => (
          <div key={label} className="bg-pcpp-card rounded-card border border-pcpp-border p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald flex items-center justify-center"><Icon size={20} strokeWidth={1.75} /></span>
            <div>
              <div className="text-2xl font-semibold text-ink tabular-nums">{Number(value).toLocaleString()}</div>
              <div className="text-xs text-ink-secondary">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="font-semibold text-pcpp-pine mb-3">Quick actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/projects" className="bg-pcpp-card border border-pcpp-border rounded-card p-5 hover:border-pcpp-emerald hover:shadow-sm transition flex items-center gap-4 group">
            <span className="w-10 h-10 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald flex items-center justify-center"><Search size={20} strokeWidth={1.75} /></span>
            <div className="flex-1"><div className="font-medium text-ink">Browse projects &amp; invest</div><p className="text-xs text-ink-secondary">Discover verified development projects and express your investment interest</p></div>
          </Link>
          <Link to="/dashboard/submit" className="bg-pcpp-card border border-pcpp-border rounded-card p-5 hover:border-pcpp-emerald hover:shadow-sm transition flex items-center gap-4 group">
            <span className="w-10 h-10 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald flex items-center justify-center"><Plus size={20} strokeWidth={1.75} /></span>
            <div className="flex-1"><div className="font-medium text-ink">Submit a new project</div><p className="text-xs text-ink-secondary">Add your development project to attract strategic investors</p></div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-pcpp-pine">My recent interests</h3>
            <Link to="/dashboard/interests" className="text-xs text-pcpp-emerald hover:underline">View all →</Link>
          </div>
          {myInterests.slice(0,3).map(i => (
            <div key={i.id} className="flex items-center justify-between py-2 border-b border-pcpp-border last:border-0">
              <div className="flex items-center gap-3"><span className="w-8 h-8 bg-pcpp-emerald/10 text-pcpp-emerald rounded-control flex items-center justify-center"><Building2 size={16} strokeWidth={1.75} /></span>
                <div><p className="text-sm font-medium text-ink">{i.project?.title}</p><p className="text-xs text-ink-tertiary">{new Date(i.created_at).toLocaleDateString()}</p></div>
              </div>
              <Badge label={i.status === 'owner_replied' ? 'Owner replied' : 'Pending'} color={i.status === 'owner_replied' ? 'green' : 'yellow'} />
            </div>
          ))}
          {myInterests.length === 0 && <p className="text-sm text-ink-secondary text-center py-4">No interests yet</p>}
        </div>

        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-pcpp-pine">My projects</h3>
            <Link to="/dashboard/projects" className="text-xs text-pcpp-emerald hover:underline">View all →</Link>
          </div>
          {myProjects.slice(0,3).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-pcpp-border last:border-0">
              <div className="flex items-center gap-3"><span className="w-8 h-8 bg-pcpp-emerald/10 text-pcpp-emerald rounded-control flex items-center justify-center"><FolderOpen size={16} strokeWidth={1.75} /></span>
                <div><p className="text-sm font-medium text-ink">{p.title}</p><p className="text-xs text-ink-tertiary">{new Date(p.created_at).toLocaleDateString()}</p></div>
              </div>
              <Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status] || 'gray'} />
            </div>
          ))}
          {myProjects.length === 0 && <p className="text-sm text-ink-secondary text-center py-4">No projects yet. <Link to="/dashboard/submit" className="text-pcpp-emerald hover:underline">Submit one!</Link></p>}
        </div>
      </div>
    </div>
  );
}
