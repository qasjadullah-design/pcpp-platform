import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Plus, Send, FolderOpen, Settings, RefreshCw, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PcppLogo from '../common/PcppLogo';

const userLinks = [
  { to: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', Icon: Search, label: 'Browse projects' },
  { to: '/dashboard/submit', Icon: Plus, label: 'Submit project' },
  { to: '/dashboard/interests', Icon: Send, label: 'My interests' },
  { to: '/dashboard/projects', Icon: FolderOpen, label: 'My projects' },
  { to: '/dashboard/settings', Icon: Settings, label: 'Settings' },
];

const investorLinks = [
  { to: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', Icon: Search, label: 'Browse projects' },
  { to: '/dashboard/interests', Icon: Send, label: 'My interests' },
  { to: '/dashboard/settings', Icon: Settings, label: 'Settings' },
];

const adminLinks = [
  { to: '/admin', Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/projects?status=under_review&sort_by=created_at&sort_dir=asc', Icon: RefreshCw, label: 'Pending review' },
  { to: '/admin/projects', Icon: FolderOpen, label: 'All projects' },
  { to: '/admin/users', Icon: Users, label: 'All users' },
  { to: '/admin/analytics', Icon: BarChart3, label: 'Analytics' },
  { to: '/admin/settings', Icon: Settings, label: 'Settings' },
];

// Provincial users: their (province-scoped) project list, submit, and their own submissions.
const provincialLinks = [
  { to: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', Icon: Search, label: 'Province projects' },
  { to: '/dashboard/submit', Icon: Plus, label: 'Submit project' },
  { to: '/dashboard/analytics', Icon: BarChart3, label: 'Analytics' },
  { to: '/dashboard/settings', Icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = user?.role === 'admin' || user?.role === 'superadmin' ? adminLinks
    : user?.role === 'provincial' ? provincialLinks
    : user?.role === 'investor' ? investorLinks
    : userLinks;
  const searchParams = new URLSearchParams(location.search);
  const adminPendingViewActive = location.pathname === '/admin/projects' && searchParams.get('status') === 'under_review';
  const portalLabel = user?.role === 'admin' || user?.role === 'superadmin' ? 'Admin panel'
    : user?.role === 'provincial' ? `${user?.province || 'Provincial'} portal`
    : user?.role === 'investor' ? 'Investor portal'
    : 'User portal';

  return (
    <aside className="w-64 min-h-screen bg-pcpp-pine text-white flex flex-col">
      <div className="p-5 border-b border-white/10">
        <PcppLogo variant="dark" />
        <div className="text-[11px] text-white/60 mt-2">{portalLabel}</div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-[11px] text-white/40 font-medium mb-3 px-3">Main menu</div>
        {links.map(({ to, Icon, label }) => {
          const targetPath = to.split('?')[0];
          const active = to.includes('?')
            ? adminPendingViewActive
            : location.pathname === targetPath && !(targetPath === '/admin/projects' && adminPendingViewActive);
          return (
            <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors ${active ? 'bg-pcpp-emerald text-white' : 'text-white/70 hover:bg-pcpp-pine-700 hover:text-white'}`}>
              <Icon size={18} strokeWidth={1.75} />{label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-pcpp-emerald rounded-full flex items-center justify-center text-white text-xs font-semibold">{user?.first_name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-white">{user?.first_name} {user?.last_name}</div>
            <div className="text-xs text-white/60 truncate">{user?.organization}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full text-sm text-white/70 hover:text-white flex items-center gap-2 px-3 py-2 rounded-control hover:bg-pcpp-pine-700">← Logout</button>
      </div>
    </aside>
  );
}
