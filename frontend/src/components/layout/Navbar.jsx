import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PcppLogo from '../common/PcppLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };
  return (
    <nav className="bg-pcpp-card border-b border-pcpp-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <PcppLogo variant="light" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">Home</Link>
            <Link to="/projects" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">Projects</Link>
            <Link to="/invest" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">Invest</Link>
            <Link to="/analytics" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">Analytics</Link>
            <Link to="/search" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">Search</Link>
            <Link to="/about" className="text-ink-secondary hover:text-pcpp-emerald text-sm font-medium">About</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-pcpp-mist rounded-full px-3 py-1.5 text-sm font-medium hover:bg-pcpp-emerald/10">
                  <div className="w-6 h-6 bg-pcpp-emerald rounded-full flex items-center justify-center text-white text-xs">{user.first_name?.[0]}</div>
                  {user.first_name}
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-pcpp-card rounded-card shadow-lg border border-pcpp-border py-1">
                    <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="block px-4 py-2 text-sm text-ink-secondary hover:bg-pcpp-mist" onClick={() => setOpen(false)}>Dashboard</Link>
                    <Link to="/dashboard/settings" className="block px-4 py-2 text-sm text-ink-secondary hover:bg-pcpp-mist" onClick={() => setOpen(false)}>Settings</Link>
                    <hr className="my-1"/>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-status-rejected hover:bg-status-rejected/10">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink-secondary hover:text-pcpp-emerald">Login</Link>
                <Link to="/register" className="text-sm font-medium bg-pcpp-emerald text-white px-4 py-2 rounded-control hover:bg-pcpp-emerald-600">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
