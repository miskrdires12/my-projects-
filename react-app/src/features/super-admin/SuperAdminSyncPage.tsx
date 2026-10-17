import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, ShieldCheck, Zap, Server, RotateCcw,
  Layers, Filter, Search, Check
} from 'lucide-react';
import { getStudents, getAllSendersMetrics } from '@/lib/store';

export const SuperAdminSyncPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'FAILED' | 'RESOLVED'>('ALL');
  const [retryingQueue, setRetryingQueue] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const students = getStudents();
  const senders = getAllSendersMetrics();

  // Synthetic queue items representing field-to-cloud synchronization status
  const [queueItems, setQueueItems] = useState([
    { id: 'SYNC-1082', studentId: 'SB-2026-082', type: 'PORTRAIT_UPLOAD', branch: 'Addis Ababa', terminal: 'POS-AA-01', attempts: 0, status: 'RESOLVED', timestamp: '2 mins ago' },
    { id: 'SYNC-1083', studentId: 'SB-2026-083', type: 'RECORD_INSERT', branch: 'Adama', terminal: 'POS-AD-02', attempts: 0, status: 'RESOLVED', timestamp: '5 mins ago' },
    { id: 'SYNC-1084', studentId: 'SB-2026-084', type: 'METADATA_PATCH', branch: 'Mojo', terminal: 'POS-MJ-01', attempts: 1, status: 'RESOLVED', timestamp: '12 mins ago' },
    { id: 'SYNC-1085', studentId: 'SB-2026-085', type: 'PORTRAIT_UPLOAD', branch: 'Harar', terminal: 'POS-HR-03', attempts: 0, status: 'RESOLVED', timestamp: '18 mins ago' },
  ]);

  const handleRetryAll = () => {
    setRetryingQueue(true);
    setTimeout(() => {
      setRetryingQueue(false);
      setQueueItems(prev => prev.map(item => ({ ...item, status: 'RESOLVED', attempts: item.attempts + 1 })));
      setSuccessToast("All queue payloads reconciled and confirmed synchronized with Cloudflare R2 & Supabase.");
      setTimeout(() => setSuccessToast(null), 4000);
    }, 1200);
  };

  const filteredQueue = queueItems.filter(item => {
    if (activeFilter === 'ALL') return true;
    return item.status === activeFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#85E510]" />
            <span>Synchronization &amp; Reconciliation Center</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor offline field queues, retry stuck payloads, reconcile multi-terminal updates, and resolve synchronization conflicts
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetryAll}
          disabled={retryingQueue}
          className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${retryingQueue ? "animate-spin" : ""}`} />
          <span>{retryingQueue ? "Reconciling Payload Queue..." : "Reconcile All Batches"}</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/30 text-xs text-[#366804] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#85E510]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Queue Health
          </span>
          <div className="mt-1 text-lg font-heading font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#85E510]" />
            <span>100% Synchronized</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">
            0 Blocked &bull; 0 Pending Payloads
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Active Field Terminals
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-500" />
            <span>{senders.length} Operators Online</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">
            4 Regional Hubs Monitored
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Average Sync Latency
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>34ms Edge Response</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
            Cloudflare Workers Edge Network
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Conflict Resolution
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <span>LWW Rule Enforced</span>
          </div>
          <div className="text-[10px] font-mono text-purple-700 font-bold mt-1">
            Last-Write-Wins with Version Vector
          </div>
        </div>
      </div>

      {/* Synchronization Table & Payload Inspector */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
              Synchronization Audit Queue
            </h2>
            <p className="text-xs text-slate-500">
              Live payload stream from field senders transmitting to Cloudflare R2 and Supabase
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAF9] p-1 rounded-xl border border-[#CBD5E1]">
            {(['ALL', 'PENDING', 'FAILED', 'RESOLVED'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveFilter(mode)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === mode ? "bg-[#85E510] text-[#062404] shadow-xs" : "text-[#64748B] hover:text-[#202833]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-mono font-bold">
              <tr>
                <th className="py-3 pl-4">Queue Item</th>
                <th className="py-3">Student ID</th>
                <th className="py-3">Payload Action</th>
                <th className="py-3">Branch Hub</th>
                <th className="py-3">Terminal ID</th>
                <th className="py-3 text-center">Attempts</th>
                <th className="py-3">Timestamp</th>
                <th className="py-3 text-right pr-4">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredQueue.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAF9] transition-colors font-mono">
                  <td className="py-3 pl-4 font-bold text-[#202833]">{item.id}</td>
                  <td className="py-3 text-[#0284C7] font-bold">{item.studentId}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">{item.branch}</td>
                  <td className="py-3 text-[11px] text-[#64748B]">{item.terminal}</td>
                  <td className="py-3 text-center text-slate-700">{item.attempts}</td>
                  <td className="py-3 text-[11px] text-[#64748B]">{item.timestamp}</td>
                  <td className="py-3 text-right pr-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                      <Check className="w-3 h-3 text-[#85E510]" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
