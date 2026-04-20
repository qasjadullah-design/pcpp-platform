import React from 'react';
import Navbar from './Navbar';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>{children}</main>
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>© 2024 Pakistan Country Project Platform (PCPP). Government of Pakistan.</p>
        </div>
      </footer>
    </div>
  );
}
