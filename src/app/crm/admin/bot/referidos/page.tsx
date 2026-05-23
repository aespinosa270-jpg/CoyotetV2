import { getReferralsDashboard } from "@/lib/bot/repositories/referrals-dashboard";

export const dynamic = "force-dynamic";

function formatMxn(n: number): string {
  return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  converted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-neutral-100 text-neutral-600",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Pendiente",
  converted: "✓ Convertido",
  rejected: "✗ Rechazado",
};

export default async function ReferidosPage() {
  const data = await getReferralsDashboard();

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎁</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Programa de Referidos
          </h1>
        </div>
        <p className="text-sm text-neutral-600 max-w-3xl">
          Referido nuevo recibe <strong>$500 MXN</strong> en su primera orden (min $5K).
          Quien refiere gana <strong>$200 MXN</strong> de crédito por cada conversión.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="text-xs font-semibold uppercase text-blue-700">Total Referidos</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{data.stats.totalReferrals}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-xs font-semibold uppercase text-amber-700">Pendientes</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{data.stats.pending}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs font-semibold uppercase text-emerald-700">Convertidos</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{data.stats.converted}</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
          <div className="text-xs font-semibold uppercase text-purple-700">$ Otorgado total</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {formatMxn(data.stats.totalCreditOtorgado)}
          </div>
        </div>
        <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-4">
          <div className="text-xs font-semibold uppercase text-pink-700">$ Por reclamar</div>
          <div className="text-2xl font-bold text-pink-900 mt-1">
            {formatMxn(data.stats.totalCreditDisponible)}
          </div>
        </div>
      </section>

      {/* Top Referrers */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-bold uppercase text-neutral-800 mb-3">
          🌟 Top Referrers
        </h2>
        {data.topReferrers.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">Aún no hay referrers activos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-600 border-b">
                <tr>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Código</th>
                  <th className="pb-2 text-right">Total invitados</th>
                  <th className="pb-2 text-right">Convertidos</th>
                  <th className="pb-2 text-right">Ganado</th>
                  <th className="pb-2 text-right">Saldo actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.topReferrers.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-2">
                      <div className="font-medium text-neutral-900">{r.name ?? "Sin nombre"}</div>
                      <div className="text-xs text-neutral-500">{r.phone ?? "—"}</div>
                    </td>
                    <td className="py-2 font-mono text-xs">{r.referralCode ?? "—"}</td>
                    <td className="py-2 text-right">{r.totalReferred}</td>
                    <td className="py-2 text-right text-emerald-700 font-semibold">{r.totalConverted}</td>
                    <td className="py-2 text-right text-purple-700 font-semibold">
                      {formatMxn(r.totalEarned)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={r.currentBalance > 0 ? "text-pink-700 font-bold" : "text-neutral-400"}>
                        {formatMxn(r.currentBalance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Referrals recientes */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-bold uppercase text-neutral-800 mb-3">
          📋 Referrals recientes
        </h2>
        {data.recentReferrals.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            Aún no hay referrals registrados. Cuando un cliente mencione un código, aparecerá aquí.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-600 border-b">
                <tr>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Código</th>
                  <th className="pb-2">Referido</th>
                  <th className="pb-2">Referrer</th>
                  <th className="pb-2 text-right">Orden</th>
                  <th className="pb-2 text-right">Ganado</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.recentReferrals.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-xs text-neutral-600">{formatDate(r.createdAt)}</td>
                    <td className="py-2 font-mono text-xs">{r.codeUsed}</td>
                    <td className="py-2">
                      <div className="font-medium text-neutral-900">{r.refereeName ?? "—"}</div>
                      <div className="text-xs text-neutral-500">{r.refereePhone ?? ""}</div>
                    </td>
                    <td className="py-2 text-neutral-900">{r.referrerName ?? "—"}</td>
                    <td className="py-2 text-right text-neutral-700">
                      {r.orderTotal ? formatMxn(r.orderTotal) : "—"}
                    </td>
                    <td className="py-2 text-right text-purple-700 font-semibold">
                      {r.creditEarned > 0 ? formatMxn(r.creditEarned) : "—"}
                    </td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? "bg-neutral-100"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}