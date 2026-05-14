import Link from "next/link";
import type { ConversacionResumen } from "@/lib/bot/repositories/admin-queries";

interface Props {
  items: ConversacionResumen[];
}

const SEGMENTO_BADGE: Record<string, string> = {
  vip: "bg-purple-100 text-purple-800",
  recurrente: "bg-emerald-100 text-emerald-800",
  nuevo: "bg-blue-100 text-blue-800",
  prospecto: "bg-slate-100 text-slate-700",
  inactivo: "bg-orange-100 text-orange-800",
};

function tempColor(temp: number): string {
  if (temp >= 70) return "text-red-600 font-semibold";
  if (temp >= 50) return "text-orange-600 font-semibold";
  if (temp >= 30) return "text-yellow-600";
  return "text-slate-500";
}

function relativeTime(iso: string): string {
  if (!iso || iso === "1970-01-01T00:00:00.000Z") return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d`;
  const m = Math.floor(d / 30);
  return `${m}mes`;
}

export function ConversacionesTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-slate-200 rounded-md p-8 text-center text-slate-500">
        No hay conversaciones aún. Una vez que el bot procese mensajes,
        aparecerán aquí.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <Th>Teléfono</Th>
            <Th>Nombre</Th>
            <Th>Segmento</Th>
            <Th>Compras</Th>
            <Th>Temp.</Th>
            <Th>Confianza</Th>
            <Th>Táctica</Th>
            <Th>Objeciones</Th>
            <Th>Últ. contacto</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((c) => (
            <tr key={c.phone} className="hover:bg-slate-50">
              <Td>
                <code className="text-xs text-slate-700">{c.phone}</code>
              </Td>
              <Td>{c.nombre}</Td>
              <Td>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${SEGMENTO_BADGE[c.segmento] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {c.segmento}
                </span>
              </Td>
              <Td className="tabular-nums">{c.totalCompras}</Td>
              <Td className={`tabular-nums ${tempColor(c.temperaturaCompra)}`}>
                {c.temperaturaCompra}
              </Td>
              <Td className="tabular-nums text-slate-600">{c.nivelConfianza}</Td>
              <Td className="text-xs text-slate-500">{c.tacticaActual}</Td>
              <Td>
                {c.topObjeciones.length === 0 ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {c.topObjeciones.map((o, i) => (
                      <span
                        key={i}
                        className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded"
                        title={`Peso: ${o.score.toFixed(1)}`}
                      >
                        {o.label}
                      </span>
                    ))}
                  </div>
                )}
              </Td>
              <Td className="text-xs text-slate-500 tabular-nums">
                {relativeTime(c.ultimoContacto)}
              </Td>
              <Td>
                <Link
                  href={`/crm/admin/bot/conversaciones/${encodeURIComponent(c.phone)}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Ver →
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

