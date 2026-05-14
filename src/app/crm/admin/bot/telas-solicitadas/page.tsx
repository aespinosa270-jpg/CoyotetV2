/**
 * Página: Telas Solicitadas (que NO manejamos)
 *
 * Lista agregada de telas que clientes han pedido y no están en catálogo.
 * Útil para decidir qué agregar al catálogo basado en demanda real.
 */
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TelasSolicitadasPage() {
  // Agregado por tela
  const agregado = await prisma.telaNoManejada.groupBy({
    by: ["telaIdentificada"],
    _count: true,
    _sum: { cantidadKg: true },
    orderBy: { _count: { telaIdentificada: "desc" } },
  });

  // Solicitudes recientes
  const recientes = await prisma.telaNoManejada.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Inteligencia de catálogo
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          Telas que <span className="text-[#FDCB02]">NO</span> manejamos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Clientes nos piden estas telas. Considera agregarlas al catálogo si
          hay demanda recurrente.
        </p>
      </header>

      {/* Agregado por tela */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Telas más solicitadas</h2>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {agregado.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Sin solicitudes todavía
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Tela</th>
                  <th className="text-right px-4 py-2 font-medium">
                    Solicitudes
                  </th>
                  <th className="text-right px-4 py-2 font-medium">
                    KG totales
                  </th>
                </tr>
              </thead>
              <tbody>
                {agregado.map((row: any) => (
                  <tr key={row.telaIdentificada} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium capitalize">
                      {row.telaIdentificada}
                    </td>
                    <td className="px-4 py-2 text-right">{row._count}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row._sum.cantidadKg
                        ? `${row._sum.cantidadKg.toLocaleString("es-MX")} kg`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Detalles recientes */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Solicitudes recientes</h2>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {recientes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Vacío</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                  <th className="text-left px-4 py-2 font-medium">Tela</th>
                  <th className="text-left px-4 py-2 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium">Cant/uso</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2 font-medium capitalize">
                      {r.telaIdentificada}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">{r.clienteNombre ?? "—"}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {r.clientePhone}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.cantidadKg ? `${r.cantidadKg}kg ` : ""}
                      {r.frecuencia && (
                        <span className="text-slate-500">({r.frecuencia})</span>
                      )}
                      {r.usoFinal && (
                        <div className="text-slate-400 text-xs">
                          → {r.usoFinal}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
