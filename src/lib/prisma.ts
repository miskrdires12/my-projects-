// ============================================================================
// STUDENT BRIDGE — PRISMA CLIENT SINGLETON (VERCEL & LOCAL RESILIENT)
// Guaranteed valid PostgreSQL datasource connection to Supabase Cloud
// ============================================================================

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function resolveDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
    throw new Error(
      "[prisma] DATABASE_URL is missing or invalid. Set it in .env (postgresql://user:pass@host:5432/db)."
    );
  }

  let resolved = dbUrl;

  // Rewrite Supabase pooler from Session Mode (5432, cap of 15) to Transaction Mode (6543)
  if (resolved.includes("pooler.supabase.com")) {
    resolved = resolved.replace(":5432", ":6543");
    if (!resolved.includes("pgbouncer=")) {
      resolved += (resolved.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    // Raised from 1 -> 10 (pool_timeout 20s): a single pooled connection starved
    // every concurrent query batch (P2024 pool timeouts), slowing the UI and
    // forcing resilient fallbacks to render "0 students".
    if (!resolved.includes("connection_limit=")) {
      resolved += (resolved.includes("?") ? "&" : "?") + "connection_limit=10&pool_timeout=20";
    }
  }

  // Ensure SSL requirement for cloud database connections
  if (
    (resolved.includes("supabase.co") || resolved.includes("supabase.com") || resolved.includes("pooler.supabase.com")) &&
    !resolved.includes("sslmode=")
  ) {
    resolved += (resolved.includes("?") ? "&" : "?") + "sslmode=require";
  }

  // Enforce Cloudflare dedicated schema to guarantee complete database isolation
  if (resolved.includes("schema=")) {
    resolved = resolved.replace(/schema=[^&]*/, "schema=cloudflare");
  } else {
    resolved += (resolved.includes("?") ? "&" : "?") + "schema=cloudflare";
  }

  // Synchronize process.env so Prisma engine internals read the exact postgresql:// protocol
  process.env.DATABASE_URL = resolved;
  return resolved;
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
