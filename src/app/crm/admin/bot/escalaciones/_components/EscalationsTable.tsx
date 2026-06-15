"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LlamarButton from "../../_components/LlamarButton";

interface Escalation {
  id: string; phone: string; nombre: string | null; razon: string;
  contexto: string; ultimoMsg: string; estado: string;
  atendidaPor: string | null; atendidaAt: Date | string | null; createdAt: Date | string;
}

const RAZON_LABELS: Record<string, string> = {
  queja: "Queja / molestia", humano: "Pide humano", alto_valor: "Pedido alto valor",
  retries: "Bot atorado", frustracion: "Repeticion", facturacion: "Facturacion",
};
const RAZON_EMOJI: Record<string, string> = {
  queja: "😠", humano: "👤", alto_valor: "💰", retries: "🤖", frustracion: "😤", facturacion: "📄",
};
// Color del acento por razon
const RAZON_ACCENT: Record<string, { cls: string; dot: string }> = {
  queja: { cls: "ac-red", dot: "#fb6f6f" },
  frustracion: { cls: "ac-orange", dot: "#fb923c" },
  alto_valor: { cls: "ac-amber", dot: "#fbbf24" },
  humano: { cls: "ac-blue", dot: "#5b9dff" },
  facturacion: { cls: "ac-slate", dot: "#94a3b8" },
  retries: { cls: "ac-violet", dot: "#b794f6" },
};
// Orden de urgencia: enojo/queja primero
const URGENCIA: Record<string, number> = {
  queja: 0, frustracion: 1, alto_valor: 2, humano: 3, retries: 4, facturacion: 5,
};

export default function EscalationsTable({ items: initialItems }: { items: Escalation[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Escalation[]>(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("pendiente");
  const [filterRazon, setFilterRazon] = useState<string>("todas");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { refreshList(); }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  async function refreshList() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/bot/escalaciones?take=500");
      const data = await res.json();
      if (data.items) { setItems(data.items); setLastRefresh(new Date()); }
    } catch (err) { console.error("Error refreshing escalations:", err); }
    finally { setRefreshing(false); }
  }

  const filtered = useMemo(() => {
    const arr = items.filter((e) => {
      if (filterEstado !== "todos" && e.estado !== filterEstado) return false;
      if (filterRazon !== "todas" && e.razon !== filterRazon) return false;
      return true;
    });
    // Urgentes primero, luego mas recientes
    return arr.sort((a, b) => {
      const ua = URGENCIA[a.razon] ?? 9, ub = URGENCIA[b.razon] ?? 9;
      if (ua !== ub) return ua - ub;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, filterEstado, filterRazon]);

  const countsByRazon = useMemo(() => {
    const counts: Record<string, number> = { todas: 0 };
    for (const e of items) {
      if (e.estado !== "pendiente") continue;
      counts.todas++;
      counts[e.razon] = (counts[e.razon] || 0) + 1;
    }
    return counts;
  }, [items]);

  const stats = useMemo(() => {
    let pend = 0, aten = 0, desc = 0;
    for (const e of items) {
      if (e.estado === "pendiente") pend++;
      else if (e.estado === "atendida") aten++;
      else if (e.estado === "descartada") desc++;
    }
    return { pend, aten, desc };
  }, [items]);

  async function handleAtender(id: string, phone: string, goToConv: boolean) {
    if (busy) return;
    if (goToConv) {
      setBusy(id);
      try {
        const res = await fetch(`/api/admin/bot/escalaciones/${id}/atender`, { method: "POST" });
        if (res.ok) {
          try { await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/take-over`, { method: "POST" }); }
          catch (err) { console.warn("No se pudo tomar control auto:", err); }
          router.push(`/crm/admin/bot/conversaciones/${encodeURIComponent(phone)}`);
        }
      } finally { setBusy(null); }
    } else {
      if (!confirm("¿Marcar como atendida? Esto la quita de pendientes.")) return;
      setBusy(id);
      try {
        const res = await fetch(`/api/admin/bot/escalaciones/${id}/atender`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) alert(`Error: ${data.error}`); else await refreshList();
      } finally { setBusy(null); }
    }
  }

  async function handleDescartar(id: string) {
    if (busy) return;
    if (!confirm("¿Descartar esta escalacion? Esto la marca como falsa alarma.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/bot/escalaciones/${id}/descartar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(`Error: ${data.error}`); else await refreshList();
    } finally { setBusy(null); }
  }

  const razones = ["queja", "frustracion", "alto_valor", "humano", "retries", "facturacion"];

  return (
    <div className="esc">
      <style>{CSS}</style>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi red"><div className="kl">🔴 Pendientes</div><div className="kv">{stats.pend}</div></div>
        <div className="kpi green"><div className="kl">✅ Atendidas</div><div className="kv">{stats.aten}</div></div>
        <div className="kpi gray"><div className="kl">⏭ Descartadas</div><div className="kv">{stats.desc}</div></div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="sel">
          <option value="pendiente">🔴 Solo pendientes</option>
          <option value="atendida">✅ Solo atendidas</option>
          <option value="descartada">⏭ Solo descartadas</option>
          <option value="todos">📋 Todos los estados</option>
        </select>
        <button onClick={refreshList} disabled={refreshing} className="tbtn">{refreshing ? "⏳..." : "🔄 Actualizar"}</button>
        <label className="auto">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          <span className={autoRefresh ? "on" : ""}>{autoRefresh ? "🟢 Auto (30s)" : "⏸ Pausado"}</span>
        </label>
        <span className="lr">Actualizado: {lastRefresh.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {/* Pills por razon */}
      <div className="pills">
        <button onClick={() => setFilterRazon("todas")} className={`pill ${filterRazon === "todas" ? "on" : ""}`}>
          🌟 Todas {countsByRazon.todas > 0 ? `(${countsByRazon.todas})` : ""}
        </button>
        {razones.map((r) => {
          const count = countsByRazon[r] || 0;
          if (count === 0 && filterRazon !== r) return null;
          return (
            <button key={r} onClick={() => setFilterRazon(r)} className={`pill ${filterRazon === r ? "on" : ""}`}>
              {RAZON_EMOJI[r]} {RAZON_LABELS[r]} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
        <span className="res">{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</span>
      </div>

      {/* Tarjetas */}
      {filtered.length === 0 ? (
        <div className="empty"><p className="e1">🎉</p><p>No hay escalaciones con este filtro.</p></div>
      ) : (
        <div className="board">
          {filtered.map((e) => (
            <EscalationCard key={e.id} esc={e} busy={busy === e.id}
              onAtenderConv={() => handleAtender(e.id, e.phone, true)}
              onAtenderSolo={() => handleAtender(e.id, e.phone, false)}
              onDescartar={() => handleDescartar(e.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EscalationCard({ esc, busy, onAtenderConv, onAtenderSolo, onDescartar }: {
  esc: Escalation; busy: boolean; onAtenderConv: () => void; onAtenderSolo: () => void; onDescartar: () => void;
}) {
  const ac = RAZON_ACCENT[esc.razon] ?? { cls: "ac-slate", dot: "#94a3b8" };
  const tiempo = timeAgo(esc.createdAt);
  const isPending = esc.estado === "pendiente";
  const urgente = esc.razon === "queja" || esc.razon === "frustracion";

  return (
    <div className={`ecard ${ac.cls} ${busy ? "busy" : ""}`}>
      <div className="ec-head">
        <div className="razon">
          <span className="em">{RAZON_EMOJI[esc.razon]}</span>
          <div>
            <p className="rl">{urgente && isPending ? "🔥 " : ""}{RAZON_LABELS[esc.razon] || esc.razon}</p>
            <p className="ta">hace {tiempo}</p>
          </div>
        </div>
        <span className={`est est-${esc.estado}`}>{esc.estado}</span>
      </div>

      <div className="cli">
        <p className="nm">{esc.nombre || "(sin nombre)"}</p>
        <p className="ph">+{esc.phone}</p>
      </div>

      {esc.contexto && (<div className="ctx"><p className="lbl">Contexto</p><p className="txt">{esc.contexto}</p></div>)}
      {esc.ultimoMsg && (<div className="msg"><p className="lbl">Ultimo mensaje</p><p className="txt">"{esc.ultimoMsg}"</p></div>)}
      {esc.atendidaPor && <p className="aten">✅ Atendida por <b>{esc.atendidaPor}</b> · {fmt(esc.atendidaAt!)}</p>}

      <div className="acts">
        {isPending ? (
          <>
            <button onClick={onAtenderConv} disabled={busy} className="act main">{busy ? "..." : "✋ Atender y abrir"}</button>
            <LlamarButton phone={esc.phone} variant="secondary" size="sm" label="📞" />
            <button onClick={onAtenderSolo} disabled={busy} className="act ghost" title="Marcar atendida sin abrir">✓</button>
            <button onClick={onDescartar} disabled={busy} className="act ghost del" title="Descartar">✗</button>
          </>
        ) : (
          <Link href={`/crm/admin/bot/conversaciones/${encodeURIComponent(esc.phone)}`} className="act ver">💬 Ver conversacion</Link>
        )}
      </div>
      <p className="creada">Creada {fmt(esc.createdAt)}</p>
    </div>
  );
}

function fmt(d: Date | string): string {
  try { return new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}
function timeAgo(d: Date | string): string {
  try {
    const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60); if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ${m % 60}min`;
    return `${Math.floor(h / 24)}d`;
  } catch { return "—"; }
}

const CSS = `
.esc{color:#eef1f5}
.esc .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}
.esc .kpi{border-radius:16px;padding:16px 20px;border:1px solid #2c323b;background:#15181d}
.esc .kpi .kl{font-size:12px;color:#6b7480;font-weight:600}
.esc .kpi .kv{font-family:'Space Grotesk',monospace;font-size:30px;font-weight:700;margin-top:6px;line-height:1}
.esc .kpi.red{background:linear-gradient(135deg,rgba(251,111,111,.16),transparent),#15181d;border-color:rgba(251,111,111,.35)}.esc .kpi.red .kv{color:#fb6f6f}
.esc .kpi.green{background:linear-gradient(135deg,rgba(52,211,153,.13),transparent),#15181d;border-color:rgba(52,211,153,.3)}.esc .kpi.green .kv{color:#34d399}
.esc .kpi.gray .kv{color:#aab2bd}
.esc .toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:#15181d;border:1px solid #2c323b;border-radius:13px;padding:12px;margin-bottom:14px}
.esc .sel{background:#22272f;color:#eef1f5;border:1px solid #2c323b;border-radius:9px;padding:8px 12px;font-size:13px;cursor:pointer}
.esc .sel:focus{outline:none;border-color:rgba(245,166,35,.4)}
.esc .tbtn{background:#22272f;color:#aab2bd;border:1px solid #2c323b;border-radius:9px;padding:8px 12px;font-size:13px;cursor:pointer;font-weight:600}
.esc .tbtn:hover{color:#fbbf24;border-color:rgba(245,166,35,.4)}
.esc .auto{display:flex;align-items:center;gap:7px;font-size:13px;color:#6b7480;cursor:pointer}
.esc .auto input{accent-color:#34d399;width:15px;height:15px}
.esc .auto .on{color:#34d399}
.esc .lr{margin-left:auto;font-size:11px;color:#6b7480}
.esc .pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;align-items:center}
.esc .pill{font-size:12.5px;padding:7px 13px;border-radius:20px;border:1px solid #2c323b;background:#15181d;color:#aab2bd;font-weight:600;cursor:pointer;transition:.15s}
.esc .pill:hover{border-color:rgba(245,166,35,.4);color:#eef1f5}
.esc .pill.on{background:#f5a623;color:#1a1205;border-color:#f5a623}
.esc .res{margin-left:auto;font-size:12px;color:#6b7480}
.esc .empty{text-align:center;padding:60px;background:#15181d;border:1px solid #2c323b;border-radius:16px;color:#6b7480}
.esc .empty .e1{font-size:40px;margin-bottom:8px}
.esc .board{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}
.esc .ecard{background:#15181d;border:1px solid #2c323b;border-left-width:4px;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:13px;transition:.15s}
.esc .ecard:hover{transform:translateY(-2px)}
.esc .ecard.busy{opacity:.5;pointer-events:none}
.esc .ac-red{border-left-color:#fb6f6f}
.esc .ac-orange{border-left-color:#fb923c}
.esc .ac-amber{border-left-color:#fbbf24}
.esc .ac-blue{border-left-color:#5b9dff}
.esc .ac-violet{border-left-color:#b794f6}
.esc .ac-slate{border-left-color:#94a3b8}
.esc .ec-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.esc .razon{display:flex;gap:11px;align-items:center}
.esc .razon .em{font-size:26px}
.esc .razon .rl{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#eef1f5}
.esc .razon .ta{font-size:11px;color:#6b7480;margin-top:2px}
.esc .est{font-size:10px;font-weight:700;text-transform:uppercase;padding:4px 10px;border-radius:20px;border:1px solid;white-space:nowrap}
.esc .est-pendiente{background:rgba(251,111,111,.12);color:#fb6f6f;border-color:rgba(251,111,111,.3)}
.esc .est-atendida{background:rgba(52,211,153,.12);color:#34d399;border-color:rgba(52,211,153,.3)}
.esc .est-descartada{background:rgba(107,116,128,.15);color:#9aa3ad;border-color:rgba(107,116,128,.3)}
.esc .cli{background:#101216;border:1px solid #22272f;border-radius:11px;padding:10px 13px}
.esc .cli .nm{font-size:14.5px;font-weight:600;color:#eef1f5}
.esc .cli .ph{font-size:11.5px;color:#6b7480;font-family:'Space Grotesk',monospace}
.esc .ctx,.esc .msg{font-size:13px}
.esc .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#6b7480;font-weight:700;margin-bottom:4px}
.esc .ctx .txt{color:#cdd3da;line-height:1.5}
.esc .msg{border-left:3px solid #2c323b;padding-left:11px}
.esc .msg .txt{color:#aab2bd;font-style:italic}
.esc .aten{font-size:11px;color:#6b7480}
.esc .acts{display:flex;gap:8px;align-items:center;border-top:1px solid #22272f;padding-top:13px;flex-wrap:wrap}
.esc .act{font-size:13px;font-weight:700;padding:10px 14px;border-radius:11px;cursor:pointer;border:1px solid;transition:.15s}
.esc .act.main{flex:1;background:rgba(52,211,153,.15);color:#34d399;border-color:rgba(52,211,153,.35);white-space:nowrap}
.esc .act.main:hover{background:rgba(52,211,153,.25)}
.esc .act.ghost{background:#22272f;color:#aab2bd;border-color:#2c323b;width:40px;text-align:center}
.esc .act.ghost:hover{color:#eef1f5}
.esc .act.ghost.del:hover{color:#fb6f6f;border-color:rgba(251,111,111,.4)}
.esc .act.ver{flex:1;text-align:center;background:rgba(91,157,255,.12);color:#5b9dff;border-color:rgba(91,157,255,.3);text-decoration:none}
.esc .creada{font-size:10px;color:#6b7480;text-align:right}
`;
