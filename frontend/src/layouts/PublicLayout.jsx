import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
              <span className="font-bold text-gray-900 text-lg">PCPP</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-600 hover:text-green-700 font-medium text-sm">Home</Link>
              <Link to="/projects" className="text-gray-600 hover:text-green-700 font-medium text-sm">Projects</Link>
              <Link to="/about" className="text-gray-600 hover:text-green-700 font-medium text-sm">About</Link>
            </div>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link to={user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/dashboard'}
                    className="text-sm text-gray-600 hover:text-green-700 font-medium">Dashboard</Link>
                  <button onClick={() => { logout(); navigate('/'); }}
                    className="text-sm text-gray-500 hover:text-red-600">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-600 hover:text-green-700 font-medium">Login</Link>
                  <Link to="/register" className="bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Register</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden py-3 border-t border-gray-100 space-y-1">
              <Link to="/" className="block px-3 py-2 text-gray-600 hover:bg-green-50 rounded-lg text-sm">Home</Link>
              <Link to="/projects" className="block px-3 py-2 text-gray-600 hover:bg-green-50 rounded-lg text-sm">Projects</Link>
              <Link to="/about" className="block px-3 py-2 text-gray-600 hover:bg-green-50 rounded-lg text-sm">About</Link>
              {!user ? (
                <>
                  <Link to="/login" className="block px-3 py-2 text-gray-600 hover:bg-green-50 rounded-lg text-sm">Login</Link>
                  <Link to="/register" className="block px-3 py-2 bg-green-700 text-white rounded-lg text-sm text-center">Register</Link>
                </>
              ) : (
                <button onClick={() => { logout(); navigate('/'); }} className="block w-full text-left px-3 py-2 text-red-600 text-sm">Logout</button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center font-bold">B</div>
                <span className="font-bold text-xl">PCPP</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Pakistan Country Project Platform — Connecting visionary development projects with strategic investors to build a prosperous Pakistan.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-300">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/projects" className="hover:text-white transition-colors">Browse Projects</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About PCPP</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-300">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>info@bcpp.gov.pk</li>
                <li>+92-81-9201234</li>
                <li>Quetta, Pakistan, Pakistan</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Government of Pakistan. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
