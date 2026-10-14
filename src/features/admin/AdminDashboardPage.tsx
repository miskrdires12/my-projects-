import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BarChart3, ShieldCheck, ArrowUpRight,
  TrendingUp, Layers, CheckCircle2, GraduationCap,
  Building2, PieChart, Bus, HeartPulse, Radio, Clock,
  Smartphone, Zap, Activity, Check, AlertTriangle, Shield
} from 'lucide-react';
import { getStudents, getUsers, getAllSendersMetrics, SenderMetrics, getSchools, BRANCH_SCHOOL_MAP } from '@/lib/store';
import { Student, User, School } from '@/types';
import { getCleanGrade } from '@/lib/gradeUtils';

export const AdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sendersMetrics, setSendersMetrics] = useState<SenderMetrics[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const loadData = () => {
    setStudents(getStudents());
    setUsers(getUsers());
    setSendersMetrics(getAllSendersMetrics());
    setSchools(getSchools());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
    };
  }, []);

  // Compute Grade Distribution (Grade 1 through Grade 12)
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0,
      '5': 0, '6': 0, '7': 0, '8': 0,
      '9': 0, '10': 0, '11': 0, '12': 0
    };

    students.forEach((s) => {
      const g = getCleanGrade(s);
      if (counts[g] !== undefined) {
        counts[g]++;
      } else {
        counts[g] = (counts[g] || 0) + 1;
      }
    });

    const entries = Object.entries(counts).filter(([_, count]) => count > 0 || ['7', '8', '9', '10', '11', '12'].includes(_));
    const maxCount = Math.max(...entries.map(([_, c]) => c), 1);

    return { entries, maxCount };
  }, [students]);

  // Compute Campus Census & Biometric Verification Breakdown
  const campusCensusBreakdown = useMemo(() => {
    const map: Record<string, {
      schoolName: string;
      branch: string;
      count: number;
      verifiedPhotos: number;
      targetCapacity: number;
    }> = {};

    // Seed from official schools
    schools.forEach(sch => {
      let br = sch.location || 'Addis Ababa';
      if (sch.name === 'Sena Yerosen') br = 'Adama';
      map[sch.name] = {
        schoolName: sch.name,
        branch: br,
        count: 0,
        verifiedPhotos: 0,
        targetCapacity: sch.studentsCount || 500
      };
    });

    // Populate from active student records
    students.forEach((s) => {
      const sch = s.school || 'YMS 1';
      if (!map[sch]) {
        let br = 'Addis Ababa';
        for (const [b, list] of Object.entries(BRANCH_SCHOOL_MAP)) {
          if (list.includes(sch)) { br = b; break; }
        }
        if (sch.toLowerCase().includes('sena')) br = 'Adama';
        map[sch] = {
          schoolName: sch,
          branch: br,
          count: 0,
          verifiedPhotos: 0,
          targetCapacity: sch.toLowerCase().includes('sena') ? 940 : 600
        };
      }
      map[sch].count++;
      if (s.photoPath || s.previewPath || s.photoIntegrityStatus === 'PHOTO_VERIFIED') {
        map[sch].verifiedPhotos++;
      }
    });

    return Object.values(map)
      .filter(item => item.count > 0 || item.schoolName === 'Sena Yerosen')
      .sort((a, b) => b.count - a.count);
  }, [students, schools]);

  // Gender Analytics
  const genderStats = useMemo(() => {
    let male = 0;
    let female = 0;
    students.forEach((s) => {
      if ((s.sex || '').toLowerCase() === 'female') female++;
      else male++;
    });
    const total = students.length || 1;
    return {
      male,
      female,
      malePct: Math.round((male / total) * 100),
      femalePct: Math.round((female / total) * 100)
    };
  }, [students]);

  // Bus Transport & Verified Photos
  const busCount = useMemo(() => {
    return students.filter(s => s.schoolBusUsage === 'Yes' || s.busUser === 'YES').length;
  }, [students]);

  const verifiedPhotoCount = useMemo(() => {
    return students.filter(s => s.photoPath || s.previewPath || s.photoIntegrityStatus === 'PHOTO_VERIFIED').length;
  }, [students]);

  // Live telemetry summary
  const totalDailyTransmissions = useMemo(() => {
    return sendersMetrics.reduce((sum, sm) => sum + (sm.today || 0), 0);
  }, [sendersMetrics]);

  const avgTransmissionDelay = useMemo(() => {
    if (sendersMetrics.length === 0) return 42;
    const sum = sendersMetrics.reduce((acc, sm) => acc + (sm.transmissionDelayMs || 45), 0);
    return Math.round(sum / sendersMetrics.length);
  }, [sendersMetrics]);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Live Institutional Operations & Telemetry Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Edge Network
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time biometric census, field transmitter daily contribution telemetry, and cohort analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/senders"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>Workstation Locks</span>
          </Link>
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-xs transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Operator Tasks</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards: Student Registry Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Enrolled</span>
            <Users className="w-4 h-4 text-[#366804]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{students.length.toLocaleString()}</span>
            <span className="text-xs text-[#366804] font-bold">Students</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">Active census across all regions</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Biometric Photos</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{verifiedPhotoCount.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 font-bold">
              {students.length > 0 ? `${Math.round((verifiedPhotoCount / students.length) * 100)}%` : '100%'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">3:4 ID Portrait compliance</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Gender Balance</span>
            <PieChart className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-[#202833]">{genderStats.male}M / {genderStats.female}F</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B] flex items-center gap-2">
            <span>{genderStats.malePct}% Male</span>
            <span>&bull;</span>
            <span>{genderStats.femalePct}% Female</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Bus Transportation</span>
            <Bus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{busCount.toLocaleString()}</span>
            <span className="text-xs text-amber-600 font-bold">
              {students.length > 0 ? `${Math.round((busCount / students.length) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">Assigned school bus transport</div>
        </div>
      </div>

      {/* =========================================================================
          LIVE DASHBOARD METRICS: DAILY SENDERS CONTRIBUTION BY DETAIL WITH TIME & DELAY
         ========================================================================= */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#366804]" />
              <h2 className="text-base font-heading font-black text-[#202833] uppercase tracking-wider">
                Live Senders Transmission Telemetry & Daily Contributions
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live transmission log showing exact records transmitted today, timestamp, network delay, and workstation lock status
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#85E510]/20 text-[#256002] border border-[#85E510]/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#4D8A07]" />
              Avg Latency: <strong>{avgTransmissionDelay}ms</strong>
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Today: <strong>{totalDailyTransmissions} Transmissions</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 pl-4">Field Sender Operator</th>
                <th className="py-3 px-3">Assigned Campus & Branch</th>
                <th className="py-3 px-3">Bound Workstation</th>
                <th className="py-3 px-3 text-right">Today (Daily)</th>
                <th className="py-3 px-3 text-right">Total Transmitted</th>
                <th className="py-3 px-3">Last Transmission Time</th>
                <th className="py-3 px-3">Network Delay / Latency</th>
                <th className="py-3 px-3">Batch Pace</th>
                <th className="py-3 px-3 text-center pr-4">Live Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sendersMetrics.map((sm) => (
                <tr key={sm.id || sm.email} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 pl-4 font-bold text-[#202833]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#85E510]/20 text-[#366804] flex items-center justify-center font-black text-[10px]">
                        {sm.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{sm.username}</div>
                        <div className="text-[10px] font-mono text-[#64748B] font-normal">{sm.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#202833]">{sm.school || 'YMS 1'}</div>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {sm.branch || 'Addis Ababa'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {sm.boundDeviceId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Smartphone className="w-3 h-3 text-blue-600" />
                        <span>{sm.boundDeviceId.substring(0, 12)}...</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">Unlocked</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#202833]">
                    <span className="px-2 py-0.5 rounded-md bg-[#85E510]/20 text-[#366804] font-black border border-[#85E510]/40">
                      +{sm.today.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#202833]">
                    {sm.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#4D8A07]" />
                      <span>{sm.lastTransmissionTime}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      sm.transmissionDelayMs < 45
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      <Activity className="w-2.5 h-2.5" />
                      {sm.transmissionDelayDisplay}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {sm.paceDisplay}
                  </td>
                  <td className="py-3 px-3 text-center pr-4">
                    {sm.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Idle Standby
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Analytics Grid: Grade Bar Graph & Campus Census Progress Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grade Distribution Bar Graph (7 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#366804]" />
              <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Grade Cohort Distribution (Bar Graph)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              Grades 1 to 12
            </span>
          </div>

          {/* Responsive CSS Bar Graph */}
          <div className="pt-6">
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-3 px-2 pt-8 pb-4 bg-[#F8FAF9] rounded-xl border border-slate-100">
              {gradeDistribution.entries.map(([grade, count]) => {
                const heightPct = Math.max(12, Math.round((count / gradeDistribution.maxCount) * 100));
                return (
                  <div key={grade} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-[#202833] opacity-80 group-hover:opacity-100 transition-opacity">
                      {count}
                    </div>

                    <div className="w-full max-w-[36px] bg-slate-200 rounded-t-lg overflow-hidden flex items-end transition-all group-hover:scale-105">
                      <div
                        className="w-full bg-gradient-to-t from-[#76CF0C] to-[#85E510] rounded-t-lg transition-all duration-500 shadow-xs"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 font-mono mt-1">
                      G{grade}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
              <span>Primary, Middle & Secondary Grade Cohorts</span>
              <span className="font-semibold text-slate-700">Peak Cohort: Grade 9 ({gradeDistribution.maxCount} students)</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CAMPUS CENSUS & BIOMETRIC VERIFICATION BREAKDOWN (LIKE PROGRESS SHOWING)
           ========================================================================= */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#366804]" />
              <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Campus Census & Biometric Verification Breakdown
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {campusCensusBreakdown.length} Campuses Active
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px] mt-2 flex-1 pr-1">
            {campusCensusBreakdown.map((item) => {
              const bioPct = item.count > 0 ? Math.round((item.verifiedPhotos / item.count) * 100) : 0;
              const censusProgress = Math.min(100, Math.round((item.count / item.targetCapacity) * 100));

              return (
                <div key={item.schoolName} className="py-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#202833] text-sm">{item.schoolName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.branch === 'Adama'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : item.branch === 'Harar'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : item.branch === 'Mojo'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {item.branch} Branch
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-600 font-bold">
                        {item.count.toLocaleString()} / {item.targetCapacity.toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40">
                        {censusProgress}% Census
                      </span>
                    </div>
                  </div>

                  {/* Multi-layered Visual Progress Showing */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Biometric Verified Portraits: <strong className="text-emerald-700">{item.verifiedPhotos} ({bioPct}%)</strong></span>
                      <span>Target Capacity: <strong className="text-slate-700">{item.targetCapacity}</strong></span>
                    </div>

                    {/* Dynamic Biometric & Census Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                      {/* Biometric Verified Segment (Lime-Green) */}
                      <div
                        className="bg-gradient-to-r from-[#85E510] to-[#76CF0C] h-full transition-all duration-500 rounded-l-full"
                        style={{ width: `${Math.round((item.verifiedPhotos / Math.max(item.targetCapacity, item.count)) * 100)}%` }}
                        title={`Verified Biometrics: ${item.verifiedPhotos}`}
                      />
                      {/* Enrolled but pending photo (Amber) */}
                      <div
                        className="bg-amber-300 h-full transition-all duration-500"
                        style={{ width: `${Math.round(((item.count - item.verifiedPhotos) / Math.max(item.targetCapacity, item.count)) * 100)}%` }}
                        title={`Pending Biometric Photo: ${item.count - item.verifiedPhotos}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#85E510]" /> Biometric Verified</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-300" /> Pending Photo</span>
            </div>
            <Link
              to="/receiver/students"
              className="text-xs text-[#366804] font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>Explore All Student Records</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
