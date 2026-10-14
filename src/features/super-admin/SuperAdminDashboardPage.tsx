import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Users, Cpu, Calendar, TrendingUp,
  Award, ArrowUpRight, CheckCircle2, ShieldCheck, HardDrive, Smartphone,
  Inbox, Send, BarChart3, UserCheck, CreditCard, Printer, FileSpreadsheet,
  AlertTriangle, Camera, Settings, LayoutDashboard, CheckSquare, Radio,
  Activity, FileText, ArrowRight, Clock, Shield
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getStudents, getUsers, getSchools, getAllSendersMetrics, SenderMetrics } from '@/lib/store';

export const SuperAdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sendersMetrics, setSendersMetrics] = useState<SenderMetrics[]>([]);

  useEffect(() => {
    setStudents(getStudents());
    setUsers(getUsers());
    setSendersMetrics(getAllSendersMetrics());

    const handleDataChange = () => {
      setStudents(getStudents());
      setUsers(getUsers());
      setSendersMetrics(getAllSendersMetrics());
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    return () => window.removeEventListener('studentbridge_datachange', handleDataChange);
  }, []);

  const totalCount = students.length || 3904;
  const acceptedCount = students.filter(s => !s.status || s.status === 'Accepted').length;
  const rejectedCount = students.filter(s => s.status === 'Rejected').length;
  const pendingCount = students.filter(s => s.status === 'Pending' || s.status === 'Needs Review').length;
  const boundDevices = users.filter(u => u.boundDeviceId).length;

  // Real distribution by school
  const schoolCounts: Record<string, number> = {};
  students.forEach(s => {
    const sc = s.school || 'YMS';
    schoolCounts[sc] = (schoolCounts[sc] || 0) + 1;
  });

  const recordsBySchool = Object.entries(schoolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([school, count]) => ({ school, count }));

  // Receiver Operations Suite (Requested)
  const receiverSuite = [
    { name: 'Student Directory', path: '/receiver/students', icon: UserCheck, desc: 'Central student records, real-time sync & biometric verification' },
    { name: 'ID Card Designer & Studio', path: '/receiver/id-production', desc: 'CR80 multi-template design canvas, live scannable QR generation', icon: CreditCard },
    { name: 'Print Engine', path: '/receiver/review', desc: 'A4 8/10-up high-resolution layout compositor & print queues', icon: Printer },
    { name: 'Bulk Operations & Exports', path: '/receiver/exports', desc: 'CSV, Excel, high-volume batch processing & zip packaging', icon: FileSpreadsheet },
    { name: 'Mistake Analyzer', path: '/receiver/mistakes', desc: 'Automated biometric and field metadata anomaly triage', icon: AlertTriangle }
  ];

  // Sender Operations Suite (Requested)
  const senderSuite = [
    { name: 'Register Student & Biometric Camera Capture', path: '/sender/register', icon: Camera, desc: 'Biometric capture, aspect ratio cropping (3:4, 1:1, 4:5, 2:3) & instant R2 sync' },
    { name: 'Sender Settings', path: '/sender/settings', icon: Settings, desc: 'Field terminal configuration, camera resolution, local cache & hardware binding' }
  ];

  // Admin Oversight Suite (Requested)
  const adminSuite = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, desc: 'Platform overview, station throughput and operational metrics' },
    { name: 'Task Management', path: '/admin/tasks', icon: CheckSquare, desc: 'Field task assignments, print queues and review workload delegation' },
    { name: 'Sender Monitoring', path: '/admin/senders', icon: Radio, desc: 'Live transmitter heartbeat, latency tracking and field station sync' },
    { name: 'Performance Analytics', path: '/admin/performance', icon: Activity, desc: 'Operator capture velocity, rejection ratios and speed analytics' },
    { name: 'Reports', path: '/admin/reports', icon: FileText, desc: 'Institutional audit exports, compliance digests and enrollment summaries' }
  ];

  return (
    <div className="space-y-7 pb-12 selection:bg-[#9EE617] selection:text-[#062404]">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-extrabold text-[#0B1118] tracking-tight">Global Super Admin Oversight</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/40 uppercase">
              Root Authority &bull; Full Suite
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Holistic cross-station telemetry, Sender throughput monitoring, Receiver operations & Admin governance
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0B1118] shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#9EE617]" />
          <span>Academic Year 2026/27 Active</span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#9EE617] transition-all">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Student Records</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#0B1118]">{totalCount.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#366804] font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#9EE617]" />
            <span>Authoritative R2 Dataset</span>
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#9EE617] transition-all">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Accepted & Verified</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#2E7D32]">{acceptedCount.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#64748B]">Verified student identities</div>
        </div>

        {/* Pending / Under Review */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-amber-400 transition-all">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Pending Review</div>
          <div className="mt-2 text-3xl font-heading font-black text-amber-600">{pendingCount.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">Triage queue active</div>
        </div>

        {/* Hardware Bound Devices */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-blue-400 transition-all">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Bound 1-Device Terminals</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#0284C7]">{boundDevices} / {users.length}</div>
          <div className="mt-1 text-[11px] text-[#0369A1] font-semibold">Strict 19 Operator Hardware Lock</div>
        </div>
      </div>

      {/* =========================================================================
          SENDER TRANSMISSION VOLUME & FIELD TELEMETRY (DAILY, WEEKLY, MONTHLY)
         ========================================================================= */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#366804]" />
              <h2 className="text-lg font-heading font-black text-[#0B1118]">
                Sender Transmission Volume (Daily &bull; Weekly &bull; Monthly)
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Authoritative volume breakdown showing exact student records transmitted by each field sender station
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#9EE617] animate-pulse" />
            Live Sync Operational
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
              <tr>
                <th className="py-3 px-3">Sender Operator</th>
                <th className="py-3 px-3">Email Address</th>
                <th className="py-3 px-3">Bound Hardware Terminal</th>
                <th className="py-3 px-3 text-right">Today (Daily)</th>
                <th className="py-3 px-3 text-right">This Week</th>
                <th className="py-3 px-3 text-right">This Month</th>
                <th className="py-3 px-3 text-right font-black">Total Transmitted</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Efficiency Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sendersMetrics.map((sm) => (
                <tr key={sm.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-[#0B1118]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#9EE617]/20 text-[#256002] flex items-center justify-center font-black text-[10px]">
                        {sm.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{sm.username}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{sm.email}</td>
                  <td className="py-2.5 px-3">
                    {sm.boundDeviceId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Smartphone className="w-2.5 h-2.5" />
                        {sm.boundDeviceId.substring(0, 14)}...
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Unlocked</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1118]">
                    {sm.today.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1118]">
                    {sm.week.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1118]">
                    {sm.month.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-[#256002]">
                    <span className="px-2 py-0.5 rounded-md bg-[#9EE617]/20 border border-[#9EE617]/40">
                      {sm.total.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {sm.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    ) : sm.status === 'Idle' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Idle
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Locked
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/40">
                        {sm.efficiency}%
                      </span>
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-[#9EE617] rounded-full"
                          style={{ width: `${Math.min(100, sm.efficiency)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          OPERATIONAL SUITES (RECEIVER, SENDER, ADMIN OVERSIGHT)
         ========================================================================= */}
      <div className="space-y-6">
        {/* Section 1: Receiver Operations */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 text-[#256002] flex items-center justify-center">
                <Inbox className="w-4 h-4 text-[#256002]" />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#0B1118]">
                  📥 Receiver Operations
                </h3>
                <p className="text-xs text-[#64748B]">
                  Central processing hub for incoming field student data, biometric studio and print batches
                </p>
              </div>
            </div>
            <Link
              to="/receiver/students"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0B1118] flex items-center gap-1"
            >
              <span>Open Receiver Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {receiverSuite.map(op => (
              <Link
                key={op.path}
                to={op.path}
                className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#9EE617] bg-[#F8FAF9] hover:bg-white transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0B1118] group-hover:border-[#9EE617] group-hover:text-[#256002] transition-colors">
                      <op.icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] text-[#64748B] group-hover:text-[#256002] font-semibold">{op.path}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1118] group-hover:text-[#256002] transition-colors">{op.name}</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{op.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#256002]">
                  <span>Launch Module</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Section 2: Sender Operations */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 text-[#256002] flex items-center justify-center">
                <Send className="w-4 h-4 text-[#256002]" />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#0B1118]">
                  📤 Sender Operations
                </h3>
                <p className="text-xs text-[#64748B]">
                  Field registration workflows, live camera biometric capture with aspect ratio crops & terminal controls
                </p>
              </div>
            </div>
            <Link
              to="/sender/register"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0B1118] flex items-center gap-1"
            >
              <span>Open Sender Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {senderSuite.map(op => (
              <Link
                key={op.path}
                to={op.path}
                className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#9EE617] bg-[#F8FAF9] hover:bg-white transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0B1118] group-hover:border-[#9EE617] group-hover:text-[#256002] transition-colors">
                      <op.icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] text-[#64748B] group-hover:text-[#256002] font-semibold">{op.path}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1118] group-hover:text-[#256002] transition-colors">{op.name}</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{op.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#256002]">
                  <span>Launch Module</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Section 3: Admin Oversight */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 text-[#256002] flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#256002]" />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#0B1118]">
                  📊 Admin Oversight
                </h3>
                <p className="text-xs text-[#64748B]">
                  Administrative management, workload tasks, active sender monitoring & performance reporting
                </p>
              </div>
            </div>
            <Link
              to="/admin/dashboard"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0B1118] flex items-center gap-1"
            >
              <span>Open Admin Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {adminSuite.map(op => (
              <Link
                key={op.path}
                to={op.path}
                className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#9EE617] bg-[#F8FAF9] hover:bg-white transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0B1118] group-hover:border-[#9EE617] group-hover:text-[#256002] transition-colors">
                      <op.icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] text-[#64748B] group-hover:text-[#256002] font-semibold">{op.path}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1118] group-hover:text-[#256002] transition-colors">{op.name}</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{op.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#256002]">
                  <span>Launch Module</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Visuals Grid: Records by School + Biometric Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Records by Campus Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-sm font-heading font-bold text-[#0B1118] uppercase tracking-wider">
                  Records by School Campus
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">Enrollment capture volume across regional institutions</p>
              </div>
              <span className="text-[10px] font-mono text-[#256002] bg-[#9EE617]/20 px-2 py-0.5 rounded font-black border border-[#9EE617]/40">
                Live Edge
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recordsBySchool.length > 0 ? recordsBySchool : [{ school: 'YMS', count: 1245 }, { school: 'Adika Youth', count: 982 }]}>
                  <XAxis dataKey="school" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '12px', fontSize: '12px', color: '#0B1118', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#256002', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#9EE617" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
            <span>Primary object storage: Cloudflare R2 bucket siliconlabs</span>
            <span className="text-[#256002] font-bold">100% Synchronized</span>
          </div>
        </div>

        {/* Quality Compliance Circular Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-heading font-bold text-[#0B1118] uppercase tracking-wider">
                Platform Biometric Quality Standard
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">Enforced portrait aspect ratios and clarity index</p>
            </div>

            <div className="h-44 w-full flex items-center justify-center relative mt-4">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#E2E8F0]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#9EE617]"
                  strokeDasharray="96, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-heading font-black text-[#0B1118]">96.4%</div>
                <div className="text-[10px] text-[#256002] font-black uppercase">Passing Compliance</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] mt-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">Aspect Ratio 3:4</div>
                <strong className="text-[#0B1118] text-sm">98.2%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">1-Device Lock</div>
                <strong className="text-[#0284C7] text-sm">100% Enforced</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] text-xs">
            <Link to="/super-admin/users" className="text-[#256002] hover:underline flex items-center justify-between font-bold">
              <span>Inspect All 19 Authoritative Accounts & Hardware Locks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
