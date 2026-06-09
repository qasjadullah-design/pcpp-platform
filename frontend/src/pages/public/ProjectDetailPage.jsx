import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, interestsAPI } from '../../services/api';
import { MOCK_FEATURED_PROJECTS } from '../../data/designMocks';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Tooltip from '../../components/common/Tooltip';
import { STATUS_COLORS, SDG_GOALS, TRL_LEVELS } from '../../utils/constants';
import { TOKENS } from '../../utils/designTokens';
import { trlText } from '../../utils/trl';
import toast from 'react-hot-toast';
import { Bookmark, Building2, ClipboardList, Droplet, Globe2, Landmark, Leaf, Mail, MapPin, Phone, Zap } from 'lucide-react';

const TABS = ['Overview','Financial','Team','Documents','Updates','Gallery'];

const hasValidCoordinates = (project) => {
  const latitude = Number(project?.latitude);
  const longitude = Number(project?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 23 && latitude <= 38 && longitude >= 60 && longitude <= 78;
};

const coordinatePercent = (value, min, max) => {
  if (max === min) return 50;
  return Math.min(96, Math.max(4, ((value - min) / (max - min)) * 100));
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [interestModal, setInterestModal] = useState(false);
  const [interestData, setInterestData] = useState({ message: '', investment_range_min: '', investment_range_max: '', contact_method: '', investment_timeline: '', intent: '' });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [myInterest, setMyInterest] = useState(null);

  useEffect(() => {
    projectsAPI
      .getOne(id)
      .then((r) => {
        const nextProject = r?.data || r;
        setProject(nextProject);
        setSaved(Boolean(nextProject?.is_saved));
        setMyInterest(nextProject?.my_interest || null);
      })
      .catch(() => {
        const fallback = MOCK_FEATURED_PROJECTS.find((p) => p.id === id);
        if (fallback) setProject(fallback);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleInterest = async () => {
    if (!user) { window.location.href = '/login'; return; }
    if (myInterest) {
      toast('You have already expressed interest in this project.');
      setInterestModal(false);
      return;
    }
    setSubmitting(true);
    try {
      const details = [
        interestData.message?.trim(),
        interestData.intent ? `Investment intent: ${interestData.intent}` : '',
        interestData.investment_timeline ? `Timeline: ${interestData.investment_timeline}` : '',
        interestData.contact_method ? `Preferred contact: ${interestData.contact_method}` : '',
      ].filter(Boolean).join('\n\n');
      const createdInterest = await interestsAPI.express(id, { ...interestData, message: details });
      setMyInterest(createdInterest);
      toast.success('Interest expressed successfully!');
      setInterestModal(false);
    } catch(e) { toast.error(e.message || 'Failed to express interest'); }
    finally { setSubmitting(false); }
  };

  const handleSaveProject = async () => {
    if (!user) { window.location.href = '/login'; return; }
    setSavingProject(true);
    try {
      const result = await projectsAPI.toggleSave(id);
      setSaved(Boolean(result?.saved));
      toast.success(result?.saved ? 'Project saved' : 'Project removed from saved projects');
    } catch(e) {
      toast.error(e.message || 'Failed to update saved project');
    } finally {
      setSavingProject(false);
    }
  };

  if (loading) return <Spinner size="lg"/>;
  if (!project) return <div className="text-center py-20 text-gray-500">Project not found</div>;

  const fmt = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'string') {
      if (/B$/i.test(value) || /M$/i.test(value)) return `Rs ${value}`;
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) value = asNumber;
      else return value;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    if (Math.abs(num) >= 1e9) return `Rs ${(num / 1e9).toFixed(1)}B`;
    if (Math.abs(num) >= 1e6) return `Rs ${(num / 1e6).toFixed(1)}M`;
    return `Rs ${num.toLocaleString()}`;
  };
  const trl = TRL_LEVELS.find(t => t.level === project.trl_level);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/projects" className="text-sm text-gray-500 hover:text-emerald-600 mb-4 inline-block">← Back to Projects</Link>

      {/* Header */}
      <div className="bg-emerald-700 text-white rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <Badge label={project.status?.replace(/_/g,' ')} color={STATUS_COLORS[project.status]} />
          {trl && <Tooltip content={trlText(project.trl_level)}><Badge label={`TRL ${project.trl_level}`} color="blue" /></Tooltip>}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{project.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-emerald-200 overflow-hidden">
          {project.district && <span className="inline-flex items-center gap-1"><MapPin size={16} strokeWidth={1.75} /> {project.district}, Pakistan</span>}
          {project.primary_sector && <span className="inline-flex items-center gap-1"><Zap size={16} strokeWidth={1.75} /> {project.primary_sector}</span>}
          {project.organization_name && <span className="inline-flex items-center gap-1"><Building2 size={16} strokeWidth={1.75} /> {project.organization_name}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Project Cost', value: fmt(project.total_cost) },
            { label: 'Funding Gap', value: fmt(project.funding_gap) },
            { label: 'Expected ROI', value: project.expected_roi ? `${project.expected_roi}%` : 'N/A' },
            { label: 'Jobs Created', value: project.jobs_created?.toLocaleString() || 'N/A' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-emerald-200">{s.label}</div>
              <div className="text-lg font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl mb-6">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>{t}</button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Project Overview</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{project.abstract}</p>
                {project.description && <p className="text-sm text-gray-600 mt-3">{project.description}</p>}
              </div>
              {project.sdg_goals?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3">SDG Alignment</h2>
                  <div className="flex flex-wrap gap-2">
                    {project.sdg_goals.map(n => {
                      const sdg = SDG_GOALS.find(s => s.id === n);
                      return sdg ? <div key={n} className="flex items-center gap-1 px-3 py-1 rounded-full text-white text-xs font-medium" style={{ backgroundColor: sdg.color }}>{sdg.id}. {sdg.name}</div> : null;
                    })}
                  </div>
                </div>
              )}
              {project.carbon_market_relevant && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Leaf size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Carbon-Market Readiness</h2>
                  <div className="grid md:grid-cols-2 gap-x-6 text-sm">
                    {[
                      ['Standard', project.carbon_standard],
                      ['Methodology', project.carbon_methodology],
                      ['Credit Status', project.carbon_credit_status],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {(project.feasibility_status || project.feasibility_notes || project.feasibility_study_url || project.land_acquired) && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><ClipboardList size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Feasibility</h2>
                  <div className="grid md:grid-cols-2 gap-x-6 text-sm mb-3">
                    {[
                      ['Study Status', project.feasibility_status],
                      ['Land Acquired', project.land_acquired ? 'Yes' : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900">{v}</span></div>
                    ))}
                  </div>
                  {project.feasibility_study_url && <a href={project.feasibility_study_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">View feasibility study →</a>}
                  {project.feasibility_notes && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{project.feasibility_notes}</p>}
                </div>
              )}
              {project.mitigation_tco2e != null && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Globe2 size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Climate Mitigation</h2>
                  <p className="text-sm text-gray-700">Estimated emission reduction: <span className="font-semibold text-gray-900">{Number(project.mitigation_tco2e).toLocaleString()} tCO₂e</span> {project.mitigation_basis === 'lifetime' ? '(over project lifetime)' : 'per year'}</p>
                  {project.mitigation_value != null && project.mitigation_unit && <p className="text-xs text-gray-400 mt-1">Entered as {Number(project.mitigation_value).toLocaleString()} {project.mitigation_unit}</p>}
                </div>
              )}
              {project.wef_nexus?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Droplet size={18} strokeWidth={1.75} className="text-pcpp-water" /> Water-Energy-Food Nexus</h2>
                  <div className="flex flex-wrap gap-2">
                    {project.wef_nexus.map(nx => <span key={nx} className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium">{nx}</span>)}
                  </div>
                </div>
              )}
              {(project.line_ministry || project.partners?.length > 0 || project.provincial_contacts?.length > 0) && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Landmark size={18} strokeWidth={1.75} className="text-pcpp-emerald" /> Ownership & Partners</h2>
                  {project.line_ministry && <p className="text-sm mb-3"><span className="text-gray-500">Line Ministry: </span><span className="font-medium text-gray-900">{project.line_ministry}</span></p>}
                  {project.provincial_contacts?.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Provincial Contacts</h3>
                      <div className="space-y-1">
                        {project.provincial_contacts.map((c, i) => (
                          <p key={i} className="text-sm text-gray-600">{c.name}{c.designation ? `, ${c.designation}` : ''}{c.department ? ` — ${c.department}` : ''}{c.email ? ` · ${c.email}` : ''}{c.phone ? ` · ${c.phone}` : ''}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.partners?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Partners</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.partners.map((pt, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{pt.name}{pt.type ? ` (${pt.type})` : ''}{pt.role ? ` — ${pt.role}` : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'Financial' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Financial Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ['Total Cost', fmt(project.total_cost)], ['Funding Gap', fmt(project.funding_gap)],
                  ['Expected ROI', project.expected_roi ? `${project.expected_roi}%` : 'N/A'], ['Payback Period', project.payback_years ? `${project.payback_years} years` : 'N/A'],
                  ['Equity Fund', fmt(project.equity_fund)], ['Debt/Loan', fmt(project.debt_loan)],
                  ['Grant', fmt(project.grant_amount)], ['Min Investment', fmt(project.min_investment)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{k}</span>
                    <span className="text-sm font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Team' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Project Team</h2>
              {project.project_lead && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-xl">
                  <p className="font-medium text-gray-900">{project.project_lead.name}</p>
                  <p className="text-sm text-gray-600">{project.project_lead.designation}</p>
                  <p className="text-sm text-gray-500">{project.project_lead.email}</p>
                </div>
              )}
              {project.team_members?.map((m, i) => (
                <div key={i} className="p-3 border-b border-gray-100 flex justify-between text-sm">
                  <span className="font-medium">{m.name}</span><span className="text-gray-500">{m.designation}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Documents' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Documents</h2>
              {project.documents && Object.entries(project.documents).filter(([,v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-700 capitalize">{k.replace(/_/g, ' ')}</span>
                  <a href={v} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">Download</a>
                </div>
              ))}
            </div>
          )}

          {tab === 'Updates' && (
            <div className="space-y-4">
              {project.updates?.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No updates yet.</p>}
              {project.updates?.map(u => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{u.update_type}</span>
                    <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{u.title}</h3>
                  <p className="text-sm text-gray-600">{u.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Facts</h3>
            {[
              ['Project Cost', fmt(project.total_cost)], ['Funding Gap', fmt(project.funding_gap)],
              ['Expected ROI', project.expected_roi ? `${project.expected_roi}%` : 'N/A'],
              ['Timeline', project.start_date && project.end_date ? `${project.start_date.slice(0,4)}–${project.end_date.slice(0,4)}` : 'N/A'],
              ['TRL Level', trl ? `${project.trl_level} — ${trl.name}` : 'N/A'], ['Jobs Created', project.jobs_created?.toLocaleString() || 'N/A'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span className="text-gray-500">{k}</span><span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>

          {hasValidCoordinates(project) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={18} strokeWidth={1.75} className="text-pcpp-emerald" />
                Project Location
              </h3>
              <div className="relative h-40 rounded-xl border border-gray-200 bg-pcpp-mist overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(${TOKENS.border} 1px, transparent 1px), linear-gradient(90deg, ${TOKENS.border} 1px, transparent 1px)`,
                    backgroundSize: '30px 30px',
                  }}
                />
                <span
                  className="absolute z-10 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pcpp-emerald border-2 border-white shadow"
                  style={{
                    left: `${coordinatePercent(Number(project.longitude), 60, 78)}%`,
                    top: `${100 - coordinatePercent(Number(project.latitude), 23, 38)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3 tabular-nums">
                {Number(project.latitude).toFixed(5)}, {Number(project.longitude).toFixed(5)}
              </p>
            </div>
          )}

          <div className="bg-emerald-600 text-white rounded-2xl p-5">
            <h3 className="font-semibold mb-1">Invest in this Project</h3>
            <p className="text-xs text-emerald-100 mb-4">{myInterest ? 'Your interest has been sent to the project owner' : 'Connect with project owner'}</p>
            <Button className="w-full justify-center mb-2" disabled={Boolean(myInterest)} onClick={() => setInterestModal(true)}>
              {myInterest ? 'Interest Sent' : 'Invest Now'}
            </Button>
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={savingProject}
              className="w-full inline-flex items-center justify-center gap-2 text-sm border border-white/50 text-white py-2 rounded-lg hover:bg-white/10 disabled:opacity-60"
            >
              <Bookmark size={16} strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved' : 'Save Project'}
            </button>
            {!user && <Link to="/register" className="block text-center text-sm border border-white/50 text-white py-2 rounded-lg hover:bg-white/10 mt-2">Register</Link>}
          </div>

          {(project.project_lead?.email || project.project_lead?.phone) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Project Contact</h3>
              {project.project_lead?.email && <p className="text-sm text-gray-600 flex items-center gap-2"><Mail size={16} strokeWidth={1.75} /> {project.project_lead.email}</p>}
              {project.project_lead?.phone && <p className="text-sm text-gray-600 flex items-center gap-2 mt-1"><Phone size={16} strokeWidth={1.75} /> {project.project_lead.phone}</p>}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={interestModal} onClose={() => setInterestModal(false)} title="Express Investment Interest">
        <div className="space-y-4">
          {myInterest && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
              You have already expressed interest in this project.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message to Project Owner</label>
            <textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Describe your investment interest..." value={interestData.message} onChange={e => setInterestData(d => ({ ...d, message: e.target.value }))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Investment (PKR)</label><input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={interestData.investment_range_min} onChange={e => setInterestData(d => ({ ...d, investment_range_min: e.target.value }))}/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Investment (PKR)</label><input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={interestData.investment_range_max} onChange={e => setInterestData(d => ({ ...d, investment_range_max: e.target.value }))}/></div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intent</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={interestData.intent} onChange={e => setInterestData(d => ({ ...d, intent: e.target.value }))}>
                <option value="">Select intent</option>
                <option value="Equity investment">Equity investment</option>
                <option value="Debt financing">Debt financing</option>
                <option value="Grant or blended finance">Grant or blended finance</option>
                <option value="Strategic partnership">Strategic partnership</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={interestData.investment_timeline} onChange={e => setInterestData(d => ({ ...d, investment_timeline: e.target.value }))}>
                <option value="">Select timeline</option>
                <option value="Immediately">Immediately</option>
                <option value="Within 30 days">Within 30 days</option>
                <option value="1-3 months">1-3 months</option>
                <option value="Exploratory">Exploratory</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={interestData.contact_method} onChange={e => setInterestData(d => ({ ...d, contact_method: e.target.value }))}>
                <option value="">Select contact</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Meeting">Meeting</option>
              </select>
            </div>
          </div>
          <Button className="w-full justify-center" disabled={Boolean(myInterest)} loading={submitting} onClick={handleInterest}>{myInterest ? 'Interest Already Sent' : 'Submit Interest'}</Button>
        </div>
      </Modal>
    </div>
  );
}
