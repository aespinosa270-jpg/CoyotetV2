/**
 * Pagina: Ordenes del Bot — rediseno oscuro + cartera + acciones.
 * Muestra ordenes del bot v2, resumen de cartera (por cobrar/cobrado/enviado)
 * y permite marcar pagada / cambiar status desde cada fila.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import OrdenesActions from "./_components/OrdenesActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente pago", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  PAID: { label: "Pagada", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  PROCESSING: { label: "Preparando", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  SHIPPED: { label: "Enviada", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  DELIVERED: { label: "Entregada", cls: "bg-green-500/15 text-green-300 border-green-500/30" },
  CANCELLED: { label: "Cancelada", cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" },
  FAILED: { label: "Fallo", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export default async function OrdenesBotPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params.status ?? "todas";

  const where: any = { source: "bot_v2" };
  if (filterStatus !== "todas") where.status = filterStatus.toUpperCase();

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, user: { select: { name: true, email: true, membershipTier: true } } },
  });

  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { source: "bot_v2" },
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c: any) => [c.status, c._count]));

  // Cartera: sumas por grupo de estado (sobre TODAS las ordenes del bot, no solo el filtro)
  const sums = await prisma.order.groupBy({
    by: ["status"],
    where: { source: "bot_v2" },
    _sum: { total: true },
  });
  const sumByStatus: Record<string, number> = {};
  for (const s of sums) sumByStatus[(s as any).status] = Number((s as any)._sum.total) || 0;

  const porCobrar = sumByStatus["PENDING"] ?? 0;
  const cobrado = (sumByStatus["PAID"] ?? 0) + (sumByStatus["PROCESSING"] ?? 0) + (sumByStatus["SHIPPED"] ?? 0) + (sumByStatus["DELIVERED"] ?? 0);
  const enviado = (sumByStatus["SHIPPED"] ?? 0) + (sumByStatus["DELIVERED"] ?? 0);
  const nPend = countMap["PENDING"] ?? 0;

  const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0 });

  return (
    <div className="orders-dark space-y-6">
      <style>{CSS}</style>

      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Bot v2 — Logistica</p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ordenes del <span className="text-amber-400">Bot</span></h1>
      </header>

      {/* RESUMEN DE CARTERA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="cartera amber">
          <div className="ck">💰 Por cobrar</div>
          <div className="cv">{fmt(porCobrar)}</div>
          <div className="cs">{nPend} orden{nPend === 1 ? "" : "es"} pendiente{nPend === 1 ? "" : "s"}</div>
        </div>
        <div className="cartera green">
          <div className="ck">✅ Cobrado</div>
          <div className="cv">{fmt(cobrado)}</div>
          <div className="cs">pagadas + en proceso</div>
        </div>
        <div className="cartera violet">
          <div className="ck">🚚 Enviado</div>
          <div className="cv">{fmt(enviado)}</div>
          <div className="cs">en transito + entregadas</div>
        </div>
      </div>

      {/* TABS */}
      <nav className="flex gap-2 flex-wrap">
        {[
          { key: "todas", label: "Todas" },
          { key: "pending", label: `Pendiente pago (${countMap["PENDING"] ?? 0})` },
          { key: "paid", label: `Pagadas (${countMap["PAID"] ?? 0})` },
          { key: "processing", label: `Preparando (${countMap["PROCESSING"] ?? 0})` },
          { key: "shipped", label: `Enviadas (${countMap["SHIPPED"] ?? 0})` },
          { key: "delivered", label: `Entregadas (${countMap["DELIVERED"] ?? 0})` },
        ].map((tab) => (
          <Link key={tab.key}
            href={`/crm/admin/bot/ordenes${tab.key !== "todas" ? `?status=${tab.key}` : ""}`}
            className={`tab ${filterStatus === tab.key ? "on" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* TABLA */}
      <div className="tablewrap">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No hay ordenes con ese filtro</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="tl">Orden</th><th className="tl">Cliente</th><th className="tl">Items</th>
                <th className="tr">Total</th><th className="tl">Pago</th><th className="tl">Status</th>
                <th className="tl">Creada</th><th className="tr">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const lab = STATUS_LABEL[o.status] ?? { label: o.status, cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" };
                return (
                  <tr key={o.id}>
                    <td className="font-mono text-xs text-zinc-400">{o.orderNumber}</td>
                    <td><div className="font-semibold text-zinc-100">{o.customerName}</div><div className="text-xs text-zinc-500 font-mono">{o.customerPhone}</div></td>
                    <td className="text-xs text-zinc-300">
                      {o.items.slice(0, 2).map((i) => (<div key={i.id}>{i.quantity} {i.unit ?? ""} {i.title}</div>))}
                      {o.items.length > 2 && <div className="text-zinc-500">+{o.items.length - 2} mas</div>}
                    </td>
                    <td className="tr font-mono font-semibold text-zinc-100">{fmt(o.total)}</td>
                    <td className="text-xs uppercase text-zinc-400">{o.paymentMethod}</td>
                    <td><span className={`chip ${lab.cls}`}>{lab.label}</span></td>
                    <td className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="tr"><OrdenesActions orderId={o.id} currentStatus={o.status} /></td>
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

const CSS = `
.orders-dark{color:#eef1f5}
.orders-dark .cartera{border-radius:16px;padding:18px 20px;border:1px solid #2c323b;background:#1c2026}
.orders-dark .cartera .ck{font-size:12px;color:#6b7480;font-weight:600}
.orders-dark .cartera .cv{font-family:'Space Grotesk',monospace;font-size:30px;font-weight:700;margin-top:8px;line-height:1}
.orders-dark .cartera .cs{font-size:12px;color:#6b7480;margin-top:6px}
.orders-dark .cartera.amber{background:linear-gradient(135deg,rgba(245,166,35,.14),transparent),#1c2026;border-color:rgba(245,166,35,.3)}
.orders-dark .cartera.amber .cv{color:#fbbf24}
.orders-dark .cartera.green{background:linear-gradient(135deg,rgba(52,211,153,.14),transparent),#1c2026;border-color:rgba(52,211,153,.3)}
.orders-dark .cartera.green .cv{color:#34d399}
.orders-dark .cartera.violet{background:linear-gradient(135deg,rgba(139,124,246,.14),transparent),#1c2026;border-color:rgba(139,124,246,.3)}
.orders-dark .cartera.violet .cv{color:#b794f6}
.orders-dark .tab{padding:7px 14px;font-size:13px;border-radius:10px;border:1px solid #2c323b;background:#15181d;color:#aab2bd;transition:.15s;font-weight:500}
.orders-dark .tab:hover{color:#eef1f5;border-color:rgba(245,166,35,.3)}
.orders-dark .tab.on{background:#f5a623;color:#1a1205;border-color:#f5a623;font-weight:700}
.orders-dark .tablewrap{background:#15181d;border:1px solid #2c323b;border-radius:16px;overflow-x:auto}
.orders-dark table th{text-align:left;padding:13px 14px;font-size:11px;font-weight:600;color:#6b7480;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #2c323b;background:#101216}
.orders-dark table th.tr{text-align:right}
.orders-dark table td{padding:13px 14px;border-bottom:1px solid #22272f;vertical-align:top}
.orders-dark table td.tr{text-align:right}
.orders-dark table tr:last-child td{border-bottom:0}
.orders-dark table tbody tr{transition:background .12s}
.orders-dark table tbody tr:hover{background:#1c2026}
.orders-dark .chip{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}
`;
