/**
 * POST /api/admin/sales-agent/contacts/[id]/feedback
 *   Body: { feedback: string, category?: timing|pricing|product_fit|communication_style }
 *
 * GET /api/admin/sales-agent/contacts/[id]/feedback
 *   Lista feedbacks de un contacto.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const VALID_CATEGORIES = ["timing", "pricing", "product_fit", "communication_style"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "no email en sesion" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (!body.feedback || typeof body.feedback !== "string" || body.feedback.trim().length < 3) {
    return NextResponse.json(
      { error: "feedback requerido (min 3 caracteres)" },
      { status: 400 }
    );
  }

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: `category invalida. Validas: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json(
      { error: "No estas registrado como Employee" },
      { status: 403 }
    );
  }

  const contact = await prisma.contactoOutbound.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact no existe" }, { status: 404 });
  }

  const fb = await prisma.salesAgentFeedback.create({
    data: {
      contactId: id,
      employeeId: employee.id,
      feedback: body.feedback.trim(),
      category: body.category ?? null,
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ feedback: fb }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;

  const feedbacks = await prisma.salesAgentFeedback.findMany({
    where: { contactId: id },
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ feedbacks });
}