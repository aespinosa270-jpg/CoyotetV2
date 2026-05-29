"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { ConversacionResumen } from "@/lib/bot/repositories/admin-queries";

interface Props {
  items: ConversacionResumen[];
}

const LEAD_BADGE: Record<
  string,
  { emoji: string; label: string; light: string; dark: string }
> = {
  hot: { emoji: "🔥", label: "Hot", light: "bg-red-100 text-red-700 border-red-200", dark: "dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30" },
  vip: { emoji: "💎", label: "VIP", light: "bg-purple-100 text-purple-700 border-purple-200", dark: "dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30" },
  premium: { emoji: "💰", label: "Premium", light: "bg-amber-100 text-amber-700 border-amber-200", dark: "dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30" },
  precio: { emoji: "💸", label: "Precio", light: "bg-blue-100 text-blue-700 border-blue-200", dark: "dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30" },
  casual: { emoji: "🤷", label: "Casual", light: "bg-slate-100 text-slate-600 border-slate-200", dark: "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" },
  frio: { emoji: "❄️", label: "Frío", light: "bg-cyan-100 text-cyan-700 border-cyan-200", dark: "dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30" },
  curioso: { emoji: "👀", label: "Curioso", light: "bg-emerald-100 text-emerald-700 border-emerald-200", dark: "dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30" },
};

// Colores de avatar generados de forma consistente por nombre
const AVATAR_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-teal-600",
  "from-indigo-500 to-violet-600",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(iso?: string): string {
  if (!iso || iso === "1970-01-01T00:00:00.000Z") return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mes`;
}

type Filtro = "todas" | "sin_responder" | "respondidas" | "calientes";

export function ConversacionesTable({ items }: Props) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [dark, setDark] = useState(false);

  // Inicializar tema desde la clase del <html> (persistencia via localStorage no permitida en artifacts, pero aqui es app real)
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      try { window.localStorage.setItem("coyote-theme", "dark"); } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      try { window.localStorage.setItem("coyote-theme", "light"); } catch {}
    }
  }

  const counts = useMemo(() => {
    const sinResp = items.filter((c) => c.sinResponder).length;
    const calientes = items.filter((c) => c.leadScore === "hot" || c.leadScore === "vip").length;
    return { sinResp, calientes, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filtro === "sin_responder" && !c.sinResponder) return false;
      if (filtro === "respondidas" && c.sinResponder) return false;
      if (filtro === "calientes" && c.leadScore !== "hot" && c.leadScore !== "vip") return false;
      if (!q) return true;
      return [c.phone, c.nombre, c.ultimoMensajeTexto ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, filtro]);

  if (items.length === 0) {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center bg-white dark:bg-slate-900">
        <div className="text-5xl mb-3 opacity-40">💬</div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          No hay conversaciones aún
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Aparecerán aquí cuando el bot procese mensajes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de control ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar nombre, teléfono o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          />
        </div>
        <button
          onClick={toggleDark}
          className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* ── Filtros pill ── */}
      <div className="flex gap-2 flex-wrap">
        <FiltroChip activo={filtro === "todas"} onClick={() => setFiltro("todas")}>
          Todas
          <Count>{counts.total}</Count>
        </FiltroChip>
        <FiltroChip
          activo={filtro === "sin_responder"}
          onClick={() => setFiltro("sin_responder")}
          tone="red"
        >
          🔴 Sin responder
          <Count>{counts.sinResp}</Count>
        </FiltroChip>
        <FiltroChip activo={filtro === "respondidas"} onClick={() => setFiltro("respondidas")}>
          ✓ Respondidas
        </FiltroChip>
        <FiltroChip
          activo={filtro === "calientes"}
          onClick={() => setFiltro("calientes")}
          tone="amber"
        >
          🔥 Calientes
          <Count>{counts.calientes}</Count>
        </FiltroChip>
      </div>

      {/* ── Lista ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Sin resultados para estos filtros.
          </div>
        ) : (
          filtered.map((c, idx) => {
            const leadInfo = c.leadScore ? LEAD_BADGE[c.leadScore] : null;
            const inicial = (c.nombre || "?").charAt(0).toUpperCase();
            const rol = c.ultimoMensajeRole;
            return (
              <Link
                key={c.phone}
                href={`/crm/admin/bot/conversaciones/${encodeURIComponent(c.phone)}`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                className={`group flex items-center gap-3 px-4 py-3.5 transition-all duration-150 animate-[fadeIn_0.3s_ease-out_both] ${
                  c.sinResponder
                    ? "bg-red-50/50 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {/* Punto sin responder */}
                <div className="w-2 shrink-0 flex justify-center">
                  {c.sinResponder && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className={`w-11 h-11 shrink-0 rounded-full bg-gradient-to-br ${avatarColor(
                    c.nombre || c.phone
                  )} flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform`}
                >
                  {inicial}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {c.nombre}
                    </span>
                    {leadInfo && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${leadInfo.light} ${leadInfo.dark}`}
                      >
                        {leadInfo.emoji} {leadInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {rol === "user" && (
                      <span className="text-[11px] font-semibold text-red-500 dark:text-red-400 shrink-0">
                        Cliente:
                      </span>
                    )}
                    {rol === "assistant" && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        Bot:
                      </span>
                    )}
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {c.ultimoMensajeTexto || "Sin mensajes"}
                    </span>
                  </div>
                </div>

                {/* Tiempo + telefono */}
                <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                  <span
                    className={`text-xs ${
                      c.sinResponder
                        ? "text-red-500 dark:text-red-400 font-semibold"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {relativeTime(c.ultimoMensajeAt)}
                  </span>
                  <code className="text-[10px] text-slate-300 dark:text-slate-600">
                    {c.phone}
                  </code>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1">
        Mostrando {filtered.length} de {items.length} · ordenadas por actividad reciente
        <span className="inline-flex items-center gap-1 ml-1">
          · <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> esperan respuesta
        </span>
      </p>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function FiltroChip({
  children,
  activo,
  onClick,
  tone = "slate",
}: {
  children: React.ReactNode;
  activo: boolean;
  onClick: () => void;
  tone?: "slate" | "red" | "amber";
}) {
  const activeBg =
    tone === "red"
      ? "bg-red-500 text-white border-red-500"
      : tone === "amber"
      ? "bg-amber-500 text-white border-amber-500"
      : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100";
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 ${
        activo
          ? activeBg
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-black/10 dark:bg-white/15 text-[10px] font-bold">
      {children}
    </span>
  );
}
