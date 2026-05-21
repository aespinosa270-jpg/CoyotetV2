import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ContactDetail from "./_components/ContactDetail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!contact) return notFound();

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: { in: ["VENDEDORA", "SUPERVISOR", "ADMIN"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const orders = contact.phone
    ? await prisma.order.findMany({
        where: { customerPhone: contact.phone },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link
          href="/crm/admin/sales-agent"
          className="text-neutral-500 hover:text-neutral-900"
        >
          ← Volver a Sales Agent
        </Link>
      </div>

      <ContactDetail
        contact={JSON.parse(JSON.stringify(contact))}
        employees={employees}
        orders={JSON.parse(JSON.stringify(orders))}
      />
    </div>
  );
}