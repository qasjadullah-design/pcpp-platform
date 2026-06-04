import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { STATUS_COLORS, SECTORS, PROVINCES, getDistricts, formatCurrency } from '../../utils/constants';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

const PAGE_SIZE = 25;

const NEXT_STATUS = {
  under_review: { label: 'Approve', value: 'approved', color: 'bg-emerald-600 hover:bg-emerald-700' },
  approved: { label: 'Archive', value: 'archived', color: 'bg-gray-600 hover:bg-gray-700' },
};

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

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ search:'', status:'', sector:'', province:'', district:'', sort_by:'created_at', sort_dir:'desc', page:1 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ under_review: 0, approved: 0, archived: 0 });
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const handleProvinceChange = (province) => {
    setFilters(f => ({ ...f, province, district: '', page: 1 }));
  };

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
      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
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
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-sm font-medium text-emerald-900">{selected.size.toLocaleString()} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleBulkStatus('approved')} disabled={bulkBusy} className="text-xs text-white px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">{bulkBusy ? '...' : 'Approve selected'}</button>
            <button onClick={() => handleBulkStatus('archived')} disabled={bulkBusy} className="text-xs text-white px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 disabled:opacity-50">{bulkBusy ? '...' : 'Archive selected'}</button>
            <button onClick={handleExportSelected} disabled={exporting} className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white disabled:opacity-50">Export selected</button>
          </div>
          <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">Clear selection</button>
        </div>
      )}

      {loading ? <Spinner/> : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            <span>Showing {projects.length.toLocaleString()} of {total.toLocaleString()} projects</span>
            <span>Page {filters.page.toLocaleString()} of {totalPages.toLocaleString()}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={allPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organization</th>
                {renderSortableHeader('Sector','primary_sector')}
                {renderSortableHeader('Province','province')}
                {renderSortableHeader('Status','status')}
                {renderSortableHeader('Cost','total_cost')}
                {renderSortableHeader('Created','created_at')}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const next = NEXT_STATUS[p.status];
                return (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(p.id) ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.title}`} />
                    </td>
                    <td className="px-4 py-3"><div className="font-medium text-gray-900">{p.title}</div><div className="text-xs text-gray-400">ID: {p.id.slice(0,8)}</div></td>
                    <td className="px-4 py-3 text-gray-600">{p.organization_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.primary_sector}</td>
                    <td className="px-4 py-3 text-gray-600"><div>{p.province || 'Unspecified'}</div><div className="text-xs text-gray-400">{p.district || 'No district'}</div></td>
                    <td className="px-4 py-3"><Badge label={p.status?.replace(/_/g,' ')} color={STATUS_COLORS[p.status]||'gray'} dot/></td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(p.total_cost)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
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
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
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
    </div>
  );
}
