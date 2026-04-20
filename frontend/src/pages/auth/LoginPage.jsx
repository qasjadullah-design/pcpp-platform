import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form);
      toast.success('Welcome back!');
      const role = data.user?.role;
      navigate(role === 'admin' || role === 'superadmin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-700 to-green-900 text-white p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center font-bold">B</div>
          <span className="font-bold text-xl">PCPP</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold mb-3">Pakistan Country Project Platform</h2>
          <p className="text-green-200 mb-8">Connect with development projects and investors across Pakistan.</p>
          <div className="flex gap-8 text-center">
            <div><div className="text-2xl font-bold">247+</div><div className="text-green-300 text-sm">Projects</div></div>
            <div><div className="text-2xl font-bold">850B</div><div className="text-green-300 text-sm">PKR Investment</div></div>
            <div><div className="text-2xl font-bold">156</div><div className="text-green-300 text-sm">Investors</div></div>
          </div>
        </div>
        <div />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to continue to PCPP</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="rounded" /> Remember me
                </label>
                <Link to="/forgot-password" className="text-sm text-green-600 hover:underline">Forgot Password?</Link>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60">
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account? <Link to="/register" className="text-green-600 font-medium hover:underline">Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', organization: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return toast.error('Please agree to Terms of Service');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 to-purple-800 text-white p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center font-bold">B</div>
          <span className="font-bold text-xl">PCPP</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold mb-3">Join Pakistan's Largest Investment Platform</h2>
          <p className="text-blue-200 mb-6">Create an account to submit projects, express interest in investments, and connect with organizations across Pakistan.</p>
          <ul className="space-y-2 text-sm text-blue-100">
            <li>✅ Submit unlimited project proposals</li>
            <li>✅ Connect with verified investors</li>
            <li>✅ Track project progress in real-time</li>
          </ul>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
            <p className="text-gray-500 text-sm mb-6">Join PCPP to submit or invest in projects</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input required value={form.first_name} onChange={e => update('first_name', e.target.value)}
                    placeholder="Ahmed" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input required value={form.last_name} onChange={e => update('last_name', e.target.value)}
                    placeholder="Baloch" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="name@company.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input value={form.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+92 300 1234567" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization (Optional)</label>
                <input value={form.organization} onChange={e => update('organization', e.target.value)}
                  placeholder="Company or Department" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required value={form.password} onChange={e => update('password', e.target.value)}
                  placeholder="Create a strong password" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="rounded" />
                I agree to the <span className="text-green-600">Terms of Service</span> and <span className="text-green-600">Privacy Policy</span>
              </label>
              <button type="submit" disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60">
                {loading ? 'Creating Account...' : 'Create Account →'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account? <Link to="/login" className="text-green-600 font-medium hover:underline">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { authAPI } = await import('../../services/api');
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch { toast.error('Failed to send reset email'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← Back to Login</Link>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password</h2>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">📧</div>
            <p className="text-gray-600">If that email exists, a password reset link has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button type="submit" disabled={loading}
              className="w-full bg-green-700 text-white font-medium py-2.5 rounded-lg hover:bg-green-800 disabled:opacity-60">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
