import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { SECTORS, PROVINCES, getDistricts, SDG_GOALS, TRL_LEVELS, CURRENCIES, CARBON_STANDARDS, CARBON_CREDIT_STATUS, FEASIBILITY_STATUS, WEF_NEXUS, LINE_MINISTRIES, PARTNER_TYPES, CO2_UNITS, MITIGATION_BASIS, toTco2e } from '../../utils/constants';
import toast from 'react-hot-toast';

const STEPS = ['Basic Info','Sector & SDG','Readiness & Location','Financial','Impact & Team','Documents & Submit'];

export default function SubmitProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProvincial = user?.role === 'provincial';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:'', abstract:'', description:'',
    primary_sector:'', sub_sectors:[], sdg_goals:[], wef_nexus:[],
    trl_level:'', status_level:'concept', risk_level:'medium', priority_level:'medium',
    duration_months:'', start_date:'', expected_completion:'', province:'', district:'', city:'', address:'',
    currency:'PKR', total_cost:'', research_fund:'', equity_fund:'', debt_loan:'', grant_amount:'',
    funding_gap:'', min_investment:'', expected_roi:'', payback_years:'',
    direct_beneficiaries:'', indirect_beneficiaries:'', jobs_created:'',
    mitigation_value:'', mitigation_unit:'tCO2e', mitigation_basis:'annual',
    carbon_market_relevant:false, carbon_standard:'', carbon_methodology:'', carbon_credit_status:'',
    feasibility_status:'', feasibility_study_url:'', feasibility_notes:'', land_acquired:false,
    organization_name:'', organization_type:'', organization_website:'',
    project_lead:{ name:'', designation:'', email:'', phone:'' },
    line_ministry:'', provincial_contacts:[], partners:[],
    tags:'',
  });

  const f = (k, v) => setForm(p => ({...p, [k]: v}));

  // Provincial users can only file under their own province; lock it in the form.
  // (The server also forces this on create, so this is UX only.)
  useEffect(() => {
    if (isProvincial && user?.province) setForm(p => ({ ...p, province: user.province }));
  }, [isProvincial, user]);

  const handleSDG = (id) => {
    setForm(p => ({ ...p, sdg_goals: p.sdg_goals.includes(id) ? p.sdg_goals.filter(x=>x!==id) : [...p.sdg_goals, id] }));
  };

  const toggleNexus = (val) => {
    setForm(p => ({ ...p, wef_nexus: p.wef_nexus.includes(val) ? p.wef_nexus.filter(x=>x!==val) : [...p.wef_nexus, val] }));
  };

  // Generic repeatable-row helpers (provincial_contacts, partners)
  const addRow = (key, blank) => setForm(p => ({ ...p, [key]: [...p[key], blank] }));
  const updateRow = (key, idx, field, val) => setForm(p => ({ ...p, [key]: p[key].map((r,i)=> i===idx ? { ...r, [field]: val } : r) }));
  const removeRow = (key, idx) => setForm(p => ({ ...p, [key]: p[key].filter((_,i)=> i!==idx) }));

  const handleSave = async (submit = false) => {
    setSaving(true);
    try {
      const data = { ...form, tags: form.tags ? form.tags.split(',').map(t=>t.trim()) : [] };
      await projectsAPI.create(data);
      toast.success('Project submitted for review!');
      navigate('/dashboard/projects');
    } catch(e) { toast.error(e.message||'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Add New Project</h1>
        <p className="text-sm text-gray-500">Fill in all details to create a comprehensive project profile</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={()=>setStep(i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${i===step?'bg-emerald-600 text-white':i<step?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i===step?'bg-white text-emerald-600':i<step?'bg-emerald-600 text-white':'bg-gray-300 text-gray-600'}`}>{i+1}</span>{s}
            </button>
            {i < STEPS.length-1 && <div className={`h-0.5 w-8 rounded ${i<step?'bg-emerald-400':'bg-gray-200'}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">1</span> Basic Information</h2>
            <Input label="Project Title *" placeholder="Enter a clear, descriptive project title" value={form.title} onChange={e=>f('title',e.target.value)} required />
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Abstract *</label><textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Describe the project objectives, scope, expected outcomes, and impact..." value={form.abstract} onChange={e=>f('abstract',e.target.value)}/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label><textarea rows={5} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Detailed project description..." value={form.description} onChange={e=>f('description',e.target.value)}/></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">2</span> Sector</h2>
            <div>
              <p className="text-sm text-gray-500 mb-3">Choose the primary sector and related sub-sectors</p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {SECTORS.map(s => (
                  <button key={s} onClick={()=>f('primary_sector',s)} className={`p-3 border rounded-xl text-center text-xs font-medium transition ${form.primary_sector===s?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    <div className="text-lg mb-1">⚡</div>{s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">3</span> SDG Alignment</h3>
              <p className="text-sm text-gray-500 mb-3">Select all Sustainable Development Goals this project contributes to</p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {SDG_GOALS.map(sdg => (
                  <button key={sdg.id} onClick={()=>handleSDG(sdg.id)} className={`p-3 rounded-xl text-white text-xs font-bold transition ${form.sdg_goals.includes(sdg.id)?'ring-4 ring-offset-1 ring-gray-300 opacity-100':'opacity-70 hover:opacity-90'}`} style={{backgroundColor: sdg.color}}>
                    {sdg.id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">W</span> Water-Energy-Food Nexus</h3>
              <p className="text-sm text-gray-500 mb-3">Select all nexus dimensions this project addresses</p>
              <div className="flex gap-3 flex-wrap">
                {WEF_NEXUS.map(nx => (
                  <button key={nx} type="button" onClick={()=>toggleNexus(nx)} className={`px-5 py-2 border rounded-xl text-sm font-medium transition ${form.wef_nexus.includes(nx)?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    {nx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">4</span> Project Readiness & Status</h2>
            <div>
              <p className="text-sm text-gray-500 mb-3">Technology Readiness Level (TRL)</p>
              <div className="flex gap-3 flex-wrap">
                {TRL_LEVELS.map(t => (
                  <button key={t.level} type="button" title={`TRL ${t.level}: ${t.name} — ${t.desc}`} onClick={()=>f('trl_level',t.level)} className={`flex flex-col items-center p-3 border rounded-xl transition min-w-16 ${form.trl_level===t.level?'border-emerald-500 bg-emerald-50':'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-bold text-lg text-gray-800">{t.level}</span>
                    <span className="text-xs text-gray-500 text-center leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Status</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.status_level} onChange={e=>f('status_level',e.target.value)}><option value="concept">Concept</option><option value="planning">Planning</option><option value="development">Development</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.risk_level} onChange={e=>f('risk_level',e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.priority_level} onChange={e=>f('priority_level',e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            </div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">5</span> Timeline & Location</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Input label="Duration (Months)" type="number" value={form.duration_months} onChange={e=>f('duration_months',e.target.value)} />
              <Input label="Start Date" type="date" value={form.start_date} onChange={e=>f('start_date',e.target.value)} />
              <Input label="Expected Completion" type="date" value={form.expected_completion} onChange={e=>f('expected_completion',e.target.value)} />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Province *</label><select disabled={isProvincial} title={isProvincial ? 'Locked to your province' : undefined} className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm ${isProvincial ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={form.province} onChange={e=>setForm(p=>({...p, province:e.target.value, district:''}))}><option value="">Select Province</option>{PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">District</label><select disabled={!form.province} className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm ${!form.province ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={form.district} onChange={e=>f('district',e.target.value)}><option value="">{form.province ? 'Select District' : 'Select province first'}</option>{getDistricts(form.province).map(d=><option key={d} value={d}>{d}</option>)}</select></div>
              <Input label="City" placeholder="City name" value={form.city} onChange={e=>f('city',e.target.value)} />
              <Input label="Address" placeholder="Street address or location details" value={form.address} onChange={e=>f('address',e.target.value)} />
            </div>

            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">6</span> Carbon-Market Readiness</h2>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.carbon_market_relevant} onChange={e=>f('carbon_market_relevant',e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              This project is relevant to carbon markets
            </label>
            {form.carbon_market_relevant && (
              <div className="grid md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Carbon Standard</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.carbon_standard} onChange={e=>f('carbon_standard',e.target.value)}><option value="">Select Standard</option>{CARBON_STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <Input label="Methodology" placeholder="e.g. VM0007, ACM0002" value={form.carbon_methodology} onChange={e=>f('carbon_methodology',e.target.value)} />
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Credit Status</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.carbon_credit_status} onChange={e=>f('carbon_credit_status',e.target.value)}><option value="">Select Status</option>{CARBON_CREDIT_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              </div>
            )}

            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">7</span> Feasibility</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Feasibility Study</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.feasibility_status} onChange={e=>f('feasibility_status',e.target.value)}><option value="">Select Status</option>{FEASIBILITY_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <Input label="Study Link (URL)" placeholder="https://..." value={form.feasibility_study_url} onChange={e=>f('feasibility_study_url',e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-7">
                <input type="checkbox" checked={form.land_acquired} onChange={e=>f('land_acquired',e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                Land acquired
              </label>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Feasibility Notes / Key Findings</label><textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Summary of feasibility findings..." value={form.feasibility_notes} onChange={e=>f('feasibility_notes',e.target.value)}/></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">6</span> Financial Information</h2>
            <div>
              <p className="text-sm text-gray-500 mb-3">Select Currency</p>
              <div className="flex gap-2 flex-wrap">
                {CURRENCIES.map(c => <button key={c} onClick={()=>f('currency',c)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.currency===c?'bg-emerald-600 text-white border-emerald-600':'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{c}</button>)}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label={`Total Project Cost (${form.currency}) *`} type="number" placeholder="e.g., 35000000000" value={form.total_cost} onChange={e=>f('total_cost',e.target.value)} />
              <Input label={`Research Fund (${form.currency})`} type="number" placeholder="R&D" value={form.research_fund} onChange={e=>f('research_fund',e.target.value)} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Equity Fund" type="number" value={form.equity_fund} onChange={e=>f('equity_fund',e.target.value)} />
              <Input label="Debt / Loan" type="number" value={form.debt_loan} onChange={e=>f('debt_loan',e.target.value)} />
              <Input label="Grant" type="number" value={form.grant_amount} onChange={e=>f('grant_amount',e.target.value)} />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <Input label="Funding Gap" type="number" value={form.funding_gap} onChange={e=>f('funding_gap',e.target.value)} />
              <Input label="Min Investment" type="number" value={form.min_investment} onChange={e=>f('min_investment',e.target.value)} />
              <Input label="Expected ROI (%)" type="number" placeholder="e.g., 14.5" value={form.expected_roi} onChange={e=>f('expected_roi',e.target.value)} />
              <Input label="Payback (Years)" type="number" value={form.payback_years} onChange={e=>f('payback_years',e.target.value)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">8</span> Impact & Beneficiaries</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Direct Beneficiaries" type="number" placeholder="Number of people" value={form.direct_beneficiaries} onChange={e=>f('direct_beneficiaries',e.target.value)} />
              <Input label="Indirect Beneficiaries" type="number" placeholder="Number of people" value={form.indirect_beneficiaries} onChange={e=>f('indirect_beneficiaries',e.target.value)} />
              <Input label="Jobs Created" type="number" placeholder="Direct jobs" value={form.jobs_created} onChange={e=>f('jobs_created',e.target.value)} />
            </div>

            <h3 className="font-semibold text-gray-900 flex items-center gap-2 pt-2">🌍 Climate Mitigation (CO₂)</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Emission Reduction" type="number" placeholder="e.g., 5000" value={form.mitigation_value} onChange={e=>f('mitigation_value',e.target.value)} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.mitigation_unit} onChange={e=>f('mitigation_unit',e.target.value)}>{CO2_UNITS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Basis</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.mitigation_basis} onChange={e=>f('mitigation_basis',e.target.value)}>{MITIGATION_BASIS.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
            </div>
            {toTco2e(form.mitigation_value, form.mitigation_unit) != null && (
              <p className="text-xs text-gray-500">≈ <span className="font-medium text-gray-700">{toTco2e(form.mitigation_value, form.mitigation_unit).toLocaleString()} tCO₂e</span> {form.mitigation_basis==='annual'?'per year':'over project lifetime'} (normalized)</p>
            )}
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">9</span> Project Team & Organization</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Organization Name *" placeholder="Ministry / Company" value={form.organization_name} onChange={e=>f('organization_name',e.target.value)} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.organization_type} onChange={e=>f('organization_type',e.target.value)}><option value="">Select</option><option>Government Ministry</option><option>Provincial Authority</option><option>Private Company</option><option>NGO</option><option>International Organization</option></select></div>
              <Input label="Website" placeholder="https://..." value={form.organization_website} onChange={e=>f('organization_website',e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Project Lead Name" value={form.project_lead.name} onChange={e=>f('project_lead',{...form.project_lead,name:e.target.value})} />
              <Input label="Designation" value={form.project_lead.designation} onChange={e=>f('project_lead',{...form.project_lead,designation:e.target.value})} />
              <Input label="Email" type="email" value={form.project_lead.email} onChange={e=>f('project_lead',{...form.project_lead,email:e.target.value})} />
              <Input label="Phone" value={form.project_lead.phone} onChange={e=>f('project_lead',{...form.project_lead,phone:e.target.value})} />
            </div>

            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">10</span> Line Ministry, Contacts & Partners</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Line Ministry / Sponsoring Body</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.line_ministry} onChange={e=>f('line_ministry',e.target.value)}><option value="">Select</option>{LINE_MINISTRIES.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-800">Provincial Contacts</h3>
                <button type="button" onClick={()=>addRow('provincial_contacts',{name:'',designation:'',department:'',email:'',phone:''})} className="text-sm text-emerald-600 hover:underline">+ Add contact</button>
              </div>
              {form.provincial_contacts.length===0 && <p className="text-sm text-gray-400">No contacts added.</p>}
              {form.provincial_contacts.map((c,i)=>(
                <div key={i} className="grid md:grid-cols-5 gap-2 mb-2">
                  <Input placeholder="Name" value={c.name} onChange={e=>updateRow('provincial_contacts',i,'name',e.target.value)} />
                  <Input placeholder="Designation" value={c.designation} onChange={e=>updateRow('provincial_contacts',i,'designation',e.target.value)} />
                  <Input placeholder="Department" value={c.department} onChange={e=>updateRow('provincial_contacts',i,'department',e.target.value)} />
                  <Input placeholder="Email" value={c.email} onChange={e=>updateRow('provincial_contacts',i,'email',e.target.value)} />
                  <div className="flex gap-1 items-start">
                    <Input placeholder="Phone" value={c.phone} onChange={e=>updateRow('provincial_contacts',i,'phone',e.target.value)} />
                    <button type="button" onClick={()=>removeRow('provincial_contacts',i)} className="text-red-500 px-2 py-2.5">✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-800">Partners</h3>
                <button type="button" onClick={()=>addRow('partners',{name:'',type:'',role:''})} className="text-sm text-emerald-600 hover:underline">+ Add partner</button>
              </div>
              {form.partners.length===0 && <p className="text-sm text-gray-400">No partners added.</p>}
              {form.partners.map((pt,i)=>(
                <div key={i} className="grid md:grid-cols-3 gap-2 mb-2">
                  <Input placeholder="Partner name" value={pt.name} onChange={e=>updateRow('partners',i,'name',e.target.value)} />
                  <select value={pt.type} onChange={e=>updateRow('partners',i,'type',e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Type</option>{PARTNER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
                  <div className="flex gap-1 items-start">
                    <Input placeholder="Role / contribution" value={pt.role} onChange={e=>updateRow('partners',i,'role',e.target.value)} />
                    <button type="button" onClick={()=>removeRow('partners',i)} className="text-red-500 px-2 py-2.5">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">14</span> Tags & Keywords</h2>
            <Input label="Tags (comma separated)" placeholder="e.g., Solar, Infrastructure, CPEC, Green Initiative" value={form.tags} onChange={e=>f('tags',e.target.value)} />
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="font-medium text-emerald-800 mb-2">📋 Project Summary</h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm text-emerald-700">
                <p>Title: {form.title || 'Not set'}</p>
                <p>Sector: {form.primary_sector || 'Not set'}</p>
                <p>Province: {form.province || 'Not set'}</p>
                <p>District: {form.district || 'Not set'}</p>
                <p>Total Cost: {form.total_cost ? `${form.currency} ${Number(form.total_cost).toLocaleString()}` : 'Not set'}</p>
                <p>SDGs: {form.sdg_goals.length} selected</p>
                <p>TRL Level: {form.trl_level || 'Not set'}</p>
                <p>Carbon Market: {form.carbon_market_relevant ? (form.carbon_standard || 'Relevant') : 'Not relevant'}</p>
                <p>Feasibility: {form.feasibility_status || 'Not set'}</p>
                <p>CO₂ Mitigation: {toTco2e(form.mitigation_value, form.mitigation_unit) != null ? `${toTco2e(form.mitigation_value, form.mitigation_unit).toLocaleString()} tCO₂e ${form.mitigation_basis==='annual'?'/yr':'(lifetime)'}` : 'Not set'}</p>
                <p>WEF Nexus: {form.wef_nexus.length ? form.wef_nexus.join(', ') : 'None'}</p>
                <p>Line Ministry: {form.line_ministry || 'Not set'}</p>
                <p>Partners: {form.partners.length} • Contacts: {form.provincial_contacts.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Cancel / Back</button>
        <div className="flex gap-3">
          <Button variant="secondary" loading={saving} onClick={()=>handleSave(false)}>💾 Save Draft</Button>
          {step < STEPS.length-1 ? (
            <Button onClick={()=>setStep(s=>s+1)}>Next →</Button>
          ) : (
            <Button loading={saving} onClick={()=>handleSave(true)}>✅ Submit Project</Button>
          )}
        </div>
      </div>
    </div>
  );
}
