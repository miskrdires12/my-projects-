import React, { useState } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Download, ArrowRight, Table, RefreshCw, FileText, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addStudent } from '@/lib/store';

export const ReceiverImportPage: React.FC = () => {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedRows(data);
      } catch (err) {
        console.error("Failed parsing spreadsheet:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    let importedCount = 0;
    let skippedCount = 0;

    parsedRows.forEach((row, idx) => {
      const fullName = row['Full Name'] || row['Name'] || row['fullName'] || '';
      const studentId = row['Student ID'] || row['ID'] || row['studentId'] || `SB-${Date.now().toString().slice(-4)}-${idx}`;
      const grade = String(row['Grade'] || row['grade'] || '10');
      const school = row['School'] || row['Campus'] || row['school'] || 'YMS';

      if (fullName && studentId) {
        addStudent({
          id: `std_${Date.now()}_${idx}`,
          studentId,
          fullName,
          grade,
          school,
          bloodType: row['Blood Type'] || 'O+',
          phone: row['Phone'] || '0911000000',
          status: 'PENDING'
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    });

    setTimeout(() => {
      setImporting(false);
      setImportSummary({ imported: importedCount, skipped: skippedCount });
      setParsedRows([]);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight flex items-center gap-2">
            <Upload className="w-6 h-6 text-[#85E510]" />
            <span>Excel / CSV Batch Ingestion &amp; Mapping Center</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Bulk ingest institutional student rosters, preview column mappings, and validate data integrity before committing to database
          </p>
        </div>
      </div>

      {importSummary && (
        <div className="p-4 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/30 text-xs text-[#366804] font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#85E510]" />
            <span>Successfully imported {importSummary.imported} student records ({importSummary.skipped} rows skipped).</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSummary(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl p-8 text-center space-y-4 hover:border-[#85E510] transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-[#85E510]/15 text-[#366804] flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-6 h-6 text-[#4D8A07]" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#202833]">Drop Excel (.xlsx) or CSV Roster Here</h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Accepts official Ministry of Education and campus student spreadsheets
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black cursor-pointer shadow-xs transition-all">
          <Upload className="w-4 h-4" />
          <span>Browse Spreadsheet File</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Roster Preview ({parsedRows.length} Records Detected)
              </h3>
              <p className="text-xs text-[#64748B]">Showing preview of mapped student rows</p>
            </div>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={importing}
              className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{importing ? "Committing to Database..." : `Commit ${parsedRows.length} Records`}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-80 custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 pl-4">Full Name</th>
                  <th className="py-2.5">Student ID</th>
                  <th className="py-2.5">Grade</th>
                  <th className="py-2.5">Section</th>
                  <th className="py-2.5">Campus</th>
                  <th className="py-2.5 pr-4">Contact Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 pl-4 font-bold text-[#202833]">{row['Full Name'] || row['Name'] || row['fullName'] || '—'}</td>
                    <td className="py-2.5 font-mono text-[#0284C7] font-semibold">{row['Student ID'] || row['ID'] || row['studentId'] || 'Auto'}</td>
                    <td className="py-2.5 text-slate-700">{row['Grade'] || row['grade'] || '10'}</td>
                    <td className="py-2.5 text-slate-700">{row['Section'] || 'A'}</td>
                    <td className="py-2.5 text-slate-700">{row['School'] || row['Campus'] || 'YMS'}</td>
                    <td className="py-2.5 pr-4 font-mono text-[#64748B]">{row['Phone'] || '0911000000'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
