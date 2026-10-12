import React, { useState, useEffect } from 'react';
import { Users, Smartphone, Plus, CheckCircle2, Shield, Search, UserPlus, X, RefreshCw, Activity } from 'lucide-react';
import { getUsers, resetUserHardwareLock, getAllSendersMetrics, SenderMetrics, addUser } from '@/lib/store';

// Campus allocation mapping for authentic Ethiopian institutions
const OPERATOR_CAMPUS_MAP: Record<string, string> = {
  miskrdires11: 'YMS',
  mebratadony: 'Adika Youth',
  yohannes: 'School of America',
  etsubmolla: 'Warka',
  adoni: 'Ferway',
  biruk: 'Yacine',
  zemichael: 'Debebech',
  abeni1: 'High Tech',
  dani: 'YMS',
  dagim: 'Mojo',
  kal: 'Adika Youth',
  rob: 'School of America',
  beki: 'Ferway',
  aman: 'Warka',
  henok: 'Yacine',
  yonas: 'Debebech',
  sol: 'High Tech'
};

export const AdminSendersPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SenderMetrics[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('12345678');
  const [inviteRole, setInviteRole] = useState<'SENDER' | 'RECEIVER' | 'ADMIN'>('SENDER');
  const [inviteSchool, setInviteSchool] = useState('YMS');

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

  const handleResetLock = (sender: SenderMetrics) => {
    resetUserHardwareLock(sender.id);
    resetUserHardwareLock(sender.username);
    resetUserHardwareLock(sender.email);
    setToastMessage(`Hardware lock reset for operator ${sender.username} (${sender.email}). Bound terminal cleared.`);
    loadSenders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const cleanUsername = inviteName.trim().toLowerCase().replace(/\s+/g, '');
    addUser({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: inviteEmail.trim(),
      password: invitePassword.trim() || '12345678',
      role: inviteRole,
      boundDeviceId: null,
      school: inviteSchool,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      workSessionCount: 0
    });
    setToastMessage(`Operator "${cleanUsername}" successfully provisioned with role [${inviteRole}] and credentials.`);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('12345678');
    setInviteRole('SENDER');
    loadSenders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = metrics.filter(s => {
    const term = search.toLowerCase();
    const campus = OPERATOR_CAMPUS_MAP[s.username.toLowerCase()] || 'YMS';
    return (
      !search ||
      s.username.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      campus.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Invite Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">Sender Monitoring & Workforce</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Supervise field data collection operators, institutional school allocations, quality efficiency rates, and 1-device terminal bindings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSenders}
            className="p-2.5 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            title="Refresh operator telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Invite Sender Operator</span>
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
          <span>Active Workforce: <strong className="text-[#202833]">{filtered.length} Field Senders</strong></span>
          <span className="h-3 w-px bg-slate-300" />
          <span>Bound Workstations: <strong className="text-[#202833]">{filtered.filter(s => s.boundDeviceId).length} Locked</strong></span>
        </div>
      </div>

      {/* Senders Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Operator Name</th>
                <th className="py-3.5">Email Address</th>
                <th className="py-3.5">Assigned Campus</th>
                <th className="py-3.5 text-center">Status</th>
                <th className="py-3.5 text-center">Efficiency Rating</th>
                <th className="py-3.5 text-right">Volume</th>
                <th className="py-3.5">Hardware Terminal (1-Device)</th>
                <th className="py-3.5 text-right pr-6">Terminal Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((s) => {
                const campus = OPERATOR_CAMPUS_MAP[s.username.toLowerCase()] || 'YMS';
                return (
                  <tr key={s.id || s.email} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3.5 pl-6 font-bold text-[#202833]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#85E510]/20 text-[#366804] flex items-center justify-center font-black text-[10px]">
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{s.username}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-[#64748B]">{s.email}</td>
                    <td className="py-3.5 font-semibold text-[#202833]">{campus}</td>
                    <td className="py-3.5 text-center">
                      {s.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      ) : s.status === 'Idle' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Idle
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Locked
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40">
                          {s.efficiency}%
                        </span>
                        <div className="w-16 bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#85E510] h-full rounded-full"
                            style={{ width: `${Math.min(100, s.efficiency)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-[#202833]">
                      {s.total.toLocaleString()} records
                    </td>
                    <td className="py-3.5">
                      {s.boundDeviceId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Smartphone className="w-2.5 h-2.5" />
                          {s.boundDeviceId.substring(0, 14)}...
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Unlocked</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right pr-6">
                      <button
                        type="button"
                        onClick={() => handleResetLock(s)}
                        className="px-2.5 py-1 rounded-lg bg-[#F8FAF9] hover:bg-amber-50 text-[#202833] hover:text-amber-800 border border-[#CBD5E1] text-[11px] font-bold transition-all cursor-pointer"
                        title="Clear 1-device lock to allow pairing on a new device"
                      >
                        Reset Lock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Invite Sender Operator</span>
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Operator Username</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. dawitalemu"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Operator Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="dawit@gmail.com"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Assigned Operational Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#202833]"
                >
                  <option value="SENDER">Field Sender (Registration & Photo Capture)</option>
                  <option value="RECEIVER">Receiver (Directory, 8-Up Print & Badges)</option>
                  <option value="ADMIN">Admin (Supervision & Telemetrics)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Terminal Password</label>
                <input
                  type="text"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Password (default: 12345678)"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Assigned School Campus</label>
                <select
                  value={inviteSchool}
                  onChange={(e) => setInviteSchool(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="YMS">YMS (Addis Ababa)</option>
                  <option value="Adika Youth">Adika Youth (Addis Ababa)</option>
                  <option value="School of America">School of America (Addis Ababa)</option>
                  <option value="Ferway">Ferway (Addis Ababa)</option>
                  <option value="Warka">Warka (Addis Ababa)</option>
                  <option value="Yacine">Yacine (Adama)</option>
                  <option value="Debebech">Debebech (Adama)</option>
                  <option value="High Tech">High Tech (Harar)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-xs cursor-pointer"
                >
                  Dispatch Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
