import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean up existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const miskr = await prisma.user.create({
    data: {
      name: "Miskr",
      email: "miskr@example.com",
      passwordHash,
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    },
  });

  const alex = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "alex@example.com",
      passwordHash,
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "sarah@example.com",
      passwordHash,
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
  });

  const david = await prisma.user.create({
    data: {
      name: "David Kim",
      email: "david@example.com",
      passwordHash,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  // 2. Create Organizations
  const acme = await prisma.organization.create({
    data: {
      name: "Acme Technologies",
      slug: "acme",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      subscriptionTier: "PRO",
      subscriptionStatus: "ACTIVE",
      stripeCustomerId: "cus_mock_acme_pro_01",
      stripeSubscriptionId: "sub_mock_acme_pro_01",
      stripePriceId: "price_pro_monthly_123",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const stark = await prisma.organization.create({
    data: {
      name: "Stark Innovations",
      slug: "stark",
      logoUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=100&auto=format&fit=crop&q=80",
      subscriptionTier: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
      stripeCustomerId: "cus_mock_stark_ent_02",
      stripeSubscriptionId: "sub_mock_stark_ent_02",
      stripePriceId: "price_enterprise_monthly_456",
      currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  const studio = await prisma.organization.create({
    data: {
      name: "Startup Studio",
      slug: "studio",
      logoUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&auto=format&fit=crop&q=80",
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      stripeCustomerId: "cus_mock_studio_free_03",
    },
  });

  // 3. Create Organization Memberships with RBAC Roles
  // Miskr is OWNER across all organizations
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: acme.id, userId: miskr.id, role: "OWNER" },
      { organizationId: stark.id, userId: miskr.id, role: "OWNER" },
      { organizationId: studio.id, userId: miskr.id, role: "OWNER" },

      { organizationId: acme.id, userId: alex.id, role: "ADMIN" },
      { organizationId: acme.id, userId: sarah.id, role: "ADMIN" },
      { organizationId: acme.id, userId: david.id, role: "MEMBER" },

      { organizationId: stark.id, userId: alex.id, role: "ADMIN" },
      { organizationId: stark.id, userId: sarah.id, role: "ADMIN" },

      { organizationId: studio.id, userId: alex.id, role: "MEMBER" },
      { organizationId: studio.id, userId: david.id, role: "ADMIN" },
    ],
  });

  // 4. Create Tenant-Isolated Projects
  await prisma.project.createMany({
    data: [
      // Acme projects
      {
        name: "Quantum Analytics Engine",
        description: "High-throughput real-time streaming telemetry processor for B2B data pipes.",
        status: "ACTIVE",
        organizationId: acme.id,
      },
      {
        name: "Mobile SDK v2",
        description: "Zero-latency offline-first mobile sync framework for iOS & Android.",
        status: "ACTIVE",
        organizationId: acme.id,
      },
      {
        name: "Customer Data Platform",
        description: "Unified identity stitching and tenant enrichment layer.",
        status: "ACTIVE",
        organizationId: acme.id,
      },

      // Stark projects
      {
        name: "Arc Reactor Cloud Mesh",
        description: "Self-healing zero-trust multi-region container orchestration grid.",
        status: "ACTIVE",
        organizationId: stark.id,
      },
      {
        name: "Jarvis Neural Gateway",
        description: "Multi-agent cognitive reasoning engine with automated failover.",
        status: "ACTIVE",
        organizationId: stark.id,
      },

      // Studio projects
      {
        name: "MVP Landing Page Redesign",
        description: "Conversion-optimized product waitlist and interactive playground.",
        status: "ACTIVE",
        organizationId: studio.id,
      },
    ],
  });

  // 5. Create Sample Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: acme.id,
        userId: alex.id,
        action: "ORGANIZATION_CREATED",
        resourceType: "Organization",
        resourceId: acme.id,
        metadata: JSON.stringify({ name: acme.name, tier: "PRO" }),
      },
      {
        organizationId: acme.id,
        userId: alex.id,
        action: "MEMBER_INVITED",
        resourceType: "Member",
        resourceId: sarah.id,
        metadata: JSON.stringify({ email: "sarah@example.com", role: "ADMIN" }),
      },
      {
        organizationId: acme.id,
        userId: alex.id,
        action: "SUBSCRIPTION_UPGRADED",
        resourceType: "Billing",
        resourceId: acme.stripeSubscriptionId,
        metadata: JSON.stringify({ tier: "PRO", interval: "month" }),
      },
      {
        organizationId: stark.id,
        userId: sarah.id,
        action: "PROJECT_CREATED",
        resourceType: "Project",
        resourceId: "proj_arc_mesh",
        metadata: JSON.stringify({ name: "Arc Reactor Cloud Mesh" }),
      },
      {
        organizationId: studio.id,
        userId: david.id,
        action: "ORGANIZATION_CREATED",
        resourceType: "Organization",
        resourceId: studio.id,
        metadata: JSON.stringify({ name: studio.name, tier: "FREE" }),
      },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log(`- Users: ${alex.email}, ${sarah.email}, ${david.email} (Password: password123)`);
  console.log(`- Orgs: Acme Technologies (/acme), Stark Innovations (/stark), Startup Studio (/studio)`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
