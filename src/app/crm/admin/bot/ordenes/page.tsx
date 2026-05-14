/**
 * Página: Órdenes del Bot
 *
 * Muestra TODAS las órdenes generadas por el bot v2 con su estado de
 * despacho. Logística puede avanzar el status desde aquí.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import OrdenesActions from "./_components/OrdenesActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente pago", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Pagada", color: "bg-emerald-100 text-emerald-800" },
  PROCESSING: { label: "Preparando", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Enviada", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Entregada", color: "bg-green-100 text-green-900" },
  CANCELLED: { label: "Cancelada", color: "bg-slate-100 text-slate-600" },
  FAILED: { label: "Falló", color: "bg-red-100 text-red-800" },
};

export default async function OrdenesBotPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params.status ?? "todas";

  const where: any = { source: "bot_v2" };
  if (filterStatus !== "todas") {
    where.status = filterStatus.toUpperCase();
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      items: true,
      user: { select: { name: true, email: true, membershipTier: true } },
    },
  });

  // Conteos por status (para los tabs)
  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { source: "bot_v2" },
    _count: true,
  });
  const countMap = Object.fromEntries(
    counts.map((c: any) => [c.status, c._count])
  );

  const totalRevenue = orders
    .filter((o) => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Bot v2 — Logística
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">
            <span>ÓRDENES DEL </span>
            <span className="text-[#FDCB02]">BOT</span>
          </h1>
        </div>
        <div className="bg-black text-[#FDCB02] px-6 py-3 rounded-xl">
          <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
            Ingresos del bot
          </p>
          <p className="text-xl font-black font-mono">
            $
            {totalRevenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </header>

      {/* Tabs de filtro */}
      <nav className="flex gap-2 flex-wrap">
        {[
          { key: "todas", label: "Todas" },
          { key: "pending", label: `Pendiente pago (${countMap["PENDING"] ?? 0})` },
          { key: "paid", label: `Pagadas (${countMap["PAID"] ?? 0})` },
          {
            key: "processing",
            label: `Preparando (${countMap["PROCESSING"] ?? 0})`,
          },
          { key: "shipped", label: `Enviadas (${countMap["SHIPPED"] ?? 0})` },
          {
            key: "delivered",
            label: `Entregadas (${countMap["DELIVERED"] ?? 0})`,
          },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/crm/admin/bot/ordenes${tab.key !== "todas" ? `?status=${tab.key}` : ""}`}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              filterStatus === tab.key
                ? "bg-black text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No hay órdenes con ese filtro
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Orden</th>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Items</th>
                <th className="text-right px-3 py-2 font-medium">Total</th>
                <th className="text-left px-3 py-2 font-medium">Pago</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Creada</th>
                <th className="text-right px-3 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const label = STATUS_LABEL[o.status] ?? {
                  label: o.status,
                  color: "bg-slate-100",
                };
                return (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {o.orderNumber}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {o.customerPhone}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {o.items.slice(0, 2).map((i) => (
                        <div key={i.id}>
                          {i.quantity} {i.unit ?? ""} {i.title}
                        </div>
                      ))}
                      {o.items.length > 2 && (
                        <div className="text-slate-400">
                          +{o.items.length - 2} más
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      $
                      {o.total.toLocaleString("es-MX", {
                        minimumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs uppercase">
                      {o.paymentMethod}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${label.color}`}
                      >
                        {label.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <OrdenesActions
                        orderId={o.id}
                        currentStatus={o.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
