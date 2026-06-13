"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Item { id: string; quantity: number; unit: string | null; title: string; }
interface Order {
  id: string; orderNumber: string; customerName: string; customerPhone: string;
  total: number; paymentMethod: string; status: string; createdAt: string; items: Item[];
}

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Pendiente pago", cls: "st-amber", dot: "#fbbf24" },
  PAID: { label: "Pagada", cls: "st-green", dot: "#34d399" },
  PROCESSING: { label: "Preparando", cls: "st-blue", dot: "#5b9dff" },
  SHIPPED: { label: "Enviada", cls: "st-violet", dot: "#b794f6" },
  DELIVERED: { label: "Entregada", cls: "st-green2", dot: "#22c55e" },
  CANCELLED: { label: "Cancelada", cls: "st-gray", dot: "#6b7480" },
  FAILED: { label: "Fallo", cls: "st-red", dot: "#fb6f6f" },
};

const FLUJO = [
  { status: "PENDING", label: "Pendiente" },
  { status: "PAID", label: "Pagada" },
  { status: "PROCESSING", label: "Preparando" },
  { status: "SHIPPED", label: "Enviada" },
  { status: "DELIVERED", label: "Entregada" },
];

const FILTROS = [
  { key: "activas", label: "Activas" },
  { key: "PENDING", label: "Por cobrar" },
  { key: "PAID", label: "Pagadas" },
  { key: "PROCESSING", label: "Preparando" },
  { key: "SHIPPED", label: "Enviadas" },
  { key: "DELIVERED", label: "Entregadas" },
  { key: "CANCELLED", label: "Canceladas" },
];

const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0 });

function horas(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function inicial(n: string) { return (n || "?").trim()[0]?.toUpperCase() ?? "?"; }
const AV = ["#34d399","#fb6f9c","#f5a623","#5b9dff","#b794f6"];

export default function OrdenesBoard({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState("activas");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    c.activas = orders.filter((o) => !["CANCELLED", "FAILED"].includes(o.status)).length;
    return c;
  }, [orders]);

  const cartera = useMemo(() => {
    const cobrado = ["PAID","PROCESSING","SHIPPED","DELIVERED"];
    let porCobrar = 0, cob = 0, env = 0, nPend = 0;
    for (const o of orders) {
      if (o.status === "PENDING") { porCobrar += o.total; nPend++; }
      if (cobrado.includes(o.status)) cob += o.total;
      if (["SHIPPED","DELIVERED"].includes(o.status)) env += o.total;
    }
    return { porCobrar, cob, env, nPend };
  }, [orders]);

  const visibles = useMemo(() => {
    if (filtro === "activas") return orders.filter((o) => !["CANCELLED","FAILED"].includes(o.status));
    return orders.filter((o) => o.status === filtro);
  }, [orders, filtro]);

  async function cambiar(id: string, status: string) {
    if (busy) return;
    if (status === "CANCELLED" && !confirm("¿Cancelar esta orden?")) return;
    setBusy(id); setMenuOpen(null);
    try {
      const res = await fetch(`/api/admin/bot/ordenes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
      else { const d = await res.json(); alert("Error: " + (d.error ?? "no se pudo")); }
    } catch (e) { alert("Error: " + e); }
    finally { setBusy(null); }
  }

  return (
    <div className="ob">
      <style>{CSS}</style>

      <header className="obhead">
        <div>
          <p className="eyebrow">Bot v2 — Logistica</p>
          <h1>Ordenes del <span>Bot</span></h1>
        </div>
      </header>

      {/* Cartera */}
      <div className="cartera">
        <div className="cc amber"><div className="k">💰 Por cobrar</div><div className="v">{fmt(cartera.porCobrar)}</div><div className="s">{cartera.nPend} pendientes</div></div>
        <div className="cc green"><div className="k">✅ Cobrado</div><div className="v">{fmt(cartera.cob)}</div><div className="s">pagadas + en proceso</div></div>
        <div className="cc violet"><div className="k">🚚 Enviado</div><div className="v">{fmt(cartera.env)}</div><div className="s">en transito + entregadas</div></div>
      </div>

      {/* Filtros */}
      <div className="filtros">
        {FILTROS.map((f) => (
          <button key={f.key} className={`fl ${filtro === f.key ? "on" : ""}`} onClick={() => setFiltro(f.key)}>
            {f.label}<b>{counts[f.key] ?? 0}</b>
          </button>
        ))}
      </div>

      {/* Tablero de tarjetas */}
      {visibles.length === 0 ? (
        <div className="empty">No hay ordenes en "{FILTROS.find((f) => f.key === filtro)?.label}"</div>
      ) : (
        <div className="board">
          {visibles.map((o, idx) => {
            const st = STATUS[o.status] ?? STATUS.PENDING;
            return (
              <div key={o.id} className={`ocard ${busy === o.id ? "busy" : ""}`}>
                <div className="oc-top">
                  <div className="oc-cliente">
                    <div className="av" style={{ background: AV[idx % AV.length] }}>{inicial(o.customerName)}</div>
                    <div>
                      <div className="nm">{o.customerName || "Sin nombre"}</div>
                      <div className="ph">{o.customerPhone}</div>
                    </div>
                  </div>
                  <span className={`chip ${st.cls}`}><i style={{ background: st.dot }} />{st.label}</span>
                </div>

                <div className="oc-items">
                  {o.items.slice(0, 3).map((i) => (
                    <div key={i.id} className="it"><span className="q">{i.quantity} {i.unit ?? ""}</span> {i.title}</div>
                  ))}
                  {o.items.length > 3 && <div className="more">+{o.items.length - 3} mas</div>}
                </div>

                <div className="oc-foot">
                  <div className="monto">{fmt(o.total)}<span className="pm">{o.paymentMethod}</span></div>
                  <div className="fecha">{horas(o.createdAt)}</div>
                </div>

                {/* Acciones visibles */}
                <div className="oc-acts">
                  {o.status === "PENDING" && (
                    <button className="act pay" disabled={busy === o.id} onClick={() => cambiar(o.id, "PAID")}>✓ Marcar pagada</button>
                  )}
                  {o.status === "PAID" && (
                    <button className="act go" disabled={busy === o.id} onClick={() => cambiar(o.id, "PROCESSING")}>📦 Preparar</button>
                  )}
                  {o.status === "PROCESSING" && (
                    <button className="act go" disabled={busy === o.id} onClick={() => cambiar(o.id, "SHIPPED")}>🚚 Marcar enviada</button>
                  )}
                  {o.status === "SHIPPED" && (
                    <button className="act go" disabled={busy === o.id} onClick={() => cambiar(o.id, "DELIVERED")}>✅ Entregada</button>
                  )}
                  <div className="menu-wrap">
                    <button className="act sec" onClick={() => setMenuOpen(menuOpen === o.id ? null : o.id)}>⋯</button>
                    {menuOpen === o.id && (
                      <div className="menu">
                        {FLUJO.map((f) => (
                          <button key={f.status} disabled={f.status === o.status} onClick={() => cambiar(o.id, f.status)}
                            className={f.status === o.status ? "cur" : ""}>{f.status === o.status ? "● " : ""}{f.label}</button>
                        ))}
                        <div className="sep" />
                        <button className="del" onClick={() => cambiar(o.id, "CANCELLED")}>Cancelar orden</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CSS = `
.ob{color:#eef1f5}
.ob .obhead{margin-bottom:20px}
.ob .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#6b7480}
.ob .obhead h1{font-size:30px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#0f1115}
.ob .obhead h1 span{color:#f5a623}
.ob .cartera{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
.ob .cc{border-radius:16px;padding:16px 18px;border:1px solid #2c323b;background:#1c2026}
.ob .cc .k{font-size:12px;color:#6b7480;font-weight:600}
.ob .cc .v{font-family:'Space Grotesk',monospace;font-size:26px;font-weight:700;margin-top:6px;line-height:1}
.ob .cc .s{font-size:11px;color:#6b7480;margin-top:5px}
.ob .cc.amber{background:linear-gradient(135deg,rgba(245,166,35,.14),transparent),#1c2026;border-color:rgba(245,166,35,.3)}.ob .cc.amber .v{color:#fbbf24}
.ob .cc.green{background:linear-gradient(135deg,rgba(52,211,153,.14),transparent),#1c2026;border-color:rgba(52,211,153,.3)}.ob .cc.green .v{color:#34d399}
.ob .cc.violet{background:linear-gradient(135deg,rgba(139,124,246,.14),transparent),#1c2026;border-color:rgba(139,124,246,.3)}.ob .cc.violet .v{color:#b794f6}
.ob .filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.ob .fl{font-size:13px;padding:8px 14px;border-radius:10px;border:1px solid #2c323b;background:#15181d;color:#aab2bd;font-weight:600;cursor:pointer;transition:.15s}
.ob .fl b{margin-left:7px;opacity:.6;font-weight:700}
.ob .fl:hover{border-color:rgba(245,166,35,.4);color:#eef1f5}
.ob .fl.on{background:#f5a623;color:#1a1205;border-color:#f5a623}
.ob .fl.on b{opacity:.7}
.ob .empty{text-align:center;color:#6b7480;padding:60px;background:#15181d;border:1px solid #2c323b;border-radius:16px}
.ob .board{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
.ob .ocard{background:#15181d;border:1px solid #2c323b;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:14px;transition:.15s}
.ob .ocard:hover{border-color:rgba(245,166,35,.35);transform:translateY(-2px)}
.ob .ocard.busy{opacity:.5;pointer-events:none}
.ob .oc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.ob .oc-cliente{display:flex;gap:11px;align-items:center;min-width:0}
.ob .oc-cliente .av{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;font-weight:700;color:#11131a;font-size:17px}
.ob .oc-cliente .nm{font-size:14.5px;font-weight:600;color:#eef1f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.ob .oc-cliente .ph{font-size:11.5px;color:#6b7480;font-family:'Space Grotesk',monospace}
.ob .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:600;white-space:nowrap;border:1px solid}
.ob .chip i{width:6px;height:6px;border-radius:50%}
.ob .st-amber{background:rgba(245,166,35,.12);color:#fbbf24;border-color:rgba(245,166,35,.3)}
.ob .st-green,.ob .st-green2{background:rgba(52,211,153,.12);color:#34d399;border-color:rgba(52,211,153,.3)}
.ob .st-blue{background:rgba(91,157,255,.12);color:#5b9dff;border-color:rgba(91,157,255,.3)}
.ob .st-violet{background:rgba(139,124,246,.12);color:#b794f6;border-color:rgba(139,124,246,.3)}
.ob .st-gray{background:rgba(107,116,128,.15);color:#9aa3ad;border-color:rgba(107,116,128,.3)}
.ob .st-red{background:rgba(251,111,111,.12);color:#fb6f6f;border-color:rgba(251,111,111,.3)}
.ob .oc-items{background:#101216;border:1px solid #22272f;border-radius:12px;padding:11px 13px;display:flex;flex-direction:column;gap:5px;min-height:56px}
.ob .oc-items .it{font-size:13px;color:#cdd3da}
.ob .oc-items .it .q{font-weight:700;color:#eef1f5;font-family:'Space Grotesk',monospace}
.ob .oc-items .more{font-size:11.5px;color:#6b7480}
.ob .oc-foot{display:flex;justify-content:space-between;align-items:flex-end}
.ob .monto{font-family:'Space Grotesk',monospace;font-size:22px;font-weight:700;color:#eef1f5;display:flex;flex-direction:column}
.ob .monto .pm{font-size:10px;color:#6b7480;font-weight:500;letter-spacing:.5px;margin-top:2px}
.ob .fecha{font-size:11px;color:#6b7480}
.ob .oc-acts{display:flex;gap:8px;align-items:center;border-top:1px solid #22272f;padding-top:13px}
.ob .act{font-size:13px;font-weight:700;padding:10px 14px;border-radius:11px;cursor:pointer;border:1px solid;transition:.15s;flex:1;white-space:nowrap}
.ob .act.pay{background:rgba(52,211,153,.15);color:#34d399;border-color:rgba(52,211,153,.35)}
.ob .act.pay:hover{background:rgba(52,211,153,.25)}
.ob .act.go{background:rgba(245,166,35,.15);color:#fbbf24;border-color:rgba(245,166,35,.35)}
.ob .act.go:hover{background:rgba(245,166,35,.25)}
.ob .act.sec{flex:none;width:42px;background:#22272f;color:#aab2bd;border-color:#2c323b;font-size:18px;line-height:1}
.ob .act.sec:hover{color:#fbbf24;border-color:rgba(245,166,35,.4)}
.ob .menu-wrap{position:relative;flex:none}
.ob .menu{position:absolute;right:0;bottom:48px;z-index:50;width:180px;background:#15181d;border:1px solid #2c323b;border-radius:12px;padding:5px;box-shadow:0 20px 50px -10px rgba(0,0,0,.7)}
.ob .menu button{display:block;width:100%;text-align:left;padding:9px 12px;font-size:13px;color:#cdd3da;background:none;border:none;border-radius:8px;cursor:pointer}
.ob .menu button:hover:not(:disabled){background:#22272f}
.ob .menu button.cur{color:#fbbf24;font-weight:600}
.ob .menu button:disabled{cursor:default}
.ob .menu .sep{height:1px;background:#22272f;margin:5px 0}
.ob .menu .del{color:#fb6f6f}
.ob .menu .del:hover{background:rgba(251,111,111,.1)}
`;
