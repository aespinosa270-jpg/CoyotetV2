/**
 * GET /api/admin/sales-agent/contacts
 *
 * Lista paginada filtrable de contactos fríos.
 * Query params:
 *   ?status=PENDING|CONTACTED|INTERESTED|CONVERTED|LOST|DO_NOT_CONTACT
 *   ?assignedTo=<employeeId> | "unassigned" | "me"
 *   ?minPriority=0-100
 *   ?search=<phone|nombre|empresa>
 *   ?page=1
 *   ?pageSize=50
 *   ?sortBy=priority|recent|attempts
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const minPriority = Number(searchParams.get("minPriority") ?? 0);
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const sortBy = searchParams.get("sortBy") ?? "priority";

  const where: any = {};
  if (status) where.status = status;
  if (minPriority > 0) where.reactivationPriority = { gte: minPriority };

  if (assignedTo === "unassigned") {
    where.assignedToEmployeeId = null;
  } else if (assignedTo === "me") {
    const session = await auth();
    if (session?.user?.email) {
      const employee = await prisma.employee.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      where.assignedToEmployeeId = employee?.id ?? "__none__";
    }
  } else if (assignedTo) {
    where.assignedToEmployeeId = assignedTo;
  }

  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { nombre: { contains: search, mode: "insensitive" } },
      { empresa: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sortBy === "recent"
      ? [{ updatedAt: "desc" as const }]
      : sortBy === "attempts"
      ? [{ totalAttempts: "asc" as const }, { reactivationPriority: "desc" as const }]
      : [{ reactivationPriority: "desc" as const }, { updatedAt: "desc" as const }];

  const [total, items] = await Promise.all([
    prisma.contactoOutbound.count({ where }),
    prisma.contactoOutbound.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedToEmployee: { select: { id: true, name: true, email: true } },
        _count: { select: { attempts: true, feedbacks: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}