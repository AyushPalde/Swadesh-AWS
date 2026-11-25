import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/primitives/Toast.jsx';
import { ROLES } from '../constants.js';
import {
  User,
  Shield,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  PhoneCall,
} from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState(ROLES.CITIZEN);
  const [name, setName] = useState('Asha Patil');
  const [email, setEmail] = useState('asha.patil@swadesh.gov.in');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      const destination = role === ROLES.AUTHORITY ? '/authority' : '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setFieldErrors({});
    setGeneralError('');
    if (newRole === ROLES.AUTHORITY) {
      setName('Rajesh Kumar');
      setEmail('rajesh.kumar@swadesh.gov.in');
      setPasscode('swadesh-demo');
    } else {
      setName('Asha Patil');
      setEmail('asha.patil@swadesh.gov.in');
      setPasscode('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');

    // Client-side quick checks
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim() || !email.includes('@')) errors.email = 'Valid email is required';
    if (selectedRole === ROLES.AUTHORITY && !passcode.trim()) {
      errors.passcode = 'Authority access passcode is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        name: name.trim(),
        email: email.trim(),
        role: selectedRole,
        passcode: selectedRole === ROLES.AUTHORITY ? passcode.trim() : undefined,
      });

      toast.success(`Welcome to SWADESH, ${res.user.name}!`, 'Signed In');

      // Redirect by role
      const target = selectedRole === ROLES.AUTHORITY ? '/authority' : '/';
      navigate(target, { replace: true });
    } catch (err) {
      setGeneralError(err.message || 'Login failed. Please check credentials.');
      if (err.details && Array.isArray(err.details)) {
        const mapped = {};
        err.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setFieldErrors(mapped);
      }
      toast.error(err.message || 'Authentication error', 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-background selection:bg-teal-100 selection:text-teal-900">
      {/* ============================================================ */}
      {/* LEFT HALF: Deep Teal Civic Panel (Matches Stitch 06_login) */}
      {/* ============================================================ */}
      <div className="relative w-full lg:w-1/2 bg-primary-container text-white p-8 md:p-14 lg:p-16 flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        {/* Top Header Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wide text-teal-50">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Civic Action & Municipal Governance
          </div>
          <span className="text-xs text-primary-light font-medium hidden sm:inline">
            Maharashtra &bull; Ward K-West
          </span>
        </div>

        {/* Mid Content: Hero Tagline & Civic Vector Illustration */}
        <div className="relative z-10 my-8 lg:my-auto flex flex-col gap-6 max-w-xl">
          <div>
            <span className="inline-block text-accent font-bold text-xs uppercase tracking-widest mb-2">
              Empowering Every Neighborhood
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.18] text-white">
              Your city. <span className="text-accent">Your voice.</span>
            </h1>
            <p className="mt-2.5 text-primary-light text-sm md:text-base leading-relaxed max-w-md font-normal">
              Bridging citizens with city municipal corporations to report, verify, and resolve civic issues in real time.
            </p>
          </div>

          {/* Civic Illustration Frame */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/15 bg-primary/40 backdrop-blur-sm shadow-xl aspect-[16/9] max-h-64 group">
            <img
              src="/docs/screens/08_illustration_street_scene.png"
              onError={(e) => {
                // Fallback to high-res hosted link if local file path isn't bundled directly by Vite
                e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80';
              }}
              alt="Citizens pointing out potholes, streetlights, and city infrastructure"
              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-container/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-primary-light">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Civic Crowdsourcing Grid
              </span>
              <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono text-teal-200">
                Potholes &bull; Waste &bull; Water
              </span>
            </div>
          </div>

          {/* 3 Bullet Features */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Report in 30 seconds</h3>
                <p className="text-[11px] text-primary-light leading-normal mt-0.5">
                  Snap a geotagged photo of a road pothole or streetlight and alert municipal engineers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Track every update</h3>
                <p className="text-[11px] text-primary-light leading-normal mt-0.5">
                  Transparent 5-stage SLA timeline from citizen verification to on-site work completion.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Stat */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-primary-light">
          <span>Official Public Redressal Portal</span>
          <span className="font-bold text-white">88% Resolution SLA</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT HALF: Login Form Card (Matches Stitch 06_login) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between items-center relative">
        <div className="w-full max-w-md flex justify-end items-center text-xs text-muted">
          <span>Need municipal help? <a href="tel:1916" className="text-primary font-bold hover:underline">BMC Helpline 1916</a></span>
        </div>

        <div className="w-full max-w-md my-auto py-6">
          <div className="bg-surface-lowest rounded-2xl p-7 md:p-9 shadow-card border border-outline-variant">
            {/* Logo & Header */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-outline-variant/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary text-surface-lowest flex items-center justify-center font-extrabold text-xl shadow-subtle">
                  स्व
                </div>
                <div className="text-left">
                  <div className="text-2xl font-extrabold tracking-tight text-text flex items-center gap-1.5">
                    SWADESH
                    <span className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    Civic Action Platform
                  </div>
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-text mt-4 tracking-tight">
                Welcome to SWADESH
              </h2>
              <p className="text-xs text-muted mt-1 max-w-xs">
                Access your ward feed, report civic issues, or manage municipal dispatch.
              </p>
            </div>

            {/* Error Banner */}
            {generalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Segmented Toggle: Citizen | Authority */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text mb-2">
                  Select Account Role
                </label>
                <div className="grid grid-cols-2 p-1 bg-surface-low rounded-xl border border-outline-variant gap-1">
                  <button
                    type="button"
                    onClick={() => handleRoleChange(ROLES.CITIZEN)}
                    className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedRole === ROLES.CITIZEN
                        ? 'bg-primary-container text-surface-lowest shadow-subtle font-bold'
                        : 'text-text hover:text-primary hover:bg-surface-lowest'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Citizen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange(ROLES.AUTHORITY)}
                    className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedRole === ROLES.AUTHORITY
                        ? 'bg-primary-container text-surface-lowest shadow-subtle font-bold'
                        : 'text-text hover:text-primary hover:bg-surface-lowest'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-accent" />
                    <span>Authority</span>
                  </button>
                </div>

                {/* Authority Lock Cue Banner */}
                {selectedRole === ROLES.AUTHORITY && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
                      In mock mode, use: <code className="font-bold bg-amber-200/60 px-1 rounded">swadesh-demo</code>
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950">
                      BMC / WARD
                    </span>
                  </div>
                )}
              </div>

              {/* Field 1: Full Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-text mb-1">
                  Full Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asha Patil"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-surface-low text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      fieldErrors.name
                        ? 'border-error focus:border-error'
                        : 'border-outline-variant focus:border-primary'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] font-medium text-error mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Field 2: Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-text mb-1">
                  Email Address <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. resident@swadesh.gov.in"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-surface-low text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      fieldErrors.email
                        ? 'border-error focus:border-error'
                        : 'border-outline-variant focus:border-primary'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] font-medium text-error mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Field 3: Authority Passcode (Shown only for Authority role) */}
              {selectedRole === ROLES.AUTHORITY && (
                <div className="animate-in fade-in duration-200">
                  <label htmlFor="passcode" className="block text-xs font-semibold text-text mb-1">
                    Authority Access Passcode <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="passcode"
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter municipal officer passcode"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-surface-low text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        fieldErrors.passcode
                          ? 'border-error focus:border-error'
                          : 'border-outline-variant focus:border-primary'
                      }`}
                    />
                  </div>
                  {fieldErrors.passcode && (
                    <p className="text-[11px] font-medium text-error mt-1">{fieldErrors.passcode}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-surface-lowest hover:bg-primary-hover shadow-subtle flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>
                      {selectedRole === ROLES.AUTHORITY
                        ? 'Authorize Officer Access'
                        : 'Sign In as Citizen'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="w-full max-w-md text-center text-xs text-muted">
          SWADESH Civic Redressal Architecture &bull; Local Mock Enabled
        </div>
      </div>
    </main>
  );
}
