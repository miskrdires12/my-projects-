import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant-context";
import { getScopedPrisma, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const searchParams = req.nextUrl.searchParams;
  const slug = searchParams.get("orgSlug") || undefined;

  try {
    const tenant = await getTenantContext(slug);
    const db = getScopedPrisma(tenant.organizationId);

    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
    });

    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.organizationId,
          name: tenant.organizationName,
          slug: tenant.organizationSlug,
          tier: tenant.subscriptionTier,
        },
        meta: {
          total: projects.length,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        data: projects,
      },
      {
        status: 200,
        headers: {
          "X-Tenant-Id": tenant.organizationId,
          "X-Execution-Time": `${latencyMs}ms`,
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve tenant projects",
      },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const slug = body.orgSlug || undefined;
    const tenant = await getTenantContext(slug);
    const db = getScopedPrisma(tenant.organizationId);

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'name' is required" },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        organizationId: tenant.organizationId,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: "PROJECT_CREATED_API",
        resourceType: "Project",
        resourceId: project.id,
        metadata: JSON.stringify({ via: "REST_API", name: project.name }),
      },
    });

    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully via tenant API",
        meta: { latencyMs },
        data: project,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create project",
      },
      { status: 400 }
    );
  }
}
