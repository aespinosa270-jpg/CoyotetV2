/**
 * Lista de clientes con pago pendiente identificados por el cron de reminders.
 *
 * El job runRemindersJob marca clientes con `pedidoPendienteFlag: true`.
 * Esta página los lista para que el equipo humano haga seguimiento.
 *
 * Acciones disponibles:
 *  - Enviar plantilla bienvenida (manual, via /api/admin/bot/send-template)
 *  - Limpiar el flag (cuando ya se le dio seguimiento)
 */
import { getRedis } from "@/lib/bot/repositories/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ClientePendiente {
  telefono: string;
  nombre?: string;
  monto?: number;
  fechaFlag?: string;
  ultimoContacto?: string;
  totalCompras?: number;
}

async function fetchPendientes(): Promise<ClientePendiente[]> {
  const redis = getRedis();
  const pendientes: ClientePendiente[] = [];
  let cursor: string | number = 0;

  try {
    do {
      const scanResult = (await redis.scan(cursor as any, {
        match: "v2:cliente:*",
        count: 100,
      })) as [string | number, string[]];
      cursor = scanResult[0];
      const keys = scanResult[1];

      for (const key of keys) {
        try {
          const perfil = await redis.get<any>(key);
          if (!perfil?.pedidoPendienteFlag) continue;

          pendientes.push({
            telefono: perfil.telefono ?? key.replace("v2:cliente:", ""),
            nombre: perfil.nombre,
            monto: perfil.pedidoPendienteMonto,
            fechaFlag: perfil.pedidoPendienteFlagDesde,
            ultimoContacto: perfil.ultimoContacto,
            totalCompras: perfil.totalCompras,
          });
        } catch {}
      }
    } while (cursor !== "0" && cursor !== 0);
  } catch (err) {
    console.error("Error scanning pendientes:", err);
  }

  // Más viejos primero (más urgentes)
  pendientes.sort((a, b) => {
    const aMs = a.fechaFlag ? new Date(a.fechaFlag).getTime() : 0;
    const bMs = b.fechaFlag ? new Date(b.fechaFlag).getTime() : 0;
    return aMs - bMs;
  });

  return pendientes;
}

export default async function PendientesPage() {
  const pendientes = await fetchPendientes();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Clientes con pago pendiente
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Identificados por el cron horario. Pago pendiente {">"} 24h sin
          actividad.
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {pendientes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            🎉 Sin clientes con pagos pendientes
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">
                  Cliente
                </th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">
                  Teléfono
                </th>
                <th className="text-right px-4 py-2 text-slate-600 font-medium">
                  Monto MXN
                </th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">
                  Marcado desde
                </th>
                <th className="text-right px-4 py-2 text-slate-600 font-medium">
                  Compras prev.
                </th>
                <th className="text-right px-4 py-2 text-slate-600 font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((c) => (
                <tr
                  key={c.telefono}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {c.nombre ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {c.telefono}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.monto
                      ? c.monto.toLocaleString("es-MX", {
                          style: "currency",
                          currency: "MXN",
                          minimumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.fechaFlag
                      ? new Date(c.fechaFlag).toLocaleString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.totalCompras ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionButtons telefono={c.telefono} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">¿Cómo usar esta lista?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Enviar plantilla:</strong> manda la plantilla{" "}
            <code className="bg-blue-100 px-1 rounded">bienvenida</code> para
            reabrir la conversación. El cliente responde y el bot v2 retoma
            con su contexto.
          </li>
          <li>
            <strong>Limpiar flag:</strong> cuando ya le diste seguimiento (por
            cualquier medio), borra el flag para que no aparezca de nuevo.
          </li>
          <li>
            <strong>Conversación completa:</strong> entra al historial del
            cliente desde{" "}
            <code className="bg-blue-100 px-1 rounded">
              /crm/admin/bot/conversaciones
            </code>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}

function ActionButtons({ telefono }: { telefono: string }) {
  return (
    <div className="flex gap-1 justify-end">
      {/* Botón Enviar plantilla — usa form action POST al endpoint */}
      <form
        action="/api/admin/bot/send-template"
        method="POST"
        className="inline"
      >
        <input type="hidden" name="telefono" value={telefono} />
        <input type="hidden" name="templateName" value="bienvenida" />
        <button
          type="submit"
          className="text-xs px-3 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
          title="Enviar plantilla 'bienvenida' por WhatsApp"
        >
          📤 Enviar
        </button>
      </form>

      <a
        href={`/crm/admin/bot/conversaciones/${telefono}`}
        className="text-xs px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
      >
        💬 Ver chat
      </a>
    </div>
  );
}
