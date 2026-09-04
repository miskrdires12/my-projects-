import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Ensure DATABASE_URL is defined with a valid fallback
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

// When running on Vercel with SQLite, copy the pre-seeded dev.db to /tmp so write operations succeed
if (process.env.VERCEL && process.env.DATABASE_URL.startsWith("file:")) {
  try {
    const tmpDbPath = "/tmp/dev.db";
    const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(/*turbopackIgnore: true*/ sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, tmpDbPath);
      console.log("[Prisma] Copied database to /tmp/dev.db for writable SQLite in Vercel function.");
    }

    if (fs.existsSync(tmpDbPath)) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    }
  } catch (err) {
    console.warn("[Prisma] Could not copy SQLite database to /tmp:", err);
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns a tenant-scoped Prisma client that automatically enforces
 * the `organizationId` foreign key boundary on all queries and mutations.
 */
export function getScopedPrisma(organizationId: string) {
  return prisma.$extends({
    query: {
      project: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, organizationId } as any;
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      auditLog: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, organizationId } as any;
          return query(args);
        },
      },
      organizationMember: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      invitation: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, organizationId } as any;
          return query(args);
        },
      },
    },
  });
}
