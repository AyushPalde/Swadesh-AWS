import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/primitives/Toast.jsx';
import { Mail, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, register, isAuthenticated, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from?.pathname || (role === 'authority' ? '/authority' : '/'), { replace: true });
    }
  }, [isAuthenticated, role, navigate, location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && !name.trim()) return setError('Enter your full name.');
    if (!email.trim()) return setError('Enter your email address.');
    if (password.length < 6) return setError('Password must contain at least 6 characters.');

    setLoading(true);
    try {
      const result = mode === 'register'
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login({ email: email.trim(), password });
      toast.success(`Welcome to SWADESH, ${result.user.name || email}!`, mode === 'register' ? 'Account created' : 'Signed in');
      navigate(result.user.role === 'authority' ? '/authority' : '/', { replace: true });
    } catch (err) {
      const message = err.code === 'auth/email-already-in-use'
        ? 'This email already has an account. Sign in instead.'
        : err.code === 'auth/invalid-credential'
          ? 'Incorrect email or password.'
          : err.message || 'Authentication failed.';
      setError(message);
      toast.error(message, 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      <section className="lg:w-1/2 bg-primary-container text-white p-8 md:p-14 flex flex-col justify-between">
        <div className="text-sm font-semibold tracking-wide">SWADESH · CIVIC ACTION PLATFORM</div>
        <div className="max-w-xl py-12">
          <p className="text-accent font-bold text-xs uppercase tracking-widest mb-3">Empowering Every Neighborhood</p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Your city. <span className="text-accent">Your voice.</span></h1>
          <p className="mt-4 text-primary-light leading-relaxed">Report civic issues, support your neighborhood, and track municipal action in one place.</p>
          <div className="mt-8 space-y-4 text-sm text-primary-light">
            <p>✓ Report potholes, waste, water and infrastructure issues</p>
            <p>✓ Track every status update</p>
            <p>✓ Connect citizens with municipal authorities</p>
          </div>
        </div>
        <p className="text-xs text-primary-light">Secure sign-in powered by Firebase Authentication</p>
      </section>

      <section className="lg:w-1/2 p-6 sm:p-10 flex items-center justify-center">
        <div className="w-full max-w-md bg-surface-lowest rounded-2xl p-7 md:p-9 shadow-card border border-outline-variant">
          <div className="flex items-center justify-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-xl">स्व</div>
            <div><div className="text-2xl font-extrabold text-text">SWADESH</div><div className="text-[10px] uppercase font-bold tracking-wider text-primary">Civic Action Platform</div></div>
          </div>
          <h2 className="text-2xl font-extrabold text-text text-center">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="text-sm text-muted text-center mt-2">Sign in or register using your email and password.</p>

          {error && <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && <div>
              <label htmlFor="name" className="block text-sm font-semibold text-text mb-1">Full name</label>
              <div className="relative"><User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="w-full pl-9 pr-3 py-3 rounded-xl border border-outline-variant bg-surface-low text-text" placeholder="Your full name" /></div>
            </div>}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text mb-1">Email address</label>
              <div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className="w-full pl-9 pr-3 py-3 rounded-xl border border-outline-variant bg-surface-low text-text" placeholder="you@example.com" /></div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-text mb-1">Password</label>
              <div className="relative"><Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} className="w-full pl-9 pr-3 py-3 rounded-xl border border-outline-variant bg-surface-low text-text" placeholder="At least 6 characters" /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-60">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>

          <p className="text-sm text-center text-muted mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="font-bold text-primary hover:underline">
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>
          <div className="mt-6 pt-5 border-t border-outline-variant text-xs text-muted flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4" /> Authority access is assigned by SWADESH administrators.</div>
        </div>
      </section>
    </main>
  );
}
