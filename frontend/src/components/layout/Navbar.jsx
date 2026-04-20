import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">PC</div>
            <span className="font-bold text-gray-900 text-lg">PCPP</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-emerald-600 text-sm font-medium">Home</Link>
            <Link to="/projects" className="text-gray-600 hover:text-emerald-600 text-sm font-medium">Projects</Link>
            <Link to="/about" className="text-gray-600 hover:text-emerald-600 text-sm font-medium">About</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-gray-200">
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs">{user.first_name?.[0]}</div>
                  {user.first_name}
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                    <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>Dashboard</Link>
                    <Link to="/dashboard/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>Settings</Link>
                    <hr className="my-1"/>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-emerald-600">Login</Link>
                <Link to="/register" className="text-sm font-medium bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
