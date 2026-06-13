"use client";

/**
 * Pantalla "Hoy" — el copiloto El Coyote te dice qué hacer.
 * Concepto: accion primero. Consume /api/admin/bot/dashboard (ya existente).
 * No toca ninguna otra pantalla. Ruta: /crm/admin/bot/hoy
 */
import { useEffect, useState } from "react";
import Link from "next/link";

interface Escalacion {
  id: string;
  phone: string;
  nombre: string | null;
  razon: string;
  contexto: string | null;
  createdAt: string;
}
interface DashData {
  kpis: {
    ventasHoy: number;
    ordenesHoy: number;
    conversionesHoy: number;
    conversionesChange: number | null;
    mensajesHoy: number;
    escalacionesPendientes: number;
  };
  lastEscalations: Escalacion[];
}

const RAZON_LABEL: Record<string, string> = {
  alto_valor: "Pedido grande",
  humano: "Pide humano",
  queja: "Queja",
  frustracion: "Cliente molesto",
  facturacion: "Facturación",
  retries: "Bot atorado",
  precio: "Objeción de precio",
};

function horasDesde(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "ahora";
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

function inicial(nombre: string | null, phone: string): string {
  const n = (nombre || "").trim();
  if (n) return n[0].toUpperCase();
  return phone.slice(-2, -1) || "?";
}

const AVATARES = [
  "linear-gradient(135deg,#34d399,#1fa877)",
  "linear-gradient(135deg,#fb6f9c,#d04a78)",
  "linear-gradient(135deg,#f5a623,#d4860f)",
  "linear-gradient(135deg,#5b9dff,#3a6fd0)",
  "linear-gradient(135deg,#b794f6,#8a5fd0)",
];

export default function HoyPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verNums, setVerNums] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(d.error || "No se pudo cargar");
      })
      .catch((e) => setError(String(e)));
  }, []);

  const k = data?.kpis;
  const esc = data?.lastEscalations ?? [];
  const ventas = k ? `$${(k.ventasHoy ?? 0).toLocaleString("es-MX")}` : "—";
  const urgentes = k?.escalacionesPendientes ?? 0;

  return (
    <div className="hoy-root">
      <style>{CSS}</style>

      {/* VOZ DEL COYOTE */}
      <div className="coyote-hi">
        <div className="face">🐺</div>
        <div className="speech">
          <div className="hello">Buenas, <span>Jack</span> 👋</div>
          <div className="line">
            {data ? (
              <>Hoy llevamos <b>{ventas}</b> en ventas y cerré <b>{k?.ordenesHoy ?? 0} pedidos</b> solo.{" "}
              {urgentes > 0
                ? <>Te dejé <b>{urgentes} cosa{urgentes === 1 ? "" : "s"}</b> que necesitan tu mano — en orden de urgencia 👇</>
                : <>No hay nada urgente ahora mismo. Todo bajo control 👌</>}</>
            ) : error ? (
              <>No pude cargar tus datos: {error}</>
            ) : (
              <>Cargando lo de hoy…</>
            )}
          </div>
        </div>
      </div>

      {/* SEMÁFORO */}
      <div className="pulse">
        <div className="pcard red"><div className="emoji">🔴</div><div><div className="n">{urgentes}</div><div className="k">urgentes ahora</div></div></div>
        <div className="pcard amb"><div className="emoji">🟡</div><div><div className="n">{k?.mensajesHoy ?? "—"}</div><div className="k">mensajes hoy</div></div></div>
        <div className="pcard grn"><div className="emoji">🟢</div><div><div className="n">{k?.ordenesHoy ?? "—"}</div><div className="k">cerrados hoy</div></div></div>
      </div>

      {/* LISTA DE ACCIONES */}
      <div className="todo-h">
        <h2>Qué hacer ahora</h2>
        <div className="by"><span className="p"></span> priorizado por El Coyote</div>
      </div>
      <div className="todo-sub">Atiende de arriba hacia abajo. Cada tarjeta te lleva directo a la conversación.</div>

      {esc.length === 0 && data && (
        <div className="empty">
          <div className="ee">✓</div>
          <div>
            <b>Nada pendiente que necesite tu mano.</b>
            <div className="es">El Coyote está atendiendo todo. Cuando algo necesite un humano, aparecerá aquí.</div>
          </div>
        </div>
      )}

      {esc.map((e, i) => (
        <Link key={e.id} href={`/crm/admin/bot/conversaciones/${e.phone}`} className="task urgent">
          <div className="rank">{i + 1}</div>
          <div className="ava" style={{ background: AVATARES[i % AVATARES.length] }}>{inicial(e.nombre, e.phone)}</div>
          <div className="body">
            <div className="tt">
              {e.nombre || e.phone}
              <span className="pill red">{RAZON_LABEL[e.razon] || e.razon}</span>
            </div>
            <div className="why">{e.contexto || "El bot lo escaló: necesita tu atención."}</div>
          </div>
          <div className="when">{horasDesde(e.createdAt)}</div>
          <div className="go">Atender →</div>
        </Link>
      ))}

      {/* RACHA */}
      {data && k?.conversionesChange != null && (
        <div className="streak">
          <div className="big">🔥 {k.conversionesChange > 0 ? "+" : ""}{k.conversionesChange}%</div>
          <div className="tx">
            <b>{k.conversionesChange >= 0 ? "Vas mejor que ayer." : "Hoy va más lento que ayer."}</b>{" "}
            El Coyote contestó {k.mensajesHoy} mensajes por ti hoy.
          </div>
        </div>
      )}

      {/* NÚMEROS escondidos */}
      <div className="numbers-toggle">
        <button onClick={() => setVerNums((v) => !v)}>
          {verNums ? "Ocultar números ▲" : "Ver los números completos ▼"}
        </button>
        {verNums && k && (
          <div className="numbers">
            <div className="num"><div className="v">{ventas}</div><div className="l">Ventas hoy</div></div>
            <div className="num"><div className="v">{k.ordenesHoy}</div><div className="l">Pedidos hoy</div></div>
            <div className="num"><div className="v">{k.conversionesHoy}</div><div className="l">Conversiones hoy</div></div>
            <div className="num"><div className="v">{k.escalacionesPendientes}</div><div className="l">Por atender</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.hoy-root{--carbon-900:#0a0b0d;--carbon-800:#15181d;--carbon-700:#1c2026;--carbon-650:#22272f;--line:#2c323b;
  --ambar:#f5a623;--ambar-soft:#fbbf24;--ambar-glow:rgba(245,166,35,.16);--texto:#eef1f5;--texto-2:#aab2bd;--texto-3:#6b7480;
  --verde:#34d399;--verde-glow:rgba(52,211,153,.14);--rojo:#fb6f6f;--rojo-glow:rgba(251,111,111,.14);
  max-width:1080px;margin:0 auto;padding:30px 36px 80px;font-family:Inter,-apple-system,sans-serif;color:var(--texto)}
.hoy-root a{text-decoration:none;color:inherit}
.coyote-hi{display:flex;gap:18px;align-items:flex-start;margin-bottom:30px}
.coyote-hi .face{width:64px;height:64px;border-radius:18px;flex:none;background:radial-gradient(circle at 32% 30%,var(--ambar-soft),var(--ambar));
  display:grid;place-items:center;font-size:34px;box-shadow:0 0 0 1px rgba(245,166,35,.3),0 12px 30px -10px var(--ambar);position:relative}
.coyote-hi .face::after{content:"";position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;background:var(--verde);border:3px solid var(--carbon-900);box-shadow:0 0 8px var(--verde)}
.coyote-hi .speech .hello{font-family:'Space Grotesk',sans-serif;font-size:25px;font-weight:600}
.coyote-hi .speech .hello span{color:var(--ambar-soft)}
.coyote-hi .speech .line{font-size:15px;color:var(--texto-2);margin-top:6px;line-height:1.55}
.coyote-hi .speech .line b{color:var(--texto)}
.pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
.pcard{border-radius:16px;padding:18px 20px;border:1px solid var(--line);background:var(--carbon-700);display:flex;align-items:center;gap:15px}
.pcard .emoji{font-size:30px}.pcard .n{font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:700;line-height:1}
.pcard .k{font-size:13px;color:var(--texto-3);margin-top:3px}
.pcard.red{background:linear-gradient(135deg,var(--rojo-glow),transparent),var(--carbon-700);border-color:rgba(251,111,111,.3)}.pcard.red .n{color:var(--rojo)}
.pcard.amb{background:linear-gradient(135deg,var(--ambar-glow),transparent),var(--carbon-700);border-color:rgba(245,166,35,.3)}.pcard.amb .n{color:var(--ambar-soft)}
.pcard.grn{background:linear-gradient(135deg,var(--verde-glow),transparent),var(--carbon-700);border-color:rgba(52,211,153,.3)}.pcard.grn .n{color:var(--verde)}
.todo-h{display:flex;align-items:center;gap:10px;margin:34px 0 4px}
.todo-h h2{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600}
.todo-h .by{font-size:12px;color:var(--texto-3);margin-left:auto;display:flex;align-items:center;gap:6px}
.todo-h .by .p{width:6px;height:6px;border-radius:50%;background:var(--verde);box-shadow:0 0 7px var(--verde)}
.todo-sub{font-size:13px;color:var(--texto-3);margin-bottom:18px}
.task{display:flex;align-items:center;gap:18px;background:var(--carbon-700);border:1px solid var(--line);
  border-radius:16px;padding:18px 20px;margin-bottom:13px;cursor:pointer;transition:.15s}
.task:hover{border-color:rgba(245,166,35,.4);transform:translateX(3px)}
.task .rank{width:34px;height:34px;border-radius:11px;flex:none;display:grid;place-items:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;background:var(--rojo);color:#1a0808}
.task .ava{width:46px;height:46px;border-radius:13px;flex:none;display:grid;place-items:center;font-weight:700;color:#11131a;font-size:17px}
.task .body{flex:1;min-width:0}
.task .body .tt{font-size:15.5px;font-weight:600;display:flex;align-items:center;gap:9px}
.task .body .tt .pill{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;background:var(--rojo-glow);color:var(--rojo)}
.task .body .why{font-size:13px;color:var(--texto-3);margin-top:4px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:560px}
.task .when{font-family:'Space Grotesk',sans-serif;font-size:12px;color:var(--texto-3);flex:none;width:48px;text-align:right}
.task .go{flex:none;background:var(--ambar);color:#1a1205;font-weight:700;font-size:13.5px;padding:11px 20px;border-radius:11px;white-space:nowrap}
.empty{display:flex;gap:16px;align-items:center;background:var(--carbon-700);border:1px solid rgba(52,211,153,.25);border-radius:16px;padding:24px}
.empty .ee{width:48px;height:48px;border-radius:14px;background:var(--verde-glow);color:var(--verde);display:grid;place-items:center;font-size:24px;font-weight:700}
.empty .es{font-size:13px;color:var(--texto-3);margin-top:4px}
.streak{margin-top:30px;background:linear-gradient(135deg,var(--verde-glow),transparent),var(--carbon-700);border:1px solid rgba(52,211,153,.25);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px}
.streak .big{font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:700;color:var(--verde);white-space:nowrap}
.streak .tx{font-size:14px;color:var(--texto-2);line-height:1.5}.streak .tx b{color:var(--texto)}
.numbers-toggle{margin-top:30px;text-align:center}
.numbers-toggle button{background:var(--carbon-800);border:1px solid var(--line);color:var(--texto-3);font-size:13px;padding:10px 20px;border-radius:11px;cursor:pointer}
.numbers{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-top:16px}
.num{background:var(--carbon-700);border:1px solid var(--line);border-radius:14px;padding:16px 18px;text-align:left}
.num .v{font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700}.num .l{font-size:12px;color:var(--texto-3);margin-top:4px}
@media(max-width:760px){.pulse,.numbers{grid-template-columns:1fr}.task .why{max-width:none}}
`;
