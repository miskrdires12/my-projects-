import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BarChart3, ShieldCheck, ArrowUpRight,
  TrendingUp, Layers, CheckCircle2, GraduationCap,
  Building2, PieChart, Bus, HeartPulse
} from 'lucide-react';
import { getStudents, getUsers } from '@/lib/store';
import { Student, User } from '@/types';
import { getCleanGrade } from '@/lib/gradeUtils';

export const AdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setStudents(getStudents());
    setUsers(getUsers());
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
        // Fallback for KG or other grades
        counts[g] = (counts[g] || 0) + 1;
      }
    });

    const entries = Object.entries(counts).filter(([_, count]) => count > 0 || ['7', '8', '9', '10', '11', '12'].includes(_));
    const maxCount = Math.max(...entries.map(([_, c]) => c), 1);

    return { entries, maxCount };
  }, [students]);

  // Compute Campus Distribution
  const campusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const sch = s.school || 'YMS';
      map[sch] = (map[sch] || 0) + 1;
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [students]);

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

  // Bus Transport & Blood Type
  const busCount = useMemo(() => {
    return students.filter(s => s.schoolBusUsage === 'Yes' || s.busUser === 'YES').length;
  }, [students]);

  const verifiedPhotoCount = useMemo(() => {
    return students.filter(s => s.photoPath || s.previewPath || s.photoIntegrityStatus === 'PHOTO_VERIFIED').length;
  }, [students]);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Institutional Student Registry Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              Station Admin &bull; Live Telemetry
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time biometric demographics, campus distribution, and grade cohort analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-xs transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Operator Performance Center</span>
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

      {/* Main Analytics Grid: Grade Bar Graph & Campus Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution Bar Graph */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
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
                    {/* Tooltip Count */}
                    <div className="text-[10px] font-mono font-bold text-[#202833] opacity-80 group-hover:opacity-100 transition-opacity">
                      {count}
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full max-w-[36px] bg-slate-200 rounded-t-lg overflow-hidden flex items-end transition-all group-hover:scale-105">
                      <div
                        className="w-full bg-gradient-to-t from-[#76CF0C] to-[#85E510] rounded-t-lg transition-all duration-500 shadow-xs"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Grade Label */}
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

        {/* Institutional Campus Volume Breakdown */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#366804]" />
              <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Campus Census
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {campusDistribution.length} Campuses
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-72 mt-2 flex-1">
            {campusDistribution.map(([schoolName, count]) => {
              const pct = Math.round((count / (students.length || 1)) * 100);
              return (
                <div key={schoolName} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[#202833] truncate">{schoolName}</div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-[#85E510] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[#202833]">{count.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link
              to="/receiver/students"
              className="text-xs text-[#366804] font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>Explore Complete Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
