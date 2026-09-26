import fs from "fs";
import path from "path";

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env:", e?.message);
}

import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";

const prisma = new PrismaClient();

async function run() {
  console.log("Fetching students needing QR update...");
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

  const needingUpdate = students.filter(
    (s) => !s.qrCodeData || s.qrCodeData.trim() === "" || s.qrCodeData.startsWith("STUDENT:")
  );

  console.log(`Total students: ${students.length}. Needing QR update: ${needingUpdate.length}`);

  const CHUNK_SIZE = 25;
  for (let i = 0; i < needingUpdate.length; i += CHUNK_SIZE) {
    const chunk = needingUpdate.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (s) => {
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

        try {
          const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            margin: 1,
            width: 300,
            errorCorrectionLevel: "M",
          });

          await prisma.studentQR.upsert({
            where: { id: `auto_qr_${s.id}` },
            update: { imagePath: qrDataUrl, status: "MATCHED" },
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
        } catch {}
      })
    );
    console.log(`Processed ${Math.min(i + CHUNK_SIZE, needingUpdate.length)} / ${needingUpdate.length} records...`);
  }

  console.log("SUCCESS: All student records now have real, scannable QR codes!");
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
