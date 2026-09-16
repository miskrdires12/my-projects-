// ============================================================================
// STUDENT BRIDGE — PRISMA CLIENT SINGLETON (VERCEL & LOCAL RESILIENT)
// Guaranteed valid PostgreSQL datasource connection to Supabase Cloud
// ============================================================================

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Canonical Supabase Cloud PostgreSQL Connection (Session/Transaction Pooler)
const SUPABASE_POSTGRES_URL =
  "postgresql://postgres.hiwhmpuhhakguckckuqv:1998nehase10@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";

function resolveDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL?.trim();

  // If missing or invalid protocol (e.g. SQLite file: or REST API https:), fallback to Supabase
  if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
    dbUrl = SUPABASE_POSTGRES_URL;
  }

  // Ensure SSL requirement for cloud database connections
  if (
    (dbUrl.includes("supabase.co") || dbUrl.includes("supabase.com") || dbUrl.includes("pooler.supabase.com")) &&
    !dbUrl.includes("sslmode=")
  ) {
    dbUrl += (dbUrl.includes("?") ? "&" : "?") + "sslmode=require";
  }

  // Synchronize process.env so Prisma engine internals read the exact postgresql:// protocol
  process.env.DATABASE_URL = dbUrl;
  return dbUrl;
}

function getPrismaClient(): PrismaClient {
  const dbUrl = resolveDatabaseUrl();

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = global.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;

