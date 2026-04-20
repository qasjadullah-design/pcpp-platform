import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', organization:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { toast.error('Please agree to Terms & Privacy Policy'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch(e) { toast.error(e.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const f = (k, v) => setForm(p => ({...p, [k]: v}));

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-700 to-blue-600 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">PC</div><span className="font-bold text-lg">PCPP</span></div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Join Pakistan's Largest Investment Platform</h2>
          <p className="text-blue-100 mb-8">Create an account to submit projects, express interest in investments, and connect with organizations across Pakistan.</p>
          <div className="space-y-2">
            {['Submit unlimited project proposals','Connect with verified investors','Track project progress in real-time'].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm"><span className="text-green-300">✓</span>{t}</div>
            ))}
          </div>
        </div>
        <div/>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500 mb-8">Join PCPP to submit or invest in projects</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Ahmed" value={form.first_name} onChange={e=>f('first_name',e.target.value)} required />
              <Input label="Last Name" placeholder="Khan" value={form.last_name} onChange={e=>f('last_name',e.target.value)} required />
            </div>
            <Input label="Email Address" type="email" placeholder="name@company.com" value={form.email} onChange={e=>f('email',e.target.value)} required />
            <Input label="Phone Number" placeholder="+92 300 1234567" value={form.phone} onChange={e=>f('phone',e.target.value)} />
            <Input label="Organization (Optional)" placeholder="Company or Department" value={form.organization} onChange={e=>f('organization',e.target.value)} />
            <Input label="Password" type="password" placeholder="Create a strong password" value={form.password} onChange={e=>f('password',e.target.value)} required />
            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={agreed} onChange={e=>setAgreed(e.target.checked)} />
              I agree to the <Link to="/terms" className="text-emerald-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>
            </label>
            <Button type="submit" className="w-full justify-center" size="lg" loading={loading}>Create Account →</Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link to="/login" className="text-emerald-600 font-medium">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
