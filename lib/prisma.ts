import { PrismaClient } from "@prisma/client";

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
