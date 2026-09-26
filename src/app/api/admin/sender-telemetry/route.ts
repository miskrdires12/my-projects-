import { NextRequest, NextResponse } from "next/server";
import { getSenderTelemetryAction } from "@/actions/sender-telemetry";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sender-telemetry?date=YYYY-MM-DD
 * High-speed telemetry poll endpoint for real-time per-minute sender speeds,
 * intervals, daily start-to-end hours, and efficiency rates.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "RECEIVER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || undefined;

    const data = await getSenderTelemetryAction(dateParam);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Telemetry route error:", err);
    return NextResponse.json({ error: err?.message || "Internal telemetry failure" }, { status: 500 });
  }
}
