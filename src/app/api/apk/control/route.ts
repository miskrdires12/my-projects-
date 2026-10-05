import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getApkControlConfig,
  updateApkControlConfig,
} from "@/lib/apk-control";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Role, X-School-Selection",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const config = await getApkControlConfig();

    // Query distinct schools from database
    const dbSchools = await prisma.student.findMany({
      select: { school: true },
      distinct: ["school"],
      where: { school: { not: null } },
    });

    const registeredSchools = Array.from(
      new Set(
        [
          "Warka",
          "Sena Yerosen",
          ...dbSchools.map((s) => s.school?.trim()).filter(Boolean),
        ] as string[]
      )
    );

    return NextResponse.json(
      {
        success: true,
        config,
        availableSchools: registeredSchools,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    // Allow SUPER_ADMIN session or valid master header
    const userRole = session?.role;
    const authHeader = request.headers.get("Authorization");

    const isMasterAuthorized =
      userRole === "SUPER_ADMIN" ||
      userRole === "ADMIN" ||
      authHeader === "Bearer siliconlabstech2026";

    if (!isMasterAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin permissions required." },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { isApkBlocked, approvedSchools, blockReason } = body;

    const updated = await updateApkControlConfig(
      {
        isApkBlocked: typeof isApkBlocked === "boolean" ? isApkBlocked : undefined,
        approvedSchools: Array.isArray(approvedSchools) ? approvedSchools : undefined,
        blockReason: typeof blockReason === "string" ? blockReason : undefined,
      },
      session?.email || "SUPER_ADMIN"
    );

    return NextResponse.json(
      {
        success: true,
        message: "APK access control configuration updated successfully.",
        config: updated,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
