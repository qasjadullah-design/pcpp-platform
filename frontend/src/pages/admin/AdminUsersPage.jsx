import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search:'', role:'', status:'' });

  useEffect(() => {
    adminAPI.getUsers(filters).then(r=>setUsers(r.data.users || r.data || []));
  }, [filters]);

  const handleStatus = async (id, status) => {
    try { await adminAPI.updateUserStatus(id, status); setUsers(u=>u.map(x=>x.id===id?{...x,status}:x)); toast.success('Status updated'); }
    catch(e) { toast.error(e.message||'Failed'); }
  };

  const roleColors = { admin:'purple', investor:'blue', project_owner:'green', government:'orange', ngo:'yellow' };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">All Users</h1><p className="text-sm text-gray-500">Manage and monitor platform users</p></div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">↑ Export</button>
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">⭐ Invite User</button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by name, email, or organization..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.role} onChange={e=>setFilters(f=>({...f,role:e.target.value}))}>
            <option value="">All Roles</option>
            <option value="investor">Investor</option><option value="project_owner">Project Owner</option><option value="government">Government</option><option value="ngo">NGO</option><option value="admin">Admin</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
            <option value="">All Status</option>
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['User','Organization','Role','Projects','Status','Last Active','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">{u.first_name?.[0]}{u.last_name?.[0]}</div>
                      <div><div className="font-medium text-gray-900">{u.first_name} {u.last_name}</div><div className="text-xs text-gray-400">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.organization||'—'}</td>
                  <td className="px-4 py-3"><Badge label={u.role?.replace('_',' ')} color={roleColors[u.role]||'gray'}/></td>
                  <td className="px-4 py-3 text-gray-600">0</td>
                  <td className="px-4 py-3"><Badge label={u.status} color={u.status==='active'?'green':u.status==='suspended'?'red':'gray'} dot/></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3">
                    <select className="text-xs border border-gray-300 rounded px-2 py-1" value={u.status} onChange={e=>handleStatus(u.id,e.target.value)}>
                      <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
