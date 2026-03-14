import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../features/auth/authSlice';
import { authAPI } from '../features/auth/authAPI';

/* ─── Tiny XOR+Base64 cipher ─────────────────────────────────────── */
const _EK = 'kg_admin_2024_xor_key_secure';
const encrypt = (t) => { try { return btoa(t.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ _EK.charCodeAt(i % _EK.length))).join('')); } catch { return btoa(t); } };
const decrypt = (e) => { try { const r = atob(e); return r.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ _EK.charCodeAt(i % _EK.length))).join(''); } catch { return ''; } };

/* ─── Eye SVGs ────────────────────────────────────────────────────── */
const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

/* ─── Toast colours ───────────────────────────────────────────────── */
const TOAST_COLORS = { success: '#10b981', error: '#f43f5e', info: '#f97316' };

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* form state */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [trust, setTrust] = useState(() => localStorage.getItem('admin_trust') === 'true');
  const [busy, setBusy] = useState(false);

  /* forgot password */
  const [fog, setFog] = useState(false);
  const [fogEmail, setFogEmail] = useState('');
  const [fogOtp, setFogOtp] = useState('');
  const [fogPwd, setFogPwd] = useState('');
  const [fogStep, setFogStep] = useState('request');
  const [fogBusy, setFogBusy] = useState(false);

  /* toasts */
  const [toasts, setToasts] = useState([]);
  const push = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  /* restore saved credentials */
  useEffect(() => {
    if (localStorage.getItem('admin_trust') === 'true') {
      const e = localStorage.getItem('admin_email') || '';
      const p = localStorage.getItem('admin_password') || '';
      if (e) setEmail(e);
      if (p) setPassword(decrypt(p));
    }
  }, []);

  /* ── handlers ── */
  const handleLogin = async (ev) => {
    ev.preventDefault();
    if (!email || !password) { push('error', 'Email and password are required.'); return; }
    try {
      setBusy(true);
      const loginRes = await authAPI.login({ email, password });

      // 1. Success message for login (Response data now only contains identity)
      push('success', loginRes.data?.message || 'Login successful.');
      const loginData = loginRes.data?.data;
      const { userId, accessToken } = loginData || {};

      if (accessToken) localStorage.setItem('token', accessToken);

      // 2. Fetch User Profile by ID (Instead of /me)
      if (userId) {
        const userRes = await authAPI.getUserById(userId);
        const user = userRes.data?.data?.user;
        if (user) {
          // Flatten user data as per reference project
          localStorage.setItem('id', user.id);
          localStorage.setItem('client', user.client);
          localStorage.setItem('organizationId', user.organizationId);
          localStorage.setItem('roleId', user.roleId);
          localStorage.setItem('username', user.username);
          localStorage.setItem('isSubscription', JSON.stringify(user.isSubscribed));
          localStorage.setItem('isAuthenticated', 'true');

          // Remember credentials if trust is checked
          if (trust) {
            localStorage.setItem('admin_trust', 'true');
            localStorage.setItem('admin_email', email);
            localStorage.setItem('admin_password', encrypt(password));
            localStorage.setItem('rememberEmail', encrypt(email));
            localStorage.setItem('rememberPassword', encrypt(password));
          } else {
            localStorage.removeItem('admin_trust');
            localStorage.removeItem('admin_email');
            localStorage.removeItem('admin_password');
            localStorage.removeItem('rememberEmail');
            localStorage.removeItem('rememberPassword');
          }

          // 3. Fetch Role Details (Permissions and name)
          if (user.roleId) {
            const roleRes = await authAPI.getRolePermissions(user.roleId);
            const role = roleRes.data?.data?.role;
            if (role) {
              localStorage.setItem('Role', role.name);
              const permissions = role.permissions || [];

              // Flatten permissions into localStorage
              permissions.forEach(p => {
                const featureName = p.feature_name || p.feature_key;
                if (featureName) {
                  const key = `${featureName.charAt(0).toLowerCase() + featureName.slice(1).toLowerCase()}Permissions`;
                  localStorage.setItem(key, JSON.stringify(p.permissions));
                }
              });
              localStorage.setItem('admin_permissions', JSON.stringify(permissions));
            }
          }

          // 4. Fetch Organization Details (College/Company Name)
          if (user.organizationId) {
            try {
              const orgRes = user.isCollege
                ? await authAPI.getCollegeDetails(user.organizationId)
                : await authAPI.getCompanyDetails(user.organizationId);

              if (orgRes.data?.success && orgRes.data?.data) {
                const orgData = orgRes.data.data;
                const orgName = orgData.collegeName || orgData.companyName;
                localStorage.setItem('collegeName', orgName);
              }
            } catch (err) {
              console.error('Failed to fetch org details during login', err);
            }
          }

          localStorage.setItem('admin_user', JSON.stringify(user));
          dispatch(setUser(user));
        } else {
          throw new Error('User data not found for the given ID.');
        }
      } else {
        throw new Error('User identity not found in login response.');
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      push('error', err?.response?.data?.message || 'Login failed. Please try again.');
    } finally { setBusy(false); }
  };

  const handleOtp = async () => {
    if (!fogEmail) { push('error', 'Please enter your email.'); return; }
    try {
      setFogBusy(true);
      const res = await authAPI.requestPasswordReset(fogEmail);
      const otp = res.data?.otp;
      push('success', otp ? `OTP sent: ${otp} (Testing only)` : 'OTP sent to your email.');
      setFogStep('verify');
    } catch (err) {
      push('error', err?.response?.data?.message || 'Invalid email.');
    } finally { setFogBusy(false); }
  };

  const handleReset = async () => {
    if (!fogOtp || !fogPwd) { push('error', 'Please enter OTP and new password.'); return; }
    try {
      setFogBusy(true);
      await authAPI.resetPassword({ email: fogEmail, otp: fogOtp, newPassword: fogPwd });
      push('success', 'Password reset successfully.');
      setFog(false);
    } catch (err) {
      push('error', err?.response?.data?.message || 'Invalid OTP.');
    } finally { setFogBusy(false); }
  };

  /* ── shared input class ── */
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100';

  return (
    <div className="flex min-h-screen font-['Inter',sans-serif]">

      {/* ══ LEFT BRAND PANEL ══════════════════════════════════════════ */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#A63200] via-[#B83800] to-[#CC4E00] px-14 py-12 text-white">

        {/* animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-60">
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-red-600/40 blur-[100px]" />
          <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-gradient-to-r from-red-500 to-amber-400/30 blur-[80px]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-600/40 blur-[90px]" />
        </div>

        {/* diagonal line pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.8) 4px, rgba(255,255,255,0.8) 5px)' }} />

        {/* top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 shadow-lg shadow-orange-900/20 text-sm font-extrabold backdrop-blur-md border border-white/20">
            KG
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-white/90">KareerGrowth</span>
        </div>

        {/* centre hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Restricted Access — Authorised Personnel Only
          </div>
          <h1 className="font-['Space_Grotesk',sans-serif] text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-md">
            Admin<br />
            <span className="bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
              Control Suite
            </span>
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/80">
            Manage positions, candidates, credits, and interview workflows — from a single admin command centre.
          </p>

          {/* stat chips */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { label: 'Position Tracking', value: 'Live' },
              { label: 'Interview Credits', value: 'Live' },
              { label: 'Candidate Pipeline', value: 'Live' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-white">{s.value}</span> · {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* bottom footer */}
        <p className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} KareerGrowth · All actions are logged and monitored.
        </p>

        {/* decorative arc */}
        <svg className="pointer-events-none absolute right-0 top-0 h-full w-24 text-white/10" viewBox="0 0 100 800" preserveAspectRatio="none">
          <path d="M100 0 Q0 400 100 800" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ══ RIGHT FORM PANEL ══════════════════════════════════════════ */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">

          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#D94200] to-[#DD7000] text-xs font-extrabold text-white shadow-md">KG</div>
            <span className="text-sm font-semibold tracking-widest uppercase text-[#D94200]">KareerGrowth Admin</span>
          </div>

          {/* heading */}
          <div className="mb-8">
            <h2 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to access the admin console.
            </p>
          </div>

          {/* form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                autoComplete="email"
              />
            </div>

            {/* password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {/* trust + forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={trust}
                  onChange={e => setTrust(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-orange-600"
                />
                Trust this device
              </label>
              <button type="button" onClick={() => { setFogEmail(email); setFogStep('request'); setFog(true); }}
                className="font-semibold text-orange-700 hover:text-orange-900 transition">
                Forgot password?
              </button>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={busy}
              className="relative w-full overflow-hidden rounded-full bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 hover:shadow-orange-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                  </svg>
                  Authenticating…
                </span>
              ) : 'Enter Admin Console →'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected by end-to-end encryption · Session expires on inactivity
          </p>
        </div>
      </div>

      {/* ══ FORGOT PASSWORD MODAL ════════════════════════════════════ */}
      {fog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl ring-1 ring-slate-200">

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-['Space_Grotesk',sans-serif] text-lg font-bold text-slate-900">
                  {fogStep === 'request' ? 'Reset your password' : 'Set new password'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {fogStep === 'request' ? "We'll send a one-time code to your email." : 'Enter the OTP and choose a new password.'}
                </p>
              </div>
              <button onClick={() => setFog(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
                <input type="email" placeholder="you@company.com" value={fogEmail} onChange={e => setFogEmail(e.target.value)} className={inputCls} />
              </div>

              {fogStep === 'verify' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">OTP Code</label>
                    <input type="text" placeholder="6-digit code" value={fogOtp} onChange={e => setFogOtp(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</label>
                    <input type="password" placeholder="Choose a strong password" value={fogPwd} onChange={e => setFogPwd(e.target.value)} className={inputCls} />
                  </div>
                </>
              )}

              <button
                type="button"
                disabled={fogBusy}
                onClick={fogStep === 'request' ? handleOtp : handleReset}
                className="w-full rounded-full bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 hover:shadow-orange-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {fogBusy ? 'Please wait…' : fogStep === 'request' ? 'Send OTP' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOASTS ═══════════════════════════════════════════════════ */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[999] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            style={{ backgroundColor: TOAST_COLORS[t.type] || TOAST_COLORS.info }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl"
          >
            {t.type === 'success' && <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            {t.type === 'error' && <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
