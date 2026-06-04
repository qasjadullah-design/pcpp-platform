import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import PcppLogo from '../../components/common/PcppLogo';
import toast from 'react-hot-toast';

const getRoleHome = (role) => ['admin', 'superadmin'].includes(role) ? '/admin' : '/dashboard';

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
      const res = await register(form);
      toast.success('Account created successfully!');
      navigate(getRoleHome(res.user.role));
    } catch(e) { toast.error(e.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const f = (k, v) => setForm(p => ({...p, [k]: v}));

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pcpp-pine to-pcpp-emerald text-white flex-col justify-between p-12">
        <PcppLogo variant="dark" />
        <div>
          <h2 className="text-3xl font-bold mb-4">Join as an Investor</h2>
          <p className="text-white/80 mb-8">Create an account to discover approved development projects and express investment interest.</p>
          <div className="space-y-2">
            {['Browse verified project opportunities','Express investment interest','Track owner responses'].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm"><CheckCircle size={16} strokeWidth={1.75} className="text-pcpp-mint" />{t}</div>
            ))}
          </div>
        </div>
        <div />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500 mb-8">Join PCPP to discover and invest in projects</p>
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
            <Button type="submit" className="w-full justify-center" size="lg" loading={loading}>Create Account</Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link to="/login" className="text-emerald-600 font-medium">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
