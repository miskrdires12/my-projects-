import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";

const prisma = new PrismaClient();

async function backfillQRCodes() {
  console.log("Starting real QR code auto-population for all students in database...");

  const students = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      fullName: true,
      grade: true,
      rollNumber: true,
      qrCodeData: true,
    },
  });

  console.log(`Found ${students.length} total student records.`);
  let updatedCount = 0;

  for (const s of students) {
    if (!s.qrCodeData || s.qrCodeData.trim() === "" || s.qrCodeData.startsWith("STUDENT:")) {
      const qrPayload = JSON.stringify({
        id: s.studentId,
        name: s.fullName,
        roll: s.rollNumber || "",
        grade: s.grade || "General",
      });

      await prisma.student.update({
        where: { id: s.id },
        data: { qrCodeData: qrPayload },
      });

      // Also create or update StudentQR
      try {
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 300,
          errorCorrectionLevel: "M",
        });

        await prisma.studentQR.upsert({
          where: { id: `auto_qr_${s.id}` },
          update: {
            imagePath: qrDataUrl,
            status: "MATCHED",
          },
          create: {
            id: `auto_qr_${s.id}`,
            studentId: s.id,
            fileName: `${s.studentId}_qr.png`,
            imagePath: qrDataUrl,
            mimeType: "image/png",
            matchedMethod: "AUTO_SYSTEM",
            status: "MATCHED",
          },
        });
      } catch (err) {
        console.warn(`StudentQR image error for ${s.studentId}:`, err?.message);
      }

      updatedCount++;
    }
  }

  console.log(`Successfully backfilled real QR codes for ${updatedCount} students!`);
  await prisma.$disconnect();
}

backfillQRCodes().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
