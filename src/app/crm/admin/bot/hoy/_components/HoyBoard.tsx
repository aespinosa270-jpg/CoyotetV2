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
const AV = ["#34d399","#fb6f9c","#f5a623","#5b9dff","#b794f6"];

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
        </div>
      </div>

      {/* Semaforo + KPIs reales */}
      <div className="pulse">
        <Link href="/crm/admin/bot/escalaciones" className={`pc ${urgentes > 0 ? "red" : "gray"}`}>
          <span className="emoji">{urgentes > 0 ? "🔴" : "✅"}</span>
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
        <h2>Que hacer ahora</h2>
        <span className="by"><span className="p" /> priorizado por El Coyote</span>
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
.hoy{color:#eef1f5;max-width:1080px}
.hoy .hello{display:flex;gap:18px;align-items:center;margin-bottom:26px}
.hoy .face{width:66px;height:66px;border-radius:19px;flex:none;background:radial-gradient(circle at 32% 30%,#fbbf24,#f5a623);display:grid;place-items:center;font-size:34px;box-shadow:0 12px 32px -10px rgba(245,166,35,.7);position:relative}
.hoy .face .liv{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;background:#34d399;border:3px solid #F8F9FA;box-shadow:0 0 8px #34d399}
.hoy .hello .h1{font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:600;color:#0f1115}
.hoy .hello .h1 span{color:#f5a623}
.hoy .hello .ln{font-size:15px;color:#52606d;margin-top:5px;line-height:1.55;max-width:680px}
.hoy .hello .ln b{color:#0f1115;font-weight:700}
.hoy .pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:30px}
.hoy .pc{display:flex;align-items:center;gap:15px;border-radius:18px;padding:18px 20px;border:1px solid #2c323b;background:#15181d;text-decoration:none;transition:.18s}
.hoy .pc:hover{transform:translateY(-3px);box-shadow:0 16px 40px -16px rgba(0,0,0,.5)}
.hoy .pc .emoji{font-size:28px}
.hoy .pc .n{font-family:'Space Grotesk',monospace;font-size:30px;font-weight:700;line-height:1;color:#eef1f5}
.hoy .pc .k{font-size:12px;color:#6b7480;margin-top:4px}
.hoy .pc.red{background:linear-gradient(135deg,rgba(251,111,111,.16),transparent),#15181d;border-color:rgba(251,111,111,.35)}.hoy .pc.red .n{color:#fb6f6f}
.hoy .pc.amber{background:linear-gradient(135deg,rgba(245,166,35,.15),transparent),#15181d;border-color:rgba(245,166,35,.32)}.hoy .pc.amber .n{color:#fbbf24}
.hoy .pc.green{background:linear-gradient(135deg,rgba(52,211,153,.15),transparent),#15181d;border-color:rgba(52,211,153,.32)}.hoy .pc.green .n{color:#34d399}
.hoy .pc.gray{background:linear-gradient(135deg,rgba(52,211,153,.1),transparent),#15181d;border-color:rgba(52,211,153,.25)}.hoy .pc.gray .n{color:#34d399}
.hoy .th{display:flex;align-items:center;gap:10px;margin-bottom:5px}
.hoy .th h2{font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:600;color:#0f1115}
.hoy .th .by{margin-left:auto;font-size:12px;color:#6b7480;display:flex;align-items:center;gap:6px}
.hoy .th .by .p{width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 7px #34d399}
.hoy .tasks{margin-top:16px;display:flex;flex-direction:column;gap:12px}
.hoy .task{display:flex;align-items:center;gap:18px;background:#15181d;border:1px solid #2c323b;border-radius:18px;padding:18px 20px;text-decoration:none;transition:.15s}
.hoy .task:hover{border-color:rgba(245,166,35,.45);transform:translateX(4px)}
.hoy .task .rank{width:34px;height:34px;border-radius:11px;flex:none;display:grid;place-items:center;font-family:'Space Grotesk',monospace;font-weight:700;font-size:15px;background:#fb6f6f;color:#1a0808}
.hoy .task .ava{width:46px;height:46px;border-radius:13px;flex:none;display:grid;place-items:center;font-weight:700;color:#11131a;font-size:17px}
.hoy .task .body{flex:1;min-width:0}
.hoy .task .tt{font-size:15.5px;font-weight:600;color:#eef1f5;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.hoy .task .pill{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;background:rgba(251,111,111,.15);color:#fb6f6f}
.hoy .task .why{font-size:13px;color:#9aa3ad;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:540px}
.hoy .task .when{font-family:'Space Grotesk',monospace;font-size:12px;color:#6b7480;flex:none;width:46px;text-align:right}
.hoy .task .go{flex:none;background:#f5a623;color:#1a1205;font-weight:700;font-size:13.5px;padding:11px 20px;border-radius:11px;white-space:nowrap}
.hoy .empty{display:flex;gap:18px;align-items:flex-start;background:#15181d;border:1px solid rgba(52,211,153,.25);border-radius:18px;padding:24px;margin-top:16px}
.hoy .empty .ee{width:48px;height:48px;border-radius:14px;background:rgba(52,211,153,.15);color:#34d399;display:grid;place-items:center;font-size:24px;font-weight:700;flex:none}
.hoy .empty b{color:#eef1f5;font-size:15px}
.hoy .empty .es{font-size:13px;color:#9aa3ad;margin-top:4px}
.hoy .empty .tip{font-size:13px;color:#cdd3da;margin-top:12px;padding-top:12px;border-top:1px solid #22272f}
.hoy .empty .tip a{color:#fbbf24;text-decoration:none;font-weight:600}
@media(max-width:760px){.hoy .pulse{grid-template-columns:1fr}.hoy .task .why{max-width:none}}
`;
