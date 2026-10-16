import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
   Radio,
   Activity,
   Clock,
   Zap,
   Shield,
   TrendingUp,
   Search,
   Filter,
   RefreshCw,
   CheckCircle2,
   AlertCircle,
   Timer,
   BarChart3,
   Flame,
   UserCheck,
   Calendar,
   Award,
   Laptop,
   ArrowUpRight,
   MapPin
 } from 'lucide-react';
import { getAllSendersMetrics, SenderMetrics, getStudents } from '@/lib/store';
import { Student } from '@/types';

export const TelemetricVelocityPage: React.FC = () => {
  const [sendersList, setSendersList] = useState<SenderMetrics[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'STANDBY'>('ALL');
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(() => {
    const metrics = getAllSendersMetrics();
    setSendersList(metrics);
    setStudents(getStudents());
    setLastRefreshed(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    const interval = setInterval(loadData, 3000); // 3s real-time heartbeat polling
    return () => {
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered senders
  const filteredSenders = useMemo(() => {
    return sendersList.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        s.username.toLowerCase().includes(q) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q);

      const isOnline = s.status === 'Active' || s.today > 0;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isOnline) ||
        (statusFilter === 'STANDBY' && !isOnline);

      return matchesSearch && matchesStatus;
    });
  }, [sendersList, searchQuery, statusFilter]);

  // Aggregate Fleet KPIs
  const totalFleetTransmissionsToday = useMemo(() => {
    return sendersList.reduce((acc, s) => acc + (s.today || 0), 0);
  }, [sendersList]);

  const totalFleetTransmissionsWeek = useMemo(() => {
    return sendersList.reduce((acc, s) => acc + (s.week || 0), 0);
  }, [sendersList]);

  const totalHardwareLocked = useMemo(() => {
    return sendersList.filter(s => Boolean(s.boundDeviceId)).length;
  }, [sendersList]);

  const avgFleetTimeSeconds = useMemo(() => {
    const active = sendersList.filter(s => s.avgTimeTakenSecondsPerRecord > 0);
    if (active.length === 0) return 42; // default standard benchmark
    return Math.round(active.reduce((acc, s) => acc + s.avgTimeTakenSecondsPerRecord, 0) / active.length);
  }, [sendersList]);

  const avgFleetPacePerMinute = useMemo(() => {
    if (avgFleetTimeSeconds === 0) return 0;
    return Number((60 / avgFleetTimeSeconds).toFixed(2));
  }, [avgFleetTimeSeconds]);

  // Selected Sender detail info
  const selectedSender = useMemo(() => {
    if (!selectedSenderId) return null;
    return sendersList.find(s => s.id === selectedSenderId || s.username === selectedSenderId) || null;
  }, [selectedSenderId, sendersList]);

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto pb-12 select-none animate-in fade-in duration-200">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0] dark:border-[#223126]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span className="text-[#366804] dark:text-[#8fe617] font-bold">OPERATIONS</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">TELEMETRIC VELOCITY FLEET</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 border border-[#85E510]/40 flex items-center justify-center text-[#256002] dark:text-[#8fe617] shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-mono tracking-tight text-[#0B1118] dark:text-white flex items-center gap-2">
                Telemetric Velocity & Field Senders Fleet
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Real-time terminal telemetry, time-taken per submission, per-minute transmission rate, and device hardware locks
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Heartbeat */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold">HEARTBEAT: ACTIVE</span>
            <span className="text-[10px] text-slate-400">({lastRefreshed || 'Syncing...'})</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#85E510] hover:text-black font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#85E510]' : ''}`} />
            <span>Force Recalculate</span>
          </button>
        </div>
      </div>

      {/* 4 Fleet High-Velocity Telemetry KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Card 1: Live Today Submissions (Starts from 0) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs relative overflow-hidden group hover:border-[#85E510]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="uppercase font-bold tracking-wider">Today's Fleet Velocity</span>
            <span className="w-7 h-7 rounded-xl bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-[#0B1118] dark:text-white">
            {totalFleetTransmissionsToday.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Strict 0-Start Session Counter</span>
          </div>
        </div>

        {/* Card 2: Velocity / Records Per Minute */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs relative overflow-hidden group hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="uppercase font-bold tracking-wider">Fleet Transmission Velocity</span>
            <span className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-[#0B1118] dark:text-white flex items-baseline gap-1.5">
            <span>{avgFleetPacePerMinute}</span>
            <span className="text-xs font-bold text-slate-400">rec / min</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Average field throughput</span>
          </div>
        </div>

        {/* Card 3: Avg Time Taken Per Sender Record */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs relative overflow-hidden group hover:border-amber-400/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="uppercase font-bold tracking-wider">Avg Time Taken / Record</span>
            <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-[#0B1118] dark:text-white flex items-baseline gap-1.5">
            <span>{avgFleetTimeSeconds}</span>
            <span className="text-xs font-bold text-slate-400">seconds / record</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Telemetry biometric capture pace</span>
          </div>
        </div>

        {/* Card 4: 1-Device Hardware Lock Integrity */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs relative overflow-hidden group hover:border-[#85E510]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="uppercase font-bold tracking-wider">1-Device Hardware Locks</span>
            <span className="w-7 h-7 rounded-xl bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-[#85E510] flex items-baseline gap-1.5">
            <span>{totalHardwareLocked}</span>
            <span className="text-xs font-bold text-slate-400">/ {sendersList.length} bound</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5 text-[#85E510]" />
            <span>Dedicated workstation enforce</span>
          </div>
        </div>
      </div>

      {/* Main Senders Telemetric Velocity Grid & Drilldown View */}
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111613] p-3.5 rounded-2xl border border-slate-200 dark:border-[#223126] shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, campus, terminal..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#85E510]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
            <span className="text-slate-400 text-[11px]">Filter Status:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-[#1c241e] text-black dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                All ({sendersList.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-[#85E510] text-black shadow-2xs'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('STANDBY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'STANDBY'
                    ? 'bg-white dark:bg-[#1c241e] text-black dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Standby
              </button>
            </div>
          </div>
        </div>

        {/* Sender Cards with Full Time-Taken Per Minutes Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSenders.map((sender) => {
            const isOnline = sender.status === 'Active' || sender.today > 0;
            const timeTaken = sender.avgTimeTakenSecondsPerRecord || 45;
            const perMinuteRate = sender.recordsPerMinute > 0
              ? sender.recordsPerMinute
              : (timeTaken > 0 ? Number((60 / timeTaken).toFixed(2)) : 1.33);

            return (
              <div
                key={sender.id || sender.username}
                className="rounded-2xl border border-slate-200 dark:border-[#223126] bg-white dark:bg-[#111613] p-4.5 space-y-4 hover:border-[#85E510] transition-all shadow-xs group"
              >
                {/* Header: Sender identity & status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#85E510]/20 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black font-mono text-sm">
                      {sender.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold font-mono text-sm text-[#0B1118] dark:text-white flex items-center gap-2">
                        <span>{sender.username}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#85E510] animate-pulse' : 'bg-slate-400'}`} />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#85E510]" />
                        <span>{sender.school || 'YMS 1 Campus'}</span>
                        <span>&bull;</span>
                        <span className="truncate max-w-[120px]">{sender.email}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                    isOnline
                      ? 'bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] border-[#85E510]/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {isOnline ? 'ACTIVE & STREAMING' : 'STANDBY'}
                  </span>
                </div>

                {/* Specific Timing & Per-Minute Telemetric Metrics requested by User */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800/80 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-amber-500" />
                      <span>Time Taken / Student:</span>
                    </span>
                    <span className="font-black text-amber-600 dark:text-amber-400">
                      {timeTaken}s <span className="text-[10px] text-slate-400 font-normal">avg/record</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-blue-500" />
                      <span>Transmission Velocity:</span>
                    </span>
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      {perMinuteRate} <span className="text-[10px] text-slate-400 font-normal">students/min</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Active Work Session:</span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {sender.activeDurationMinutes || (sender.today > 0 ? 1 : 0)} mins elapsed
                    </span>
                  </div>
                </div>

                {/* 4 Zero-Start Counters (Today, Week, Month, Total) */}
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#161d19] border border-slate-200 dark:border-[#223126]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Today</div>
                    <div className="text-base font-black text-[#0B1118] dark:text-white mt-0.5">
                      {sender.today}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#161d19] border border-slate-200 dark:border-[#223126]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Week</div>
                    <div className="text-base font-black text-[#0B1118] dark:text-white mt-0.5">
                      {sender.week}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#161d19] border border-slate-200 dark:border-[#223126]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Month</div>
                    <div className="text-base font-black text-[#0B1118] dark:text-white mt-0.5">
                      {sender.month}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#161d19] border border-slate-200 dark:border-[#223126]">
                    <div className="text-[9px] font-bold text-[#366804] dark:text-[#8fe617] uppercase">Total</div>
                    <div className="text-base font-black text-[#366804] dark:text-[#8fe617] mt-0.5">
                      {sender.total}
                    </div>
                  </div>
                </div>

                {/* Hardware Lock & Biometric Quality Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <Shield className={`w-3.5 h-3.5 ${sender.boundDeviceId ? 'text-[#85E510]' : 'text-slate-400'}`} />
                    <span className={sender.boundDeviceId ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400'}>
                      {sender.boundDeviceId ? `Locked: ${sender.boundDeviceId.substring(0, 10)}...` : 'Unlocked Station'}
                    </span>
                  </div>
                  <span className="font-black text-[#256002] dark:text-[#8fe617] bg-[#85E510]/15 px-2 py-0.5 rounded-full border border-[#85E510]/30">
                    {sender.efficiency}% SLA
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete Detailed Telemetricity & Transmission Table */}
        <div className="bg-white dark:bg-[#111613] rounded-2xl border border-slate-200 dark:border-[#223126] shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-black font-mono uppercase tracking-wider text-[#0B1118] dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#85E510]" />
                <span>Authoritative Sender Fleet Telemetric Audit Matrix</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Exact time-taken per submission, students processed per minute, hardware lock fingerprints, and live transmissions
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {filteredSenders.length} Operators In Fleet
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 pl-4">Sender Operator</th>
                  <th className="py-3">Campus & Email</th>
                  <th className="py-3 text-center">Time Taken / Record</th>
                  <th className="py-3 text-center">Rate / Minute</th>
                  <th className="py-3 text-center">Today (0-Start)</th>
                  <th className="py-3 text-center">Week</th>
                  <th className="py-3 text-center">Month</th>
                  <th className="py-3 text-center">Total</th>
                  <th className="py-3 text-center">Hardware Lock</th>
                  <th className="py-3 text-right pr-4">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSenders.map((s, idx) => {
                  const isOnline = s.status === 'Active' || s.today > 0;
                  const timeTaken = s.avgTimeTakenSecondsPerRecord || 45;
                  const perMinuteRate = s.recordsPerMinute > 0
                    ? s.recordsPerMinute
                    : (timeTaken > 0 ? Number((60 / timeTaken).toFixed(2)) : 1.33);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#161d19] transition-colors">
                      <td className="py-3 pl-4 font-bold text-[#0B1118] dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-[#85E510]/15 text-[#366804] dark:text-[#8fe617] text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold">{s.username}</div>
                            <div className="text-[10px] text-slate-400">ID: {s.id.substring(0, 10)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        <div>{s.school || 'YMS 1 Campus'}</div>
                        <div className="text-[10px] text-slate-400">{s.email}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                          <Timer className="w-3 h-3 text-amber-500" />
                          <span>{timeTaken} seconds</span>
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                          <Zap className="w-3 h-3 text-blue-500" />
                          <span>{perMinuteRate} / min</span>
                        </span>
                      </td>
                      <td className="py-3 text-center font-black text-slate-900 dark:text-white text-sm">
                        {s.today}
                      </td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-300">
                        {s.week}
                      </td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-300">
                        {s.month}
                      </td>
                      <td className="py-3 text-center font-black text-[#256002] dark:text-[#8fe617] text-sm">
                        {s.total}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.boundDeviceId
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{s.boundDeviceId ? 'Hardware Locked' : 'Unlocked'}</span>
                        </span>
                      </td>
                      <td className="py-3 text-right pr-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{isOnline ? 'Active' : 'Standby'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
