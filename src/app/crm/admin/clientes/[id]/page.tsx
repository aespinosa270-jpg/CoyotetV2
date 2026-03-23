import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClienteDetalleClient from "./_components/ClienteDetalleClient";

export const dynamic = 'force-dynamic';

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  // 1. Fetch del cliente con todo su historial de Deals
  const rawClient = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      deals: {
        include: {
          employee: { select: { name: true } },
          product: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!rawClient) notFound();

  // 2. Serialización a prueba de balas para pasar al Client Component
  const serializedClient = {
    id: rawClient.id,
    hashId: rawClient.hashId,
    name: rawClient.name || 'Sin Nombre',
    email: rawClient.email,
    phone: rawClient.phone || 'Sin teléfono',
    rfc: rawClient.rfc || 'Público General',
    ltv: rawClient.ltv,
    points: rawClient.points,
    membershipTier: rawClient.membershipTier,
    createdAt: new Intl.DateTimeFormat('es-MX', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    }).format(rawClient.createdAt),
    deals: rawClient.deals.map(deal => ({
      id: deal.id,
      title: deal.title,
      company: deal.company,
      value: Number(deal.value), // Parseamos Decimal a Number
      status: deal.status,
      agentName: deal.employee?.name || 'Sistema',
      productName: deal.product?.title || 'Genérico/Varios',
      date: new Intl.DateTimeFormat('es-MX', { 
        year: 'numeric', month: 'short', day: '2-digit' 
      }).format(deal.createdAt),
    }))
  };

  return <ClienteDetalleClient client={serializedClient} />;
}