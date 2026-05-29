"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ConversacionResumen } from "@/lib/bot/repositories/admin-queries";

interface Props {
  items: ConversacionResumen[];
}

const LEAD_BADGE: Record<string, { emoji: string; label: string; classes: string }> = {
  hot: { emoji: "🔥", label: "Hot", classes: "bg-red-100 text-red-800 border-red-300" },
  vip: { emoji: "💎", label: "VIP", classes: "bg-purple-100 text-purple-800 border-purple-300" },
  premium: { emoji: "💰", label: "Premium", classes: "bg-amber-100 text-amber-800 border-amber-300" },
  precio: { emoji: "💸", label: "Precio", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  casual: { emoji: "🤷", label: "Casual", classes: "bg-slate-100 text-slate-700 border-slate-300" },
  frio: { emoji: "❄️", label: "Frío", classes: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  curioso: { emoji: "👀", label: "Curioso", classes: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

const SEGMENTO_BADGE: Record<string, string> = {
  vip: "bg-purple-100 text-purple-800",
  recurrente: "bg-emerald-100 text-emerald-800",
  nuevo: "bg-blue-100 text-blue-800",
  prospecto: "bg-slate-100 text-slate-700",
  inactivo: "bg-orange-100 text-orange-800",
};

function relativeTime(iso?: string): string {
  if (!iso || iso === "1970-01-01T00:00:00.000Z") return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mes`;
}

type Filtro = "todas" | "sin_responder" | "respondidas";

export function ConversacionesTable({ items }: Props) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const sinResponderCount = useMemo(
    () => items.filter((c) => c.sinResponder).length,
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filtro === "sin_responder" && !c.sinResponder) return false;
      if (filtro === "respondidas" && c.sinResponder) return false;
      if (!q) return true;
      return [c.phone, c.nombre, c.ultimoMensajeTexto ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, filtro]);

  if (items.length === 0) {
    return (
      <div className="border border-slate-200 rounded-md p-8 text-center text-slate-500">
        No hay conversaciones aún.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="🔍 Buscar nombre, teléfono o mensaje..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex gap-1.5">
          <FiltroChip activo={filtro === "todas"} onClick={() => setFiltro("todas")}>
            Todas ({items.length})
          </FiltroChip>
          <FiltroChip
            activo={filtro === "sin_responder"}
            onClick={() => setFiltro("sin_responder")}
            danger
          >
            🔴 Sin responder ({sinResponderCount})
          </FiltroChip>
          <FiltroChip activo={filtro === "respondidas"} onClick={() => setFiltro("respondidas")}>
            ✓ Respondidas
          </FiltroChip>
        </div>
      </div>

      {/* Lista estilo inbox */}
      <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Sin resultados.
          </div>
        ) : (
          filtered.map((c) => {
            const leadInfo = c.leadScore ? LEAD_BADGE[c.leadScore] : null;
            return (
              <Link
                key={c.phone}
                href={`/crm/admin/bot/conversaciones/${encodeURIComponent(c.phone)}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition ${
                  c.sinResponder ? "bg-red-50/40" : ""
                }`}
              >
                {/* Indicador sin responder */}
                <div className="w-2 shrink-0 flex justify-center">
                  {c.sinResponder && (
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" title="Sin responder" />
                  )}
                </div>

                {/* Avatar inicial */}
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  c.sinResponder ? "bg-red-500" : "bg-slate-400"
                }`}>
                  {(c.nombre || "?").charAt(0).toUpperCase()}
                </div>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {c.nombre}
                    </span>
                    {leadInfo && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${leadInfo.classes}`}>
                        {leadInfo.emoji} {leadInfo.label}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${SEGMENTO_BADGE[c.segmento] ?? "bg-slate-100 text-slate-600"}`}>
                      {c.segmento}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.ultimoMensajeRole === "user" && (
                      <span className="text-[11px] text-red-600 font-semibold shrink-0">Cliente:</span>
                    )}
                    {c.ultimoMensajeRole === "assistant" && (
                      <span className="text-[11px] text-slate-400 shrink-0">Bot:</span>
                    )}
                    <span className="text-sm text-slate-500 truncate">
                      {c.ultimoMensajeTexto || "(sin mensajes)"}
                    </span>
                  </div>
                </div>

                {/* Lado derecho: tiempo + telefono */}
                <div className="shrink-0 text-right">
                  <div className={`text-xs ${c.sinResponder ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                    {relativeTime(c.ultimoMensajeAt)}
                  </div>
                  <code className="text-[10px] text-slate-400">{c.phone}</code>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400 px-1">
        Mostrando {filtered.length} de {items.length} conversaciones · Las que esperan respuesta aparecen arriba con 🔴
      </p>
    </div>
  );
}

function FiltroChip({
  children,
  activo,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  activo: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
        activo
          ? danger
            ? "bg-red-500 text-white"
            : "bg-slate-800 text-white"
          : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}