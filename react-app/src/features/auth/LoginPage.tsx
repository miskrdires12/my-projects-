import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, KeyRound, ArrowRight, AlertCircle, Smartphone, ShieldCheck,
  UserPlus, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Building2, MapPin, X
} from 'lucide-react';
import {
  getUsers, setCurrentUser, getOrCreateDeviceId,
  setUserHardwareLock, resetUserHardwareLock, PRESET_OPERATORS,
  addUser, BRANCH_SCHOOL_MAP, DEFAULT_BRANCHES
} from '@/lib/store';
import { User as UserType, UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Master defaults
  const [email, setEmail] = useState('miskrdires11@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [error, setError] = useState<string | null>(null);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null);
  const [deviceLockedWarning, setDeviceLockedWarning] = useState<string | null>(null);
  const [lockedUser, setLockedUser] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Select & Provisioning states
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Provisioning form states
  const [provUsername, setProvUsername] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provRole, setProvRole] = useState<UserRole>('SENDER');
  const [provBranch, setProvBranch] = useState<string>('Addis Ababa');
  const [provSchool, setProvSchool] = useState<string>('YMS');
  const [provPassword, setProvPassword] = useState('12345678');
  const [provToast, setProvToast] = useState<string | null>(null);

  const deviceId = getOrCreateDeviceId();
  const allUsers = getUsers();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setUnregisteredEmail(null);
    setDeviceLockedWarning(null);
    setIsSubmitting(true);

    try {
      const term = email.trim().toLowerCase();
      const pwd = password.trim();

      // Find user strictly or by alias
      let user = allUsers.find(
        u => u.email.toLowerCase() === term || u.username.toLowerCase() === term
      );

      // Handle username-only input without @gmail.com
      if (!user && !term.includes('@')) {
        user = allUsers.find(
          u => u.email.toLowerCase().startsWith(term + '@') || u.username.toLowerCase() === term
        );
      }

      // Institutional aliases fallback
      if (!user) {
        if (term === 'admin@studentbridge.internal' || term === 'admin') {
          user = allUsers.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') || PRESET_OPERATORS.find(u => u.role === 'SUPER_ADMIN');
        } else if (term === 'receiver@studentbridge.internal' || term === 'receiver') {
          user = allUsers.find(u => u.role === 'RECEIVER') || PRESET_OPERATORS.find(u => u.role === 'RECEIVER');
        } else if (term === 'sender@studentbridge.internal' || term === 'sender') {
          user = allUsers.find(u => u.role === 'SENDER') || PRESET_OPERATORS.find(u => u.role === 'SENDER');
        }
      }

      // If user is not yet registered in directory
      if (!user) {
        setUnregisteredEmail(term);
        setError(`Email "${term}" is not registered yet. Click "Auto-Provision & Enter" below to create this account instantly with password 12345678.`);
        setIsSubmitting(false);
        return;
      }

      // Universal Password Verification: 12345678 works for ALL accounts unconditionally
      const expectedPwd = (user as any).password || '12345678';
      const isMasterValid =
        pwd === '12345678' ||
        pwd === expectedPwd ||
        pwd === 'admin123' ||
        pwd === 'receiver123' ||
        pwd === 'sender123' ||
        pwd === 'password123' ||
        pwd === 'super123';

      if (!isMasterValid) {
        setError('Invalid password. Default password for all accounts is: 12345678');
        setIsSubmitting(false);
        return;
      }

      // Hardware Lock Auto-Binding: Entering universal password 12345678 binds the current workstation
      setUserHardwareLock(user.id, deviceId);
      user.boundDeviceId = deviceId;

      finishLogin(user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishLogin = (user: UserType) => {
    setCurrentUser(user);

    // If redirected from a specific page, return there
    const fromPath = (location.state as any)?.from?.pathname;
    if (fromPath && fromPath !== '/login') {
      navigate(fromPath, { replace: true });
      return;
    }

    // Role-specific workspace landing
    if (user.role === 'SENDER') navigate('/sender/register');
    else if (user.role === 'RECEIVER') navigate('/receiver/students');
    else if (user.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user.role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
    else navigate('/receiver/students');
  };

  // Instant 1-click Auto-Provisioning for unregistered email
  const handleQuickProvision = (customRole: UserRole = 'SENDER') => {
    if (!unregisteredEmail) return;
    const cleanEmail = unregisteredEmail.trim();
    const cleanUsername = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;

    const newUser: UserType & { password?: string; branch?: string; school?: string } = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
      role: customRole,
      password: '12345678',
      branch: 'Addis Ababa',
      school: 'YMS',
      boundDeviceId: deviceId,
      boundDeviceInfo: 'Authenticated Workstation',
      workSessionCount: 1,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      createdAt: new Date().toISOString()
    };

    addUser(newUser);
    finishLogin(newUser);
  };

  // Full User Provisioning Form submission
  const handleFullProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provEmail.trim()) return;

    const cleanEmail = provEmail.trim().toLowerCase();
    const cleanUsername = provUsername.trim() || cleanEmail.split('@')[0];

    const newUser: UserType & { password?: string; branch?: string; school?: string } = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
      role: provRole,
      password: provPassword.trim() || '12345678',
      branch: provBranch,
      school: provSchool,
      boundDeviceId: deviceId,
      boundDeviceInfo: 'Authenticated Workstation',
      workSessionCount: 1,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      createdAt: new Date().toISOString()
    };

    addUser(newUser);
    setProvToast(`Account provisioned successfully for ${newUser.email}! Logging in...`);

    setTimeout(() => {
      setShowProvisionModal(false);
      finishLogin(newUser);
    }, 700);
  };

  // Quick Account Selector click
  const handleSelectAccount = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('12345678');
    setError(null);
    setUnregisteredEmail(null);

    // Auto-login with selected account
    const target = allUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase() || u.username.toLowerCase() === targetEmail.toLowerCase());
    if (target) {
      setUserHardwareLock(target.id, deviceId);
      target.boundDeviceId = deviceId;
      finishLogin(target);
    }
  };

  const handleBranchChange = (branch: string) => {
    setProvBranch(branch);
    const schools = BRANCH_SCHOOL_MAP[branch] || [];
    setProvSchool(schools[0] || 'YMS');
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 font-sans select-none min-h-[90vh]">
      {/* Silicon Labs Monogram Logo Card */}
      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-center p-2.5 mb-3 transition-transform hover:scale-105">
        <img
          src="/logo.png"
          alt="Silicon Labs"
          className="w-11 h-11 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/brand-logo.png';
          }}
        />
      </div>

      {/* Brand Title with Light Lemon Green Accent */}
      <div className="flex items-center gap-1.5 text-2xl font-black text-black tracking-tight font-heading">
        <span>SILICON</span>
        <span className="bg-[#9EE617] text-black text-xs font-black px-2 py-0.5 rounded-md leading-none shadow-xs">
          LABS
        </span>
      </div>

      {/* Institutional Subtitle */}
      <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1 text-center">
        STUDENT IDENTITY & CARD MANUFACTURING PLATFORM
      </div>

      {/* Universal Password Notice Banner */}
      <div className="mt-3 px-3.5 py-1.5 rounded-full bg-[#9EE617]/15 border border-[#9EE617]/40 flex items-center gap-2 text-[11px] font-bold text-[#2A5202]">
        <Sparkles className="w-3.5 h-3.5 text-[#4D8A07]" />
        <span>Universal Password for all emails: <code className="bg-white px-2 py-0.5 rounded-md text-black font-black border border-[#9EE617]/50">12345678</code></span>
      </div>

      {/* Secure Sign-In Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.04)] p-6 sm:p-7 mt-4 relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
              Sign In to Terminal
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Enter any authorized or custom email
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setProvEmail(email);
              setProvUsername(email.split('@')[0]);
              setShowProvisionModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black text-[11px] font-black shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>➕ Provision User</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed">{error}</span>
            </div>

            {unregisteredEmail && (
              <div className="mt-1 pt-2 border-t border-red-200/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickProvision('SENDER')}
                  className="w-full py-1.5 px-3 bg-[#9EE617] hover:bg-[#8FE617] text-black font-black rounded-lg text-[11px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Provision & Enter Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* USERNAME OR EMAIL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              ACCOUNT EMAIL OR USERNAME
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                  setUnregisteredEmail(null);
                }}
                placeholder="e.g. miskrdires11@gmail.com"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#9EE617] focus:ring-2 focus:ring-[#9EE617]/20 transition-all"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setPassword('12345678')}
                className="text-[10px] text-[#4D8A07] hover:underline font-bold"
              >
                Set to 12345678
              </button>
            </div>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium tracking-widest focus:outline-none focus:border-[#9EE617] focus:ring-2 focus:ring-[#9EE617]/20 transition-all"
              />
            </div>
          </div>

          {/* AUTHENTICATE SESSION BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] active:bg-[#80D60E] text-black font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span>AUTHENTICATE SESSION</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Select Operators Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowQuickSelect(!showQuickSelect)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#4D8A07]" />
              <span>Quick Select Operator ({allUsers.length} Accounts)</span>
            </div>
            {showQuickSelect ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showQuickSelect && (
            <div className="mt-2 p-2 bg-slate-50/70 border border-slate-200 rounded-xl max-h-56 overflow-y-auto space-y-1.5 text-xs">
              {allUsers.map((u) => (
                <button
                  key={u.id || u.email}
                  type="button"
                  onClick={() => handleSelectAccount(u.email)}
                  className="w-full p-2 rounded-lg bg-white hover:bg-[#9EE617]/10 border border-slate-100 hover:border-[#9EE617]/40 flex items-center justify-between text-left transition-all"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-900 text-[11px] truncate">{u.username}</div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">{u.email}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                    u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                    u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' :
                    u.role === 'RECEIVER' ? 'bg-blue-100 text-blue-800' : 'bg-[#9EE617]/25 text-[#2A5202]'
                  }`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Workstation Lock Security Status Badge */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-[#9EE617]" />
          <span>Workstation Terminal • {deviceId}</span>
        </div>
      </div>

      {/* PROVISION NEW OPERATOR MODAL */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Provision New Operator Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {provToast && (
              <div className="p-3 rounded-xl bg-[#9EE617]/15 border border-[#9EE617]/40 text-[#2A5202] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold">{provToast}</span>
              </div>
            )}

            <form onSubmit={handleFullProvisionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name / Operator Username</label>
                <input
                  type="text"
                  required
                  value={provUsername}
                  onChange={(e) => setProvUsername(e.target.value)}
                  placeholder="e.g. Samuel Desta"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#9EE617]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  placeholder="e.g. samuel@gmail.com"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#9EE617]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Station Role</label>
                  <select
                    value={provRole}
                    onChange={(e) => setProvRole(e.target.value as UserRole)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                  >
                    <option value="SENDER">SENDER</option>
                    <option value="RECEIVER">RECEIVER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Branch</label>
                  <select
                    value={provBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                  >
                    {DEFAULT_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned School</label>
                <select
                  value={provSchool}
                  onChange={(e) => setProvSchool(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                >
                  {(BRANCH_SCHOOL_MAP[provBranch] || ['YMS']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Universal standard password is <strong className="text-black">12345678</strong>
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-xs shadow-sm cursor-pointer"
                >
                  Provision & Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
