"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface OrderStats {
  pedidosPagados: number; ventasTotales: number; ordenesPendientes: number;
  montoPorCobrar: number; ventas7dMonto: number; ventas7dCount: number;
}
interface Escalacion { id: string; phone: string; nombre: string | null; razon: string; contexto: string | null; createdAt: string; }
interface Obj { label: string; total: number; clientesAfectados: number; }

const RAZON: Record<string, { label: string; emoji: string }> = {
  alto_valor: { label: "Pedido grande", emoji: "💰" },
  humano: { label: "Pide humano", emoji: "🙋" },
  queja: { label: "Queja", emoji: "😠" },
  frustracion: { label: "Cliente molesto", emoji: "😤" },
  facturacion: { label: "Facturacion", emoji: "📄" },
  retries: { label: "Bot atorado", emoji: "🤖" },
  precio: { label: "Objecion de precio", emoji: "🏷️" },
};
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");
const AV = ["linear-gradient(135deg,#36d6a0,#3db8ff)","linear-gradient(135deg,#ff6ba6,#ff6b6b)","linear-gradient(135deg,#ffb340,#ff6ba6)","linear-gradient(135deg,#7c5cff,#3db8ff)","linear-gradient(135deg,#9d7bff,#ff6ba6)"];

function horas(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "ahora";
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}
function inicial(n: string | null, p: string) { return (n || "").trim()[0]?.toUpperCase() ?? p.slice(-2, -1) ?? "?"; }

function useCountUp(target: number, dur = 900) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const s = performance.now(); const f = from.current; let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - s) / dur); const e = 1 - Math.pow(1 - p, 3);
      setV(f + (target - f) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}
function Num({ value, money }: { value: number; money?: boolean }) {
  const v = useCountUp(value);
  return <>{money ? fmt(v) : Math.round(v).toLocaleString("es-MX")}</>;
}

export default function HoyBoard({ orders, mensajesHoy, escalaciones, topObjecion }: { orders: OrderStats; mensajesHoy: number; escalaciones: Escalacion[]; topObjecion: Obj | null; }) {
  const urgentes = escalaciones.length;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos dias" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  let frase: React.ReactNode;
  if (urgentes > 0) {
    frase = <>Tienes <b>{urgentes} cosa{urgentes === 1 ? "" : "s"}</b> que necesitan tu mano hoy{orders.montoPorCobrar > 0 ? <> y <b>{fmt(orders.montoPorCobrar)}</b> por cobrar</> : ""}. Las puse en orden de urgencia 👇</>;
  } else if (orders.montoPorCobrar > 0) {
    frase = <>Nada urgente ahora mismo. Tienes <b>{fmt(orders.montoPorCobrar)}</b> por cobrar en {orders.ordenesPendientes} ordenes — buen momento para darles seguimiento.</>;
  } else {
    frase = <>Todo bajo control 👌 El Coyote esta atendiendo sin pendientes que necesiten tu mano.</>;
  }

  return (
    <div className="hoy">
      <style>{CSS}</style>

      {/* Saludo del Coyote */}
      <div className="hello">
        <div className="face">🐺<span className="liv" /></div>
        <div className="sp">
          <div className="h1">{saludo}, <span>Jack</span> 👋</div>
          <div className="ln">{frase}</div>
          {mensajesHoy > 0 && (
            <div className="msgline">✨ El Coyote contesto <b>{mensajesHoy.toLocaleString("es-MX")}</b> mensaje{mensajesHoy === 1 ? "" : "s"} hoy</div>
          )}
        </div>
      </div>

      {/* KPIs reales con gradientes vivos */}
      <div className="pulse">
        <Link href="/crm/admin/bot/escalaciones" className="pc red">
          <span className="emoji">{urgentes > 0 ? "🔥" : "✅"}</span>
          <div><div className="n"><Num value={urgentes} /></div><div className="k">urgentes ahora</div></div>
        </Link>
        <Link href="/crm/admin/bot/ordenes" className="pc amber">
          <span className="emoji">⏳</span>
          <div><div className="n"><Num value={orders.montoPorCobrar} money /></div><div className="k">por cobrar · {orders.ordenesPendientes} ordenes</div></div>
        </Link>
        <Link href="/crm/admin/pedidos" className="pc green">
          <span className="emoji">💰</span>
          <div><div className="n"><Num value={orders.ventas7dMonto} money /></div><div className="k">vendido (7 dias) · {orders.ventas7dCount} pedidos</div></div>
        </Link>
      </div>

      {/* Que hacer ahora */}
      <div className="th">
        <h2>¿Qué hacer ahora?</h2>
        <span className="by"><span className="p" /> ✨ priorizado por El Coyote</span>
      </div>

      {urgentes === 0 ? (
        <div className="empty">
          <div className="ee">✓</div>
          <div>
            <b>Nada pendiente que necesite tu mano.</b>
            <div className="es">El Coyote esta atendiendo todo. Cuando algo necesite un humano, aparecera aqui.</div>
            {topObjecion && <div className="tip">💡 Mientras tanto: tu objecion #1 es <b>{topObjecion.label}</b> ({topObjecion.clientesAfectados} clientes). <Link href="/crm/admin/bot/objeciones">Revisarla →</Link></div>}
          </div>
        </div>
      ) : (
        <div className="tasks">
          {escalaciones.map((e, i) => {
            const r = RAZON[e.razon] ?? { label: e.razon, emoji: "📌" };
            return (
              <Link key={e.id} href={`/crm/admin/bot/conversaciones/${encodeURIComponent(e.phone)}`} className="task">
                <div className="rank">{i + 1}</div>
                <div className="ava" style={{ background: AV[i % AV.length] }}>{inicial(e.nombre, e.phone)}</div>
                <div className="body">
                  <div className="tt">{e.nombre || e.phone}<span className="pill">{r.emoji} {r.label}</span></div>
                  <div className="why">{e.contexto || "El bot lo escalo: necesita tu atencion."}</div>
                </div>
                <div className="when">{horas(e.createdAt)}</div>
                <div className="go">Atender →</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CSS = `
.hoy{color:#2b2546;max-width:1080px;font-family:var(--font-nunito),system-ui,sans-serif}
.hoy b{font-weight:800}

/* Saludo */
.hoy .hello{display:flex;gap:18px;align-items:center;margin-bottom:28px}
.hoy .face{width:74px;height:74px;border-radius:24px;flex:none;background:linear-gradient(135deg,#ffb340,#ff6ba6);display:grid;place-items:center;font-size:38px;box-shadow:0 14px 30px -10px rgba(255,107,166,.5);position:relative;animation:hoybob 3s ease-in-out infinite}
@keyframes hoybob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.hoy .face .liv{position:absolute;right:-3px;bottom:-3px;width:20px;height:20px;border-radius:50%;background:#36d6a0;border:3px solid #f4f2fb}
.hoy .hello .h1{font-family:var(--font-baloo),sans-serif;font-size:30px;font-weight:800;letter-spacing:-.5px;color:#2b2546;line-height:1.1}
.hoy .hello .h1 span{background:linear-gradient(135deg,#7c5cff,#ff6ba6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hoy .hello .ln{font-size:15.5px;color:#6b6485;margin-top:4px;line-height:1.55;max-width:680px;font-weight:600}
.hoy .hello .ln b{color:#2b2546}
.hoy .hello .msgline{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#7c5cff;background:linear-gradient(135deg,#f0ebff,#fdeef6);border:1.5px solid #e7ddff;padding:5px 12px;border-radius:30px;margin-top:9px}
.hoy .hello .msgline b{color:#7c5cff;font-weight:900}

/* KPIs con gradientes vivos */
.hoy .pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.hoy .pc{display:flex;align-items:center;gap:16px;border-radius:24px;padding:22px 24px;text-decoration:none;transition:transform .25s;color:#fff;position:relative;overflow:hidden;box-shadow:0 12px 30px -16px rgba(43,37,70,.3)}
.hoy .pc:hover{transform:translateY(-4px)}
.hoy .pc::after{content:'';position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);top:-40px;right:-30px}
.hoy .pc .emoji{font-size:30px;position:relative;z-index:1}
.hoy .pc .n{font-family:var(--font-baloo),sans-serif;font-size:32px;font-weight:800;line-height:1;position:relative;z-index:1}
.hoy .pc .k{font-size:12.5px;font-weight:700;margin-top:4px;opacity:.95;position:relative;z-index:1}
.hoy .pc.red{background:linear-gradient(135deg,#ff6b6b,#ff9a6b)}
.hoy .pc.amber{background:linear-gradient(135deg,#ffb340,#ffd16b)}
.hoy .pc.green{background:linear-gradient(135deg,#36d6a0,#3db8ff)}

/* Titulo seccion */
.hoy .th{display:flex;align-items:center;gap:10px;margin-bottom:5px}
.hoy .th h2{font-family:var(--font-baloo),sans-serif;font-size:22px;font-weight:700;color:#2b2546}
.hoy .th .by{margin-left:auto;font-size:12px;font-weight:800;color:#7c5cff;background:#f0ebff;padding:6px 13px;border-radius:20px;display:flex;align-items:center;gap:6px}
.hoy .th .by .p{width:7px;height:7px;border-radius:50%;background:#36d6a0;box-shadow:0 0 7px #36d6a0}

/* Tareas */
.hoy .tasks{margin-top:16px;display:flex;flex-direction:column;gap:12px}
.hoy .task{display:flex;align-items:center;gap:16px;background:#fff;border:1.5px solid #f0ecfa;border-radius:22px;padding:18px 20px;text-decoration:none;transition:all .25s;box-shadow:0 8px 22px -16px rgba(43,37,70,.18)}
.hoy .task:hover{transform:translateX(4px);border-color:#ddd2f7;box-shadow:0 14px 30px -16px rgba(124,92,255,.3)}
.hoy .task .rank{width:34px;height:34px;border-radius:12px;flex:none;display:grid;place-items:center;font-family:var(--font-baloo),sans-serif;font-weight:800;font-size:16px;background:linear-gradient(135deg,#7c5cff,#3db8ff);color:#fff}
.hoy .task .ava{width:46px;height:46px;border-radius:15px;flex:none;display:grid;place-items:center;font-weight:800;color:#fff;font-size:18px}
.hoy .task .body{flex:1;min-width:0}
.hoy .task .tt{font-size:15px;font-weight:800;color:#2b2546;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.hoy .task .pill{font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;background:#fff0e0;color:#e8881e}
.hoy .task .why{font-size:13px;color:#8b85a6;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:540px;font-weight:600}
.hoy .task .when{font-size:12px;font-weight:700;color:#8b85a6;flex:none;width:46px;text-align:right}
.hoy .task .go{flex:none;background:linear-gradient(135deg,#7c5cff,#9d7bff);color:#fff;font-weight:800;font-size:13px;padding:11px 20px;border-radius:15px;white-space:nowrap;box-shadow:0 8px 18px -8px rgba(124,92,255,.6)}

/* Empty */
.hoy .empty{display:flex;gap:18px;align-items:flex-start;background:linear-gradient(135deg,#eafaf3,#e6f7ff);border:1.5px solid #c4ecdb;border-radius:22px;padding:24px;margin-top:16px}
.hoy .empty .ee{width:48px;height:48px;border-radius:15px;background:#36d6a0;color:#fff;display:grid;place-items:center;font-size:24px;font-weight:800;flex:none}
.hoy .empty b{color:#2b2546;font-size:15px}
.hoy .empty .es{font-size:13px;color:#6b6485;margin-top:4px;font-weight:600}
.hoy .empty .tip{font-size:13px;color:#2b2546;margin-top:12px;padding-top:12px;border-top:1px solid rgba(54,214,160,.3);font-weight:600}
.hoy .empty .tip a{color:#7c5cff;text-decoration:none;font-weight:800}
@media(max-width:760px){.hoy .pulse{grid-template-columns:1fr}.hoy .task .why{max-width:none}}
`;
