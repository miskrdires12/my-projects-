// ============================================================================
// STUDENT BRIDGE — PRISMA CLIENT SINGLETON (VERCEL & LOCAL RESILIENT)
// ============================================================================

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL || "file:./dev.db";

  // Check if running in a serverless environment (Vercel, AWS Lambda)
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless && dbUrl.startsWith("file:")) {
    const tmpDbPath = path.join("/tmp", "dev.db");
    const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");

    try {
      if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        } else {
          fs.writeFileSync(tmpDbPath, "");
        }
      }
    } catch (err) {
      console.warn("Notice: SQLite serverless path copy warning:", err);
    }

    dbUrl = `file:${tmpDbPath}`;
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = global.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
