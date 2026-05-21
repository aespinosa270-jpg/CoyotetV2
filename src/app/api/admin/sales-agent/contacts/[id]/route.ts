/**
 * GET   /api/admin/sales-agent/contacts/[id] — detalle con attempts, feedbacks, orders
 * PATCH /api/admin/sales-agent/contacts/[id] — actualiza status, asignacion, tags, notas
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = [
  "PENDING", "CONTACTED", "INTERESTED", "CONVERTED", "LOST", "DO_NOT_CONTACT",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;

  const contact = await prisma.contactoOutbound.findUnique({
    where: { id },
    include: {
      assignedToEmployee: { select: { id: true, name: true, email: true } },
      attempts: {
        orderBy: { sentAt: "desc" },
        include: { sentByEmployee: { select: { id: true, name: true } } },
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { id: true, name: true } } },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let orders: any[] = [];
  if (contact.phone) {
    orders = await prisma.order.findMany({
      where: { customerPhone: contact.phone },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, orderNumber: true, total: true, status: true, createdAt: true,
      },
    });
  }

  return NextResponse.json({ contact, orders });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();
  const data: any = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status invalido. Validos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    data.status = body.status;
  }

  if (body.assignedToEmployeeId !== undefined) {
    data.assignedToEmployeeId = body.assignedToEmployeeId || null;
    data.assignedAt = body.assignedToEmployeeId ? new Date() : null;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: "tags debe ser array" }, { status: 400 });
    }
    data.tags = body.tags;
  }

  if (body.notas !== undefined) data.notas = body.notas;
  if (body.nombre !== undefined) data.nombre = body.nombre;
  if (body.empresa !== undefined) data.empresa = body.empresa;
  if (body.coldReason !== undefined) data.coldReason = body.coldReason;

  if (body.nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const updated = await prisma.contactoOutbound.update({
    where: { id },
    data,
    include: {
      assignedToEmployee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ contact: updated });
}