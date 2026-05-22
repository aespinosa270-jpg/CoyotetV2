import type { ExecutiveDashboard } from "@/lib/bot/repositories/executive-dashboard";

function formatMxn(n: number): string {
  return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 }) + " MXN";
}

const TYPE_LABELS: Record<string, string> = {
  post_delivery_7d: "📦 Check D+7",
  re_engagement_30d: "🔄 Re-engagement D+30",
};

export default function ExecutiveSection({ data }: { data: ExecutiveDashboard }) {
  return (
    <div className="space-y-6 mt-8 pt-8 border-t-2 border-amber-300">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎯</span>
        <h2 className="text-xl font-bold text-neutral-900">Command Center</h2>
        <span className="ml-auto text-xs text-neutral-500">Datos en tiempo real</span>
      </div>

      {/* ROW 1: 4 KPIs grandes */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="VENTAS 7 DÍAS"
          value={formatMxn(data.ventas7d.totalRevenue)}
          sublabel={`${data.ventas7d.totalOrders} órdenes`}
          color="emerald"
        />
        <KpiCard
          label="TICKET PROMEDIO"
          value={formatMxn(data.ventas7d.avgTicket)}
          sublabel="por orden"
          color="blue"
        />
        <KpiCard
          label="MENSAJES HOY"
          value={data.eventos24h.messages.toString()}
          sublabel={`${data.eventos24h.conversions} conversiones`}
          color="purple"
        />
        <KpiCard
          label="TRUST PROMEDIO"
          value={`${data.trust.promedio}/100`}
          sublabel={`${data.trust.fans} fans · ${data.trust.riesgo} en riesgo`}
          color={data.trust.promedio >= 70 ? "emerald" : "amber"}
        />
      </section>

      {/* ALERTAS rojas */}
      {(data.alertas.errores > 5 || data.alertas.sinRespuestaUrgente > 0) && (
        <section className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <h3 className="text-sm font-bold uppercase text-red-800 mb-2">🚨 Alertas críticas</h3>
          <ul className="space-y-1 text-sm text-red-900">
            {data.alertas.errores > 5 && (
              <li>• <strong>{data.alertas.errores}</strong> errores en las últimas 24h (revisa logs)</li>
            )}
            {data.alertas.sinRespuestaUrgente > 0 && (
              <li>• <strong>{data.alertas.sinRespuestaUrgente}</strong> contactos VIP sin respuesta &gt;48h</li>
            )}
          </ul>
        </section>
      )}

      {/* ROW 2: Top telas vendidas vs Top telas NO manejadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
          <h3 className="text-sm font-bold uppercase text-emerald-800 mb-3">
            🔥 Top telas vendidas (7d)
          </h3>
          {data.ventas7d.topProducts.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">Sin ventas en los últimos 7 días.</p>
          ) : (
            <ul className="space-y-2">
              {data.ventas7d.topProducts.map((p, i) => (
                <li key={p.title} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-neutral-900">
                    {i + 1}. {p.title}
                  </span>
                  <span className="text-neutral-600 text-xs">
                    {p.qty.toFixed(0)}kg · {formatMxn(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
          <h3 className="text-sm font-bold uppercase text-amber-800 mb-3">
            📋 Telas pedidas que NO vendemos
          </h3>
          {data.telasNoManejadas.top.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">Sin telas externas registradas.</p>
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {data.telasNoManejadas.top.map((t, i) => (
                  <li key={t.tela} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-900 capitalize">
                      {i + 1}. {t.tela}
                    </span>
                    <span className="text-neutral-600 text-xs">
                      {t.count} solicitud{t.count !== 1 ? "es" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 italic">
                Total: {data.telasNoManejadas.totalRegistros} registros · ¿Vale la pena agregar al catálogo?
              </p>
            </>
          )}
        </section>
      </div>

      {/* ROW 3: Aftercare + Sales Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-xl border border-pink-200 bg-pink-50/30 p-5">
          <h3 className="text-sm font-bold uppercase text-pink-800 mb-3">💝 Aftercare</h3>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-700">{data.aftercare.pending}</div>
              <div className="text-xs text-neutral-600">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{data.aftercare.positive}</div>
              <div className="text-xs text-neutral-600">Positivos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">{data.aftercare.complaints}</div>
              <div className="text-xs text-neutral-600">Quejas</div>
            </div>
          </div>
          {data.aftercare.proxima && (
            <p className="text-xs text-pink-900 bg-white rounded p-2">
              <strong>Próximo:</strong> {TYPE_LABELS[data.aftercare.proxima.type] ?? data.aftercare.proxima.type}
              {data.aftercare.proxima.userName && ` · ${data.aftercare.proxima.userName}`}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
          <h3 className="text-sm font-bold uppercase text-blue-800 mb-3">🎯 Sales Agent</h3>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between"><span className="text-neutral-700">Total contactos</span><strong>{data.salesAgent.totalContactos}</strong></li>
            <li className="flex justify-between"><span className="text-neutral-700">High priority (≥60)</span><strong className="text-amber-700">{data.salesAgent.highPriority}</strong></li>
            <li className="flex justify-between"><span className="text-neutral-700">Esperando 1er contacto</span><strong>{data.salesAgent.awaitingFirst}</strong></li>
            <li className="flex justify-between"><span className="text-neutral-700">Contactados</span><strong>{data.salesAgent.contacted}</strong></li>
            <li className="flex justify-between"><span className="text-neutral-700">Convertidos</span><strong className="text-emerald-700">{data.salesAgent.converted}</strong></li>
          </ul>
        </section>

        <section className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
          <h3 className="text-sm font-bold uppercase text-emerald-800 mb-3">🌟 Top Fans</h3>
          {data.trust.topFans.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">Sin clientes con trust events aún.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.trust.topFans.map((f, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="font-medium text-neutral-900 truncate">{f.name ?? "Sin nombre"}</span>
                  <span className="text-neutral-600 text-xs whitespace-nowrap">
                    {f.score}/100 · {formatMxn(f.ltv)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ROW 4: Eventos 24h */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase text-neutral-800 mb-3">⚡ Eventos últimas 24h</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <EventBox label="Mensajes" count={data.eventos24h.messages} color="blue" />
          <EventBox label="Conversiones" count={data.eventos24h.conversions} color="emerald" />
          <EventBox label="Errores" count={data.eventos24h.errors} color="red" />
          <EventBox label="Alucinaciones" count={data.eventos24h.hallucinations} color="amber" />
          <EventBox label="Objeciones" count={data.eventos24h.objections} color="purple" />
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colors = {
    emerald: "border-emerald-300 bg-emerald-50/40 text-emerald-900",
    blue: "border-blue-300 bg-blue-50/40 text-blue-900",
    purple: "border-purple-300 bg-purple-50/40 text-purple-900",
    amber: "border-amber-300 bg-amber-50/40 text-amber-900",
  };
  return (
    <div className={`rounded-xl border-2 p-4 ${colors[color]}`}>
      <div className="text-xs font-semibold uppercase opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sublabel && <div className="text-xs opacity-70 mt-1">{sublabel}</div>}
    </div>
  );
}

function EventBox({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "blue" | "emerald" | "red" | "amber" | "purple";
}) {
  const colors = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
  };
  return (
    <div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{count}</div>
      <div className="text-xs text-neutral-600 uppercase">{label}</div>
    </div>
  );
}