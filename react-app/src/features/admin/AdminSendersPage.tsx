import React, { useState, useEffect } from 'react';
import {
  Shield, Search, UserPlus, X, RefreshCw, Trash2,
  Lock, AlertTriangle, ArrowLeft, LogOut, CheckCircle2,
  Smartphone, RotateCcw, Upload, Download, Sparkles,
  Camera, Calendar, Zap, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getUsers, resetUserHardwareLock, getAllSendersMetrics,
  addUser, deleteUser, BRANCH_SCHOOL_MAP, initStore, getCurrentUser, setCurrentUser
} from '@/lib/store';
import { User as UserType } from '@/types';

export const AdminSendersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current session user
  const currentUser = getCurrentUser();

  // Provision Operator Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('12345678');
  const [inviteRole, setInviteRole] = useState<'SENDER' | 'RECEIVER' | 'ADMIN'>('SENDER');
  const [inviteCampus, setInviteCampus] = useState('YMS 1');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);

  const loadData = () => {
    const list = getUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadData();
    initStore().then(() => loadData()).catch(() => {});
    const handleSync = () => loadData();
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
    };
  }, []);

  // 1. Disconnect Device (Reset Hardware Lock)
  const handleDisconnectDevice = (user: UserType) => {
    resetUserHardwareLock(user.id);
    resetUserHardwareLock(user.username);
    resetUserHardwareLock(user.email);
    setToastMessage(`Hardware device lock for "${user.username}" was cleared. Workstation is now unbound.`);
    loadData();
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 2. Delete Operator
  const handleDeleteOperator = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    deleteUser(deleteTarget.username);
    deleteUser(deleteTarget.email);
    setToastMessage(`Operator "${deleteTarget.username}" permanently removed.`);
    setDeleteTarget(null);
    loadData();
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Provision (Add) Operator
  const handleProvisionOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setErrorMessage("Please enter username and institutional email.");
      return;
    }
    const cleanUsername = inviteName.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = inviteEmail.trim().toLowerCase();
    
    addUser({
      id: `usr-${cleanUsername}-${Date.now().toString(36)}`,
      username: cleanUsername,
      email: cleanEmail,
      password: invitePassword.trim() || '12345678',
      role: inviteRole,
      boundDeviceId: null,
      school: inviteCampus,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      workSessionCount: 0,
      totalWorkMinutes: 0
    });
    setToastMessage(`Operator "${cleanUsername}" successfully provisioned with ${inviteRole} privileges.`);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('12345678');
    setInviteRole('SENDER');
    setInviteCampus('YMS 1');
    loadData();
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.school && u.school.toLowerCase().includes(term));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Flat list of available schools from store
  const allSchools = Object.values(BRANCH_SCHOOL_MAP).flat();

  // Metrics
  const totalCount = users.length;
  const boundDevicesCount = users.filter((u) => Boolean(u.boundDeviceId)).length;
  const singleSentTotal = users.reduce((acc, u) => acc + (u.recordsSentSingle || 0), 0);
  const dataEncodedTotal = users.reduce((acc, u) => acc + (u.recordsEncoded || 0), 0);
  const activeWorkHours = Math.round((users.reduce((acc, u) => acc + (u.totalWorkMinutes || 0), 0) / 60) * 10) / 10;
  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-[#080808] dark:text-[#f2f7f4] font-mono">
      {/* Top Breadcrumb & Action Bar - Matching User's Screenshot Exactly */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7e1] dark:border-[#223126] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">
            <Link to="/dashboard" className="hover:text-[#8fe617] transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-[#080808] dark:text-[#f2f7f4] font-semibold">Administration</span>
            <span>/</span>
            <span className="text-[#8fe617] font-bold">Security &amp; Roles</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-[#8fe617]" />
            <span>Operator Provisioning &amp; RBAC Control</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5 font-mono">
            Control institutional access privileges, provision operator credentials, and manage workstation accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentUser(null);
              window.location.href = '/login';
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 dark:border-red-900/50 bg-white dark:bg-[#111613] px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shadow-xs cursor-pointer"
            title="End admin session"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#8fe617]/50 bg-[#8fe617]/15 p-4 text-xs font-mono text-[#062404] dark:text-[#8fe617] shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#8fe617]" />
          <span className="font-bold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-auto text-[#062404] dark:text-[#8fe617] opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs font-mono text-red-500 shadow-sm animate-in fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-bold">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Operator Stat Badges - Exactly 6 cards matching Screenshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. TOTAL OPERATORS */}
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-xs">
          <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
            TOTAL OPERATORS
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1">
            {totalCount}
          </div>
        </div>

        {/* 2. BOUND DEVICES */}
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-bold">
            BOUND DEVICES
          </div>
          <div className="text-2xl font-black font-mono text-[#43A047] dark:text-[#8fe617] mt-1">
            {boundDevicesCount}
          </div>
        </div>

        {/* 3. SINGLE-SENT TOTAL */}
        <div className="rounded-2xl border border-blue-300 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-blue-700 dark:text-blue-400 uppercase font-bold">
            SINGLE-SENT TOTAL
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {singleSentTotal}
          </div>
        </div>

        {/* 4. DATA ENCODED (DL) */}
        <div className="rounded-2xl border border-[#8fe617]/50 bg-[#8fe617]/10 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-[#062404] dark:text-[#8fe617] uppercase font-bold">
            DATA ENCODED (DL)
          </div>
          <div className="text-2xl font-black font-mono text-[#366804] dark:text-[#8fe617] mt-1">
            {dataEncodedTotal}
          </div>
        </div>

        {/* 5. ACTIVE WORK TIME */}
        <div className="rounded-2xl border border-purple-300 dark:border-purple-950/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-purple-700 dark:text-purple-400 uppercase font-bold">
            ACTIVE WORK TIME
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
            {activeWorkHours}h
          </div>
        </div>

        {/* 6. ADMINISTRATORS */}
        <div className="rounded-2xl border border-amber-300 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase font-bold">
            ADMINISTRATORS
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {adminCount}
          </div>
        </div>
      </div>

      {/* Toolbar: Search input, Role dropdown, and Provision Operator Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7771] dark:text-[#8a9e93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] pl-10 pr-4 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] placeholder-[#6b7771] dark:placeholder-[#8a9e93] focus:border-[#8fe617] focus:outline-none transition-all shadow-xs"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none shadow-xs"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="RECEIVER">Receiver</option>
            <option value="SENDER">Sender</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8fe617] px-5 py-2.5 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <UserPlus className="h-4 w-4 stroke-[2.5]" />
          <span>Provision Operator</span>
        </button>
      </div>

      {/* Operators Directory Table - Replicating User's Screenshot Exactly */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#eef5f1] dark:border-[#1c261e] bg-[#f7faf9] dark:bg-[#070908] text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5 font-bold">OPERATOR IDENTITY</th>
                <th className="px-5 py-3.5 font-bold">INSTITUTIONAL EMAIL</th>
                <th className="px-5 py-3.5 font-bold">ROLE PRIVILEGE</th>
                <th className="px-5 py-3.5 font-bold">AUTHORIZED DEVICE (1-DEVICE LOCK)</th>
                <th className="px-5 py-3.5 font-bold">WORK OUTPUT (SENT / ENCODED)</th>
                <th className="px-5 py-3.5 font-bold">WORK TELEMETRY</th>
                <th className="px-5 py-3.5 text-right font-bold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    No operators found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = currentUser && (user.username === currentUser.username || user.email === currentUser.email);
                  const isLocked = Boolean(user.boundDeviceId);
                  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

                  return (
                    <tr
                      key={user.id || user.email}
                      className="hover:bg-[#f7faf9] dark:hover:bg-[#161d19] transition-colors"
                    >
                      {/* 1. OPERATOR IDENTITY */}
                      <td className="px-5 py-3.5 font-bold text-[#080808] dark:text-[#f2f7f4]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#062404] dark:text-[#8fe617] shrink-0 font-bold text-xs">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold">{user.username}</span>
                          {isSelf && (
                            <span className="rounded-md bg-[#8fe617] px-2 py-0.5 text-[10px] font-mono font-black text-[#062404] shadow-xs">
                              CURRENT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. INSTITUTIONAL EMAIL */}
                      <td className="px-5 py-3.5 font-mono text-[#6b7771] dark:text-[#8a9e93]">
                        {user.email}
                      </td>

                      {/* 3. ROLE PRIVILEGE */}
                      <td className="px-5 py-3.5 font-mono">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                              : user.role === 'SENDER'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                              : 'bg-[#8fe617]/20 text-emerald-800 dark:text-[#8fe617] border border-[#8fe617]/40'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* 4. AUTHORIZED DEVICE (1-DEVICE LOCK) */}
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {isLocked ? (
                          <div className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#8fe617]/15 border border-[#8fe617]/40 px-2 py-0.5 text-[10px] font-mono font-bold text-[#062404] dark:text-[#8fe617] w-fit">
                              <Smartphone className="h-3 w-3 text-[#8fe617]" />
                              <span>LOCKED (1 DEVICE)</span>
                            </div>
                            <span
                              className="text-[11px] text-[#080808] dark:text-[#f2f7f4] font-bold truncate max-w-[200px]"
                              title={user.boundDeviceInfo || user.boundDeviceId || ''}
                            >
                              {user.boundDeviceInfo || (user.boundDeviceId ? `Windows 10/11 - Chrome (${user.boundDeviceId.slice(0, 8)})` : 'Hardware Terminal')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDisconnectDevice(user)}
                              className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline w-fit font-bold cursor-pointer mt-0.5"
                              title="Unbind hardware device lock"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Unbind Device</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                            <Smartphone className="h-3 w-3 opacity-50" />
                            <span>UNBOUND (Next login locks)</span>
                          </div>
                        )}
                      </td>

                      {/* 5. WORK OUTPUT (SENT / ENCODED) */}
                      <td className="px-5 py-3.5 font-mono text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60"
                            title="Records sent in single"
                          >
                            <Upload className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="font-bold text-xs">
                              {user.recordsSentSingle ?? 0}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                              sent in single
                            </span>
                          </div>

                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/35"
                            title="Data encoded / downloaded"
                          >
                            <Download className="h-3 w-3 text-[#8fe617] shrink-0" />
                            <span className="font-bold text-xs">{user.recordsEncoded ?? 0}</span>
                            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                              data encoded
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. WORK TELEMETRY */}
                      <td className="px-5 py-3.5 font-mono text-xs">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-[11px] font-bold text-[#080808] dark:text-[#f2f7f4]">
                            {user.workSessionCount ?? 1} {user.workSessionCount === 1 ? 'Session' : 'Sessions'} • {user.totalWorkMinutes ?? 0}m active
                          </div>
                          <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                            {user.lastLoginAt
                              ? `Last: ${new Date(user.lastLoginAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                              : 'Last: Active today'}
                          </div>
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="px-5 py-3.5 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDisconnectDevice(user)}
                            className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-all cursor-pointer"
                            title="Reset 1-device lock"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>

                          {isAdmin ? (
                            <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                              title="Delete operator"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision New Operator Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#dce7e1] dark:border-[#223126] pb-3">
              <h3 className="font-mono font-black text-base text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#8fe617]" />
                <span>Provision Operator Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] dark:hover:bg-[#161d19] text-[#64748B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionOperator} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1">Operator Username</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. yohannes, etsubmolla"
                  className="w-full bg-[#F8FAF9] dark:bg-[#070908] border border-[#CBD5E1] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="operator@gmail.com"
                  className="w-full bg-[#F8FAF9] dark:bg-[#070908] border border-[#CBD5E1] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1">Role Privilege</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#F8FAF9] dark:bg-[#070908] border border-[#CBD5E1] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none font-bold"
                >
                  <option value="SENDER">SENDER (Field Terminal)</option>
                  <option value="RECEIVER">RECEIVER (Central Operations)</option>
                  <option value="ADMIN">ADMIN (Full Security Clearance)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full bg-[#F8FAF9] dark:bg-[#070908] border border-[#CBD5E1] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1">Assigned School Campus</label>
                <select
                  value={inviteCampus}
                  onChange={(e) => setInviteCampus(e.target.value)}
                  className="w-full bg-[#F8FAF9] dark:bg-[#070908] border border-[#CBD5E1] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none font-semibold"
                >
                  {allSchools.map(sch => (
                    <option key={sch} value={sch}>{sch}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#dce7e1] dark:border-[#223126]">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8fe617] hover:bg-[#7ecc10] text-[#062404] font-black shadow-xs transition-all cursor-pointer"
                >
                  Provision Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 font-mono">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-base text-[#080808] dark:text-[#f2f7f4]">
                Delete Operator Account?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.username}</strong> ({deleteTarget.email})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOperator}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
