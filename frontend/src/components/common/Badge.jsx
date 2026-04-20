import React from 'react';
const colors = { green:'bg-green-100 text-green-800', yellow:'bg-yellow-100 text-yellow-800', red:'bg-red-100 text-red-800', blue:'bg-blue-100 text-blue-800', gray:'bg-gray-100 text-gray-800', orange:'bg-orange-100 text-orange-800', purple:'bg-purple-100 text-purple-800' };
export default function Badge({ label, color='gray', dot=false }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{dot && <span className="w-1.5 h-1.5 rounded-full bg-current"/>}{label}</span>;
}
