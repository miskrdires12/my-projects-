import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Shield, Smartphone, Lock, Unlock, Search, X, CheckCircle2,
  UserPlus, RefreshCw, KeyRound, Trash2, Download, Sparkles, Building2, MapPin, Edit3
} from 'lucide-react';
import {
  getUsers, resetUserHardwareLock, setUserHardwareLock, addUser, updateUser, deleteUser,
  BRANCH_SCHOOL_MAP, DEFAULT_BRANCHES, getOrCreateDeviceId
} from '@/lib/store';
import { User, UserRole } from '@/types';

export const SuperAdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Senders' | 'Receivers' | 'Admins' | 'Super Admin'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SENDER');
  const [newBranch, setNewBranch] = useState('Addis Ababa');
  const [newSchool, setNewSchool] = useState('YMS');
  const [newPassword, setNewPassword] = useState('12345678');

  // Edit user form states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('SENDER');
  const [editBranch, setEditBranch] = useState('Addis Ababa');
  const [editSchool, setEditSchool] = useState('YMS');
  const [editPassword, setEditPassword] = useState('12345678');

  const loadData = () => {
    setUsers([...getUsers()]);
  };

  useEffect(() => {
    loadData();
    const handleUserChange = () => loadData();
    window.addEventListener('studentbridge_userchange', handleUserChange);
    return () => window.removeEventListener('studentbridge_userchange', handleUserChange);
  }, []);

  const handleBranchChange = (b: string) => {
    setNewBranch(b);
    const schools = BRANCH_SCHOOL_MAP[b] || [];
    setNewSchool(schools[0] || 'YMS');
  };

  const handleEditBranchChange = (b: string) => {
    setEditBranch(b);
    const schools = BRANCH_SCHOOL_MAP[b] || [];
    setEditSchool(schools[0] || 'YMS');
  };

  const handleLockUser = (u: User) => {
    const devId = u.boundDeviceId || getOrCreateDeviceId();
    setUserHardwareLock(u.id, devId);
    loadData();
    setToastMessage(`Workstation locked for "${u.username}" (${devId.substring(0, 14)}...).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUnlockUser = (u: User) => {
    resetUserHardwareLock(u.id);
    loadData();
    setToastMessage(`Workstation unlocked for "${u.username}". Terminal is unbound.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenEditUser = (u: User) => {
    setEditUser(u);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditBranch((u as any).branch || 'Addis Ababa');
    setEditSchool((u as any).school || 'YMS');
    setEditPassword((u as any).password || '12345678');
    setEditModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editEmail.trim()) return;

    const cleanUsername = editUsername.trim() || editEmail.split('@')[0];
    const cleanEmail = editEmail.trim().toLowerCase();

    updateUser(editUser.id, {
      username: cleanUsername,
      email: cleanEmail,
      role: editRole,
      branch: editBranch,
      school: editSchool,
      password: editPassword.trim() || '12345678'
    });

    loadData();
    setEditModalOpen(false);
    setEditUser(null);
    setToastMessage(`Account for "${cleanUsername}" (${cleanEmail}) successfully updated.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRoleChange = (userId: string, targetRole: UserRole) => {
    updateUser(userId, { role: targetRole });
    loadData();
    setToastMessage(`Updated role of account to ${targetRole}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (window.confirm(`Are you sure you want to remove account "${email}" from the system? This will also unbind and free any linked workstation.`)) {
      deleteUser(userId);
      deleteUser(email);
      loadData();
      setToastMessage(`Account "${email}" permanently removed and workstation unlocked.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanUsername = newUsername.trim() || cleanEmail.split('@')[0];

    const newUser: User & { password?: string; branch?: string; school?: string } = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
      role: newRole,
      password: newPassword.trim() || '12345678',
      branch: newBranch,
      school: newSchool,
      boundDeviceId: null,
      boundDeviceInfo: null,
      workSessionCount: 0,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      createdAt: new Date().toISOString()
    };

    addUser(newUser);
    loadData();

    setModalOpen(false);
    setNewUsername('');
    setNewEmail('');
    setNewPassword('12345678');
    setToastMessage(`Account provisioned successfully for ${newUser.email} (${newUser.role}). Universal password: 12345678.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Username', 'Email', 'Role', 'Branch', 'School', 'Bound Device ID', 'Created At'];
    const rows = users.map(u => [
      u.id,
      u.username,
      u.email,
      u.role,
      (u as any).branch || 'Addis Ababa',
      (u as any).school || 'YMS',
      u.boundDeviceId || 'Unbound',
      u.createdAt || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(cell => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `siliconlabs_authorized_users_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'Senders' && u.role !== 'SENDER') return false;
    if (activeTab === 'Receivers' && u.role !== 'RECEIVER') return false;
    if (activeTab === 'Admins' && u.role !== 'ADMIN') return false;
    if (activeTab === 'Super Admin' && u.role !== 'SUPER_ADMIN') return false;

    if (branchFilter !== 'All') {
      const uBranch = (u as any).branch || 'Addis Ababa';
      if (uBranch !== branchFilter) return false;
    }

    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RECEIVER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SENDER':
        return 'bg-[#9EE617]/20 text-[#2A5202] border-[#9EE617]/40';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              User Provisioning & Role Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#9EE617]/20 text-[#2A5202] border border-[#9EE617]/40 uppercase font-mono">
              {users.length} Authorized Accounts
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Centralized operator account provisioning, instant email pass-through, universal password (12345678), and workstation lock controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#202833] text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Account</span>
          </button>
        </div>
      </div>

      {/* Universal Password Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-[#9EE617]/15 border border-[#9EE617]/40 text-[#2A5202] text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4D8A07] shrink-0" />
          <span>
            <strong>Universal Master Password Policy Active:</strong> All operator accounts authenticate seamlessly using password <code className="bg-white px-2 py-0.5 rounded text-black font-black border border-[#9EE617]/50">12345678</code>.
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4D8A07] shrink-0">Policy Enforced</span>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/50 text-[#2A5202] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4D8A07]" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Tabs & Search Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Senders', 'Receivers', 'Admins', 'Super Admin'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[#9EE617] text-black shadow-xs font-black'
                  : 'text-[#64748B] hover:text-[#202833] bg-[#F8FAF9] border border-[#CBD5E1]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Branch Filter & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#202833]"
          >
            <option value="All">All Branches</option>
            {DEFAULT_BRANCHES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username or email..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#9EE617]"
            />
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Operator Username</th>
                <th className="py-3.5">Email Address</th>
                <th className="py-3.5">Assigned Station</th>
                <th className="py-3.5">Branch / School</th>
                <th className="py-3.5">Workstation Terminal</th>
                <th className="py-3.5">Role Assignment</th>
                <th className="py-3.5 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredUsers.map((u) => {
                const hasDevice = !!u.boundDeviceId;
                const isPreset = u.id.startsWith('cmu') || u.id.startsWith('usr-admin-') || u.id.startsWith('usr-receiver-') || u.id.startsWith('usr-sender-');

                return (
                  <tr key={u.id || u.email} className="hover:bg-[#F8FAF9] transition-colors">
                    {/* Username */}
                    <td className="py-3.5 pl-6 font-bold text-[#202833] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#F4F7F5] border border-[#CBD5E1] flex items-center justify-center font-bold text-[#64748B] text-[11px]">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span>{u.username}</span>
                        {isPreset && (
                          <span className="block text-[9px] text-slate-400 font-normal">System Authorized</span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 font-mono text-[#64748B] font-semibold">{u.email}</td>

                    {/* Assigned Station Badge */}
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Branch / School */}
                    <td className="py-3.5 text-slate-700">
                      <div className="font-semibold">{(u as any).branch || 'Addis Ababa'}</div>
                      <div className="text-[10px] text-slate-400">{(u as any).school || 'YMS'}</div>
                    </td>

                    {/* Terminal ID */}
                    <td className="py-3.5 font-mono text-[11px]">
                      {hasDevice ? (
                        <span className="text-[#2A5202] bg-[#9EE617]/15 px-2 py-0.5 rounded border border-[#9EE617]/30 font-bold">
                          {u.boundDeviceId?.substring(0, 16)}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] italic">Unbound Terminal</span>
                      )}
                    </td>

                    {/* Change Role Selector */}
                    <td className="py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#202833] focus:border-[#9EE617]"
                      >
                        <option value="SENDER">SENDER</option>
                        <option value="RECEIVER">RECEIVER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                      </select>
                    </td>

                    {/* Actions: Edit, Lock, Unlock, Delete for ALL & EACH operator */}
                    <td className="py-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 text-[11px] font-bold"
                          title="Edit user details & role"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>

                        {/* 2. Lock */}
                        <button
                          type="button"
                          onClick={() => handleLockUser(u)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 text-[11px] font-bold ${
                            hasDevice
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                          title="Lock workstation terminal"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span className="hidden lg:inline">Lock</span>
                        </button>

                        {/* 3. Unlock */}
                        <button
                          type="button"
                          onClick={() => handleUnlockUser(u)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 text-[11px] font-bold ${
                            !hasDevice
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                          title="Unlock & unbind workstation terminal"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="hidden lg:inline">Unlock</span>
                        </button>

                        {/* 4. Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                          title="Delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISION USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Provision Operator Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Full Name / Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Samuel Desta"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="samuel@gmail.com"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#202833] font-bold mb-1">Station Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#202833]"
                  >
                    <option value="SENDER">Sender Station</option>
                    <option value="RECEIVER">Receiver Station</option>
                    <option value="ADMIN">Admin Station</option>
                    <option value="SUPER_ADMIN">Super Admin Station</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#202833] font-bold mb-1">Branch</label>
                  <select
                    value={newBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#202833]"
                  >
                    {DEFAULT_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Assigned School</label>
                <select
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#202833]"
                >
                  {(BRANCH_SCHOOL_MAP[newBranch] || ['YMS']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#202833]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Standard password is set to <strong className="text-black">12345678</strong> for universal access
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#9EE617]/10 border border-[#9EE617]/30 text-[11px] text-[#2A5202] leading-relaxed">
                <Shield className="w-3.5 h-3.5 text-[#4D8A07] inline mr-1" />
                Account will be provisioned immediately and can sign in with their email and password 12345678.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-xs shadow-sm cursor-pointer"
                >
                  Provision User Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModalOpen && editUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit User Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Full Name / Username</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#202833] font-bold mb-1">Station Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#202833]"
                  >
                    <option value="SENDER">Sender Station</option>
                    <option value="RECEIVER">Receiver Station</option>
                    <option value="ADMIN">Admin Station</option>
                    <option value="SUPER_ADMIN">Super Admin Station</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#202833] font-bold mb-1">Branch</label>
                  <select
                    value={editBranch}
                    onChange={(e) => handleEditBranchChange(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#202833]"
                  >
                    {DEFAULT_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Assigned School</label>
                <select
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#202833]"
                >
                  {(BRANCH_SCHOOL_MAP[editBranch] || ['YMS']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#202833]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Universal operator master password is 12345678
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm cursor-pointer"
                >
                  Save Account Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
