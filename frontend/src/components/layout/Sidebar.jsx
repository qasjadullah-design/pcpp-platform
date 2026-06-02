import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const userLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/projects', icon: '🔍', label: 'Browse Projects' },
  { to: '/dashboard/projects/new', icon: '➕', label: 'Submit Project' },
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
  { to: '/dashboard/projects/new', icon: '➕', label: 'Submit Project' },
  { to: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = user?.role === 'admin' ? adminLinks : user?.role === 'provincial' ? provincialLinks : userLinks;
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">PC</div>
          <div>
            <div className="text-sm font-bold">PCPP</div>
            <div className="text-xs text-gray-400">{user?.role === 'admin' ? 'Admin Panel' : user?.role === 'provincial' ? `${user?.province || 'Provincial'} Portal` : 'User Portal'}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs text-gray-500 font-medium mb-3 px-3">MAIN MENU</div>
        {links.map(({ to, icon, label }) => (
          <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === to ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <span>{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{user?.first_name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</div>
            <div className="text-xs text-gray-400 truncate">{user?.organization}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full text-sm text-gray-400 hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800">← Logout</button>
      </div>
    </aside>
  );
}
