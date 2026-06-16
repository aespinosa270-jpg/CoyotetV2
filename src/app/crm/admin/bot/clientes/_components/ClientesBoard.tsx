"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LlamarButton from "../../_components/LlamarButton";

interface Cliente {
  phone: string; nombre: string; email: string | null; empresa: string | null;
  totalGastado: number; numPedidos: number; telasFavoritas: string[];
  ultimaCompra: string; diasDesdeUltima: number; primeraCompra: string; ticketPromedio: number;
}
interface Data {
  clientes: Cliente[];
  kpis: { totalClientes: number; ticketPromedioCartera: number; ventasMes: number; mejorCliente: { nombre: string; total: number } | null; };
}

const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type Orden = "gastado" | "reciente" | "inactivo";

export default function ClientesBoard({ data }: { data: Data }) {
  const { clientes, kpis } = data;
  const [orden, setOrden] = useState<Orden>("gastado");
  const [q, setQ] = useState("");

  const lista = useMemo(() => {
    let arr = [...clientes];
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter((c) => c.nombre.toLowerCase().includes(s) || c.phone.includes(s.replace(/\D/g, "")));
    }
    if (orden === "gastado") arr.sort((a, b) => b.totalGastado - a.totalGastado);
    else if (orden === "reciente") arr.sort((a, b) => a.diasDesdeUltima - b.diasDesdeUltima);
    else arr.sort((a, b) => b.diasDesdeUltima - a.diasDesdeUltima);
    return arr;
  }, [clientes, orden, q]);

  return (
    <div className="cli">
      <style>{CSS}</style>

      {/* Cuadros informativos */}
      <div className="kpis">
        <div className="kpi amber"><div className="kl">Clientes</div><div className="kv">{kpis.totalClientes}</div><div className="ks">han comprado</div></div>
        <div className="kpi"><div className="kl">Ticket promedio</div><div className="kv">{fmt(kpis.ticketPromedioCartera)}</div><div className="ks">por pedido</div></div>
        <div className="kpi green"><div className="kl">Ventas del mes</div><div className="kv">{fmt(kpis.ventasMes)}</div><div className="ks">este mes</div></div>
        <div className="kpi"><div className="kl">Mejor cliente</div><div className="kv sm">{kpis.mejorCliente ? kpis.mejorCliente.nombre : "—"}</div><div className="ks">{kpis.mejorCliente ? fmt(kpis.mejorCliente.total) : ""}</div></div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input className="search" placeholder="Buscar por nombre o telefono…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ords">
          <button className={`ord ${orden === "gastado" ? "on" : ""}`} onClick={() => setOrden("gastado")}>💰 Mas gastado</button>
          <button className={`ord ${orden === "reciente" ? "on" : ""}`} onClick={() => setOrden("reciente")}>🕐 Mas reciente</button>
          <button className={`ord ${orden === "inactivo" ? "on" : ""}`} onClick={() => setOrden("inactivo")}>💤 No compra hace mas</button>
        </div>
        <span className="cnt">{lista.length} cliente{lista.length === 1 ? "" : "s"}</span>
      </div>

      {/* Tarjetas */}
      {lista.length === 0 ? (
        <div className="empty"><p className="e1">🤝</p><p>Sin clientes que coincidan.</p></div>
      ) : (
        <div className="board">
          {lista.map((c) => {
            const inactivo = c.diasDesdeUltima > 60;
            const inicial = c.nombre.charAt(0).toUpperCase();
            return (
              <div key={c.phone} className={`card ${inactivo ? "inactivo" : ""}`}>
                <div className="top">
                  <div className="avatar">{inicial}</div>
                  <div className="ident">
                    <div className="nm">{c.nombre}</div>
                    <div className="ph">+{c.phone}</div>
                  </div>
                  {inactivo && <span className="badge-zzz">💤 {c.diasDesdeUltima}d</span>}
                </div>

                <div className="stats">
                  <div className="stat"><div className="sv amber">{fmt(c.totalGastado)}</div><div className="sl">gastado total</div></div>
                  <div className="stat"><div className="sv">{c.numPedidos}</div><div className="sl">pedido{c.numPedidos === 1 ? "" : "s"}</div></div>
                  <div className="stat"><div className="sv">{fmt(c.ticketPromedio)}</div><div className="sl">ticket prom.</div></div>
                </div>

                {c.telasFavoritas.length > 0 && (
                  <div className="telas">
                    <span className="tl">Compra:</span>
                    {c.telasFavoritas.map((t, i) => <span key={i} className="tela">{t}</span>)}
                  </div>
                )}

                <div className="footer">
                  <span className="ultima">Ultima compra: hace {c.diasDesdeUltima === 0 ? "hoy" : c.diasDesdeUltima + "d"}</span>
                </div>

                <div className="acts">
                  <Link href={`/crm/admin/bot/conversaciones/${encodeURIComponent(c.phone)}`} className="act chat">💬 Abrir chat</Link>
                  <LlamarButton phone={c.phone} variant="secondary" size="sm" label="📞" />
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
.cli{color:#eef1f5}
.cli .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.cli .kpi{background:#15181d;border:1px solid #2c323b;border-radius:16px;padding:16px 18px}
.cli .kpi .kl{font-size:11px;color:#6b7480;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.cli .kpi .kv{font-family:'Space Grotesk',monospace;font-size:26px;font-weight:700;margin-top:7px;line-height:1.05}
.cli .kpi .kv.sm{font-size:17px}
.cli .kpi .ks{font-size:11px;color:#6b7480;margin-top:3px}
.cli .kpi.amber{background:linear-gradient(135deg,rgba(245,166,35,.14),transparent),#15181d;border-color:rgba(245,166,35,.3)}.cli .kpi.amber .kv{color:#fbbf24}
.cli .kpi.green{background:linear-gradient(135deg,rgba(52,211,153,.12),transparent),#15181d;border-color:rgba(52,211,153,.3)}.cli .kpi.green .kv{color:#34d399}
.cli .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}
.cli .search{flex:1;min-width:220px;background:#15181d;border:1px solid #2c323b;border-radius:11px;padding:10px 14px;color:#eef1f5;font-size:13px}
.cli .search:focus{outline:none;border-color:rgba(245,166,35,.4)}
.cli .search::placeholder{color:#6b7480}
.cli .ords{display:flex;gap:6px}
.cli .ord{background:#15181d;border:1px solid #2c323b;color:#aab2bd;border-radius:20px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer;transition:.15s}
.cli .ord:hover{color:#eef1f5;border-color:rgba(245,166,35,.4)}
.cli .ord.on{background:#f5a623;color:#1a1205;border-color:#f5a623}
.cli .cnt{font-size:12px;color:#6b7480}
.cli .empty{text-align:center;padding:60px;background:#15181d;border:1px solid #2c323b;border-radius:16px;color:#6b7480}
.cli .empty .e1{font-size:40px;margin-bottom:8px}
.cli .board{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
.cli .card{background:#15181d;border:1px solid #2c323b;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;transition:.15s}
.cli .card:hover{transform:translateY(-2px);border-color:rgba(245,166,35,.3)}
.cli .card.inactivo{border-left:4px solid #fb923c}
.cli .top{display:flex;align-items:center;gap:12px}
.cli .avatar{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#f5a623,#d97706);color:#1a1205;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cli .ident{flex:1;min-width:0}
.cli .ident .nm{font-size:15px;font-weight:700;color:#eef1f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cli .ident .ph{font-size:12px;color:#6b7480;font-family:'Space Grotesk',monospace}
.cli .badge-zzz{font-size:11px;font-weight:700;color:#fb923c;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.3);border-radius:20px;padding:3px 9px;white-space:nowrap}
.cli .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#101216;border:1px solid #22272f;border-radius:12px;padding:12px}
.cli .stat{text-align:center}
.cli .stat .sv{font-family:'Space Grotesk',monospace;font-size:17px;font-weight:700;color:#eef1f5}
.cli .stat .sv.amber{color:#fbbf24}
.cli .stat .sl{font-size:10px;color:#6b7480;margin-top:2px}
.cli .telas{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cli .telas .tl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6b7480;font-weight:700}
.cli .tela{font-size:11.5px;background:#22272f;color:#cdd3da;border-radius:7px;padding:3px 9px}
.cli .footer .ultima{font-size:11.5px;color:#8a939e}
.cli .acts{display:flex;gap:8px;align-items:center;border-top:1px solid #22272f;padding-top:13px}
.cli .act{font-size:13px;font-weight:700;padding:9px 14px;border-radius:11px;cursor:pointer;border:1px solid;text-decoration:none;transition:.15s}
.cli .act.chat{flex:1;text-align:center;background:rgba(91,157,255,.12);color:#5b9dff;border-color:rgba(91,157,255,.3)}
.cli .act.chat:hover{background:rgba(91,157,255,.2)}
`;
