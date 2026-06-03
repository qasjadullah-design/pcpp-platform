import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PcppLogo from '../common/PcppLogo';

const userLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/projects', icon: '🔍', label: 'Browse Projects' },
  { to: '/dashboard/submit', icon: '➕', label: 'Submit Project' },
  { to: '/dashboard/interests', icon: '❤️', label: 'My Interests' },
  { to: '/dashboard/projects', icon: '📁', label: 'My Projects' },
  { to: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

const adminLinks = [
  { to: '/admin', icon: '🏠', label: 'Dashboard' },
  { to: '/admin/review', icon: '🔄', label: 'Pending Review' },
  { to: '/admin/projects', icon: '📁', label: 'All Projects' },
  { to: '/admin/users', icon: '👥', label: 'All Users' },
  { to: '/admin/analytics', icon: '📊', label: 'Analytics' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

// Provincial users: their (province-scoped) project list, submit, and their own submissions.
// No approval queue, no user management.
const provincialLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/projects', icon: '🔍', label: 'Province Projects' },
  { to: '/dashboard/submit', icon: '➕', label: 'Submit Project' },
  { to: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = user?.role === 'admin' ? adminLinks : user?.role === 'provincial' ? provincialLinks : userLinks;
  const portalLabel = user?.role === 'admin' ? 'Admin panel'
    : user?.role === 'provincial' ? `${user?.province || 'Provincial'} portal`
    : 'User portal';

  return (
    <aside className="w-64 min-h-screen bg-pcpp-pine text-white flex flex-col">
      <div className="p-5 border-b border-white/10">
        <PcppLogo variant="dark" />
        <div className="text-[11px] text-white/60 mt-2">{portalLabel}</div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-[11px] text-white/40 font-medium mb-3 px-3">Main menu</div>
        {links.map(({ to, icon, label }) => (
          <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors ${location.pathname === to ? 'bg-pcpp-emerald text-white' : 'text-white/70 hover:bg-pcpp-pine-700 hover:text-white'}`}>
            <span>{icon}</span>{label}
          </Link>
        ))}
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
