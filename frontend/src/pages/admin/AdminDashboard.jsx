import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => setData(r)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg"/>;

 const metrics = [
    { icon: '📁', label: 'Total Projects', value: data?.total_projects||0, color: 'text-blue-600' },
    { icon: '🔄', label: 'Pending Review', value: data?.pending_review||0, color: 'text-yellow-600', urgent: true },
    { icon: '👥', label: 'Total Users', value: data?.total_users||0, color: 'text-purple-600' },
    { icon: '💰', label: 'Total Funding', value: 'PKR 850B', color: 'text-emerald-600' },
    ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1><p className="text-sm text-gray-500">PCPP Admin Panel</p></div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">↑ Export Report</button>
          <Link to="/admin/review" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">+ Add Project</Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className={`bg-white rounded-2xl border p-5 ${m.urgent?'border-yellow-300':''}`}>
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className={`text-3xl font-bold ${m.color} mb-1`}>{m.value}</div>
            <div className="text-sm text-gray-500">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Attention Required */}
      {(data?.pending_review||0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-orange-500 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-orange-800">Attention Required</p>
              <p className="text-sm text-orange-600">{data?.pending_review} projects are waiting for your review.</p>
            </div>
          </div>
          <Link to="/admin/review" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">Review Now →</Link>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* By Sector */}
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">📊 By Sector</h3>
          {data?.sector_stats?.slice(0,8).map(s => (
            <div key={s.primary_sector} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700">{s.primary_sector}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-emerald-500 rounded-full" style={{width:`${Math.min(100,(s.count/50)*100)}%`}}/></div>
                <span className="text-gray-500 w-6 text-right">{s.count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* By Status */}
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">📋 By Status</h3>
          {data?.status_stats?.map(s => (
            <div key={s.status} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700 capitalize">{s.status?.replace(/_/g,' ')}</span>
              <span className="font-medium text-gray-900">{s.count}</span>
            </div>
          ))}
        </div>

        {/* TRL Distribution */}
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">🔬 TRL Distribution</h3>
          {data?.trl_stats?.map(t => (
            <div key={t.trl_level} className="flex items-center gap-2 py-1 text-sm">
              <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:`hsl(${t.trl_level*30},70%,50%)`}}>{t.trl_level}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${Math.min(100,(t.count/60)*100)}%`,backgroundColor:`hsl(${t.trl_level*30},70%,50%)`}}/></div>
              <span className="text-gray-500 w-6">{t.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Investors & District Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">🏆 Top Investors</h3>
          {data?.top_investors?.map((inv, i) => (
            <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">{i+1}</span>
              <div className="flex-1"><p className="text-sm font-medium">{inv.organization || `${inv.first_name} ${inv.last_name}`}</p><p className="text-xs text-gray-500">{inv.interests} projects</p></div>
              <span className="text-sm font-medium text-emerald-600">Rs. {Number(inv.max_investment||0)/1e9 > 0 ? (Number(inv.max_investment)/1e9).toFixed(1)+'B' : 'N/A'}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">📍 By District</h3>
          {data?.district_stats?.map(d => (
            <div key={d.district} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 last:border-0">
              <span className="text-gray-700">{d.district}</span>
              <span className="text-gray-500">{d.count} projects • Rs. {d.total ? (Number(d.total)/1e9).toFixed(1)+'B' : 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
