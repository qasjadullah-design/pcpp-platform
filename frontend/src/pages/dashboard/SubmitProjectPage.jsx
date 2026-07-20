import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { metaAPI, projectsAPI } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SdgBadge from '../../components/common/SdgBadge';
import { WefNexusBadge, WefNexusMark } from '../../components/common/WefNexusMark';
import { SECTORS, PROVINCES, SDG_GOALS, TRL_LEVELS, CURRENCIES, CARBON_STANDARDS, CARBON_CREDIT_STATUS, FEASIBILITY_STATUS, WEF_NEXUS, LINE_MINISTRIES, PARTNER_TYPES, CO2_UNITS, MITIGATION_BASIS, toTco2e } from '../../utils/constants';
import { getSectorColor } from '../../utils/designTokens';
import toast from 'react-hot-toast';
import {
  Banknote,
  CheckCircle,
  Clapperboard,
  ClipboardList,
  Cpu,
  Droplets,
  Factory,
  Fish,
  FlaskConical,
  Globe2,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Hotel,
  Landmark,
  Layers,
  Leaf,
  MapPin,
  Palette,
  Pickaxe,
  RadioTower,
  Route,
  Save,
  Shield,
  ShoppingCart,
  Trophy,
  Truck,
  Users,
  Wheat,
  Zap,
} from 'lucide-react';

const STEPS = ['Basic Info','Sector & SDG','Readiness & Location','Financial','Climate & Impact','Team & Partners','Documents & Submit'];
const PRIORITY_OPTIONS = ['WEF', 'low', 'medium', 'high'];
const PROJECT_STAGES = ['concept', 'planning', 'development', 'under_implementation', 'scale_up', 'completed'];
const RISK_OPTIONS = ['low', 'medium', 'high', 'critical'];
const FUNDING_TAGS = [
  { value: '', label: 'Not tagged' },
  { value: 'ADP', label: 'ADP' },
  { value: 'PSDP', label: 'PSDP' },
  { value: 'ADP/PSDP', label: 'ADP / PSDP' },
];

const SECTOR_ICONS = {
  'Energy & Power': Zap,
  'Water & Sanitation': Droplets,
  'Agriculture & Food': Wheat,
  'Health & Medical': HeartPulse,
  'Education & Training': GraduationCap,
  'Transport & Logistics': Truck,
  'Technology & IT': Cpu,
  Infrastructure: Landmark,
  'Housing & Real Estate': Home,
  'Industry & Manufacturing': Factory,
  'Tourism & Hospitality': Hotel,
  'Environment & Climate': Leaf,
  'Finance & Banking': Banknote,
  'Telecoms & Communications': RadioTower,
  'Retail & Commerce': ShoppingCart,
  Construction: Hammer,
  'Arts & Culture': Palette,
  'Media & Entertainment': Clapperboard,
  'Social Services': Users,
  'Research & Development': FlaskConical,
  'Defense & Security': Shield,
  'Sports & Recreation': Trophy,
  'Mining & Minerals': Pickaxe,
  'Fisheries & Coastal': Fish,
  'CPEC Infrastructure': Route,
  Other: Layers,
};

function SectionHeading({ Icon = ClipboardList, title, level = 'h2' }) {
  const Heading = level;
  return (
    <Heading className="font-semibold text-gray-900 flex items-center gap-2">
      <span className="w-8 h-8 bg-pcpp-emerald text-white rounded-control flex items-center justify-center">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      {title}
    </Heading>
  );
}

export default function SubmitProjectPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const { user } = useAuth();
  const isProvincial = user?.role === 'provincial';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [fundingSourceTypes, setFundingSourceTypes] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [form, setForm] = useState({
    title:'', abstract:'', description:'',
    primary_sector:'', custom_sector:'', sub_sectors:[], sdg_goals:[], wef_nexus:[],
    trl_level:'', stage:'concept', risk_level:'medium', priority_level:'medium', secondary_sector:'', wef_pillars:[],
    duration_months:'', start_date:'', expected_completion:'', province:'', district:'', city:'', address:'',
    currency:'PKR', custom_currency:'', total_cost:'', research_fund:'', equity_fund:'', debt_loan:'', grant_amount:'',
    funding_tag:'',
    funding_gap:'', min_investment:'', expected_roi:'', payback_years:'',
    direct_beneficiaries:'', indirect_beneficiaries:'', jobs_created:'',
    mitigation_value:'', mitigation_unit:'tCO2e', mitigation_basis:'annual',
    carbon_market_relevant:false, carbon_standard:'', custom_carbon_standard:'', carbon_methodology:'', carbon_credit_status:'',
    feasibility_status:'', feasibility_study_url:'', feasibility_notes:'', land_acquired:false,
    organization_name:'', organization_type:'', organization_website:'',
    project_lead:{ name:'', designation:'', email:'', phone:'' },
    line_ministry:'', provincial_contacts:[], partners:[],
    tags:'', districts:[], phases:[], funding_sources:[], feasibility_links:[],
    carbon_credit_methodology:'not_decided', feasibility_type:'none_yet',
    approval_loi_los:false, approval_departmental:false, approval_mocc_notification:false, approvals_confirmed:false,
    climate_finance_available:false, climate_finance_amount:'', carbon_finance_option:false, carbon_finance_notes:'', estimated_co2_reduction:'',
  });

  const f = (k, v) => setForm(p => ({...p, [k]: v}));
  const effectiveSector = form.primary_sector === 'Other' && form.custom_sector.trim() ? form.custom_sector.trim() : form.primary_sector;
  const effectiveCurrency = form.currency === 'Other' && form.custom_currency.trim() ? form.custom_currency.trim().toUpperCase() : form.currency;
  const effectiveCarbonStandard = form.carbon_standard === 'Other' && form.custom_carbon_standard.trim() ? form.custom_carbon_standard.trim() : form.carbon_standard;

  // Provincial users can only file under their own province; lock it in the form.
  // (The server also forces this on create, so this is UX only.)
  useEffect(() => {
    if (isProvincial && user?.province) setForm(p => ({ ...p, province: user.province }));
  }, [isProvincial, user]);

  useEffect(() => {
    metaAPI.getFundingSourceTypes().then(r => setFundingSourceTypes(r.funding_source_types || [])).catch(() => setFundingSourceTypes([]));
  }, []);

  useEffect(() => {
    if (!form.province) return setDistrictOptions([]);
    metaAPI.getDistricts(form.province).then(r => setDistrictOptions(r.districts || [])).catch(() => setDistrictOptions([]));
  }, [form.province]);

  useEffect(() => {
    if (!editId) return;
    projectsAPI.getOne(editId).then(project => {
      setForm(current => ({ ...current, ...project,
        districts: (project.districts || []).map(d => d.id),
        phases: project.phases || [], funding_sources: project.funding_sources || [],
        feasibility_links: project.feasibility_links || [],
        approvals_confirmed: Boolean(project.approvals_answered_at),
      }));
    }).catch(() => toast.error('Unable to load project for editing.'));
  }, [editId]);

  if (user?.role === 'investor') {
    return (
      <div className="p-8">
        <div className="max-w-2xl bg-pcpp-card border border-pcpp-border rounded-card p-6">
          <h1 className="text-xl font-semibold text-pcpp-pine mb-2">Project submission is for project owners</h1>
          <p className="text-sm text-ink-secondary mb-5">Investor accounts can browse approved projects and express investment interest.</p>
          <Link to="/projects" className="inline-flex items-center justify-center bg-pcpp-emerald text-white px-4 py-2 rounded-control text-sm hover:bg-pcpp-emerald-600">Browse projects</Link>
        </div>
      </div>
    );
  }

  const handleSDG = (id) => {
    setForm(p => ({ ...p, sdg_goals: p.sdg_goals.includes(id) ? p.sdg_goals.filter(x=>x!==id) : [...p.sdg_goals, id] }));
  };

  const toggleNexus = (val) => {
    setForm(p => ({ ...p, wef_nexus: p.wef_nexus.includes(val) ? p.wef_nexus.filter(x=>x!==val) : [...p.wef_nexus, val] }));
  };

  const handleSectorSelect = (sector) => {
    setForm(p => ({ ...p, primary_sector: sector, custom_sector: sector === 'Other' ? p.custom_sector : '' }));
  };

  // Generic repeatable-row helpers (provincial_contacts, partners)
  const addRow = (key, blank) => setForm(p => ({ ...p, [key]: [...p[key], blank] }));
  const updateRow = (key, idx, field, val) => setForm(p => ({ ...p, [key]: p[key].map((r,i)=> i===idx ? { ...r, [field]: val } : r) }));
  const removeRow = (key, idx) => setForm(p => ({ ...p, [key]: p[key].filter((_,i)=> i!==idx) }));
  const togglePillar = (pillar) => setForm(p => ({ ...p, wef_pillars: p.wef_pillars.includes(pillar) ? p.wef_pillars.filter(x => x !== pillar) : [...p.wef_pillars, pillar] }));

  const handleSave = async (submit = false) => {
    setSaving(true);
    try {
      if (form.primary_sector === 'Other' && !form.custom_sector.trim()) {
        toast.error('Enter a custom sector name.');
        return;
      }
      if (form.currency === 'Other' && !form.custom_currency.trim()) {
        toast.error('Enter a custom currency code.');
        return;
      }
      if (form.carbon_market_relevant && form.carbon_standard === 'Other' && !form.custom_carbon_standard.trim()) {
        toast.error('Enter the custom carbon standard.');
        return;
      }
      if (form.feasibility_type !== 'none_yet' && !form.approvals_confirmed) {
        toast.error('Confirm that the feasibility approval checklist has been reviewed.');
        return;
      }
      const tags = form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
      if (form.funding_tag) tags.push(`funding_type:${form.funding_tag}`);
      const data = {
        ...form,
        primary_sector: effectiveSector,
        currency: effectiveCurrency,
        carbon_standard: effectiveCarbonStandard,
        tags,
        approvals_answered_at: form.feasibility_type !== 'none_yet' ? new Date().toISOString() : null,
      };
      const project = editId ? await projectsAPI.update(editId, data) : await projectsAPI.create(data);
      const uploadFiles = async (files, category) => {
        if (!files.length) return;
        const body = new FormData();
        files.forEach(file => body.append('files', file));
        body.append('category', category);
        body.append('visibility', category === 'photo' ? 'public' : 'registered');
        await projectsAPI.uploadFile(project.id, body);
      };
      await uploadFiles(pendingDocuments, 'project_document');
      await uploadFiles(pendingPhotos, 'photo');
      toast.success(editId ? 'Project updated successfully!' : 'Project submitted for review!');
      navigate('/dashboard/projects');
    } catch(e) { toast.error(e.message||'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Add New Project</h1>
        <p className="text-sm text-gray-500">Fill in all details to create a comprehensive project profile</p>
        <p className="text-xs text-ink-tertiary mt-2">Fields marked with * are required.</p>
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
            <SectionHeading Icon={ClipboardList} title="Basic Information" />
            <Input label="Project Title *" placeholder="Enter a clear, descriptive project title" value={form.title} onChange={e=>f('title',e.target.value)} required />
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Abstract *</label><textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Describe the project objectives, scope, expected outcomes, and impact..." value={form.abstract} onChange={e=>f('abstract',e.target.value)}/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label><textarea rows={5} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Detailed project description..." value={form.description} onChange={e=>f('description',e.target.value)}/></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <SectionHeading Icon={Layers} title="Sector" />
            <div>
              <p className="text-sm text-gray-500 mb-3">Choose the primary sector and related sub-sectors</p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {SECTORS.map(s => {
                  const Icon = SECTOR_ICONS[s] || Layers;
                  const selected = form.primary_sector === s;
                  const color = getSectorColor(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={()=>handleSectorSelect(s)}
                      className="p-3 border rounded-xl text-center text-xs font-semibold transition hover:-translate-y-0.5"
                      style={{
                        backgroundColor: selected ? color : `${color}10`,
                        borderColor: selected ? color : `${color}35`,
                        color: selected ? '#FFFFFF' : color,
                      }}
                    >
                      <Icon size={20} strokeWidth={1.75} className="mx-auto mb-1" />{s}
                    </button>
                  );
                })}
              </div>
              {form.primary_sector === 'Other' && (
                <div className="mt-4 max-w-md">
                  <Input label="Custom Sector *" placeholder="Enter the sector name" value={form.custom_sector} onChange={e=>f('custom_sector',e.target.value)} />
                </div>
              )}
              <div className="mt-4 max-w-md"><label className="block text-sm font-medium text-gray-700 mb-1">Secondary Sector</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.secondary_sector} onChange={e=>f('secondary_sector',e.target.value)}><option value="">Optional secondary sector</option>{SECTORS.filter(s=>s!==form.primary_sector).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div>
              <SectionHeading Icon={Globe2} title="SDG Alignment" level="h3" />
              <p className="text-sm text-gray-500 mb-3">Select all Sustainable Development Goals this project contributes to</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {SDG_GOALS.map(sdg => (
                  <button
                    key={sdg.id}
                    type="button"
                    onClick={()=>handleSDG(sdg.id)}
                    className={`rounded-card text-left transition ${form.sdg_goals.includes(sdg.id)?'opacity-100':'opacity-75 hover:opacity-100'}`}
                  >
                    <SdgBadge goal={sdg} selected={form.sdg_goals.includes(sdg.id)} className="w-full" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><WefNexusMark size={28} /> Water-Energy-Food Nexus</h3>
              <p className="text-sm text-gray-500 mb-3">Select all nexus dimensions this project addresses</p>
              <div className="flex gap-3 flex-wrap">
                {WEF_NEXUS.map(nx => (
                  <button key={nx} type="button" onClick={()=>toggleNexus(nx)} className="transition hover:-translate-y-0.5">
                    <WefNexusBadge value={nx} selected={form.wef_nexus.includes(nx)} />
                  </button>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.priority_level === 'WEF'} onChange={e=>f('priority_level', e.target.checked ? 'WEF' : 'medium')} /> Flag as WEF Nexus priority portfolio</label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <SectionHeading Icon={CheckCircle} title="Project Readiness & Status" />
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Stage</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.stage} onChange={e=>f('stage',e.target.value)}>{PROJECT_STAGES.map(stage=><option key={stage} value={stage}>{stage.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.risk_level} onChange={e=>f('risk_level',e.target.value)}>{RISK_OPTIONS.map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.priority_level} onChange={e=>f('priority_level',e.target.value)}>{PRIORITY_OPTIONS.map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></div>
            </div>
            <SectionHeading Icon={MapPin} title="Timeline & Location" />
            <div className="grid md:grid-cols-4 gap-4">
              <Input label="Duration (Months)" type="number" value={form.duration_months} onChange={e=>f('duration_months',e.target.value)} />
              <Input label="Start Date" type="date" value={form.start_date} onChange={e=>f('start_date',e.target.value)} />
              <Input label="Expected Completion" type="date" value={form.expected_completion} onChange={e=>f('expected_completion',e.target.value)} />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Province *</label><select disabled={isProvincial} title={isProvincial ? 'Locked to your province' : undefined} className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm ${isProvincial ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={form.province} onChange={e=>setForm(p=>({...p, province:e.target.value, district:''}))}><option value="">Select Province</option>{PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Districts</label><select multiple disabled={!form.province} className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm ${!form.province ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={form.districts.map(String)} onChange={e=>f('districts',Array.from(e.target.selectedOptions,o=>Number(o.value)))}>{districtOptions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <Input label="City" placeholder="City name" value={form.city} onChange={e=>f('city',e.target.value)} />
              <Input label="Address" placeholder="Street address or location details" value={form.address} onChange={e=>f('address',e.target.value)} />
            </div>

            <SectionHeading Icon={Leaf} title="Carbon-Market Readiness" />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.carbon_market_relevant} onChange={e=>f('carbon_market_relevant',e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              This project is relevant to carbon markets
            </label>
            {form.carbon_market_relevant && (
              <div className="grid md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Carbon Standard</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.carbon_standard} onChange={e=>f('carbon_standard',e.target.value)}><option value="">Select Standard</option>{CARBON_STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <Input label="Methodology" placeholder="e.g. VM0007, ACM0002" value={form.carbon_methodology} onChange={e=>f('carbon_methodology',e.target.value)} />
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Credit Status</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.carbon_credit_status} onChange={e=>f('carbon_credit_status',e.target.value)}><option value="">Select Status</option>{CARBON_CREDIT_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                {form.carbon_standard === 'Other' && (
                  <Input label="Custom Carbon Standard *" placeholder="Enter the carbon standard" value={form.custom_carbon_standard} onChange={e=>f('custom_carbon_standard',e.target.value)} />
                )}
              </div>
            )}

            <SectionHeading Icon={FlaskConical} title="Feasibility" />
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Feasibility Study</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.feasibility_status} onChange={e=>f('feasibility_status',e.target.value)}><option value="">Select Status</option>{FEASIBILITY_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Feasibility Type</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.feasibility_type} onChange={e=>f('feasibility_type',e.target.value)}><option value="none_yet">None yet</option><option value="pre_feasibility">Pre-feasibility</option><option value="detailed_feasibility">Detailed feasibility</option><option value="both">Both</option></select></div>
              <Input label="Study Link (URL)" placeholder="https://..." value={form.feasibility_study_url} onChange={e=>f('feasibility_study_url',e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-7">
                <input type="checkbox" checked={form.land_acquired} onChange={e=>f('land_acquired',e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                Land acquired
              </label>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Feasibility Notes / Key Findings</label><textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Summary of feasibility findings..." value={form.feasibility_notes} onChange={e=>f('feasibility_notes',e.target.value)}/></div>
            <div><div className="flex justify-between mb-2"><h3 className="font-medium text-gray-800">Additional Feasibility Links</h3><button type="button" onClick={()=>addRow('feasibility_links',{title:'',url:''})} className="text-sm text-emerald-600 hover:underline">+ Add link</button></div>{form.feasibility_links.map((link,i)=><div key={i} className="grid md:grid-cols-3 gap-2 mb-2"><Input placeholder="Link title" value={link.title} onChange={e=>updateRow('feasibility_links',i,'title',e.target.value)} /><Input placeholder="https://..." value={link.url} onChange={e=>updateRow('feasibility_links',i,'url',e.target.value)} /><button type="button" onClick={()=>removeRow('feasibility_links',i)} className="text-red-500">Remove</button></div>)}</div>
            {form.feasibility_type !== 'none_yet' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-medium text-emerald-900 mb-3">Approval Checklist</h3><div className="grid md:grid-cols-3 gap-3 text-sm text-emerald-900"><label className="flex gap-2"><input type="checkbox" checked={form.approval_loi_los} onChange={e=>f('approval_loi_los',e.target.checked)} /> LOI / LOS available</label><label className="flex gap-2"><input type="checkbox" checked={form.approval_departmental} onChange={e=>f('approval_departmental',e.target.checked)} /> Departmental approval available</label><label className="flex gap-2"><input type="checkbox" checked={form.approval_mocc_notification} onChange={e=>f('approval_mocc_notification',e.target.checked)} /> MOCC notification cc available</label></div><label className="mt-4 flex gap-2 text-sm font-medium text-emerald-900"><input type="checkbox" checked={form.approvals_confirmed} onChange={e=>f('approvals_confirmed',e.target.checked)} /> I have reviewed and answered the approval checklist.</label></div>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <SectionHeading Icon={Banknote} title="Financial Information" />
            <div>
              <p className="text-sm text-gray-500 mb-3">Select Currency</p>
              <div className="flex gap-2 flex-wrap">
                {CURRENCIES.map((c, index) => {
                  const selected = form.currency === c;
                  const color = [getSectorColor('Water & Sanitation'), getSectorColor('Energy & Power'), getSectorColor('Agriculture & Food')][index % 3];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={()=>f('currency',c)}
                      className={`px-4 py-2 rounded-control text-sm font-semibold border transition ${selected ? 'opacity-100 shadow-sm' : 'opacity-60 hover:opacity-90'}`}
                      style={{
                        backgroundColor: selected ? color : `${color}10`,
                        borderColor: selected ? color : `${color}35`,
                        color: selected ? '#FFFFFF' : color,
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {form.currency === 'Other' && (
                <div className="mt-4 max-w-xs">
                  <Input label="Custom Currency Code *" placeholder="e.g., CAD" maxLength={10} value={form.custom_currency} onChange={e=>f('custom_currency',e.target.value.toUpperCase())} />
                </div>
              )}
            </div>
            <div><div className="flex justify-between mb-2"><h3 className="font-medium text-gray-800">Development Phases</h3><button type="button" onClick={()=>addRow('phases',{phase_name:'',start_date:'',end_date:'',duration_months:'',status:'planning',estimated_cost:''})} className="text-sm text-emerald-600 hover:underline">+ Add phase</button></div>{form.phases.map((phase,i)=><div key={i} className="grid md:grid-cols-6 gap-2 mb-2"><Input placeholder="Phase name" value={phase.phase_name} onChange={e=>updateRow('phases',i,'phase_name',e.target.value)} /><Input type="date" value={phase.start_date} onChange={e=>updateRow('phases',i,'start_date',e.target.value)} /><Input type="date" value={phase.end_date} onChange={e=>updateRow('phases',i,'end_date',e.target.value)} /><Input type="number" placeholder="Months" value={phase.duration_months} onChange={e=>updateRow('phases',i,'duration_months',e.target.value)} /><Input type="number" placeholder="Cost" value={phase.estimated_cost} onChange={e=>updateRow('phases',i,'estimated_cost',e.target.value)} /><button type="button" onClick={()=>removeRow('phases',i)} className="text-red-500">Remove</button></div>)}</div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label={`Total Project Cost (${effectiveCurrency}) *`} type="number" placeholder="e.g., 35000000000" value={form.total_cost} onChange={e=>f('total_cost',e.target.value)} />
              <Input label={`Research Fund (${effectiveCurrency})`} type="number" placeholder="R&D" value={form.research_fund} onChange={e=>f('research_fund',e.target.value)} />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Government Funding Tag</label>
              <div className="flex flex-wrap gap-2">
                {FUNDING_TAGS.map(tag => (
                  <button
                    key={tag.value || 'none'}
                    type="button"
                    onClick={()=>f('funding_tag', tag.value)}
                    className={`px-4 py-2 rounded-control border text-sm font-medium transition ${form.funding_tag === tag.value ? 'border-pcpp-emerald bg-pcpp-emerald text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-tertiary mt-2">Saved as a project tag until a dedicated funding-source column is approved.</p>
            </div>
            <div><div className="flex justify-between mb-2"><h3 className="font-medium text-gray-800">Funding Sources</h3><button type="button" onClick={()=>addRow('funding_sources',{source_type:'',provider_name:'',instrument:'',amount:'',currency:effectiveCurrency,status:'pipeline'})} className="text-sm text-emerald-600 hover:underline">+ Add source</button></div>{form.funding_sources.map((source,i)=><div key={i} className="grid md:grid-cols-6 gap-2 mb-2"><select className="border border-gray-300 rounded-lg px-2 text-sm" value={source.source_type} onChange={e=>updateRow('funding_sources',i,'source_type',e.target.value)}><option value="">Source type</option>{fundingSourceTypes.map(type=><option key={type.code} value={type.code}>{type.label}</option>)}</select><Input placeholder="Provider" value={source.provider_name} onChange={e=>updateRow('funding_sources',i,'provider_name',e.target.value)} /><Input placeholder="Instrument" value={source.instrument} onChange={e=>updateRow('funding_sources',i,'instrument',e.target.value)} /><Input type="number" placeholder="Amount" value={source.amount} onChange={e=>updateRow('funding_sources',i,'amount',e.target.value)} /><select className="border border-gray-300 rounded-lg px-2 text-sm" value={source.status} onChange={e=>updateRow('funding_sources',i,'status',e.target.value)}>{['secured','committed','pipeline','requested'].map(status=><option key={status} value={status}>{status}</option>)}</select><button type="button" onClick={()=>removeRow('funding_sources',i)} className="text-red-500">Remove</button></div>)}</div>
            <div className="grid md:grid-cols-2 gap-4"><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.climate_finance_available} onChange={e=>f('climate_finance_available',e.target.checked)} /> Climate finance available</label>{form.climate_finance_available && <Input label="Climate finance amount" type="number" value={form.climate_finance_amount} onChange={e=>f('climate_finance_amount',e.target.value)} />}<label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.carbon_finance_option} onChange={e=>f('carbon_finance_option',e.target.checked)} /> Carbon finance option</label>{form.carbon_finance_option && <Input label="Carbon-finance notes" value={form.carbon_finance_notes} onChange={e=>f('carbon_finance_notes',e.target.value)} />}</div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <SectionHeading Icon={Globe2} title="Climate & Environmental Impact" />
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Direct Beneficiaries" type="number" placeholder="Number of people" value={form.direct_beneficiaries} onChange={e=>f('direct_beneficiaries',e.target.value)} />
              <Input label="Indirect Beneficiaries" type="number" placeholder="Number of people" value={form.indirect_beneficiaries} onChange={e=>f('indirect_beneficiaries',e.target.value)} />
              <Input label="Jobs Created" type="number" placeholder="Direct jobs" value={form.jobs_created} onChange={e=>f('jobs_created',e.target.value)} />
            </div>

            <SectionHeading Icon={Leaf} title="Climate Mitigation (CO2e)" level="h3" />
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Emission Reduction" type="number" placeholder="e.g., 5000" value={form.mitigation_value} onChange={e=>f('mitigation_value',e.target.value)} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.mitigation_unit} onChange={e=>f('mitigation_unit',e.target.value)}>{CO2_UNITS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Basis</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.mitigation_basis} onChange={e=>f('mitigation_basis',e.target.value)}>{MITIGATION_BASIS.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
            </div>
            {toTco2e(form.mitigation_value, form.mitigation_unit) != null && (
              <p className="text-xs text-gray-500">~ <span className="font-medium text-gray-700">{toTco2e(form.mitigation_value, form.mitigation_unit).toLocaleString()} tCO2e</span> {form.mitigation_basis==='annual'?'per year':'over project lifetime'} (normalized)</p>
            )}
            <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Carbon credit methodology</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.carbon_credit_methodology} onChange={e=>f('carbon_credit_methodology',e.target.value)}><option value="not_decided">Not decided</option><option value="Verra">Verra</option><option value="Gold Standard">Gold Standard</option><option value="Article 6">Article 6</option></select></div><Input label="Estimated CO2e reduction (tCO2e/year)" type="number" value={form.estimated_co2_reduction} onChange={e=>f('estimated_co2_reduction',e.target.value)} /></div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <SectionHeading Icon={Users} title="Project Team & Organization" />
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

            <SectionHeading Icon={Landmark} title="Line Ministry, Contacts & Partners" />
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

        {step === 6 && (
          <div className="space-y-6">
            <SectionHeading Icon={ClipboardList} title="Documents & Gallery" />
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-dashed border-gray-300 p-4"><label className="block text-sm font-medium text-gray-800 mb-2">Project documents</label><input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e=>setPendingDocuments(Array.from(e.target.files || []))} /><p className="text-xs text-gray-500 mt-2">{pendingDocuments.length ? `${pendingDocuments.length} file(s) selected` : 'PDF, Office documents; uploaded after project creation.'}</p></div>
              <div className="rounded-xl border border-dashed border-gray-300 p-4"><label className="block text-sm font-medium text-gray-800 mb-2">Photo gallery</label><input type="file" multiple accept="image/jpeg,image/png" onChange={e=>setPendingPhotos(Array.from(e.target.files || []))} /><p className="text-xs text-gray-500 mt-2">{pendingPhotos.length ? `${pendingPhotos.length} photo(s) selected` : 'JPEG or PNG images; uploaded after project creation.'}</p></div>
            </div>
            <SectionHeading Icon={ClipboardList} title="Tags & Keywords" />
            <Input label="Tags (comma separated)" placeholder="e.g., Solar, Infrastructure, CPEC, Green Initiative" value={form.tags} onChange={e=>f('tags',e.target.value)} />
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="font-medium text-emerald-800 mb-2 flex items-center gap-2"><ClipboardList size={18} strokeWidth={1.75} /> Project Summary</h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm text-emerald-700">
                <p>Title: {form.title || 'Not set'}</p>
                <p>Sector: {effectiveSector || 'Not set'}</p>
                <p>Province: {form.province || 'Not set'}</p>
                <p>District: {form.district || 'Not set'}</p>
                <p>Total Cost: {form.total_cost ? `${effectiveCurrency} ${Number(form.total_cost).toLocaleString()}` : 'Not set'}</p>
                <p>SDGs: {form.sdg_goals.length} selected</p>
                <p>TRL Level: {form.trl_level || 'Not set'}</p>
                <p>Carbon Market: {form.carbon_market_relevant ? (effectiveCarbonStandard || 'Relevant') : 'Not relevant'}</p>
                <p>Feasibility: {form.feasibility_status || 'Not set'}</p>
                <p>CO2e Mitigation: {toTco2e(form.mitigation_value, form.mitigation_unit) != null ? `${toTco2e(form.mitigation_value, form.mitigation_unit).toLocaleString()} tCO2e ${form.mitigation_basis==='annual'?'/yr':'(lifetime)'}` : 'Not set'}</p>
                <p>WEF Nexus: {form.wef_nexus.length ? form.wef_nexus.join(', ') : 'None'}</p>
                <p>Line Ministry: {form.line_ministry || 'Not set'}</p>
                <p>Partners: {form.partners.length} / Contacts: {form.provincial_contacts.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Cancel / Back</button>
        <div className="flex gap-3">
          <Button variant="secondary" loading={saving} onClick={()=>handleSave(false)}><Save size={18} strokeWidth={1.75} /> Save Draft</Button>
          {step < STEPS.length-1 ? (
            <Button onClick={()=>setStep(s=>s+1)}>Next →</Button>
          ) : (
            <Button loading={saving} onClick={()=>handleSave(true)}><CheckCircle size={18} strokeWidth={1.75} /> Submit Project</Button>
          )}
        </div>
      </div>
    </div>
  );
}
