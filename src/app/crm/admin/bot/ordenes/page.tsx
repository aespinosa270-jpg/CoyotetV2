/**
 * Ordenes del Bot — tablero de tarjetas. El page (server) solo trae datos
 * y los pasa al client component que maneja filtros/acciones.
 */
import { prisma } from "@/lib/prisma";
import OrdenesBoard from "./_components/OrdenesBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdenesBotPage() {
  const orders = await prisma.order.findMany({
    where: { source: "bot_v2" },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { items: true },
  });

  const plain = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    total: o.total,
    paymentMethod: o.paymentMethod,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ id: i.id, quantity: i.quantity, unit: i.unit, title: i.title })),
  }));

  return <OrdenesBoard orders={plain} />;
}
