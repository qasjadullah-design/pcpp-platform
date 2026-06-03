import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { FolderOpen, RefreshCw, Users, Wallet, AlertTriangle, BarChart3, ClipboardList, FlaskConical, Map, Trophy, MapPin } from 'lucide-react';
import { adminAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import Tooltip from '../../components/common/Tooltip';
import { trlText } from '../../utils/trl';
import { STATUS_COLORS_HEX } from '../../utils/designTokens';
import { formatCurrency } from '../../utils/constants';

ChartJS.register(ArcElement, ChartTooltip, Legend);

// Map project status -> lifecycle bucket (per roadmap A2).
function buildLifecycle(statusStats = []) {
  let pipeline = 0, ongoing = 0, completed = 0;
  statusStats.forEach((s) => {
    const c = Number(s.count) || 0;
    if (s.status === 'under_implementation') ongoing += c;
    else if (s.status === 'completed') completed += c;
    else pipeline += c;
  });
  return { pipeline, ongoing, completed, total: pipeline + ongoing + completed };
}

const num = (v) => (Number(v) || 0).toLocaleString();
const billions = (v) => (v ? `Rs. ${(Number(v) / 1e9).toFixed(1)}B` : '—');

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => setData(r)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg"/>;

  const metrics = [
    { Icon: FolderOpen, label: 'Total projects', value: num(data?.total_projects) },
    { Icon: RefreshCw, label: 'Pending review', value: num(data?.pending_review), urgent: true },
    { Icon: Users, label: 'Total users', value: num(data?.total_users) },
    { Icon: Wallet, label: 'Total funding', value: formatCurrency(data?.total_funding) },
  ];

  const maxSector = Math.max(1, ...((data?.sector_stats || []).map(s => Number(s.count) || 0)));
  const maxTrl = Math.max(1, ...((data?.trl_stats || []).map(t => Number(t.count) || 0)));
  const maxProvince = Math.max(1, ...((data?.province_stats || []).map(p => Number(p.count) || 0)));
  const lifecycle = buildLifecycle(data?.status_stats);
  const lifecyclePct = (v) => (lifecycle.total ? Math.round((v / lifecycle.total) * 100) : 0);
  const lifecycleData = {
    labels: ['Pipeline', 'Ongoing', 'Completed'],
    datasets: [{
      data: [lifecycle.pipeline, lifecycle.ongoing, lifecycle.completed],
      backgroundColor: [STATUS_COLORS_HEX.pipeline, STATUS_COLORS_HEX.ongoing, STATUS_COLORS_HEX.completed],
      borderWidth: 0,
    }],
  };
  const lifecycleOptions = {
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toLocaleString()} (${lifecyclePct(ctx.parsed)}%)` } },
    },
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-pcpp-pine">Admin dashboard</h1><p className="text-sm text-ink-secondary">PCPP admin panel</p></div>
        <div className="flex gap-3">
          <button className="border border-pcpp-border text-ink-secondary px-4 py-2 rounded-control text-sm hover:bg-pcpp-mist">Export report</button>
          <Link to="/admin/review" className="bg-pcpp-emerald text-white px-4 py-2 rounded-control text-sm hover:bg-pcpp-emerald-600">Add project</Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map(({ Icon, label, value, urgent }) => (
          <div key={label} className={`bg-pcpp-card rounded-card border p-5 ${urgent ? 'border-status-pipeline/40' : 'border-pcpp-border'}`}>
            <span className="w-10 h-10 rounded-control bg-pcpp-emerald/10 text-pcpp-emerald flex items-center justify-center mb-3"><Icon size={20} strokeWidth={1.75} /></span>
            <div className="text-2xl font-semibold text-pcpp-pine mb-1 tabular-nums">{value}</div>
            <div className="text-sm text-ink-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Attention Required */}
      {(data?.pending_review||0) > 0 && (
        <div className="bg-pcpp-harvest/10 border border-pcpp-harvest/30 rounded-card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} strokeWidth={1.75} className="text-pcpp-harvest" />
            <div>
              <p className="font-medium text-pcpp-pine">Attention required</p>
              <p className="text-sm text-ink-secondary">{num(data?.pending_review)} projects are waiting for your review.</p>
            </div>
          </div>
          <Link to="/admin/review" className="bg-pcpp-harvest text-white px-4 py-2 rounded-control text-sm hover:opacity-90">Review now →</Link>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* By Sector */}
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><BarChart3 size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> By sector</h3>
          {data?.sector_stats?.slice(0,8).map(s => (
            <div key={s.primary_sector} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-ink-secondary">{s.primary_sector}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-pcpp-mist rounded-full"><div className="h-1.5 bg-pcpp-emerald rounded-full" style={{width:`${Math.min(100,(s.count/maxSector)*100)}%`}}/></div>
                <span className="text-ink-tertiary w-8 text-right tabular-nums">{num(s.count)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* By Status */}
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><ClipboardList size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> By status</h3>
          {data?.status_stats?.map(s => (
            <div key={s.status} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-ink-secondary capitalize">{s.status?.replace(/_/g,' ')}</span>
              <span className="font-medium text-ink tabular-nums">{num(s.count)}</span>
            </div>
          ))}
        </div>

        {/* TRL Distribution */}
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><FlaskConical size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> TRL distribution</h3>
          {data?.trl_stats?.map(t => (
            <div key={t.trl_level} className="flex items-center gap-2 py-1 text-sm">
              <Tooltip content={trlText(t.trl_level)}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold cursor-help" style={{backgroundColor:`hsl(${t.trl_level*30},70%,50%)`}}>{t.trl_level}</span>
              </Tooltip>
              <div className="flex-1 h-2 bg-pcpp-mist rounded-full"><div className="h-2 rounded-full" style={{width:`${Math.min(100,(t.count/maxTrl)*100)}%`,backgroundColor:`hsl(${t.trl_level*30},70%,50%)`}}/></div>
              <span className="text-ink-tertiary w-8 text-right tabular-nums">{num(t.count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Project Lifecycle */}
      <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5 mb-6">
        <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><RefreshCw size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Project lifecycle</h3>
        {lifecycle.total > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="max-w-[220px] mx-auto"><Doughnut data={lifecycleData} options={lifecycleOptions} /></div>
            <div className="space-y-3">
              {[
                ['Pipeline', lifecycle.pipeline, 'bg-status-pipeline', 'Submitted / approved but not yet started'],
                ['Ongoing', lifecycle.ongoing, 'bg-status-ongoing', 'Currently under implementation'],
                ['Completed', lifecycle.completed, 'bg-status-completed', 'Finished projects'],
              ].map(([label, val, dot, hint]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <span className={`w-3 h-3 rounded-full ${dot}`} />
                    <span title={hint}>{label}</span>
                  </span>
                  <span className="font-medium text-ink tabular-nums">{num(val)} <span className="text-ink-tertiary font-normal">({lifecyclePct(val)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-tertiary">No status data available.</p>
        )}
      </div>

      {/* By Province */}
      <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5 mb-6">
        <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><Map size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> By province</h3>
        {data?.province_stats?.length ? (
          data.province_stats.map(p => (
            <div key={p.province} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-ink-secondary w-44 truncate">{p.province}</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-2 bg-pcpp-mist rounded-full"><div className="h-2 bg-pcpp-emerald rounded-full" style={{width:`${Math.min(100,(p.count/maxProvince)*100)}%`}}/></div>
                <span className="text-ink font-medium w-10 text-right tabular-nums">{num(p.count)}</span>
                <span className="text-ink-tertiary w-20 text-right tabular-nums">{billions(p.total)}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-ink-tertiary">No province data available.</p>
        )}
      </div>

      {/* Top Investors & District Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><Trophy size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Top investors</h3>
          {data?.top_investors?.map((inv, i) => (
            <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-pcpp-border last:border-0">
              <span className="w-7 h-7 bg-pcpp-emerald/10 rounded-full flex items-center justify-center text-sm font-semibold text-pcpp-emerald tabular-nums">{i+1}</span>
              <div className="flex-1"><p className="text-sm font-medium text-ink">{inv.organization || `${inv.first_name} ${inv.last_name}`}</p><p className="text-xs text-ink-tertiary tabular-nums">{num(inv.interests)} projects</p></div>
              <span className="text-sm font-medium text-pcpp-emerald tabular-nums">{Number(inv.max_investment||0) > 0 ? billions(inv.max_investment) : 'N/A'}</span>
            </div>
          ))}
        </div>
        <div className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
          <h3 className="font-semibold text-pcpp-pine mb-4 flex items-center gap-2"><MapPin size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> By district</h3>
          {data?.district_stats?.map(d => (
            <div key={d.district} className="flex items-center justify-between py-1.5 text-sm border-b border-pcpp-border last:border-0">
              <span className="text-ink-secondary">{d.district}</span>
              <span className="text-ink-tertiary tabular-nums">{num(d.count)} projects • {billions(d.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
