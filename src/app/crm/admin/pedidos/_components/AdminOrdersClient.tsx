"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, FileText, Phone } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { OrderStatus } from "@prisma/client";

const ETAPAS = [
  { key: "PAID", label: "Por preparar", emoji: "📦", cls: "amber" },
  { key: "PROCESSING", label: "Preparando", emoji: "🔧", cls: "blue" },
  { key: "SHIPPED", label: "Enviadas", emoji: "🚚", cls: "violet" },
  { key: "DELIVERED", label: "Entregadas", emoji: "✅", cls: "green" },
];
const STATUS_INFO: Record<string, { label: string; cls: string; dot: string }> = {
  PAID: { label: "Por preparar", cls: "st-amber", dot: "#fbbf24" },
  PROCESSING: { label: "Preparando", cls: "st-blue", dot: "#5b9dff" },
  SHIPPED: { label: "Enviada", cls: "st-violet", dot: "#b794f6" },
  DELIVERED: { label: "Entregada", cls: "st-green", dot: "#22c55e" },
};
const NEXT: Record<string, { status: string; label: string } | null> = {
  PAID: { status: "PROCESSING", label: "🔧 Preparar" },
  PROCESSING: { status: "SHIPPED", label: "🚚 Marcar enviada" },
  SHIPPED: { status: "DELIVERED", label: "✅ Entregada" },
  DELIVERED: null,
};
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");
const AV = ["#34d399","#fb6f9c","#f5a623","#5b9dff","#b794f6"];
const inicial = (n: string) => (n || "?").trim()[0]?.toUpperCase() ?? "?";
function fecha(d: string) { return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function AdminOrdersClient({ initialOrders }: { initialOrders: any[] }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("PAID");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of initialOrders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [initialOrders]);

  const sums = useMemo(() => {
    const s: Record<string, number> = {};
    for (const o of initialOrders) s[o.status] = (s[o.status] ?? 0) + o.total;
    return s;
  }, [initialOrders]);

  const filtered = useMemo(() => {
    let arr = initialOrders.filter((o) => o.status === filtro);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((o) => (o.orderNumber ?? "").toLowerCase().includes(q) || (o.customerName ?? "").toLowerCase().includes(q));
    }
    return arr;
  }, [initialOrders, filtro, search]);

  const cambiar = (id: string, status: string) => {
    setBusyId(id);
    startTransition(async () => { await updateOrderStatus(id, status as OrderStatus); setBusyId(null); });
  };

  return (
    <div className="ped">
      <style>{CSS}</style>

      {/* Resumen por etapa */}
      <div className="etapas">
        {ETAPAS.map((e) => (
          <button key={e.key} className={`et ${e.cls} ${filtro === e.key ? "on" : ""}`} onClick={() => setFiltro(e.key)}>
            <div className="et-top"><span className="em">{e.emoji}</span><span className="lab">{e.label}</span></div>
            <div className="et-v">{fmt(sums[e.key] ?? 0)}</div>
            <div className="et-c">{counts[e.key] ?? 0} pedido{(counts[e.key] ?? 0) === 1 ? "" : "s"}</div>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="search">
        <Search size={15} className="ico" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por #orden o cliente..." />
      </div>

      {/* Tarjetas de surtido */}
      {filtered.length === 0 ? (
        <div className="empty">No hay pedidos en "{ETAPAS.find((e) => e.key === filtro)?.label}"</div>
      ) : (
        <div className="board">
          {filtered.map((o, idx) => {
            const st = STATUS_INFO[o.status] ?? STATUS_INFO.PAID;
            const next = NEXT[o.status];
            const items = (o.items ?? []) as any[];
            return (
              <div key={o.id} className={`pcard ${busyId === o.id && isPending ? "busy" : ""}`}>
                <div className="pc-top">
                  <div className="cli">
                    <div className="av" style={{ background: AV[idx % AV.length] }}>{inicial(o.customerName)}</div>
                    <div>
                      <div className="nm">{o.customerName || "Sin nombre"}</div>
                      <div className="meta">{o.orderNumber}</div>
                    </div>
                  </div>
                  <span className={`chip ${st.cls}`}><i style={{ background: st.dot }} />{st.label}</span>
                </div>

                {/* Telas a surtir */}
                <div className="surtir">
                  <div className="sh">Surtir</div>
                  {items.length === 0 ? <div className="it muted">Sin detalle de items</div> : items.slice(0, 4).map((i, k) => (
                    <div key={k} className="it"><span className="q">{i.quantity} {i.unit ?? "kg"}</span> {i.title}</div>
                  ))}
                  {items.length > 4 && <div className="more">+{items.length - 4} mas</div>}
                </div>

                <div className="pc-foot">
                  <div className="monto">{fmt(o.total)}<span className="lg">{(o.logisticsType ?? "").split("_")[0] || "—"}</span></div>
                  <div className="right">
                    {o.wantsInvoice && <span className="fact" title="Requiere factura"><FileText size={12} /> Factura</span>}
                    <span className="fch">{fecha(o.createdAt)}</span>
                  </div>
                </div>

                <div className="pc-acts">
                  {next ? (
                    <button className="act go" disabled={isPending} onClick={() => cambiar(o.id, next.status)}>{next.label}</button>
                  ) : (
                    <span className="done">✅ Pedido entregado</span>
                  )}
                  <select value={o.status} disabled={isPending} onChange={(e) => cambiar(o.id, e.target.value)} className="sel">
                    <option value="PAID">Por preparar</option>
                    <option value="PROCESSING">Preparando</option>
                    <option value="SHIPPED">Enviada</option>
                    <option value="DELIVERED">Entregada</option>
                  </select>
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
.ped{color:#eef1f5}
.ped .etapas{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.ped .et{text-align:left;border-radius:16px;padding:16px 18px;border:1px solid #2c323b;background:#15181d;cursor:pointer;transition:.15s}
.ped .et:hover{transform:translateY(-2px)}
.ped .et.on{border-width:2px}
.ped .et-top{display:flex;align-items:center;gap:8px}
.ped .et-top .em{font-size:18px}
.ped .et-top .lab{font-size:12px;color:#6b7480;font-weight:600}
.ped .et-v{font-family:'Space Grotesk',monospace;font-size:24px;font-weight:700;margin-top:8px;line-height:1;color:#eef1f5}
.ped .et-c{font-size:11px;color:#6b7480;margin-top:5px}
.ped .et.amber.on{border-color:#f5a623;background:linear-gradient(135deg,rgba(245,166,35,.16),transparent),#15181d}.ped .et.amber .et-v{color:#fbbf24}
.ped .et.blue.on{border-color:#5b9dff;background:linear-gradient(135deg,rgba(91,157,255,.16),transparent),#15181d}.ped .et.blue .et-v{color:#5b9dff}
.ped .et.violet.on{border-color:#b794f6;background:linear-gradient(135deg,rgba(139,124,246,.16),transparent),#15181d}.ped .et.violet .et-v{color:#b794f6}
.ped .et.green.on{border-color:#22c55e;background:linear-gradient(135deg,rgba(34,197,94,.16),transparent),#15181d}.ped .et.green .et-v{color:#34d399}
.ped .search{position:relative;margin-bottom:20px;max-width:420px}
.ped .search .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#6b7480}
.ped .search input{width:100%;height:44px;background:#15181d;border:1px solid #2c323b;border-radius:13px;padding:0 16px 0 40px;color:#eef1f5;font-size:14px}
.ped .search input:focus{outline:none;border-color:rgba(245,166,35,.5)}
.ped .search input::placeholder{color:#6b7480}
.ped .empty{text-align:center;color:#6b7480;padding:60px;background:#15181d;border:1px solid #2c323b;border-radius:16px}
.ped .board{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.ped .pcard{background:#15181d;border:1px solid #2c323b;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:14px;transition:.15s}
.ped .pcard:hover{border-color:rgba(245,166,35,.35);transform:translateY(-2px)}
.ped .pcard.busy{opacity:.5;pointer-events:none}
.ped .pc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.ped .cli{display:flex;gap:11px;align-items:center;min-width:0}
.ped .cli .av{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;font-weight:700;color:#11131a;font-size:17px}
.ped .cli .nm{font-size:14.5px;font-weight:600;color:#eef1f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.ped .cli .meta{font-size:11px;color:#6b7480;font-family:'Space Grotesk',monospace}
.ped .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:600;white-space:nowrap;border:1px solid}
.ped .chip i{width:6px;height:6px;border-radius:50%}
.ped .st-amber{background:rgba(245,166,35,.12);color:#fbbf24;border-color:rgba(245,166,35,.3)}
.ped .st-blue{background:rgba(91,157,255,.12);color:#5b9dff;border-color:rgba(91,157,255,.3)}
.ped .st-violet{background:rgba(139,124,246,.12);color:#b794f6;border-color:rgba(139,124,246,.3)}
.ped .st-green{background:rgba(34,197,94,.12);color:#34d399;border-color:rgba(34,197,94,.3)}
.ped .surtir{background:#101216;border:1px solid #22272f;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:5px}
.ped .surtir .sh{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#6b7480;font-weight:700;margin-bottom:3px}
.ped .surtir .it{font-size:13.5px;color:#cdd3da}
.ped .surtir .it.muted{color:#6b7480;font-style:italic}
.ped .surtir .it .q{font-weight:700;color:#fbbf24;font-family:'Space Grotesk',monospace}
.ped .surtir .more{font-size:11.5px;color:#6b7480}
.ped .pc-foot{display:flex;justify-content:space-between;align-items:flex-end}
.ped .monto{font-family:'Space Grotesk',monospace;font-size:22px;font-weight:700;color:#eef1f5;display:flex;flex-direction:column}
.ped .monto .lg{font-size:10px;color:#6b7480;font-weight:500;letter-spacing:.5px;margin-top:2px;text-transform:uppercase}
.ped .pc-foot .right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.ped .fact{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#5b9dff;background:rgba(91,157,255,.12);border:1px solid rgba(91,157,255,.25);padding:2px 8px;border-radius:20px}
.ped .fch{font-size:11px;color:#6b7480}
.ped .pc-acts{display:flex;gap:8px;align-items:center;border-top:1px solid #22272f;padding-top:13px}
.ped .act{font-size:13px;font-weight:700;padding:10px 14px;border-radius:11px;cursor:pointer;border:1px solid;transition:.15s;flex:1;white-space:nowrap}
.ped .act.go{background:rgba(245,166,35,.15);color:#fbbf24;border-color:rgba(245,166,35,.35)}
.ped .act.go:hover{background:rgba(245,166,35,.25)}
.ped .done{flex:1;font-size:13px;color:#34d399;font-weight:600;text-align:center}
.ped .sel{flex:none;background:#22272f;color:#aab2bd;border:1px solid #2c323b;border-radius:11px;padding:10px;font-size:12px;cursor:pointer}
.ped .sel:focus{outline:none;border-color:rgba(245,166,35,.4)}
@media(max-width:900px){.ped .etapas{grid-template-columns:repeat(2,1fr)}}
`;
