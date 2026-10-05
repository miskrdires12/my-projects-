import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getR2PublicUrl } from "@/lib/r2-storage";
import { verifyApkAccess } from "@/lib/apk-control";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Role, X-School-Selection, X-Client-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolParam = searchParams.get("school")?.trim();
    const limit = Math.min(2500, Math.max(1, parseInt(searchParams.get("limit") || "2000", 10)));

    // 1. Verify Super Admin APK access and school approval
    const authCheck = await verifyApkAccess(request, schoolParam);
    if (!authCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error,
          blocked: true,
          students: [],
        },
        { status: authCheck.status || 403, headers: corsHeaders }
      );
    }

    // 2. Build where filter
    const where: any = {
      receiverHidden: { not: true },
    };

    if (schoolParam && schoolParam !== "ALL") {
      where.school = { equals: schoolParam, mode: "insensitive" };
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formattedStudents = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      name: s.fullName,
      grade: s.grade || "",
      section: "A",
      rollNumber: s.rollNumber || "",
      sex: s.sex || "",
      gender: s.sex || "",
      phone: s.phone || "",
      parentPhone: s.emergencyContactPhone || s.phone || "",
      emergencyContactPhone: s.emergencyContactPhone || "",
      emergencyContactName: s.emergencyContactName || "",
      guardianName: s.guardianFullName || "",
      bloodType: s.bloodType || "",
      school: s.school || (schoolParam ? schoolParam : "Warka"),
      schoolName: s.school || (schoolParam ? schoolParam : "Warka"),
      address: s.address || "Addis Ababa",
      cityRegion: s.cityRegion || s.address || "Addis Ababa",
      qrCodeData: s.qrCodeData || s.studentId,
      photoUrl: s.photoPath
        ? s.photoPath.startsWith("http")
          ? s.photoPath
          : getR2PublicUrl(s.photoPath)
        : null,
      photoPath: s.photoPath
        ? s.photoPath.startsWith("http")
          ? s.photoPath
          : getR2PublicUrl(s.photoPath)
        : null,
      status: s.status || "Active",
    }));

    return NextResponse.json(
      {
        success: true,
        count: formattedStudents.length,
        totalCount: formattedStudents.length,
        school: schoolParam || "ALL",
        students: formattedStudents,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[GET /api/students] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message, students: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}
