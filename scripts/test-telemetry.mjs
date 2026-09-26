import fs from "fs";
import path from "path";

// Load .env
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
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testTelemetry() {
  const targetDate = "2026-09-23";
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

  const students = await prisma.student.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      senderId: true,
      senderName: true,
      createdAt: true,
    },
  });

  console.log(`Date: ${targetDate} has ${students.length} students registered!`);

  // Group by sender
  const groups = new Map();
  for (const s of students) {
    const key = s.senderName || "Unknown Station";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  for (const [sender, list] of groups.entries()) {
    console.log(`\n--- SENDER: ${sender} (${list.length} records) ---`);
    const first = list[0].createdAt;
    const last = list[list.length - 1].createdAt;
    console.log(`Starting Hour: ${first.toISOString()}`);
    console.log(`Ending Hour:   ${last.toISOString()}`);

    const durationSec = Math.round((new Date(last).getTime() - new Date(first).getTime()) / 1000);
    const durationHours = durationSec / 3600;
    const speed = durationHours > 0 ? (list.length / durationHours).toFixed(1) : list.length;
    console.log(`Total Shift Duration: ${Math.round(durationSec / 60)} minutes`);
    console.log(`Velocity / Pace: ${speed} records/hour`);

    // Compute intervals
    const intervals = [];
    for (let i = 1; i < list.length; i++) {
      const deltaSec = Math.round(
        (new Date(list[i].createdAt).getTime() - new Date(list[i - 1].createdAt).getTime()) / 1000
      );
      if (deltaSec > 0 && deltaSec < 3600) {
        intervals.push(deltaSec);
      }
    }
    if (intervals.length > 0) {
      const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      const minInterval = Math.min(...intervals);
      const underTarget = intervals.filter((d) => d <= 120).length;
      const efficiency = Math.round((underTarget / intervals.length) * 100);
      console.log(`Avg Sending Interval: ${avgInterval} seconds`);
      console.log(`Fastest Interval:     ${minInterval} seconds`);
      console.log(`Efficiency Rate:      ${efficiency}% (Cadence consistency <= 120s)`);
    }
  }

  await prisma.$disconnect();
}

testTelemetry().catch(console.error);
