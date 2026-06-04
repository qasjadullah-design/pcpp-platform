import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { STATUS_COLORS, SECTORS, PROVINCES, getDistricts, formatCurrency } from '../../utils/constants';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, CheckCircle, ExternalLink, FolderOpen, MapPin, RotateCw, X, XCircle } from 'lucide-react';

const PAGE_SIZE = 25;

const NEXT_STATUS = {
  under_review: { label: 'Approve', value: 'approved', color: 'bg-emerald-600 hover:bg-emerald-700' },
  approved: { label: 'Archive', value: 'archived', color: 'bg-gray-600 hover:bg-gray-700' },
};

const BULK_ACTIONS = {
  approved: {
    label: 'Approve selected',
    verb: 'approve',
    tone: 'emerald',
    description: 'Approved projects can become visible in public-facing project lists, depending on public filters.',
  },
  archived: {
    label: 'Archive selected',
    verb: 'archive',
    tone: 'gray',
    description: 'Archived projects will be moved out of the active review flow.',
  },
};

const QUICK_FILTERS = [
  { label: 'All Projects', status: '', priority: '' },
  { label: 'Pending Review', status: 'under_review', priority: '' },
  { label: 'Approved', status: 'approved', priority: '' },
  { label: 'Archived', status: 'archived', priority: '' },
  { label: 'High Priority', status: '', priority: 'high_or_critical' },
];

const DRAWER_REVIEW_ACTIONS = [
  { action: 'approve', label: 'Approve', Icon: CheckCircle, className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' },
  { action: 'request_changes', label: 'Request Changes', Icon: RotateCw, className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' },
  { action: 'reject', label: 'Reject', Icon: XCircle, className: 'bg-red-600 hover:bg-red-700 text-white border-red-600' },
];

const getPageNumbers = (currentPage, totalPageCount) => {
  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPageCount, currentPage + 2);

  if (start > 1) pages.push(1);
  if (start > 2) pages.push('start-ellipsis');
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < totalPageCount - 1) pages.push('end-ellipsis');
  if (end < totalPageCount) pages.push(totalPageCount);
  return pages;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value === null || value === undefined || value === '' ? 'N/A' : value}</span>
  </div>
);

const DetailStat = ({ label, value }) => (
  <div className="border border-gray-200 rounded-xl p-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-gray-900">{value === null || value === undefined || value === '' ? 'N/A' : value}</div>
  </div>
);

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ search:'', status:'', sector:'', province:'', district:'', priority:'', sort_by:'created_at', sort_dir:'desc', page:1 });
  const [density, setDensity] = useState('comfortable');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ under_review: 0, approved: 0, archived: 0 });
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] = useState('');
  const [detailProject, setDetailProject] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewBusy, setReviewBusy] = useState('');

  const fetchProjects = () => {
    setLoading(true);
    adminAPI.getProjects({ ...filters, limit: PAGE_SIZE })
    .then(r => {
        const list = r.projects || r || [];
        const count = r.total || list.length;;
        setProjects(list);
        setTotal(count);
        setTotalPages(Math.max(1, r.pages || Math.ceil(count / PAGE_SIZE)));
        const s = { under_review: 0, approved: 0, archived: 0 };
        (r.status_counts || []).forEach(row => {
          if (s[row.status] !== undefined) s[row.status] = parseInt(row.count);
        });
        setStats(s);
      })
      .catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, [filters]);

  const handleStatusChange = async (projectId, newStatus) => {
    setChanging(projectId);
    try {
      await adminAPI.changeProjectStatus(projectId, newStatus);
      toast.success(`Project ${newStatus === 'approved' ? 'approved' : 'archived'} successfully!`);
      setDetailProject(p => p?.id === projectId ? { ...p, status: newStatus } : p);
      fetchProjects();
    } catch (e) {
      toast.error(e.message || 'Failed to change status');
    } finally {
      setChanging(null);
    }
  };

  const pageNumbers = getPageNumbers(filters.page, totalPages);
  const districtOptions = filters.province ? getDistricts(filters.province) : [];

  const allPageSelected = projects.length > 0 && projects.every(p => selected.has(p.id));

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAllOnPage = () => setSelected(prev => {
    const next = new Set(prev);
    if (projects.every(p => next.has(p.id))) projects.forEach(p => next.delete(p.id));
    else projects.forEach(p => next.add(p.id));
    return next;
  });

  const clearSelection = () => setSelected(new Set());

  const openDetailDrawer = async (project) => {
    setDetailProject(project);
    setReviewNotes('');
    setDetailLoading(true);
    try {
      const detail = await adminAPI.getProject(project.id);
      setDetailProject(detail);
      setReviewNotes(detail.admin_feedback || detail.admin_notes || '');
    } catch (e) {
      toast.error(e.message || 'Failed to load project details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailDrawer = () => setDetailProject(null);

  const handleDrawerReview = async (action) => {
    if (!detailProject) return;
    if (['reject', 'request_changes'].includes(action) && !reviewNotes.trim()) {
      toast.error('Please add review notes before sending this action');
      return;
    }

    setReviewBusy(action);
    try {
      const reviewed = await adminAPI.reviewProject(detailProject.id, { action, notes: reviewNotes });
      const nextProject = reviewed?.data || reviewed;
      setDetailProject(p => ({ ...p, ...nextProject }));
      toast.success(`Project ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for changes'}`);
      fetchProjects();
    } catch (e) {
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setReviewBusy('');
    }
  };

  const handleProvinceChange = (province) => {
    setFilters(f => ({ ...f, province, district: '', page: 1 }));
  };

  const applyQuickFilter = (preset) => {
    setFilters(f => ({ ...f, status: preset.status, priority: preset.priority, page: 1 }));
  };

  const quickFilterActive = (preset) => filters.status === preset.status && filters.priority === preset.priority;

  const handleSort = (sortBy) => {
    setFilters(f => ({
      ...f,
      sort_by: sortBy,
      sort_dir: f.sort_by === sortBy && f.sort_dir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const renderSortableHeader = (label, sortBy) => {
    const active = filters.sort_by === sortBy;
    const Icon = active ? (filters.sort_dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={`text-left ${density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'} text-xs font-semibold text-gray-500 uppercase`}>
        <button type="button" onClick={() => handleSort(sortBy)} className={`inline-flex items-center gap-1.5 ${active ? 'text-emerald-700' : 'hover:text-gray-700'}`}>
          {label}
          <Icon size={14} strokeWidth={1.75} />
        </button>
      </th>
    );
  };

  const handleBulkStatus = async (status) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const r = await adminAPI.bulkChangeStatus(ids, status);
      toast.success(`${r.updated ?? ids.length} project${(r.updated ?? ids.length) === 1 ? '' : 's'} ${status === 'approved' ? 'approved' : 'archived'}`);
      clearSelection();
      fetchProjects();
    } catch (e) {
      toast.error(e.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
      setPendingBulkStatus('');
    }
  };

  const runExport = async (params) => {
    setExporting(true);
    try {
      const blob = await adminAPI.exportProjects(params);
      const url = window.URL.createObjectURL(new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pcpp-projects.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Projects export downloaded');
    } catch (e) {
      toast.error(e.message || 'Failed to export projects');
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    const { page, ...exportFilters } = filters;
    runExport(exportFilters);
  };

  const handleExportSelected = () => runExport({ ids: Array.from(selected).join(',') });
  const drawerNextStatus = detailProject?.status === 'approved' ? NEXT_STATUS[detailProject.status] : null;
  const pendingBulkAction = pendingBulkStatus ? BULK_ACTIONS[pendingBulkStatus] : null;
  const cellClass = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  const headerClass = `${cellClass} text-xs font-semibold text-gray-500 uppercase`;
  const drawerReviewable = detailProject && ['under_review', 'changes_requested'].includes(detailProject.status);
  const drawerReviewNotes = detailProject?.admin_feedback || detailProject?.admin_notes;
  const drawerHasReviewHistory = detailProject && (drawerReviewNotes || detailProject.reviewed_at || detailProject.reviewer_name || detailProject.reviewer_email);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">All Projects</h1><p className="text-sm text-gray-500">Manage and monitor all platform projects</p></div>
        <div className="flex gap-3">
          <button onClick={handleExport} disabled={exporting} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{exporting ? 'Exporting...' : 'Export'}</button>
          <Link to="/dashboard/submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">+ Add Project</Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ['Total', total, 'blue'],
          ['Under Review', stats.under_review, 'yellow'],
          ['Approved', stats.approved, 'green'],
          ['Archived', stats.archived, 'gray'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{Number(v).toLocaleString()}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </div>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {QUICK_FILTERS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyQuickFilter(preset)}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${quickFilterActive(preset) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {preset.label}
          </button>
        ))}
        {filters.province && (
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, province: '', district: '', page: 1 }))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            Province: {filters.province}
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
        {(filters.status || filters.priority || filters.province || filters.district || filters.sector || filters.search) && (
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, search: '', status: '', sector: '', province: '', district: '', priority: '', page: 1 }))}
            className="px-3 py-1.5 rounded-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by project name, organization, or sector..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value,page:1}))} />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value,page:1}))}>
            <option value="">All Status</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.sector} onChange={e=>setFilters(f=>({...f,sector:e.target.value,page:1}))}>
            <option value="">All Sectors</option>
            {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.province} onChange={e=>handleProvinceChange(e.target.value)}>
            <option value="">All Provinces</option>
            {PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select disabled={!filters.province} className={`px-3 py-2 border border-gray-300 rounded-lg text-sm ${!filters.province ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={filters.district} onChange={e=>setFilters(f=>({...f,district:e.target.value,page:1}))}>
            <option value="">{filters.province ? 'All Districts' : 'Select Province First'}</option>
            {districtOptions.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
            {['comfortable','compact'].map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setDensity(mode)}
                className={`px-3 py-2 text-sm capitalize ${density === mode ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-sm font-medium text-emerald-900">{selected.size.toLocaleString()} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPendingBulkStatus('approved')} disabled={bulkBusy} className="text-xs text-white px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">Approve selected</button>
            <button onClick={() => setPendingBulkStatus('archived')} disabled={bulkBusy} className="text-xs text-white px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 disabled:opacity-50">Archive selected</button>
            <button onClick={handleExportSelected} disabled={exporting} className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white disabled:opacity-50">Export selected</button>
          </div>
          <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">Clear selection</button>
        </div>
      )}

      {loading ? <Spinner/> : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            <span>Showing {projects.length.toLocaleString()} of {total.toLocaleString()} projects</span>
            <span>Page {filters.page.toLocaleString()} of {totalPages.toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
          <table className={`w-full min-w-[1180px] text-sm ${density === 'compact' ? 'text-xs' : ''}`}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`${cellClass} w-10`}>
                  <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={allPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />
                </th>
                {renderSortableHeader('Project','title')}
                {renderSortableHeader('Organization','organization_name')}
                {renderSortableHeader('Sector','primary_sector')}
                {renderSortableHeader('Province','province')}
                {renderSortableHeader('Status','status')}
                {renderSortableHeader('Cost','total_cost')}
                {renderSortableHeader('Created','created_at')}
                <th className={`text-left ${headerClass}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const next = NEXT_STATUS[p.status];
                return (
                  <tr key={p.id} onClick={() => openDetailDrawer(p)} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected.has(p.id) ? 'bg-emerald-50/50' : ''}`}>
                    <td className={cellClass} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.title}`} />
                    </td>
                    <td className={cellClass}><div className="font-medium text-gray-900 leading-snug">{p.title}</div><div className="text-xs text-gray-400">ID: {p.id.slice(0,8)}</div></td>
                    <td className={`${cellClass} text-gray-600`}>{p.organization_name}</td>
                    <td className={`${cellClass} text-gray-600`}>{p.primary_sector}</td>
                    <td className={`${cellClass} text-gray-600`}><div>{p.province || 'Unspecified'}</div><div className="text-xs text-gray-400">{p.district || 'No district'}</div></td>
                    <td className={cellClass}><Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status]||'gray'} dot/></td>
                    <td className={`${cellClass} text-gray-600 whitespace-nowrap`}>{formatCurrency(p.total_cost)}</td>
                    <td className={`${cellClass} text-gray-600 whitespace-nowrap`}>{formatDate(p.created_at)}</td>
                    <td className={cellClass} onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => openDetailDrawer(p)} className="text-xs border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50">Details</button>
                        <Link to={`/projects/${p.id}`} className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">View</Link>
                        {next && (
                          <button
                            onClick={() => handleStatusChange(p.id, next.value)}
                            disabled={changing === p.id}
                            className={`text-xs text-white px-3 py-1 rounded-lg ${next.color} disabled:opacity-50`}
                          >
                            {changing === p.id ? '...' : next.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setFilters(f => ({ ...f, page: 1 }))}
              disabled={filters.page <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              First
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))}
              disabled={filters.page <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map(page => (
                typeof page === 'number' ? (
                  <button
                    key={page}
                    onClick={() => setFilters(f => ({ ...f, page }))}
                    className={`min-w-9 px-3 py-1.5 border rounded-lg text-sm ${filters.page === page ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {page.toLocaleString()}
                  </button>
                ) : (
                  <span key={page} className="px-2 text-sm text-gray-400">...</span>
                )
              ))}
            </div>
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
              disabled={filters.page >= totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, page: totalPages }))}
              disabled={filters.page >= totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {detailProject && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetailDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen size={18} strokeWidth={1.75} className="text-emerald-700" />
                  <span className="text-xs font-semibold uppercase text-gray-500">Project Detail</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{detailProject.title}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge label={detailProject.status?.replace(/_/g,' ')} color={STATUS_COLORS[detailProject.status]||'gray'} dot />
                  {detailProject.trl_level && <Badge label={`TRL ${detailProject.trl_level}`} color="blue" />}
                </div>
              </div>
              <button onClick={closeDetailDrawer} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Close project detail">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {detailLoading && <div className="text-sm text-gray-500">Loading latest details...</div>}

              <div className="grid grid-cols-2 gap-3">
                <DetailStat label="Total Cost" value={formatCurrency(detailProject.total_cost)} />
                <DetailStat label="Funding Gap" value={formatCurrency(detailProject.funding_gap)} />
                <DetailStat label="Expected ROI" value={detailProject.expected_roi !== null && detailProject.expected_roi !== undefined && detailProject.expected_roi !== '' ? `${detailProject.expected_roi}%` : 'N/A'} />
                <DetailStat label="Jobs Created" value={detailProject.jobs_created !== null && detailProject.jobs_created !== undefined && detailProject.jobs_created !== '' ? Number(detailProject.jobs_created).toLocaleString() : 'N/A'} />
              </div>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Location & Classification</h3>
                <DetailRow label="Sector" value={detailProject.primary_sector} />
                <DetailRow label="Province" value={detailProject.province || 'Unspecified'} />
                <DetailRow label="District" value={detailProject.district} />
                <DetailRow label="City" value={detailProject.city} />
                <DetailRow label="Priority" value={detailProject.priority_level} />
                <DetailRow label="Risk" value={detailProject.risk_level} />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Owner & Activity</h3>
                <DetailRow label="Organization" value={detailProject.organization_name} />
                <DetailRow label="Owner" value={detailProject.owner_name} />
                <DetailRow label="Owner Email" value={detailProject.owner_email} />
                <DetailRow label="Interests" value={detailProject.interest_count != null ? Number(detailProject.interest_count).toLocaleString() : '0'} />
                <DetailRow label="Documents" value={detailProject.document_count != null ? Number(detailProject.document_count).toLocaleString() : '0'} />
                <DetailRow label="Updates" value={detailProject.update_count != null ? Number(detailProject.update_count).toLocaleString() : '0'} />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Timeline</h3>
                <DetailRow label="Created" value={formatDate(detailProject.created_at)} />
                <DetailRow label="Updated" value={formatDate(detailProject.updated_at)} />
                <DetailRow label="Start Date" value={formatDate(detailProject.start_date)} />
                <DetailRow label="End Date" value={formatDate(detailProject.end_date)} />
              </section>

              {detailProject.abstract && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Abstract</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{detailProject.abstract}</p>
                </section>
              )}

              {drawerHasReviewHistory && (
                <section className="border border-gray-200 bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Review History</h3>
                  <DetailRow label="Reviewed By" value={detailProject.reviewer_name || detailProject.reviewer_email} />
                  <DetailRow label="Reviewed At" value={formatDate(detailProject.reviewed_at)} />
                  {drawerReviewNotes && (
                    <div className="pt-2">
                      <div className="text-sm text-gray-500 mb-1">Review Notes</div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{drawerReviewNotes}</p>
                    </div>
                  )}
                </section>
              )}

              {drawerReviewable && (
                <section className="border border-yellow-200 bg-yellow-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Review Decision</h3>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="Add notes for the project owner or internal review record..."
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    {DRAWER_REVIEW_ACTIONS.map(({ action, label, Icon, className }) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleDrawerReview(action)}
                        disabled={!!reviewBusy}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 ${className}`}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                        {reviewBusy === action ? 'Working...' : label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">Reject and Request Changes require notes before submission.</p>
                </section>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <MapPin size={14} strokeWidth={1.75} />
                <span>{[detailProject.district, detailProject.province].filter(Boolean).join(', ') || 'No location set'}</span>
                <CalendarDays size={14} strokeWidth={1.75} className="ml-2" />
                <span>{formatDate(detailProject.created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {drawerNextStatus && (
                  <button
                    onClick={() => handleStatusChange(detailProject.id, drawerNextStatus.value)}
                    disabled={changing === detailProject.id}
                    className={`text-sm text-white px-4 py-2 rounded-lg ${drawerNextStatus.color} disabled:opacity-50`}
                  >
                    {changing === detailProject.id ? 'Working...' : drawerNextStatus.label}
                  </button>
                )}
                <Link to={`/projects/${detailProject.id}`} className="inline-flex items-center gap-2 text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                  View Full Page
                  <ExternalLink size={16} strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Modal isOpen={!!pendingBulkAction} onClose={() => setPendingBulkStatus('')} title={`${pendingBulkAction?.label || 'Confirm action'}?`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are about to {pendingBulkAction?.verb} <span className="font-semibold text-gray-900">{selected.size.toLocaleString()}</span> selected project{selected.size === 1 ? '' : 's'}.
          </p>
          <p className="text-sm text-gray-500">{pendingBulkAction?.description}</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setPendingBulkStatus('')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => handleBulkStatus(pendingBulkStatus)}
              disabled={bulkBusy}
              className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${pendingBulkAction?.tone === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-800'}`}
            >
              {bulkBusy ? 'Working...' : pendingBulkAction?.label}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
