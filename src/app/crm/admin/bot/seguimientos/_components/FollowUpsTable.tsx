"use client";

import Link from "next/link";
import type { FollowUpRecord } from "@/lib/bot/services/followup/followup-repo";

interface Props {
  records: FollowUpRecord[];
}

const TIPO_BADGE: Record<string, { emoji: string; label: string; classes: string }> = {
  carrito_abandonado: {
    emoji: "🛒",
    label: "Carrito",
    classes: "bg-orange-100 text-orange-800 border-orange-300",
  },
  reactivacion_fria: {
    emoji: "❄️",
    label: "Reactivación",
    classes: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
  recompra_predictiva: {
    emoji: "🔮",
    label: "Recompra",
    classes: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

export default function FollowUpsTable({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="border border-slate-200 rounded-md p-8 text-center text-slate-500 bg-white">
        Aún no se han enviado follow-ups automáticos. Los crons corren cada
        hora (carrito) y una vez al día (recompra).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <Th>Cuándo</Th>
            <Th>Tipo</Th>
            <Th>Cliente</Th>
            <Th>Mensaje</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r, i) => {
            const badge = TIPO_BADGE[r.tipo] ?? {
              emoji: "📬",
              label: r.tipo,
              classes: "bg-slate-100 text-slate-700 border-slate-300",
            };
            return (
              <tr key={`${r.phone}-${r.timestamp}-${i}`} className="hover:bg-slate-50">
                <Td className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {relativeTime(r.timestamp)}
                </Td>
                <Td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.classes}`}
                  >
                    {badge.emoji} {badge.label}
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/crm/admin/bot/conversaciones/${encodeURIComponent(r.phone)}`}
                    className="text-blue-600 hover:underline text-xs font-mono"
                  >
                    {r.phone}
                  </Link>
                </Td>
                <Td className="text-xs text-slate-700 max-w-md">
                  <span title={r.mensaje}>
                    {r.mensaje.length > 100 ? r.mensaje.slice(0, 100) + "…" : r.mensaje}
                  </span>
                </Td>
                <Td>
                  {r.convertido ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      ✅ Convertido
                    </span>
                  ) : r.respondido ? (
                    <span className="text-xs text-blue-700">💬 Respondido</span>
                  ) : (
                    <span className="text-xs text-slate-400">⏳ Pendiente</span>
                  )}
                </Td>
              </tr>
            );
          })}
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
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}