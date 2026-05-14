/**
 * Análisis agregado de objeciones de toda la cartera.
 *
 * Vista 1 (sin query): grid de cards, una por tipo de objeción, con count
 * de clientes afectados y peso total.
 *
 * Vista 2 (?tipo=precio_alto): drill-down con los 20 clientes con mayor
 * score en esa objeción específica, sus nombres y links al detalle.
 */
import Link from "next/link";
import {
  getDashboardMetrics,
  getObjeccionDrilldown,
} from "@/lib/bot/repositories/admin-queries";
import { OBJECION_LABELS } from "@/lib/bot/intelligence/objections/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function ObjecionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const tipo = params.tipo;

  if (tipo) {
    return <DrillDownView tipo={tipo} />;
  }
  return <OverviewView />;
}

async function OverviewView() {
  const metrics = await getDashboardMetrics();
  const max = metrics.topObjecionesGlobales[0]?.total ?? 1;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Análisis de objeciones
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cuántos clientes objetan qué, y con cuánto peso acumulado.
        </p>
      </header>

      {metrics.topObjecionesGlobales.length === 0 ? (
        <div className="border border-slate-200 rounded-md p-8 text-center text-slate-500 bg-white">
          Sin objeciones detectadas aún. Cuando el bot procese mensajes con
          objeciones, aparecerán aquí.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.topObjecionesGlobales.map((o) => {
              const tipoSlug = findTipoBySlug(o.label) ?? "";
              const pct = max > 0 ? (o.total / max) * 100 : 0;
              return (
                <Link
                  key={o.label}
                  href={`/crm/admin/bot/objeciones?tipo=${encodeURIComponent(tipoSlug)}`}
                  className="bg-white border border-slate-200 rounded-md p-4 hover:border-orange-400 hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-sm font-medium text-slate-900">
                      {o.label}
                    </h3>
                    <span className="text-2xl font-bold text-orange-600 tabular-nums">
                      {o.clientesAfectados}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {o.clientesAfectados === 1 ? "cliente" : "clientes"}{" "}
                    afectados · peso {o.total.toFixed(1)}
                  </p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Ver clientes →
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-3 mt-4">
            <strong>¿Cómo funciona?</strong> Cada mensaje del cliente lo
            clasifica GPT en un tipo de objeción (precio, tiempo, calidad…).
            El peso se acumula con la severidad. Cuando el cliente cambia a
            tono positivo, el peso DECAE automáticamente.
          </div>
        </>
      )}
    </div>
  );
}

async function DrillDownView({ tipo }: { tipo: string }) {
  const drilldown = await getObjeccionDrilldown(tipo, 50);

  return (
    <div className="space-y-4">
      <header>
        <Link
          href="/crm/admin/bot/objeciones"
          className="text-xs text-blue-600 hover:underline"
        >
          ← Volver a vista general
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          {drilldown.label}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {drilldown.clientes.length}{" "}
          {drilldown.clientes.length === 1 ? "cliente afectado" : "clientes afectados"}{" "}
          (top 50 por peso)
        </p>
      </header>

      {drilldown.clientes.length === 0 ? (
        <div className="border border-slate-200 rounded-md p-6 text-center text-slate-500 bg-white">
          No hay clientes con esta objeción activa.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                  Teléfono
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                  Peso
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                  Últ. contacto
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drilldown.clientes.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{c.nombre}</td>
                  <td className="px-3 py-2 text-xs">
                    <code>{c.phone}</code>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-orange-600 font-medium">
                    {c.score.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-slate-500">
                    {c.ultimoContacto
                      ? new Date(c.ultimoContacto).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 w-12">
                    <Link
                      href={`/crm/admin/bot/conversaciones/${encodeURIComponent(c.phone)}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reverse lookup: label → slug
function findTipoBySlug(label: string): string | null {
  for (const [tipo, lbl] of Object.entries(OBJECION_LABELS)) {
    if (lbl === label) return tipo;
  }
  return null;
}
