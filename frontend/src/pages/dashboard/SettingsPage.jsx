import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ first_name: user?.first_name||'', last_name: user?.last_name||'', phone: user?.phone||'', organization: user?.organization||'' });
  const [passwords, setPasswords] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await authAPI.updateProfile(profile); updateUser(profile); toast.success('Profile updated!'); }
    catch(e) { toast.error(e.message||'Failed'); } finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) { toast.error('Passwords do not match'); return; }
    setChangingPw(true);
    try { await authAPI.updatePassword(passwords); toast.success('Password updated!'); setPasswords({ current_password:'', new_password:'', confirm_password:'' }); }
    catch(e) { toast.error(e.message||'Failed'); } finally { setChangingPw(false); }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={profile.first_name} onChange={e=>setProfile(p=>({...p,first_name:e.target.value}))} />
            <Input label="Last Name" value={profile.last_name} onChange={e=>setProfile(p=>({...p,last_name:e.target.value}))} />
          </div>
          <Input label="Email" value={user?.email||''} disabled className="bg-gray-50 cursor-not-allowed" />
          <Input label="Phone" value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} />
          <Input label="Organization" value={profile.organization} onChange={e=>setProfile(p=>({...p,organization:e.target.value}))} />
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <Input label="Current Password" type="password" value={passwords.current_password} onChange={e=>setPasswords(p=>({...p,current_password:e.target.value}))} />
          <Input label="New Password" type="password" value={passwords.new_password} onChange={e=>setPasswords(p=>({...p,new_password:e.target.value}))} />
          <Input label="Confirm New Password" type="password" value={passwords.confirm_password} onChange={e=>setPasswords(p=>({...p,confirm_password:e.target.value}))} />
          <Button type="submit" loading={changingPw}>Update Password</Button>
        </form>
      </div>
    </div>
  );
}
