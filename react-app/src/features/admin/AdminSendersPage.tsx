import React, { useState, useEffect } from 'react';
import {
  Users, Smartphone, Plus, CheckCircle2, Shield, Search,
  UserPlus, X, RefreshCw, Trash2, Unlink, Lock, AlertTriangle
} from 'lucide-react';
import {
  getUsers, resetUserHardwareLock, getAllSendersMetrics,
  SenderMetrics, addUser, deleteUser, BRANCH_SCHOOL_MAP
} from '@/lib/store';

// Default campus mapping
const OPERATOR_CAMPUS_MAP: Record<string, string> = {
  miskrdires11: 'YMS 1',
  mebratadony: 'Adika Youth',
  yohannes: 'School of America 1',
  etsubmolla: 'Warka',
  adoni: 'Ferway',
  biruk: 'Yacine',
  zemichael: 'Debebech',
  abeni1: 'High Tech 1',
  dani: 'YMS 2',
  dagim: 'Mojo',
  kal: 'Adika Youth',
  rob: 'School of America 2',
  beki: 'Ferway',
  aman: 'Warka',
  henok: 'Yacine',
  yonas: 'Debebech',
  sol: 'High Tech 2'
};

export const AdminSendersPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SenderMetrics[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Provision Operator Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('12345678');
  const [inviteCampus, setInviteCampus] = useState('YMS 1');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<SenderMetrics | null>(null);

  const loadSenders = () => {
    const list = getAllSendersMetrics();
    setMetrics(list);
  };

  useEffect(() => {
    loadSenders();
    const handleSync = () => loadSenders();
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
    };
  }, []);

  // 1. Disconnect Device (Reset Hardware Lock)
  const handleDisconnectDevice = (sender: SenderMetrics) => {
    resetUserHardwareLock(sender.id);
    resetUserHardwareLock(sender.username);
    resetUserHardwareLock(sender.email);
    setToastMessage(`Hardware device disconnected for operator "${sender.username}". Terminal is now unbound.`);
    loadSenders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 2. Delete Operator
  const handleDeleteOperator = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    deleteUser(deleteTarget.username);
    deleteUser(deleteTarget.email);
    setToastMessage(`Operator "${deleteTarget.username}" permanently removed from the system.`);
    setDeleteTarget(null);
    loadSenders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Provision (Add) Operator
  const handleProvisionOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const cleanUsername = inviteName.trim().toLowerCase().replace(/\s+/g, '');
    addUser({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: inviteEmail.trim(),
      password: invitePassword.trim() || '12345678',
      role: 'SENDER',
      boundDeviceId: null,
      school: inviteCampus,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      workSessionCount: 0
    });
    setToastMessage(`Operator "${cleanUsername}" successfully provisioned and assigned to ${inviteCampus}.`);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('12345678');
    setInviteCampus('YMS 1');
    loadSenders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = metrics.filter(s => {
    const term = search.toLowerCase();
    const campus = s.school || OPERATOR_CAMPUS_MAP[s.username.toLowerCase()] || 'YMS 1';
    return (
      !search ||
      s.username.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      campus.toLowerCase().includes(term)
    );
  });

  // Flat list of available schools from store
  const allSchools = Object.values(BRANCH_SCHOOL_MAP).flat();

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
            Field Sender Operator Management
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Authoritative operator provisioning, 1-device hardware terminal locking, and device disconnection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSenders}
            className="p-2.5 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Refresh operators list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Operator</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Search Bar & Workforce Metrics */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operator by username, email, campus..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>

        <div className="text-xs text-[#64748B] flex items-center gap-4">
          <span>Total Operators: <strong className="text-[#202833]">{filtered.length} Field Senders</strong></span>
          <span className="h-3 w-px bg-slate-300" />
          <span>Locked to 1-Device: <strong className="text-[#202833]">{filtered.filter(s => s.boundDeviceId).length} Terminals</strong></span>
        </div>
      </div>

      {/* Senders Table (Status and Efficiency Rating removed per request) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Operator Name</th>
                <th className="py-3.5">Email Address</th>
                <th className="py-3.5">Assigned Campus</th>
                <th className="py-3.5 text-right">Volume Captured</th>
                <th className="py-3.5">Hardware Lock (1-Device)</th>
                <th className="py-3.5 text-right pr-6">Management Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((s) => {
                const campus = s.school || OPERATOR_CAMPUS_MAP[s.username.toLowerCase()] || 'YMS 1';
                return (
                  <tr key={s.id || s.email} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3.5 pl-6 font-bold text-[#202833]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#85E510]/20 text-[#366804] flex items-center justify-center font-black text-xs">
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{s.username}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-[#64748B]">{s.email}</td>
                    <td className="py-3.5 font-semibold text-[#202833]">{campus}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-[#202833]">
                      {s.total.toLocaleString()} records
                    </td>
                    <td className="py-3.5">
                      {s.boundDeviceId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Lock className="w-3 h-3 text-blue-600" />
                          <span>Locked: {s.boundDeviceId.substring(0, 12)}...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <span>Unlocked (No device bound)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Disconnect Device Button */}
                        <button
                          type="button"
                          onClick={() => handleDisconnectDevice(s)}
                          disabled={!s.boundDeviceId}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                            s.boundDeviceId
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 cursor-pointer shadow-xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                          title="Disconnect locked device to allow pairing on new terminal"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span>Disconnect Device</span>
                        </button>

                        {/* 2. Delete Operator Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Delete operator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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

      {/* Provision New Operator Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Provision Sender Operator</span>
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionOperator} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#202833] block mb-1">Operator Username</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. yohannes, etsubmolla"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] focus:border-[#85E510] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#202833] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="operator@gmail.com"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] focus:border-[#85E510] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#202833] block mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] focus:border-[#85E510] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#202833] block mb-1">Assigned School Campus</label>
                <select
                  value={inviteCampus}
                  onChange={(e) => setInviteCampus(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] focus:border-[#85E510] focus:outline-none font-semibold"
                >
                  {allSchools.map(sch => (
                    <option key={sch} value={sch}>{sch}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black shadow-xs transition-all cursor-pointer"
                >
                  Create & Bind Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-heading font-black text-base text-[#202833]">
                Delete Operator Account?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deleteTarget.username}</strong> ({deleteTarget.email})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
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
