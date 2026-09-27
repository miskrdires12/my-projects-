import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr?data=... or /api/qr?studentId=...&name=...&download=1
 * Generates and streams a high-resolution, scannable PNG QR code.
 * Configures Content-Disposition with the student's name so it downloads cleanly as an image file.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let payload = searchParams.get("data");
    const studentId = searchParams.get("studentId");
    let studentName = searchParams.get("name") || "";
    const sizeParam = searchParams.get("size");
    const isDownload =
      searchParams.get("download") === "true" ||
      searchParams.get("download") === "1";
    const width = sizeParam ? Math.min(Math.max(parseInt(sizeParam, 10), 100), 1000) : 400;

    let foundStudent: any = null;

    if (studentId) {
      try {
        foundStudent = await prisma.student.findFirst({
          where: {
            OR: [{ studentId }, { id: studentId }],
          },
          select: { qrCodeData: true, fullName: true, grade: true, rollNumber: true, studentId: true },
        });

        if (foundStudent) {
          if (!studentName && foundStudent.fullName) {
            studentName = foundStudent.fullName;
          }
          if (!payload) {
            if (foundStudent.qrCodeData) {
              payload = foundStudent.qrCodeData;
            } else {
              payload = JSON.stringify({
                id: foundStudent.studentId,
                name: foundStudent.fullName,
                roll: foundStudent.rollNumber || "",
                grade: foundStudent.grade || "General",
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("QR lookup fallback for student:", studentId, dbErr);
      }
    }

    if (!payload && studentId) {
      payload = `STUDENT:${studentId}`;
    }

    if (!payload) {
      return NextResponse.json({ error: "Missing 'data' or 'studentId' parameter" }, { status: 400 });
    }

    // Determine clean filename from student name
    const cleanName = (studentName || (foundStudent?.studentId) || (studentId) || "Student_QR")
      .trim()
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Student_QR";

    const filename = `${cleanName}.png`;
    const asciiFilename = cleanName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") + ".png";
    const utf8Filename = encodeURIComponent(filename);

    const dispositionType = isDownload ? "attachment" : "inline";
    const contentDisposition = `${dispositionType}; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`;

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Disposition": contentDisposition,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": isDownload ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable",
    };

    // Case 1: If payload is an uploaded local image file path
    if (payload.startsWith("/uploads/") || payload.startsWith("uploads/")) {
      const publicDir = path.join(process.cwd(), "public");
      const relativeClean = payload.replace(/^\//, "");
      const absolutePath = path.join(publicDir, relativeClean);

      if (fs.existsSync(absolutePath)) {
        const buffer = fs.readFileSync(absolutePath);
        const isJpg = absolutePath.toLowerCase().endsWith(".jpg") || absolutePath.toLowerCase().endsWith(".jpeg");
        const mime = isJpg ? "image/jpeg" : "image/png";
        const localFilename = isJpg ? `${cleanName}.jpg` : `${cleanName}.png`;
        const localAscii = cleanName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") + (isJpg ? ".jpg" : ".png");
        const localUtf8 = encodeURIComponent(localFilename);

        return new NextResponse(buffer, {
          headers: {
            ...defaultHeaders,
            "Content-Type": mime,
            "Content-Disposition": `${dispositionType}; filename="${localAscii}"; filename*=UTF-8''${localUtf8}`,
            "Content-Length": String(buffer.length),
          },
        });
      }
    }

    // Case 2: If payload is a remote URL (Cloudflare R2, Supabase, CDN)
    if (payload.startsWith("http://") || payload.startsWith("https://")) {
      try {
        const res = await fetch(payload, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const mime = res.headers.get("content-type") || "image/png";
          return new NextResponse(buffer, {
            headers: {
              ...defaultHeaders,
              "Content-Type": mime,
              "Content-Length": String(buffer.length),
            },
          });
        }
      } catch (remoteErr) {
        console.warn("Failed fetching remote QR image, falling back to QR code generation:", remoteErr);
      }
    }

    // Case 3: If payload is a base64 Data URL, strip and return binary
    if (payload.startsWith("data:image/")) {
      const mime = payload.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";
      const base64Data = payload.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      return new NextResponse(buffer, {
        headers: {
          ...defaultHeaders,
          "Content-Type": mime,
          "Content-Length": String(buffer.length),
        },
      });
    }

    // Case 4: Generate crisp scannable binary PNG QR code
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
        ...defaultHeaders,
        "Content-Length": String(qrBuffer.length),
      },
    });
  } catch (err: any) {
    console.error("QR generator API fatal error:", err);
    return NextResponse.json({ error: "Failed to generate QR code", details: err?.message }, { status: 500 });
  }
}
