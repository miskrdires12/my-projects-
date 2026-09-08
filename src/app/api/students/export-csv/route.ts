import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const students = await prisma.student.findMany({
      include: {
        batch: { select: { batchNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Student ID",
      "Full Name",
      "Grade",
      "Gender",
      "Phone",
      "Email Address",
      "Department",
      "School",
      "Academic Year",
      "Date of Birth",
      "Blood Type",
      "Roll Number",
      "Guardian Name",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Nationality",
      "Address",
      "Status",
      "Batch Number",
      "Photo Available",
      "QR Code Attached",
      "Enrollment Date",
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = students.map((s) => [
      escapeCSV(s.studentId),
      escapeCSV(s.fullName),
      escapeCSV(s.grade),
      escapeCSV(s.sex),
      escapeCSV(s.phone),
      escapeCSV(s.emailAddress || ""),
      escapeCSV(s.department || ""),
      escapeCSV(s.school || ""),
      escapeCSV(s.academicYear || ""),
      escapeCSV(s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : ""),
      escapeCSV(s.bloodType || ""),
      escapeCSV(s.rollNumber || ""),
      escapeCSV(s.guardianFullName || ""),
      escapeCSV(s.emergencyContactName || ""),
      escapeCSV(s.emergencyContactPhone || ""),
      escapeCSV(s.nationality || "Citizen"),
      escapeCSV(s.address || ""),
      escapeCSV(s.status || "ACTIVE"),
      escapeCSV(s.batch?.batchNumber || ""),
      escapeCSV(s.photoPath ? "YES" : "NO"),
      escapeCSV(s.qrCodeData ? "YES" : "NO"),
      escapeCSV(new Date(s.createdAt).toISOString().split("T")[0]),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const dateTag = new Date().toISOString().split("T")[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Student_Credentials_${dateTag}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export CSV route error:", error);
    return new NextResponse("Failed to export CSV", { status: 500 });
  }
}
