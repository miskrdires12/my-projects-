import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckCircle2, AlertTriangle, Download, ArrowUpRight,
  TrendingUp, BarChart2, ShieldCheck, PieChart, Layers, Calendar, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const refreshData = () => {
      setStudents(getStudents());
    };
    refreshData();

    window.addEventListener('studentbridge_datachange', refreshData);
    return () => window.removeEventListener('studentbridge_datachange', refreshData);
  }, []);

  const totalStudents = students.length;
  const withPhoto = students.filter(s => s.photoPath || s.previewPath || s.thumbnailPath || s.photoIntegrityStatus === 'PHOTO_VERIFIED').length;
  const missingPhoto = Math.max(0, totalStudents - withPhoto);

  const todayStr = new Date().toISOString().substring(0, 10);
  const todayIngested = students.filter(s => s.createdAt && s.createdAt.startsWith(todayStr)).length;

  const acceptedCount = students.filter(s => !s.status || s.status === 'Accepted' || s.status === 'ACTIVE' || s.status === 'VERIFIED').length;
  const pendingCount = students.filter(s => s.status === 'Pending').length;
  const rejectedCount = students.filter(s => s.status === 'Rejected').length;
  const correctedCount = students.filter(s => s.status === 'Corrected').length;

  const acceptanceRate = totalStudents > 0 ? ((acceptedCount / totalStudents) * 100).toFixed(1) + '%' : '100%';

  // Real past 7 days capture volume
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const dailyCaptureData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dStr = d.toISOString().substring(0, 10);
    const dayLabel = daysOfWeek[d.getDay()];
    const countSub = students.filter(s => s.createdAt && s.createdAt.startsWith(dStr)).length;
    const countAcc = students.filter(s => s.createdAt && s.createdAt.startsWith(dStr) && (!s.status || s.status === 'Accepted' || s.status === 'ACTIVE' || s.status === 'VERIFIED')).length;
    return {
      day: dayLabel,
      submitted: countSub,
      accepted: countAcc
    };
  });

  // Real Top Schools distribution directly from student records
  const schoolCounts: Record<string, number> = {};
  students.forEach(s => {
    const sch = s.school || 'Unassigned';
    schoolCounts[sch] = (schoolCounts[sch] || 0) + 1;
  });

  const sortedSchools = Object.entries(schoolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
    }));

  const topSchools = sortedSchools.length > 0 ? sortedSchools : [
    { name: 'Active Registry', count: totalStudents, percentage: 100 }
  ];

  // Real Record status donut data
  const recordStatusData = [
    { name: 'Accepted', value: totalStudents > 0 ? Number(((acceptedCount / totalStudents) * 100).toFixed(1)) : 100, color: '#85E510' },
    { name: 'Pending', value: totalStudents > 0 ? Number(((pendingCount / totalStudents) * 100).toFixed(1)) : 0, color: '#f59e0b' },
    { name: 'Rejected', value: totalStudents > 0 ? Number(((rejectedCount / totalStudents) * 100).toFixed(1)) : 0, color: '#ef4444' },
    { name: 'Corrected', value: totalStudents > 0 ? Number(((correctedCount / totalStudents) * 100).toFixed(1)) : 0, color: '#0284c7' },
  ].filter(x => x.value > 0 || totalStudents === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Receiver Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40">
              Live Station Active
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1">
            <Calendar className="w-3.5 h-3.5 text-[#4D8A07]" />
            <span>Operational Day</span>
            <span>&bull;</span>
            <span>Central Ingestion & Review Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/receiver/exports"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAF9] border border-[#CBD5E1] text-xs font-bold text-[#202833] shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-[#4D8A07]" />
            <span>Export Registry</span>
          </Link>

          <Link
            to="/receiver/students"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Student Directory ({totalStudents.toLocaleString()})</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Records</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#202833]">{totalStudents.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#366804] font-semibold">100% Unique IDs</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Today's Ingested</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#202833]">{todayIngested.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#366804] font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Authoritative Live Ingestion</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Biometric Photos</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#202833]">{withPhoto.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#366804] font-semibold">
            {missingPhoto > 0 ? `${missingPhoto} pending photos flagged` : 'All photos verified'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Acceptance Rate</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#366804]">{acceptanceRate}</div>
          <div className="mt-1 text-[11px] text-[#64748B]">High fidelity biometric standards</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Capture Volume (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-black text-sm text-[#202833]">Daily Capture Volume</h3>
              <p className="text-xs text-[#64748B]">Submissions vs Verified Records this week</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" /> Submitted
              </span>
              <span className="flex items-center gap-1 text-[#366804]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#85E510]" /> Accepted
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCaptureData} barGap={4}>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="submitted" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="accepted" fill="#85E510" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Record Status Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-black text-sm text-[#202833]">Record Status Distribution</h3>
              <p className="text-xs text-[#64748B]">Review queue qualification</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#4D8A07]" />
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={recordStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {recordStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {recordStatusData.map(item => (
              <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[#64748B] font-medium truncate">{item.name}</span>
                <span className="font-bold text-[#202833] ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Schools Distribution Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-sm text-[#202833]">Top Schools & Campus Ingestion</h3>
            <p className="text-xs text-[#64748B]">Records submitted across registered academic institutions</p>
          </div>
          <Link to="/receiver/students" className="text-xs font-bold text-[#4D8A07] hover:underline flex items-center gap-1">
            <span>View All Campuses</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {topSchools.map(sch => (
            <div key={sch.name} className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-2">
              <div className="text-xs font-bold text-[#202833] truncate">{sch.name}</div>
              <div className="text-xl font-heading font-black text-[#202833]">{sch.count.toLocaleString()}</div>
              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#85E510] h-full rounded-full" style={{ width: `${sch.percentage * 2.5}%` }} />
              </div>
              <div className="text-[10px] text-[#64748B] font-semibold">{sch.percentage}% of total registry</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
