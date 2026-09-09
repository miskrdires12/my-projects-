import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import { RECEIVER_EXCEL_HEADERS, getStudentPhotoLocalPath, formatPhoneForReceiver } from "@/lib/export-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();

    const students = await prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        fullName: true,
        grade: true,
        phone: true,
        photoPath: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Exact 5 columns requested by user:
    // StudentID, Name, Grade, Phone, @photo
    const headers = [...RECEIVER_EXCEL_HEADERS];

    const dataRows = students.map((s) => [
      s.studentId || "",
      s.fullName || "",
      s.grade || "",
      formatPhoneForReceiver(s.phone),
      getStudentPhotoLocalPath(s),
    ]);

    const dateTag = new Date().toISOString().split("T")[0];

    // Export as Genuine Excel (.xlsx) file
    if (format === "xlsx" || format === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Set readable column widths
      ws["!cols"] = [
        { wch: 18 }, // Student ID
        { wch: 26 }, // Name
        { wch: 12 }, // Grade
        { wch: 18 }, // Phone
        { wch: 65 }, // Photo (Full local file path)
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Students");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Student_Credentials_${dateTag}.xlsx"`,
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
    const csvContent = "\uFEFF" + [headers.map((h) => escapeCSV(h)).join(","), ...csvRows].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Student_Credentials_${dateTag}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("Export students data error:", error);
    return new NextResponse("Failed to export student data", { status: 500 });
  }
}
