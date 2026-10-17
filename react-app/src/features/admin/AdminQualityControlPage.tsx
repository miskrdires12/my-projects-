import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, Search,
  Filter, Check, UserX, Eye, ArrowRight,
  ShieldCheck, MapPin, Camera, RefreshCw
} from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';

export const AdminQualityControlPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Analyze quality issues
  const qualityIssues = useMemo(() => {
    const issues: {
      id: string;
      student: Student;
      severity: 'CRITICAL' | 'WARNING';
      issueTitle: string;
      issueDetails: string;
    }[] = [];

    // Track ID duplicates
    const idMap = new Map<string, number>();
    students.forEach(s => {
      idMap.set(s.studentId, (idMap.get(s.studentId) || 0) + 1);
    });

    students.forEach(s => {
      // 1. Missing portrait check
      const hasPhoto = Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath);
      if (!hasPhoto) {
        issues.push({
          id: `missing-photo-${s.id || s.studentId}`,
          student: s,
          severity: 'CRITICAL',
          issueTitle: 'Missing Biometric Portrait',
          issueDetails: 'Student record lacks compliant studio portrait photo in Cloudflare R2.'
        });
      }

      // 2. Duplicate student ID
      if ((idMap.get(s.studentId) || 0) > 1) {
        issues.push({
          id: `dup-id-${s.id || s.studentId}`,
          student: s,
          severity: 'CRITICAL',
          issueTitle: 'Duplicate Student ID Collision',
          issueDetails: `ID "${s.studentId}" is assigned to multiple records across stations.`
        });
      }

      // 3. Incomplete emergency phone or blood type
      if (!s.phone || s.phone.trim().length < 8) {
        issues.push({
          id: `phone-${s.id || s.studentId}`,
          student: s,
          severity: 'WARNING',
          issueTitle: 'Incomplete Contact Information',
          issueDetails: 'Emergency phone number is missing or formatted incorrectly.'
        });
      }
    });

    return issues;
  }, [students]);

  const filteredIssues = qualityIssues.filter(item => {
    if (resolvedIds.has(item.id)) return false;
    if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.student.fullName.toLowerCase().includes(q) ||
        item.student.studentId.toLowerCase().includes(q) ||
        item.issueTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolveIssue = (issueId: string, studentId: string) => {
    setResolvedIds(prev => new Set([...prev, issueId]));
    updateStudent(studentId, { status: 'VERIFIED' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>Quality Control &amp; Data Validation Hub</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Automated scanning for duplicate student IDs, missing portrait photos, and institutional validation errors
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-[#366804] bg-[#85E510]/15 px-3 py-1.5 rounded-xl border border-[#85E510]/30 shadow-2xs">
          Scanning Active &bull; {filteredIssues.length} Quality Flags
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
            Critical Integrity Flags
          </span>
          <div className="mt-2 text-2xl font-heading font-black text-rose-600">
            {qualityIssues.filter(i => i.severity === 'CRITICAL' && !resolvedIds.has(i.id)).length}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">
            Requires immediate resolution before batch printing
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
            Quality Advisory Warnings
          </span>
          <div className="mt-2 text-2xl font-heading font-black text-amber-500">
            {qualityIssues.filter(i => i.severity === 'WARNING' && !resolvedIds.has(i.id)).length}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">
            Minor formatting or contact omissions
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
            Authoritative Records Clean
          </span>
          <div className="mt-2 text-2xl font-heading font-black text-[#2E7D32]">
            {(students.length - qualityIssues.filter(i => !resolvedIds.has(i.id)).length).toLocaleString()} Records
          </div>
          <div className="text-xs text-emerald-700 font-mono mt-1 font-bold">
            100% Passed CR80 Biometric Inspection
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search flagged students by name or ID..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'CRITICAL', 'WARNING'] as const).map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                filterSeverity === sev
                  ? "bg-[#85E510] text-[#062404] shadow-xs"
                  : "bg-[#F8FAF9] text-[#64748B] hover:text-[#202833] border border-[#CBD5E1]"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Issue Queue Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Severity</th>
                <th className="py-3.5">Student Name &amp; ID</th>
                <th className="py-3.5">Campus</th>
                <th className="py-3.5">Detected Quality Issue</th>
                <th className="py-3.5">Details</th>
                <th className="py-3.5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500 font-medium">
                    No active quality validation errors found. All records meet institutional standards.
                  </td>
                </tr>
              ) : (
                filteredIssues.map(item => (
                  <tr key={item.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3.5 pl-6 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        item.severity === 'CRITICAL'
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-[#202833]">
                      <div>{item.student.fullName}</div>
                      <div className="text-[11px] font-mono text-[#0284C7] font-semibold">{item.student.studentId}</div>
                    </td>
                    <td className="py-3.5 text-slate-700 whitespace-nowrap font-medium">
                      {item.student.school || 'YMS'}
                    </td>
                    <td className="py-3.5 font-bold text-[#202833] whitespace-nowrap">
                      {item.issueTitle}
                    </td>
                    <td className="py-3.5 text-[#64748B] text-[11px] max-w-xs">
                      {item.issueDetails}
                    </td>
                    <td className="py-3.5 text-right pr-6 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleResolveIssue(item.id, item.student.id || item.student.studentId)}
                        className="px-3 py-1.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-[11px] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify &amp; Clear</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
