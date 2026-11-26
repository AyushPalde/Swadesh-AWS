import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/primitives/Toast.jsx';

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'authority' ? '/authority' : '/', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const chooseAccount = async (selectedRole) => {
    setLoading(true);
    try {
      const result = await login({ role: selectedRole });
      toast.success(`Welcome, ${result.user.name}!`, 'Demo sign-in successful');
      const requestedPath = location.state?.from?.pathname;
      navigate(requestedPath || (selectedRole === 'authority' ? '/authority' : '/'), { replace: true });
    } catch (error) {
      toast.error(error.message || 'Unable to sign in', 'Demo sign-in failed');
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
        <p className="text-xs text-primary-light">Classroom demonstration mode · AWS-backed data services</p>
      </section>
      <section className="lg:w-1/2 p-6 sm:p-10 flex items-center justify-center">
        <div className="w-full max-w-md bg-surface-lowest rounded-2xl p-7 md:p-9 shadow-card border border-outline-variant">
          <div className="flex items-center justify-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-xl">स्व</div>
            <div><div className="text-2xl font-extrabold text-text">SWADESH</div><div className="text-[10px] uppercase font-bold tracking-wider text-primary">Civic Action Platform</div></div>
          </div>
          <h2 className="text-2xl font-extrabold text-text text-center">Choose a demo account</h2>
          <p className="text-sm text-muted text-center mt-2">No registration or password required for the classroom demonstration.</p>
          <div className="mt-7 space-y-4">
            <button type="button" disabled={loading} onClick={() => chooseAccount('citizen')} className="w-full p-4 rounded-xl border border-outline-variant hover:border-primary text-left disabled:opacity-60">
              <span className="block font-bold text-text">Continue as Citizen</span>
              <span className="block text-sm text-muted mt-1">citizen@swadesh.demo</span>
            </button>
            <button type="button" disabled={loading} onClick={() => chooseAccount('authority')} className="w-full p-4 rounded-xl border border-outline-variant hover:border-primary text-left disabled:opacity-60">
              <span className="block font-bold text-text">Continue as Authority</span>
              <span className="block text-sm text-muted mt-1">authority@swadesh.demo</span>
            </button>
          </div>
          {loading && <p className="text-center text-sm text-muted mt-5">Opening demo account…</p>}
          <p className="text-xs text-muted text-center mt-7">Demo identities are for classroom demonstration only. Do not use this mode for real users or production.</p>
        </div>
      </section>
    </main>
  );
}
