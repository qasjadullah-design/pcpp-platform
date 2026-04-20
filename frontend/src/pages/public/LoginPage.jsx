import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch(e) { toast.error(e.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-800 to-emerald-600 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">PC</div><span className="font-bold text-lg">PCPP</span></div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Pakistan Country Project Platform</h2>
          <p className="text-emerald-100 mb-8">Connect with development projects and investors across Pakistan. Join thousands of organizations making an impact.</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[['247+','Projects'],['850B','PKR Investment'],['156','Investors']].map(([v,l]) => (
              <div key={l}><div className="text-2xl font-bold">{v}</div><div className="text-xs text-emerald-200">{l}</div></div>
            ))}
          </div>
        </div>
        <div/>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to continue to PCPP</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email Address" type="email" placeholder="name@company.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
            <Input label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
            <div className="flex justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600"><input type="checkbox" className="rounded"/> Remember me</label>
              <Link to="/forgot-password" className="text-emerald-600 hover:underline">Forgot Password?</Link>
            </div>
            <Button type="submit" className="w-full justify-center" size="lg" loading={loading}>Sign In →</Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Don't have an account? <Link to="/register" className="text-emerald-600 font-medium">Create Account</Link></p>
        </div>
      </div>
    </div>
  );
}
