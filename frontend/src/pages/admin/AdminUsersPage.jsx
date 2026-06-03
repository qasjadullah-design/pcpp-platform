import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { PROVINCES } from '../../utils/constants';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

const BLANK_USER = { first_name:'', last_name:'', email:'', organization:'', role:'provincial', province:'' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search:'', role:'', status:'' });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_USER);
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    adminAPI.getUsers(filters).then(r=>setUsers(r.users || r || [])).catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [filters]);

  const uf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreatedCreds(null);
    try {
      const r = await adminAPI.createUser(form);
      setCreatedCreds({ email: r.user.email, temp_password: r.temp_password });
      toast.success('User created');
      setForm(BLANK_USER);
      loadUsers();
    } catch (e) {
      toast.error(e.error || e.message || 'Failed to create user');
    } finally { setCreating(false); }
  };

  const closeCreate = () => { setShowCreate(false); setForm(BLANK_USER); setCreatedCreds(null); };

  const handleStatus = async (id, status) => {
    try { await adminAPI.updateUserStatus(id, status); setUsers(u=>u.map(x=>x.id===id?{...x,status}:x)); toast.success('Status updated'); }
    catch(e) { toast.error(e.message||'Failed'); }
  };

  const roleColors = { admin:'purple', superadmin:'purple', investor:'blue', project_owner:'green', government:'orange', ngo:'yellow', provincial:'green' };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">All Users</h1><p className="text-sm text-gray-500">Manage and monitor platform users</p></div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">↑ Export</button>
          <button onClick={()=>{ setCreatedCreds(null); setShowCreate(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">+ Create User</button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by name, email, or organization..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filters.role} onChange={e=>setFilters(f=>({...f,role:e.target.value}))}>
            <option value="">All Roles</option>
            <option value="provincial">Provincial</option><option value="investor">Investor</option><option value="project_owner">Project Owner</option><option value="government">Government</option><option value="ngo">NGO</option><option value="admin">Admin</option>
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

      <Modal isOpen={showCreate} onClose={closeCreate} title="Create User">
        {createdCreds ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
              <p className="font-medium text-emerald-800 mb-2 flex items-center gap-2"><CheckCircle size={18} strokeWidth={1.75} /> User created. Share these credentials — the password is shown only once:</p>
              <p className="text-gray-700"><span className="text-gray-500">Email:</span> <span className="font-mono">{createdCreds.email}</span></p>
              <p className="text-gray-700"><span className="text-gray-500">Temp password:</span> <span className="font-mono font-bold">{createdCreds.temp_password}</span></p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setCreatedCreds(null)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Create another</button>
              <button onClick={closeCreate} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name *" value={form.first_name} onChange={e=>uf('first_name',e.target.value)} required />
              <Input label="Last Name *" value={form.last_name} onChange={e=>uf('last_name',e.target.value)} required />
            </div>
            <Input label="Email *" type="email" value={form.email} onChange={e=>uf('email',e.target.value)} required />
            <Input label="Organization" value={form.organization} onChange={e=>uf('organization',e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.role} onChange={e=>uf('role',e.target.value)}>
                  <option value="provincial">Provincial</option>
                  <option value="project_owner">Project Owner</option>
                  <option value="investor">Investor</option>
                  <option value="government">Government</option>
                  <option value="ngo">NGO</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'provincial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" value={form.province} onChange={e=>uf('province',e.target.value)} required>
                    <option value="">Select Province</option>
                    {PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">A temporary password is generated and shown once after creation.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeCreate} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={creating} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60">{creating?'Creating…':'Create User'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
