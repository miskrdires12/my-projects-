import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr?data=... or /api/qr?studentId=...
 * Generates and streams a high-resolution, scannable PNG QR code.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let payload = searchParams.get("data");
    const studentId = searchParams.get("studentId");
    const sizeParam = searchParams.get("size");
    const width = sizeParam ? Math.min(Math.max(parseInt(sizeParam, 10), 100), 1000) : 300;

    if (!payload && studentId) {
      try {
        const student = await prisma.student.findUnique({
          where: { studentId },
          select: { qrCodeData: true, fullName: true, grade: true, rollNumber: true },
        });

        if (student?.qrCodeData) {
          payload = student.qrCodeData;
        } else if (student) {
          payload = JSON.stringify({
            id: studentId,
            name: student.fullName,
            roll: student.rollNumber || "",
            grade: student.grade || "General",
          });
        } else {
          payload = `STUDENT:${studentId}`;
        }
      } catch (dbErr) {
        console.warn("QR lookup fallback for student:", studentId, dbErr);
        payload = `STUDENT:${studentId}`;
      }
    }

    if (!payload) {
      return NextResponse.json({ error: "Missing 'data' or 'studentId' parameter" }, { status: 400 });
    }

    // If payload is already a base64 Data URL, strip and return binary
    if (payload.startsWith("data:image/")) {
      const base64Data = payload.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Generate crisp binary PNG buffer
    const qrBuffer = await QRCode.toBuffer(payload, {
      type: "png",
      margin: 1,
      width,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("QR generator API fatal error:", err);
    return NextResponse.json({ error: "Failed to generate QR code", details: err?.message }, { status: 500 });
  }
}
