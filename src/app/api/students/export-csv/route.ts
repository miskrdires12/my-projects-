// ============================================================================
// STUDENT BRIDGE — HIGH-THROUGHPUT (5000-6000+) STUDENT EXPORT ENGINE
// - Grade Separation & Grade-Specific CSV/Excel Downloads
// - Selected Data Export (combines all selected student records together)
// - Cursor-based Chunked DB Queries (take: 1000) for zero memory spikes
// - Strict 5 Columns: StudentID, Name, Grade, Phone, @photo
// - Phone normalization with 2519
// - Local desktop photo path: C:\Users\athede\Desktop\students project for 17000\<Name>.jpg
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import {
  RECEIVER_EXCEL_HEADERS,
  getStudentPhotoLocalPath,
  formatPhoneForReceiver,
} from "@/lib/export-utils";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 1000;

interface ExportOptions {
  format?: string;
  grade?: string | null;
  ids?: string[] | null;
}

async function handleExport(options: ExportOptions) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const format = (options.format || "csv").toLowerCase();
  const gradeParam = options.grade;
  const ids = options.ids && options.ids.length > 0 ? options.ids : null;

  // Build Prisma filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (gradeParam && gradeParam !== "ALL" && gradeParam !== "all" && gradeParam.trim() !== "") {
    where.grade = gradeParam.trim();
  }

  if (ids) {
    where.OR = [{ id: { in: ids } }, { studentId: { in: ids } }];
  }

  // High-Throughput Cursor Pagination: Chunk in batches of 1000 records
  // Avoids Node.js heap exhaustion on 5,000 to 6,000+ records
  const allStudents: Array<{
    id: string;
    studentId: string;
    fullName: string;
    sex: string;
    grade: string;
    phone: string;
    photoPath: string | null;
  }> = [];

  let cursor: string | undefined;

  while (true) {
    const chunk = await prisma.student.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        fullName: true,
        sex: true,
        grade: true,
        phone: true,
        photoPath: true,
      },
      take: CHUNK_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
    });

    if (chunk.length === 0) break;
    allStudents.push(...chunk);

    if (chunk.length < CHUNK_SIZE) break;
    cursor = chunk[chunk.length - 1].id;
  }

  // Receiver columns: StudentID, Name, Sex, Grade, Phone, @photo
  const headers = [...RECEIVER_EXCEL_HEADERS];

  const dataRows = allStudents.map((s) => [
    s.studentId || "",
    s.fullName || "",
    s.sex || "Male",
    s.grade || "",
    formatPhoneForReceiver(s.phone),
    getStudentPhotoLocalPath(s),
  ]);

  const dateTag = new Date().toISOString().split("T")[0];
  let fileCategory = "AllGrades";
  if (ids) {
    fileCategory = `Selected_${allStudents.length}_Students`;
  } else if (where.grade) {
    fileCategory = `Grade_${where.grade.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  }

  // Export as Genuine Excel (.xlsx) file
  if (format === "xlsx" || format === "excel") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Set readable column widths
    ws["!cols"] = [
      { wch: 18 }, // StudentID
      { wch: 28 }, // Name
      { wch: 14 }, // Grade
      { wch: 18 }, // Phone
      { wch: 70 }, // @photo (Full local file path)
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = `Student_Credentials_${fileCategory}_${allStudents.length}_Records_${dateTag}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  // Export as CSV (Default)
  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).trim();
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = dataRows.map((row) => row.map((cell) => escapeCSV(cell)).join(","));
  const csvContent =
    "\uFEFF" + [headers.map((h) => escapeCSV(h)).join(","), ...csvRows].join("\r\n");

  const fileName = `Student_Credentials_${fileCategory}_${allStudents.length}_Records_${dateTag}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const grade = searchParams.get("grade");
    const idsParam = searchParams.get("ids");
    const ids = idsParam
      ? idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

    return await handleExport({ format, grade, ids });
  } catch (error: unknown) {
    console.error("Export students data GET error:", error);
    return new NextResponse("Failed to export student data", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const format = body.format || "csv";
    const grade = body.grade || null;
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : null;

    return await handleExport({ format, grade, ids });
  } catch (error: unknown) {
    console.error("Export students data POST error:", error);
    return new NextResponse("Failed to export student data", { status: 500 });
  }
}
