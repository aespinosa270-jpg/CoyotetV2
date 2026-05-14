/**
 * Página: Programaciones de Volumen
 *
 * Lista los acuerdos de volumen que el bot ha registrado con clientes.
 * Logística los confirma y planea producción/inventario en base a esto.
 */
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ESTADO_COLOR: Record<string, string> = {
  propuesta: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  en_curso: "bg-blue-100 text-blue-800",
  completada: "bg-green-100 text-green-900",
  cancelada: "bg-slate-100 text-slate-600",
};

export default async function ProgramacionesPage() {
  const programaciones = await prisma.programacionVolumen.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // KG totales programados por estado
  const totalesPorEstado: Record<string, number> = {};
  for (const p of programaciones) {
    const multiplicador =
      p.periodo === "mensual"
        ? p.duracionMeses
        : p.periodo === "quincenal"
          ? p.duracionMeses * 2
          : p.periodo === "semanal"
            ? p.duracionMeses * 4
            : 1;
    const kgTotales = p.kgPorPeriodo * multiplicador;
    totalesPorEstado[p.estado] = (totalesPorEstado[p.estado] ?? 0) + kgTotales;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Planeación de producción
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          PROGRAMACIONES de <span className="text-[#FDCB02]">VOLUMEN</span>
        </h1>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {["propuesta", "confirmada", "en_curso", "completada"].map((estado) => (
          <div
            key={estado}
            className="bg-white border border-slate-200 rounded-md p-4"
          >
            <p className="text-xs uppercase text-slate-500">{estado}</p>
            <p className="text-2xl font-black font-mono">
              {(totalesPorEstado[estado] ?? 0).toLocaleString("es-MX")}
              <span className="text-sm text-slate-400 ml-1">kg</span>
            </p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {programaciones.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Sin programaciones registradas todavía
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Tela</th>
                <th className="text-right px-3 py-2 font-medium">
                  KG/Periodo
                </th>
                <th className="text-left px-3 py-2 font-medium">Periodo</th>
                <th className="text-left px-3 py-2 font-medium">Inicio</th>
                <th className="text-right px-3 py-2 font-medium">Meses</th>
                <th className="text-left px-3 py-2 font-medium">Estado</th>
                <th className="text-left px-3 py-2 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {programaciones.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.clienteNombre ?? "—"}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {p.clientePhone}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{p.telaTitulo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.kgPorPeriodo.toLocaleString("es-MX")} kg
                  </td>
                  <td className="px-3 py-2 text-xs">{p.periodo}</td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(p.fechaInicio).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-3 py-2 text-right">{p.duracionMeses}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ESTADO_COLOR[p.estado] ?? "bg-slate-100"
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">
                    {p.notas ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
