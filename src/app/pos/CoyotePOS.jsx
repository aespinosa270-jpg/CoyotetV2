"use client";

import { useEffect, useMemo, useState } from "react";

/* ════════════════════════════════════════════════════════════
   COYOTE POS v9 — FÁCIL PARA TODOS
   · Claro y suave, con los colores vivos de Coyote
   · Letra muy grande, botones enormes, pocas opciones a la vez
   · Confirmación clara antes de cobrar
   · Venta por corte y por rollo · persistencia · CRUD · reportes
   ════════════════════════════════════════════════════════════ */

const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Math.random().toString(36).slice(2, 9);
const dateKey = (d) => new Date(d).toISOString().split("T")[0];
const unDia = 86400000;
const LIMITE_MAYOREO = 5; // a partir de 5 unidades, el corte usa precio de mayoreo

/* Colores vivos de Coyote sobre claro. Cada tela su color. */
const TINTES = [
  { bg: "#FF8A3D", ink: "#5A2800", soft: "#FFF1E6" }, // ámbar coyote
  { bg: "#7BC62D", ink: "#284800", soft: "#F1F9E4" }, // verde
  { bg: "#22B8C4", ink: "#003E44", soft: "#E2F7F9" }, // turquesa
  { bg: "#9B6BF0", ink: "#2C0F5E", soft: "#F2EBFE" }, // morado
  { bg: "#FF5C8A", ink: "#5E0A28", soft: "#FFE9F0" }, // rosa
  { bg: "#3D9BF0", ink: "#072E5A", soft: "#E6F1FD" }, // azul
  { bg: "#FFB627", ink: "#523600", soft: "#FFF6E0" }, // amarillo
  { bg: "#2DC48A", ink: "#003E29", soft: "#E2F8EF" }, // esmeralda
];
const tinte = (i) => TINTES[i % TINTES.length];

const DB = {
  load(k, f) { try { const v = localStorage.getItem("coyotepos." + k); return v ? JSON.parse(v) : f; } catch { return f; } },
  save(k, v) { try { localStorage.setItem("coyotepos." + k, JSON.stringify(v)); } catch {} },
};

const SEED_PROD = [
  { id: "p1", sku: "LIL-01X", nombre: "Liluna",       precio: 320, precio_mayoreo: 290, precio_rollo: 270, unidad: "m",  stock_guatemala: 40, minimo: 10, stock_plomo: 150 },
  { id: "p2", sku: "PHX-001", nombre: "Phoenix",      precio: 189, precio_mayoreo: 170, precio_rollo: 155, unidad: "m",  stock_guatemala: 80, minimo: 20, stock_plomo: 120 },
  { id: "p3", sku: "ALG-004", nombre: "Algodón",      precio: 210, precio_mayoreo: 190, precio_rollo: 175, unidad: "kg", stock_guatemala: 45, minimo: 15, stock_plomo: 64  },
  { id: "p4", sku: "DRY-022", nombre: "Dry-Fit Azul", precio: 130, precio_mayoreo: 115, precio_rollo: 105, unidad: "kg", stock_guatemala: 12, minimo: 30, stock_plomo: 210 },
];
const hoyMs = Date.now();
const SEED_MOVS = [
  { id: uid(), tipo: "venta",   fecha: new Date(hoyMs - unDia * 2).toISOString(), monto: 6000, ubicacion: "guatemala", desc: "Venta GT-0102", total_unidades: 25 },
  { id: uid(), tipo: "entrada", fecha: new Date(hoyMs - unDia).toISOString(),     monto: 0,    ubicacion: "plomo",     desc: "Recepción Liluna", total_unidades: 150 },
  { id: uid(), tipo: "venta",   fecha: new Date(hoyMs - 3600000).toISOString(),   monto: 1250, ubicacion: "guatemala", desc: "Venta GT-0103", total_unidades: 6 },
];

/* ──────── Impresión ──────── */
function abrirYImprimir(html, w, h) {
  const win = window.open("", "_blank", `width=${w},height=${h}`);
  if (!win) return alert("Activa las ventanas emergentes para imprimir.");
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}
function imprimirVenta(t) {
  const filas = t.items.map((it) => {
    const etq = it.tipo === "rollo" ? " (rollo)" : (it.cantidad >= 5 ? " (mayoreo)" : "");
    return `<tr><td class="q">${it.cantidad}${it.unidad}</td><td class="n">${it.nombre}${etq}</td><td class="i">${money(it.precio_unit * it.cantidad)}</td></tr>
    <tr class="sub"><td></td><td colspan="2">${money(it.precio_unit)} x ${it.unidad}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.folio}</title>
  <style>@page{size:80mm auto;margin:0}body{width:80mm;padding:4mm;font-family:'Courier New',monospace;font-size:13px;color:#000;font-weight:bold}
  .c{text-align:center}.m{font-size:24px;font-weight:900}.sb{font-size:9px;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin:8px 0}td{vertical-align:top;padding:1px 0}.q{width:20%}.i{text-align:right}.sub td{font-size:9px;color:#444;padding-bottom:3px}
  .tot td{font-size:14px;padding-top:3px}.gr td{font-size:19px;font-weight:900;border-top:2px solid #000;padding-top:5px}.hr{border-top:2px dashed #000;margin:8px 0}</style></head><body>
  <div class="c"><div class="m">COYOTE</div><div class="sb">TELAS DE ALTO RENDIMIENTO</div></div><div class="hr"></div>
  <div>Folio ${t.folio}<br>${t.ubicacion === "guatemala" ? "Sucursal Guatemala" : "Bodega Plomo"}<br>${new Date(t.fecha).toLocaleString("es-MX")}</div>
  <div class="hr"></div><table>${filas}</table><div class="hr"></div>
  <table><tr class="tot"><td>Subtotal</td><td class="i">${money(t.subtotal)}</td></tr>
  ${t.descuentoPct > 0 ? `<tr class="tot"><td>Descuento ${t.descuentoPct}%</td><td class="i">-${money(t.descuentoMonto)}</td></tr>` : ""}
  ${t.conIva ? `<tr class="tot"><td>IVA 16%</td><td class="i">+${money(t.ivaMonto)}</td></tr>` : ""}
  <tr class="gr"><td>TOTAL</td><td class="i">${money(t.total)}</td></tr>
  <tr class="tot"><td>Pago</td><td class="i">${t.metodoPago}</td></tr></table>
  <div class="hr"></div><div class="c">¡Gracias por tu compra!<br>coyotetextil.com</div></body></html>`;
  abrirYImprimir(html, 340, 600);
}
function imprimirCorte(d) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Corte</title>
  <style>@page{size:80mm auto;margin:0}body{width:80mm;padding:4mm;font-family:'Courier New',monospace;font-size:13px;font-weight:bold}
  .c{text-align:center}.t{font-size:15px;background:#000;color:#fff;padding:4px;margin:8px 0;text-align:center}.r{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px}.hr{border-top:2px dashed #000;margin:8px 0}</style></head><body>
  <div class="c"><div style="font-size:22px;font-weight:900">COYOTE</div><div>CORTE DE CAJA</div><div>${d.filtro}</div></div>
  <div class="t">VENTAS</div><div class="r"><span>Tickets</span><span>${d.ventasCount}</span></div><div class="r"><span>Ingresos</span><span>${money(d.ingresos)}</span></div>
  <div class="t">INVENTARIO</div><div class="r"><span>Entradas</span><span>+${d.entradas}</span></div><div class="r"><span>Salidas</span><span>-${d.salidas}</span></div>
  <div class="hr"></div><div class="c" style="font-size:11px">${new Date().toLocaleString("es-MX")}</div></body></html>`;
  abrirYImprimir(html, 340, 600);
}
function exportarPDF(d) {
  const filas = d.movs.map((m) => `<tr><td>${new Date(m.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td><td><b>${m.tipo}</b></td><td>${m.ubicacion}</td><td>${m.desc}</td><td>${m.total_unidades}</td><td class="r"><b>${m.monto > 0 ? money(m.monto) : "—"}</b></td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Coyote</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');body{font-family:'Nunito',sans-serif;color:#222;padding:48px}
  .h{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:5px solid #FF8A3D;padding-bottom:18px;margin-bottom:28px}h1{margin:0;font-size:44px;font-weight:900}.acc{color:#FF8A3D}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:32px}.card{border:3px solid #eee;border-radius:18px;padding:22px}.lbl{font-size:13px;color:#999;text-transform:uppercase;font-weight:700}.val{font-size:36px;font-weight:900;margin-top:4px}
  table{width:100%;border-collapse:collapse}th{background:#FFF1E6;padding:12px;text-align:left;font-size:13px;border-radius:0}td{padding:11px;border-bottom:1px solid #f0f0f0;font-size:13px}.r{text-align:right}</style></head><body>
  <div class="h"><div><h1>COYOTE<span class="acc">.</span></h1><div class="lbl">${d.filtro}</div></div><div style="text-align:right;color:#999;font-size:12px">${new Date().toLocaleString("es-MX")}</div></div>
  <div class="grid"><div class="card"><div class="lbl">Ingresos</div><div class="val" style="color:#4CAF00">${money(d.ingresos)}</div><div>${d.ventasCount} ventas</div></div>
  <div class="card"><div class="lbl">Inventario</div><div style="display:flex;gap:24px;margin-top:6px"><div><div class="lbl">Entradas</div><div class="val" style="color:#22B8C4">+${d.entradas}</div></div><div><div class="lbl">Salidas</div><div class="val" style="color:#FF5C8A">-${d.salidas}</div></div></div></div></div>
  <h3>Movimientos</h3><table><thead><tr><th>FECHA</th><th>TIPO</th><th>SEDE</th><th>DETALLE</th><th>U</th><th class="r">MONTO</th></tr></thead><tbody>${filas}</tbody></table></body></html>`;
  abrirYImprimir(html, 980, 720);
}

/* ════════════ APP ════════════ */
export default function CoyotePOS({ initialProducts }) {
  const [montado, setMontado] = useState(false);
  const [pantalla, setPantalla] = useState("vender");
  // Arranca con los datos base (igual en servidor y navegador, sin desajuste)
  const [productos, setProductos] = useState(initialProducts || SEED_PROD);
  const [historial, setHistorial] = useState(SEED_MOVS);
  const [tickets, setTickets] = useState([]); // ventas completas para reimprimir
  const [ubicacion, setUbicacion] = useState("guatemala");

  // Ya en el navegador: cargamos lo guardado en localStorage
  useEffect(() => {
    if (initialProducts) DB.save("productos", initialProducts); setProductos(DB.load("productos", initialProducts || SEED_PROD));
    setHistorial(DB.load("historial", SEED_MOVS));
    setTickets(DB.load("tickets", []));
    setUbicacion(DB.load("ubicacion", "guatemala"));
    setMontado(true);
  }, []);

  // Guardamos solo después de montar (no pisar datos durante la carga inicial)
  useEffect(() => { if (montado) DB.save("productos", productos); }, [productos, montado]);
  useEffect(() => { if (montado) DB.save("historial", historial); }, [historial, montado]);
  useEffect(() => { if (montado) DB.save("tickets", tickets); }, [tickets, montado]);
  useEffect(() => { if (montado) DB.save("ubicacion", ubicacion); }, [ubicacion, montado]);

  // Hasta que monte en el navegador, no renderizamos (evita el desajuste servidor/cliente)
  if (!montado) return null;

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <div style={S.shell}>
        <TopBar pantalla={pantalla} setPantalla={setPantalla} />
        <main>
          {pantalla === "vender" && <Vender productos={productos} setProductos={setProductos} ubicacion={ubicacion} setUbicacion={setUbicacion} setHistorial={setHistorial} tickets={tickets} setTickets={setTickets} />}
          {pantalla === "admin" && <Admin productos={productos} setProductos={setProductos} setHistorial={setHistorial} />}
          {pantalla === "reportes" && <Reportes historial={historial} productos={productos} />}
        </main>
      </div>
    </div>
  );
}

function TopBar({ pantalla, setPantalla }) {
  const tabs = [["vender", "Vender", "🛒"], ["admin", "Inventario", "📦"], ["reportes", "Reportes", "📊"]];
  return (
    <header style={S.top}>
      <div style={S.brand}>
        <div className="logo">🐺</div>
        <div style={S.brandName}>COYOTE</div>
      </div>
      <nav style={S.nav}>
        {tabs.map(([id, label, ic]) => (
          <button key={id} className={`tab ${pantalla === id ? "tab-on" : ""}`} onClick={() => setPantalla(id)}>
            <span className="tab-ic">{ic}</span>{label}
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ════════════ VENDER ════════════ */
function Vender({ productos, setProductos, ubicacion, setUbicacion, setHistorial, tickets, setTickets }) {
  const [carrito, setCarrito] = useState([]); // array de líneas
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [conIva, setConIva] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [confirmando, setConfirmando] = useState(false);
  const [pesando, setPesando] = useState(null); // producto al que se le captura peso de rollo
  const [verTickets, setVerTickets] = useState(false);
  const [festejo, setFestejo] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const stockEn = (p) => (ubicacion === "guatemala" ? p.stock_guatemala : p.stock_plomo);
  const flash = (t) => { setAviso(t); setTimeout(() => setAviso(null), 2400); };

  // unidades de un producto ya comprometidas en el carrito (suma de cortes y pesos de rollos)
  const consumoDe = (p) => carrito.filter((l) => l.producto.id === p.id).reduce((a, l) => a + l.cantidad, 0);

  // precio unitario del corte según cantidad (mayoreo a partir del límite)
  const precioCorte = (p, cant) => (cant >= LIMITE_MAYOREO ? p.precio_mayoreo : p.precio);

  // CORTE: suma 1 unidad y recalcula el precio de toda la línea (menudeo/mayoreo)
  function agregarCorte(p) {
    
    setCarrito((c) => {
      const i = c.findIndex((l) => l.producto.id === p.id && l.tipo === "corte");
      if (i >= 0) {
        const n = [...c]; const nuevaCant = n[i].cantidad + 1;
        n[i] = { ...n[i], cantidad: nuevaCant, precio_unit: precioCorte(p, nuevaCant) };
        return n;
      }
      return [...c, { lid: uid(), producto: p, tipo: "corte", cantidad: 1, precio_unit: precioCorte(p, 1) }];
    });
  }
  // ROLLO: abre captura de peso
  function pedirPesoRollo(p) { setPesando(p); }
  function agregarRollo(peso) {
    const p = pesando;
    const kg = Number(peso) || 0;
    if (kg <= 0) { setPesando(null); return; }
    
    setCarrito((c) => [...c, { lid: uid(), producto: p, tipo: "rollo", cantidad: kg, precio_unit: p.precio_rollo }]);
    setPesando(null);
  }
  function quitarLinea(lid) {
    setCarrito((c) => {
      const i = c.findIndex((l) => l.lid === lid); if (i < 0) return c;
      const l = c[i];
      if (l.tipo === "corte" && l.cantidad > 1) {
        const nuevaCant = l.cantidad - 1;
        const n = [...c]; n[i] = { ...l, cantidad: nuevaCant, precio_unit: precioCorte(l.producto, nuevaCant) };
        return n;
      }
      return c.filter((x) => x.lid !== lid); // rollo o último corte: se borra entero
    });
  }

  const lineas = carrito;
  const subtotal = lineas.reduce((s, l) => s + l.precio_unit * l.cantidad, 0);
  const descuentoMonto = subtotal * (descuentoPct / 100);
  const baseGravable = subtotal - descuentoMonto;      // primero descuento
  const ivaMonto = conIva ? baseGravable * 0.16 : 0;   // luego IVA sobre lo que queda
  const total = baseGravable + ivaMonto;
  const totalPiezas = lineas.length;

  function confirmarCobro() {
    let unds = 0;
    setProductos((prev) => prev.map((p) => {
      const c = consumoDe(p); if (c === 0) return p; unds += c;
      return ubicacion === "guatemala" ? { ...p, stock_guatemala: +(p.stock_guatemala - c).toFixed(2) } : { ...p, stock_plomo: +(p.stock_plomo - c).toFixed(2) };
    }));
    const folio = (ubicacion === "guatemala" ? "GT" : "PL") + "-" + Math.floor(1000 + Math.random() * 9000);
    const items = lineas.map((l) => ({ nombre: l.producto.nombre, tipo: l.tipo, unidad: l.producto.unidad, cantidad: l.cantidad, precio_unit: l.precio_unit }));
    const ticketCompleto = { folio, ubicacion, items, subtotal, descuentoPct, descuentoMonto, conIva, ivaMonto, total, metodoPago, fecha: new Date().toISOString() };
    imprimirVenta(ticketCompleto);
    setTickets((prev) => [ticketCompleto, ...prev]); // guarda la venta completa para reimprimir
    setHistorial((prev) => [{ id: uid(), tipo: "venta", fecha: ticketCompleto.fecha, monto: total, ubicacion, desc: `Venta ${folio} · ${metodoPago}`, total_unidades: +unds.toFixed(2) }, ...prev]);
    setConfirmando(false);
    setFestejo({ total, folio }); setTimeout(() => setFestejo(null), 2000);
    setCarrito([]); setDescuentoPct(0); setConIva(false);
  }

  // Cancelar una venta: regresa el stock a la sede elegida y marca el ticket como cancelado
  function cancelarVenta(ticket, sedeDestino, motivo) {
    // Regresar cada tela vendida al inventario de la sede destino
    setProductos((prev) => prev.map((p) => {
      const enTicket = ticket.items.filter((it) => it.nombre === p.nombre).reduce((a, it) => a + it.cantidad, 0);
      if (enTicket === 0) return p;
      return sedeDestino === "guatemala"
        ? { ...p, stock_guatemala: +(p.stock_guatemala + enTicket).toFixed(2) }
        : { ...p, stock_plomo: +(p.stock_plomo + enTicket).toFixed(2) };
    }));
    // Marcar el ticket como cancelado
    setTickets((prev) => prev.map((t) => (t.folio === ticket.folio ? { ...t, cancelado: true, motivoCancel: motivo, fechaCancel: new Date().toISOString() } : t)));
    // Registrar en el historial (monto negativo para restar de ingresos)
    const unds = ticket.items.reduce((a, it) => a + it.cantidad, 0);
    setHistorial((prev) => [{ id: uid(), tipo: "cancelada", fecha: new Date().toISOString(), monto: -ticket.total, ubicacion: sedeDestino, desc: `Cancelada ${ticket.folio} · ${motivo}`, total_unidades: +unds.toFixed(2) }, ...prev]);
  }

  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!q) return productos;
    return productos.filter((p) => 
      p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) || 
      p.sku.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    );
  }, [productos, busqueda]);

  return (
    <div style={S.venderGrid}>
      {festejo && <Festejo data={festejo} />}
      {aviso && <Toast texto={aviso} />}
      {pesando && <CapturarPeso prod={pesando} onGuardar={agregarRollo} onCerrar={() => setPesando(null)} />}
      {confirmando && (
        <ConfirmarCobro total={total} piezas={totalPiezas} metodo={metodoPago} conIva={conIva} ivaMonto={ivaMonto}
          ubicacion={ubicacion} onSi={confirmarCobro} onNo={() => setConfirmando(false)} />
      )}
      {verTickets && <VisorTickets tickets={tickets} onCancelar={cancelarVenta} onCerrar={() => setVerTickets(false)} />}

      <div style={S.leftSide}>
        {/* Barra: pregunta + botón últimos tickets */}
        <div style={S.tituloRow}>
          <div style={S.pregunta}>¿De dónde sale la tela?</div>
          <button className="btn-tickets" onClick={() => setVerTickets(true)}>🧾 Últimos tickets</button>
        </div>
        <div style={S.ubiRow}>
          <button className={`ubi ${ubicacion === "guatemala" ? "ubi-on" : ""}`} onClick={() => setUbicacion("guatemala")}>
            <span className="ubi-ic">🏪</span><span>GUATEMALA</span><span className="ubi-sub">Sucursal</span>
          </button>
          <button className={`ubi ${ubicacion === "plomo" ? "ubi-on" : ""}`} onClick={() => setUbicacion("plomo")}>
            <span className="ubi-ic">🏭</span><span>PLOMO</span><span className="ubi-sub">Bodega</span>
          </button>
        </div>

        <input className="buscar" placeholder="🔍 Buscar tela…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

        <div style={S.pregunta}>Toca la tela que vendes</div>
        <div style={S.productGrid}>
          {visibles.map((p) => {
            const t = tinte(productos.indexOf(p));
            const disp = stockEn(p) - consumoDe(p);
            const sinRegistro = disp <= 0;
            const bajo = !agotado && disp <= p.minimo;
            const enCarro = consumoDe(p);
            return (
              <div key={p.id} className="prod" style={{ "--bg": sinRegistro ? "#DADADA" : t.bg, "--ink": sinRegistro ? "#888" : t.ink, "--soft": t.soft }}>
                <div className="prod-name">{p.nombre}</div>
                {agotado
                  ? <div className="prod-stock prod-out">Sin registro · puedes vender</div>
                  : bajo
                    ? <div className="prod-stock prod-low">¡Quedan {disp} {p.unidad}!</div>
                    : <div className="prod-stock prod-ok">{disp} {p.unidad}</div>}
                <div className="prod-precios">
                  <span>Menudeo <b>{money(p.precio)}</b></span>
                  <span>Mayoreo <b>{money(p.precio_mayoreo)}</b></span>
                  <span>Rollo <b>{money(p.precio_rollo)}</b></span>
                </div>
                <div className="prod-buys">
                  <button className="buy" onClick={() => agregarCorte(p)} >
                    <span className="buy-l">+1 {p.unidad}</span><span className="buy-p">Corte</span>
                  </button>
                  <button className="buy buy-2" onClick={() => pedirPesoRollo(p)} >
                    <span className="buy-l">pesar</span><span className="buy-p">Rollo</span>
                  </button>
                </div>
                {enCarro > 0 && <div className="prod-badge">{enCarro % 1 === 0 ? enCarro : enCarro.toFixed(1)}</div>}
              </div>
            );
          })}
          {visibles.length === 0 && <div style={S.noRes}>No encontré “{busqueda}”.</div>}
        </div>
      </div>

      {/* TICKET */}
      <aside style={S.cart}>
        <div style={S.cartHead}>
          <span>🧾 Venta</span>
          {totalPiezas > 0 && <span className="cart-n">{totalPiezas}</span>}
        </div>
        <div style={S.cartScroll}>
          {lineas.length === 0
            ? <div style={S.cartEmpty}><div className="big-arrow">👈</div>Toca una tela<br />para empezar</div>
            : lineas.map((l) => {
                const t = tinte(productos.findIndex((p) => p.id === l.producto.id));
                const u = l.producto.unidad;
                const esMayoreo = l.tipo === "corte" && l.cantidad >= LIMITE_MAYOREO;
                const lineaTotal = l.precio_unit * l.cantidad;
                return (
                  <div key={l.lid} className="crow" style={{ background: t.soft }}>
                    <div className="crow-info">
                      <div className="crow-name">
                        {l.producto.nombre}
                        {l.tipo === "rollo" && <span className="rollo-tag">ROLLO</span>}
                        {esMayoreo && <span className="mayoreo-tag">MAYOREO</span>}
                      </div>
                      {l.tipo === "rollo"
                        ? <div className="crow-price">{l.cantidad} {u} × {money(l.precio_unit)} = <b>{money(lineaTotal)}</b></div>
                        : <div className="crow-price">{l.cantidad} {u} × {money(l.precio_unit)} = <b>{money(lineaTotal)}</b></div>}
                    </div>
                    {l.tipo === "corte" ? (
                      <div className="step">
                        <button className="step-b step-min" onClick={() => quitarLinea(l.lid)}>−</button>
                        <span className="step-n">{l.cantidad}</span>
                        <button className="step-b step-plus" onClick={() => agregarCorte(l.producto)}>+</button>
                      </div>
                    ) : (
                      <button className="step-b step-min" onClick={() => quitarLinea(l.lid)} title="Quitar rollo">−</button>
                    )}
                  </div>
                );
              })}
        </div>

        <div style={S.cartFoot}>
          <div className="dlabel">Descuento</div>
          <div className="dchips">
            {[0, 10, 15, 20].map((v) => (
              <button key={v} className={`dchip ${descuentoPct === v ? "dchip-on" : ""}`} onClick={() => setDescuentoPct(v)}>{v === 0 ? "Sin" : `${v}%`}</button>
            ))}
          </div>
          <div className="dlabel">¿Cómo paga?</div>
          <div className="pays">
            {["Efectivo", "Tarjeta", "Transfer"].map((m) => (
              <button key={m} className={`pay ${metodoPago === m ? "pay-on" : ""}`} onClick={() => setMetodoPago(m)}>{m}</button>
            ))}
          </div>
          <button className={`iva-btn ${conIva ? "iva-on" : ""}`} onClick={() => setConIva(!conIva)}>
            <span className="iva-check">{conIva ? "✓" : ""}</span>
            Agregar IVA (16%)
          </button>
          <div style={S.totalCard}>
            {(descuentoPct > 0 || conIva) && <div className="tl"><span>Subtotal</span><span>{money(subtotal)}</span></div>}
            {descuentoPct > 0 && <div className="tl" style={{ color: "#C46A00" }}><span>Descuento {descuentoPct}%</span><span>−{money(descuentoMonto)}</span></div>}
            {conIva && <div className="tl" style={{ color: "#3A7A00" }}><span>IVA 16%</span><span>+{money(ivaMonto)}</span></div>}
            <div className="tgrand"><span>TOTAL</span><span>{money(total)}</span></div>
          </div>
          <button className="cobrar" onClick={() => lineas.length === 0 ? flash("Agrega telas primero") : setConfirmando(true)}>
            COBRAR
          </button>
        </div>
      </aside>
    </div>
  );
}

/* Confirmación grande antes de cobrar */
function ConfirmarCobro({ total, piezas, metodo, conIva, ivaMonto, ubicacion, onSi, onNo }) {
  return (
    <Overlay onCerrar={onNo}>
      <div className="confirm">
        <div className="confirm-q">¿Cobrar esta venta?</div>
        <div className="confirm-total">{money(total)}</div>
        <div className="confirm-detail">
          {piezas} {piezas === 1 ? "cosa" : "cosas"} · {metodo}<br />
          {conIva && <>IVA incluido ({money(ivaMonto)})<br /></>}
          desde {ubicacion === "guatemala" ? "Guatemala" : "Plomo"}
        </div>
        <div className="confirm-btns">
          <button className="confirm-no" onClick={onNo}>No, volver</button>
          <button className="confirm-si" onClick={onSi}>Sí, cobrar ✓</button>
        </div>
      </div>
    </Overlay>
  );
}

/* Captura el peso real del rollo (teclado con punto decimal) */
function CapturarPeso({ prod, onGuardar, onCerrar }) {
  const [peso, setPeso] = useState("");
  const u = prod.unidad;
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "←"];
  const onKey = (k) => setPeso((s) => {
    if (k === "←") return s.slice(0, -1);
    if (k === "." && s.includes(".")) return s; // un solo punto
    if (k === "." && s === "") return "0.";
    return s + k;
  });
  const kg = Number(peso) || 0;
  const cobro = kg * prod.precio_rollo;
  return (
    <Overlay onCerrar={onCerrar}>
      <div className="modal-title">Rollo de {prod.nombre}</div>
      <div className="big-label">¿Cuánto mide/pesa? ({u})</div>
      <div className="peso-disp">{peso || "0"} <span className="peso-u">{u}</span></div>
      <div className="peso-calc">
        {money(prod.precio_rollo)} × {kg || 0} {u} = <b>{money(cobro)}</b>
      </div>
      <div className="numpad">
        {keys.map((k) => <button key={k} className="numk" onClick={() => onKey(k)}>{k}</button>)}
      </div>
      <div className="modal-btns">
        <button className="mbtn-no" onClick={onCerrar}>Cancelar</button>
        <button className="mbtn-si" style={{ background: "#7BC62D" }} onClick={() => onGuardar(peso)}>Agregar rollo</button>
      </div>
    </Overlay>
  );
}

/* Visor de tickets: hoy + días anteriores, reimprime tal cual */
function VisorTickets({ tickets, onCancelar, onCerrar }) {
  const [dia, setDia] = useState(dateKey(new Date())); // día seleccionado
  const [cancelando, setCancelando] = useState(null); // ticket que se está cancelando

  // días con ventas, más reciente primero
  const dias = useMemo(() => {
    const set = [...new Set(tickets.map((t) => dateKey(t.fecha)))];
    return set.sort((a, b) => (a < b ? 1 : -1));
  }, [tickets]);

  const delDia = tickets.filter((t) => dateKey(t.fecha) === dia);
  const totalDia = delDia.filter((t) => !t.cancelado).reduce((a, t) => a + t.total, 0); // sin canceladas
  const hoyKey = dateKey(new Date());
  const nombreDia = (k) => {
    if (k === hoyKey) return "Hoy";
    const ayer = dateKey(new Date(Date.now() - unDia));
    if (k === ayer) return "Ayer";
    return new Date(k + "T12:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" });
  };

  function hacerCancelacion(sede, motivo) {
    onCancelar(cancelando, sede, motivo);
    setCancelando(null);
  }

  return (
    <Overlay onCerrar={onCerrar}>
      {cancelando && <ModalCancelar ticket={cancelando} onConfirmar={hacerCancelacion} onCerrar={() => setCancelando(null)} />}
      <div className="tk-head">
        <div className="modal-title" style={{ margin: 0 }}>🧾 Tickets</div>
        <button className="tk-x" onClick={onCerrar}>✕</button>
      </div>

      {dias.length === 0
        ? <div className="tk-vacio">Aún no hay ventas registradas.</div>
        : <>
            <div className="tk-dias">
              {dias.map((k) => (
                <button key={k} className={`tk-dia ${dia === k ? "tk-dia-on" : ""}`} onClick={() => setDia(k)}>{nombreDia(k)}</button>
              ))}
            </div>
            <div className="tk-resumen">{delDia.filter((t) => !t.cancelado).length} venta{delDia.filter((t) => !t.cancelado).length !== 1 ? "s" : ""} · <b>{money(totalDia)}</b></div>
            <div className="tk-lista">
              {delDia.map((t) => (
                <div key={t.folio} className={`tk-row ${t.cancelado ? "tk-cancelada" : ""}`}>
                  <div className="tk-info">
                    <div className="tk-folio">{t.folio}{t.cancelado && <span className="tk-badge-cancel">CANCELADA</span>}</div>
                    <div className="tk-meta">
                      {new Date(t.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · {t.ubicacion === "guatemala" ? "Guatemala" : "Plomo"} · {t.metodoPago}
                      {t.conIva ? " · IVA" : ""}
                      {t.cancelado && <><br /><span className="tk-motivo">Motivo: {t.motivoCancel}</span></>}
                    </div>
                  </div>
                  <div className="tk-total" style={t.cancelado ? { textDecoration: "line-through", color: "#bbb" } : null}>{money(t.total)}</div>
                  {t.cancelado
                    ? <button className="tk-print" onClick={() => imprimirVenta(t)}>🖨️</button>
                    : <div className="tk-acciones">
                        <button className="tk-print" onClick={() => imprimirVenta(t)}>🖨️</button>
                        <button className="tk-cancel" onClick={() => setCancelando(t)}>Cancelar</button>
                      </div>}
                </div>
              ))}
            </div>
          </>}
    </Overlay>
  );
}

/* Modal para cancelar: pide sede de regreso y motivo */
function ModalCancelar({ ticket, onConfirmar, onCerrar }) {
  const [sede, setSede] = useState(ticket.ubicacion); // por default, la sede donde se vendió
  const [motivo, setMotivo] = useState("");
  const motivos = ["Equivocación", "Devolución", "Cliente canceló", "Cobro doble"];
  const puede = motivo.trim().length > 0;

  return (
    <Overlay onCerrar={onCerrar}>
      <div className="modal-title">Cancelar {ticket.folio}</div>
      <div className="cancel-aviso">Se regresará la tela al inventario y se anulará el cobro de <b>{money(ticket.total)}</b>.</div>

      <div className="big-label">¿A qué sede regresa la tela?</div>
      <div className="seg-big">
        <button className={`seg-opt ${sede === "guatemala" ? "seg-sel" : ""}`} onClick={() => setSede("guatemala")}>🏪 Guatemala</button>
        <button className={`seg-opt ${sede === "plomo" ? "seg-sel" : ""}`} onClick={() => setSede("plomo")}>🏭 Plomo</button>
      </div>

      <div className="big-label">¿Por qué se cancela?</div>
      <div className="motivos">
        {motivos.map((m) => (
          <button key={m} className={`motivo-chip ${motivo === m ? "motivo-on" : ""}`} onClick={() => setMotivo(m)}>{m}</button>
        ))}
      </div>
      <input className="inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O escribe el motivo…" style={{ marginTop: 10 }} />

      <div className="modal-btns">
        <button className="mbtn-no" onClick={onCerrar}>No cancelar</button>
        <button className="mbtn-si" style={{ background: puede ? "#FF5C8A" : "#DBB", cursor: puede ? "pointer" : "not-allowed" }}
          onClick={() => puede && onConfirmar(sede, motivo.trim())} disabled={!puede}>Sí, cancelar venta</button>
      </div>
    </Overlay>
  );
}

/* ════════════ INVENTARIO ════════════ */
function Admin({ productos, setProductos, setHistorial }) {
  const [ajustando, setAjustando] = useState(null);
  const [editando, setEditando] = useState(null);
  const [traspasando, setTraspasando] = useState(false);
  const nuevo = { id: null, sku: "", nombre: "", precio: "", precio_mayoreo: "", precio_rollo: "", unidad: "m", stock_guatemala: 0, minimo: 10, stock_plomo: 0 };

  function ejecutarAjuste(f) {
    const cant = Number(f.cantidad) || 0;
    if (cant <= 0) return setAjustando(null);
    setProductos((prev) => prev.map((p) => {
      if (p.id !== ajustando.id) return p;
      const mod = f.tipo === "entrada" ? cant : -cant;
      return f.ubicacion === "guatemala" ? { ...p, stock_guatemala: Math.max(0, p.stock_guatemala + mod) } : { ...p, stock_plomo: Math.max(0, p.stock_plomo + mod) };
    }));
    setHistorial((prev) => [{ id: uid(), tipo: f.tipo, fecha: new Date().toISOString(), monto: 0, ubicacion: f.ubicacion, desc: `${f.tipo === "entrada" ? "Entrada" : "Salida"} · ${ajustando.nombre}`, total_unidades: cant }, ...prev]);
    setAjustando(null);
  }
  // Traspaso Plomo → Guatemala: descuenta de Plomo, suma a Guatemala
  function ejecutarTraspaso(prodId, cantidad) {
    const cant = Number(cantidad) || 0;
    const prod = productos.find((p) => p.id === prodId);
    if (!prod || cant <= 0) return setTraspasando(false);
    if (cant > prod.stock_plomo) return; // no debería pasar (validado en el modal)
    setProductos((prev) => prev.map((p) => {
      if (p.id !== prodId) return p;
      return { ...p, stock_plomo: Math.max(0, +(p.stock_plomo - cant).toFixed(2)), stock_guatemala: +(p.stock_guatemala + cant).toFixed(2) };
    }));
    setHistorial((prev) => [{ id: uid(), tipo: "traspaso", fecha: new Date().toISOString(), monto: 0, ubicacion: "guatemala", desc: `Traspaso Plomo → Guatemala · ${prod.nombre}`, total_unidades: cant }, ...prev]);
    setTraspasando(false);
  }
  function guardar(f) {
    const limpio = { ...f, precio: Number(f.precio) || 0, precio_mayoreo: Number(f.precio_mayoreo) || 0, precio_rollo: Number(f.precio_rollo) || 0, stock_guatemala: Number(f.stock_guatemala) || 0, stock_plomo: Number(f.stock_plomo) || 0, minimo: Number(f.minimo) || 0 };
    if (f.id) setProductos((prev) => prev.map((p) => (p.id === f.id ? limpio : p)));
    else setProductos((prev) => [...prev, { ...limpio, id: uid() }]);
    setEditando(null);
  }
  function borrar(p) { if (confirm(`¿Borrar "${p.nombre}"?`)) setProductos((prev) => prev.filter((x) => x.id !== p.id)); }

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.sectionTitle}>📦 Inventario</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-traspaso" onClick={() => setTraspasando(true)}>🔄 Traspaso entre sedes</button>
          <button className="btn-new" onClick={() => setEditando(nuevo)}>+ Agregar tela</button>
        </div>
      </div>
      <div style={S.adminGrid}>
        {productos.map((p, i) => {
          const t = tinte(i);
          const critGT = p.stock_guatemala <= p.minimo, critPL = p.stock_plomo <= p.minimo;
          return (
            <div key={p.id} className="acard">
              <div className="acard-top" style={{ background: t.bg, color: t.ink }}>
                <div className="acard-name">{p.nombre}</div>
                <div className="acard-actions">
                  <button className="atool" onClick={() => setEditando(p)}>✏️</button>
                  <button className="atool" onClick={() => borrar(p)}>🗑️</button>
                </div>
              </div>
              <div className="acard-body">
                <div className="acard-precios">
                  <div className="acp-row"><span>Menudeo</span><b>{money(p.precio)}</b></div>
                  <div className="acp-row"><span>Mayoreo</span><b>{money(p.precio_mayoreo)}</b></div>
                  <div className="acp-row"><span>Rollo</span><b>{money(p.precio_rollo)}</b></div>
                  <div className="acp-unidad">por {p.unidad}</div>
                </div>
                <div className="acard-stocks">
                  <div className="sbox"><div className="sbox-l">🏪 Guatemala</div><div className="sbox-n" style={{ color: critGT ? "#E0392B" : "#333" }}>{p.stock_guatemala}</div></div>
                  <div className="sbox"><div className="sbox-l">🏭 Plomo</div><div className="sbox-n" style={{ color: critPL ? "#E0392B" : "#333" }}>{p.stock_plomo}</div></div>
                </div>
                <button className="btn-adj" onClick={() => setAjustando(p)}>Entrada / Salida</button>
              </div>
            </div>
          );
        })}
      </div>
      {ajustando && <ModalAjuste prod={ajustando} onGuardar={ejecutarAjuste} onCerrar={() => setAjustando(null)} />}
      {editando && <ModalProducto inicial={editando} onGuardar={guardar} onCerrar={() => setEditando(null)} />}
      {traspasando && <ModalTraspaso productos={productos} onGuardar={ejecutarTraspaso} onCerrar={() => setTraspasando(false)} />}
    </div>
  );
}

function NumPad({ onKey }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "00", "←"];
  return <div className="numpad">{keys.map((k) => <button key={k} className="numk" onClick={() => onKey(k)}>{k}</button>)}</div>;
}

function ModalAjuste({ prod, onGuardar, onCerrar }) {
  const [f, setF] = useState({ tipo: "entrada", ubicacion: "guatemala", cantidad: "" });
  const onKey = (k) => setF((s) => ({ ...s, cantidad: k === "←" ? String(s.cantidad).slice(0, -1) : String(s.cantidad) + k }));
  const esEnt = f.tipo === "entrada";
  return (
    <Overlay onCerrar={onCerrar}>
      <div className="modal-title">{prod.nombre}</div>
      <div className="big-label">¿Qué hago?</div>
      <div className="seg-big">
        <button className={`seg-opt ${esEnt ? "seg-in" : ""}`} onClick={() => setF({ ...f, tipo: "entrada" })}>⬆️ Entra</button>
        <button className={`seg-opt ${!esEnt ? "seg-out" : ""}`} onClick={() => setF({ ...f, tipo: "salida" })}>⬇️ Sale</button>
      </div>
      <div className="big-label">¿En qué sede?</div>
      <div className="seg-big">
        <button className={`seg-opt ${f.ubicacion === "guatemala" ? "seg-sel" : ""}`} onClick={() => setF({ ...f, ubicacion: "guatemala" })}>🏪 Guatemala</button>
        <button className={`seg-opt ${f.ubicacion === "plomo" ? "seg-sel" : ""}`} onClick={() => setF({ ...f, ubicacion: "plomo" })}>🏭 Plomo</button>
      </div>
      <div className="big-label">¿Cuánto? ({prod.unidad})</div>
      <div className="numdisp">{f.cantidad || "0"}</div>
      <NumPad onKey={onKey} />
      <div className="modal-btns">
        <button className="mbtn-no" onClick={onCerrar}>Cancelar</button>
        <button className="mbtn-si" style={{ background: esEnt ? "#22B8C4" : "#FF5C8A" }} onClick={() => onGuardar(f)}>Guardar</button>
      </div>
    </Overlay>
  );
}

/* Traspaso de tela: Plomo (bodega) → Guatemala (sucursal) */
function ModalTraspaso({ productos, onGuardar, onCerrar }) {
  const [prodId, setProdId] = useState("");
  const [cant, setCant] = useState("");
  const conStock = productos.filter((p) => p.stock_plomo > 0);
  const prod = productos.find((p) => p.id === prodId);
  const onKey = (k) => setCant((s) => {
    if (k === "←") return s.slice(0, -1);
    if (k === "." && s.includes(".")) return s;
    if (k === "." && s === "") return "0.";
    return s + k;
  });
  const kg = Number(cant) || 0;
  const excede = prod && kg > prod.stock_plomo;
  const puede = prod && kg > 0 && !excede;

  return (
    <Overlay onCerrar={onCerrar}>
      <div className="modal-title">🔄 Traspaso entre sedes</div>
      <div className="trasp-flujo">
        <span className="trasp-de">🏭 PLOMO</span>
        <span className="trasp-flecha">→</span>
        <span className="trasp-a">🏪 GUATEMALA</span>
      </div>

      <div className="big-label">¿Qué tela mueves?</div>
      {!prodId ? (
        <div className="trasp-lista">
          {conStock.length === 0
            ? <div className="tk-vacio" style={{ padding: 24 }}>No hay tela con stock en Plomo.</div>
            : conStock.map((p) => (
                <button key={p.id} className="trasp-opt" onClick={() => setProdId(p.id)}>
                  <span className="trasp-nom">{p.nombre}</span>
                  <span className="trasp-disp">{p.stock_plomo} {p.unidad} en Plomo</span>
                </button>
              ))}
        </div>
      ) : (
        <>
          <button className="trasp-sel" onClick={() => { setProdId(""); setCant(""); }}>
            <span className="trasp-nom">{prod.nombre}</span>
            <span className="trasp-cambiar">cambiar ✎</span>
          </button>
          <div className="trasp-hay">Hay <b>{prod.stock_plomo} {prod.unidad}</b> en Plomo</div>
          <div className="big-label">¿Cuánto mueves? ({prod.unidad})</div>
          <div className="numdisp" style={excede ? { color: "#E0392B" } : null}>{cant || "0"}</div>
          {excede && <div className="trasp-error">No hay tanto en Plomo (máx {prod.stock_plomo})</div>}
          <NumPad onKey={onKey} />
        </>
      )}

      <div className="modal-btns">
        <button className="mbtn-no" onClick={onCerrar}>Cancelar</button>
        <button className="mbtn-si" style={{ background: puede ? "#22B8C4" : "#CBB", cursor: puede ? "pointer" : "not-allowed" }}
          onClick={() => puede && onGuardar(prodId, cant)} disabled={!puede}>Mover tela</button>
      </div>
    </Overlay>
  );
}

function ModalProducto({ inicial, onGuardar, onCerrar }) {
  const [f, setF] = useState(inicial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const esNuevo = !inicial.id;
  return (
    <Overlay onCerrar={onCerrar}>
      <div className="modal-title">{esNuevo ? "Nueva tela" : "Editar tela"}</div>
      <Campo label="Nombre"><input className="inp" value={f.nombre} onChange={set("nombre")} placeholder="Phoenix" autoFocus /></Campo>
      <div className="row2">
        <Campo label="Código (SKU)"><input className="inp" value={f.sku} onChange={set("sku")} placeholder="PHX-001" /></Campo>
        <Campo label="Unidad"><select className="inp" value={f.unidad} onChange={set("unidad")}><option value="m">metro</option><option value="kg">kilo</option><option value="pz">pieza</option></select></Campo>
      </div>
      <div className="precios-hint">Los 3 precios son por {f.unidad === "kg" ? "kilo" : f.unidad === "m" ? "metro" : "unidad"}</div>
      <div className="row3">
        <Campo label="1. Menudeo"><input className="inp" type="number" value={f.precio} onChange={set("precio")} placeholder="189" /></Campo>
        <Campo label={`2. Mayoreo (${LIMITE_MAYOREO}+)`}><input className="inp" type="number" value={f.precio_mayoreo} onChange={set("precio_mayoreo")} placeholder="170" /></Campo>
        <Campo label="3. Rollo"><input className="inp" type="number" value={f.precio_rollo} onChange={set("precio_rollo")} placeholder="155" /></Campo>
      </div>
      <div className="row2">
        <Campo label="Avisar cuando baje de"><input className="inp" type="number" value={f.minimo} onChange={set("minimo")} placeholder="10" /></Campo>
        <Campo label="Stock en Guatemala"><input className="inp" type="number" value={f.stock_guatemala} onChange={set("stock_guatemala")} /></Campo>
      </div>
      <div className="row2">
        <Campo label="Stock en Plomo"><input className="inp" type="number" value={f.stock_plomo} onChange={set("stock_plomo")} /></Campo>
        <div className="campo" />
      </div>
      <div className="modal-btns">
        <button className="mbtn-no" onClick={onCerrar}>Cancelar</button>
        <button className="mbtn-si" style={{ background: "#7BC62D" }} onClick={() => onGuardar(f)}>Guardar tela</button>
      </div>
    </Overlay>
  );
}

function Campo({ label, children }) { return <div className="campo"><label className="campo-l">{label}</label>{children}</div>; }
function Overlay({ children, onCerrar }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  return <div className="ov" onClick={onCerrar}><div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
}

/* ════════════ REPORTES ════════════ */
function Reportes({ historial, productos }) {
  const [filtro, setFiltro] = useState("hoy");
  const movs = historial.filter((m) => filtro === "hoy" ? dateKey(m.fecha) === dateKey(new Date()) : new Date(m.fecha) >= new Date(Date.now() - 7 * unDia));
  const ventas = movs.filter((m) => m.tipo === "venta");
  const canceladas = movs.filter((m) => m.tipo === "cancelada"); // monto negativo
  const d = {
    filtro: filtro === "hoy" ? "Hoy" : "Últimos 7 días",
    ingresos: ventas.reduce((a, v) => a + v.monto, 0) + canceladas.reduce((a, v) => a + v.monto, 0), // canceladas restan
    ventasCount: ventas.length,
    entradas: movs.filter((m) => m.tipo === "entrada").reduce((a, m) => a + m.total_unidades, 0),
    salidas: movs.filter((m) => m.tipo === "salida").reduce((a, m) => a + m.total_unidades, 0) + ventas.reduce((a, m) => a + m.total_unidades, 0),
    movs,
  };
  const critico = productos.filter((p) => p.stock_guatemala <= p.minimo || p.stock_plomo <= p.minimo);

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.sectionTitle}>📊 Reportes</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="seg2">
            <button className={`seg2-b ${filtro === "hoy" ? "seg2-on" : ""}`} onClick={() => setFiltro("hoy")}>Hoy</button>
            <button className={`seg2-b ${filtro === "semana" ? "seg2-on" : ""}`} onClick={() => setFiltro("semana")}>7 días</button>
          </div>
          <button className="btn-tk" onClick={() => imprimirCorte(d)}>🖨️ Ticket</button>
          <button className="btn-pdf" onClick={() => exportarPDF(d)}>📄 PDF</button>
        </div>
      </div>
      <div style={S.kpiRow}>
        <div className="kpi kpi-big"><div className="kpi-l">💰 Ventas de {d.filtro.toLowerCase()}</div><div className="kpi-v" style={{ color: "#4CAF00" }}>{money(d.ingresos)}</div><div className="kpi-s">{d.ventasCount} ventas</div></div>
        <div className="kpi"><div className="kpi-l">⬆️ Entró</div><div className="kpi-v" style={{ color: "#22B8C4" }}>+{d.entradas}</div></div>
        <div className="kpi"><div className="kpi-l">⬇️ Salió</div><div className="kpi-v" style={{ color: "#FF5C8A" }}>−{d.salidas}</div></div>
      </div>
      {critico.length > 0 && <div className="alerta">⚠️ Poco stock: <b>{critico.map((p) => p.nombre).join(", ")}</b></div>}
      <div style={S.tableWrap}>
        <div style={S.tableHead}>Movimientos</div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Cuándo</th><th>Qué</th><th>Sede</th><th>Detalle</th><th>Cant.</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
            <tbody>
              {d.movs.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Sin movimientos.</td></tr>}
              {d.movs.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.fecha).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{m.tipo === "venta" && <span className="badge bg-v">Venta</span>}{m.tipo === "entrada" && <span className="badge bg-e">Entró</span>}{m.tipo === "salida" && <span className="badge bg-s">Salió</span>}{m.tipo === "traspaso" && <span className="badge bg-t">Traspaso</span>}{m.tipo === "cancelada" && <span className="badge bg-c">Cancelada</span>}</td>
                  <td>{m.ubicacion === "guatemala" ? "Guatemala" : "Plomo"}</td>
                  <td>{m.desc}</td>
                  <td style={{ fontWeight: 800 }}>{m.total_unidades}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: m.monto > 0 ? "#4CAF00" : "#bbb" }}>{m.monto > 0 ? money(m.monto) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Festejo({ data }) {
  return (
    <div className="festejo-ov">
      <div className="festejo-card">
        <div className="festejo-check">✓</div>
        <div className="festejo-done">¡Listo!</div>
        <div className="festejo-total">{money(data.total)}</div>
        <div className="festejo-sub">Imprimiendo ticket 🖨️</div>
      </div>
    </div>
  );
}
function Toast({ texto }) { return <div className="toast">{texto}</div>; }

/* ════════════ ESTILOS ════════════ */
const F = "'Nunito', system-ui, sans-serif";
const CSS = `
*{box-sizing:border-box}
body,html{margin:0;background:#FFF8F0;font-family:${F};color:#3A2E26}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:#E8DCCF;border-radius:5px}
@keyframes pop{0%{transform:scale(.6)}100%{transform:scale(1)}}
@keyframes bounceIn{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@keyframes slideDown{from{transform:translate(-50%,-20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}

/* Top */
.logo{font-size:32px;width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:#FFF;border:4px solid #FF8A3D;border-radius:20px;box-shadow:0 4px 0 #E8DCCF}
.tab{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:900;padding:14px 26px;background:#FFF;color:#A89684;border:3px solid #EFE3D5;border-radius:18px;cursor:pointer;box-shadow:0 4px 0 #EFE3D5;transition:.1s}
.tab:active{transform:translateY(4px);box-shadow:none}
.tab-ic{font-size:22px}
.tab-on{background:#FF8A3D;color:#fff;border-color:#FF8A3D;box-shadow:0 4px 0 #D96E22}

/* Pregunta guía */
.pregunta-x{}

/* Ubicación */
.ubi{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:22px;font-weight:900;padding:18px;background:#FFF;color:#9A8674;border:4px solid #EFE3D5;border-radius:22px;cursor:pointer;box-shadow:0 5px 0 #EFE3D5;transition:.1s}
.ubi:active{transform:translateY(5px);box-shadow:none}
.ubi-ic{font-size:38px}
.ubi-sub{font-size:14px;font-weight:700;opacity:.7}
.ubi-on{background:#FF8A3D;color:#fff;border-color:#FF8A3D;box-shadow:0 5px 0 #D96E22}

.buscar{width:100%;font-size:20px;font-weight:700;padding:16px 20px;background:#FFF;border:3px solid #EFE3D5;border-radius:18px;outline:none;margin-bottom:8px}
.buscar:focus{border-color:#FF8A3D}

/* Producto */
.prod{position:relative;background:var(--bg);border-radius:26px;padding:18px 16px 16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 6px 0 rgba(0,0,0,.12)}
.prod-name{font-size:28px;font-weight:900;color:var(--ink);text-align:center;line-height:1}
.prod-precios{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.55);border-radius:14px;padding:8px 12px;font-size:14px;font-weight:700;color:var(--ink)}
.prod-precios span{display:flex;justify-content:space-between}
.prod-precios b{font-weight:900}
.prod-stock{align-self:center;font-size:16px;font-weight:900;padding:5px 16px;border-radius:999px;background:#fff}
.prod-ok{color:#3A7A00}
.prod-low{color:#C46A00}
.prod-out{color:#C0392B}
.prod-buys{display:flex;gap:10px}
.buy{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 6px;border:none;border-radius:18px;background:#FFF;color:var(--ink);cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.15);transition:.1s}
.buy:active:not(:disabled){transform:translateY(4px);box-shadow:none}
.buy:disabled{opacity:.5;cursor:not-allowed}
.buy-2{background:var(--soft)}
.buy-l{font-size:14px;font-weight:800;opacity:.75}
.buy-p{font-size:22px;font-weight:900}
.prod-badge{position:absolute;top:-12px;right:-12px;background:#FF3B6B;color:#fff;font-size:24px;font-weight:900;min-width:46px;height:46px;border-radius:23px;display:flex;align-items:center;justify-content:center;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:pop .2s}

/* Carrito */
.cart-n{background:#FF8A3D;color:#fff;font-size:22px;font-weight:900;padding:2px 16px;border-radius:14px}
.big-arrow{font-size:50px;margin-bottom:12px}
.crow{display:flex;align-items:center;gap:12px;border-radius:18px;padding:14px 16px;margin-bottom:12px;animation:bounceIn .25s}
.crow-info{flex:1;min-width:0}
.crow-name{font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px}
.rollo-tag{font-size:11px;font-weight:900;background:#FF8A3D;color:#fff;padding:3px 8px;border-radius:7px}
.mayoreo-tag{font-size:11px;font-weight:900;background:#7BC62D;color:#fff;padding:3px 8px;border-radius:7px}
.crow-price{font-size:17px;font-weight:800;color:#6A5A4A}
.step{display:flex;align-items:center;gap:10px}
.step-b{width:46px;height:46px;border:none;border-radius:14px;font-size:30px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 0 rgba(0,0,0,.18);transition:.1s}
.step-b:active{transform:translateY(4px);box-shadow:none}
.step-min{background:#FFF;color:#FF3B6B}
.step-plus{background:#7BC62D;color:#fff;box-shadow:0 4px 0 #5DA31E}
.step-n{min-width:34px;text-align:center;font-size:28px;font-weight:900}

.dlabel{font-size:15px;font-weight:900;color:#9A8674;margin:0 0 8px 4px;text-transform:uppercase;letter-spacing:.5px}
.dchips,.pays{display:flex;gap:8px;margin-bottom:16px}
.dchip,.pay{flex:1;padding:14px 0;border:3px solid #EFE3D5;border-radius:14px;background:#FFF;color:#9A8674;font-size:17px;font-weight:900;cursor:pointer;transition:.1s}
.dchip-on{background:#FF5C8A;color:#fff;border-color:#FF5C8A}
.pay-on{background:#22B8C4;color:#fff;border-color:#22B8C4}
.iva-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px 0;margin-bottom:14px;border:3px solid #EFE3D5;border-radius:14px;background:#FFF;color:#9A8674;font-size:18px;font-weight:900;cursor:pointer;transition:.1s}
.iva-btn:active{transform:scale(.98)}
.iva-on{background:#3A7A00;color:#fff;border-color:#3A7A00}
.iva-check{width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px}
.iva-on .iva-check{background:#fff;color:#3A7A00}

/* Botón últimos tickets */
.btn-tickets{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:900;padding:12px 20px;background:#FFF;color:#6A5A4A;border:3px solid #EFE3D5;border-radius:16px;cursor:pointer;box-shadow:0 4px 0 #EFE3D5;transition:.1s;white-space:nowrap}
.btn-tickets:active{transform:translateY(4px);box-shadow:none}

/* Visor de tickets */
.tk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.tk-x{width:44px;height:44px;border:none;border-radius:14px;background:#FFF8F0;font-size:20px;font-weight:900;cursor:pointer;color:#9A8674}
.tk-vacio{text-align:center;padding:50px 20px;color:#B0A090;font-size:19px;font-weight:800}
.tk-dias{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px}
.tk-dia{flex-shrink:0;padding:12px 18px;border:3px solid #EFE3D5;border-radius:14px;background:#FFF;color:#9A8674;font-size:16px;font-weight:900;cursor:pointer;text-transform:capitalize}
.tk-dia-on{background:#FF8A3D;color:#fff;border-color:#FF8A3D}
.tk-resumen{font-size:17px;font-weight:800;color:#6A5A4A;background:#FFF8F0;border-radius:14px;padding:14px 18px;margin-bottom:14px;text-align:center}
.tk-resumen b{color:#3A2E26;font-size:20px}
.tk-lista{display:flex;flex-direction:column;gap:10px;max-height:48vh;overflow-y:auto}
.tk-row{display:flex;align-items:center;gap:12px;background:#FFF8F0;border-radius:16px;padding:14px 16px}
.tk-info{flex:1;min-width:0}
.tk-folio{font-size:19px;font-weight:900;color:#3A2E26}
.tk-meta{font-size:13px;font-weight:700;color:#9A8674;margin-top:2px}
.tk-total{font-size:22px;font-weight:900;color:#3A7A00}
.tk-print{flex-shrink:0;padding:12px 16px;background:#3A2E26;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #241B16;transition:.1s}
.tk-print:active{transform:translateY(4px);box-shadow:none}

.tl{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#9A8674;margin-bottom:4px}
.tgrand{display:flex;justify-content:space-between;align-items:baseline;font-size:40px;font-weight:900;color:#3A2E26}
.cobrar{width:100%;margin-top:16px;padding:24px 0;border:none;border-radius:22px;background:#7BC62D;color:#fff;font-size:32px;font-weight:900;letter-spacing:1px;cursor:pointer;box-shadow:0 7px 0 #5DA31E;transition:.1s}
.cobrar:active{transform:translateY(7px);box-shadow:none}

/* Confirmar cobro */
.confirm{text-align:center;padding:8px}
.confirm-q{font-size:28px;font-weight:900;color:#3A2E26}
.confirm-total{font-size:72px;font-weight:900;color:#7BC62D;line-height:1;margin:16px 0}
.confirm-detail{font-size:20px;font-weight:700;color:#9A8674;line-height:1.5;margin-bottom:28px}
.confirm-btns{display:flex;gap:14px}
.confirm-no{flex:1;padding:22px 0;border:3px solid #EFE3D5;border-radius:20px;background:#fff;color:#9A8674;font-size:22px;font-weight:900;cursor:pointer}
.confirm-si{flex:1.6;padding:22px 0;border:none;border-radius:20px;background:#7BC62D;color:#fff;font-size:24px;font-weight:900;cursor:pointer;box-shadow:0 6px 0 #5DA31E}
.confirm-si:active{transform:translateY(6px);box-shadow:none}

/* Botones sección */
.btn-new{font-size:20px;font-weight:900;padding:16px 28px;background:#7BC62D;color:#fff;border:none;border-radius:18px;cursor:pointer;box-shadow:0 5px 0 #5DA31E}
.btn-new:active{transform:translateY(5px);box-shadow:none}
.btn-tk,.btn-pdf{font-size:17px;font-weight:900;padding:14px 22px;border:none;border-radius:16px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.15)}
.btn-tk{background:#3A2E26;color:#fff}
.btn-pdf{background:#FF8A3D;color:#fff}
.seg2{display:flex;background:#FFF;border:3px solid #EFE3D5;border-radius:16px;padding:4px}
.seg2-b{background:transparent;border:none;color:#9A8674;font-size:17px;font-weight:900;padding:10px 20px;border-radius:12px;cursor:pointer}
.seg2-on{background:#FF8A3D;color:#fff}

/* Admin */
.acard{background:#FFF;border-radius:24px;overflow:hidden;box-shadow:0 5px 0 #EFE3D5;border:3px solid #EFE3D5}
.acard-top{padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.acard-name{font-size:26px;font-weight:900}
.acard-actions{display:flex;gap:8px}
.atool{width:46px;height:46px;border:none;border-radius:14px;background:rgba(255,255,255,.4);font-size:22px;cursor:pointer}
.acard-body{padding:18px 20px}
.acard-precios{background:#FFF8F0;border-radius:14px;padding:12px 14px;margin-bottom:16px}
.acp-row{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#6A5A4A;padding:2px 0}
.acp-row b{font-weight:900;color:#3A2E26}
.acp-unidad{font-size:13px;font-weight:700;color:#9A8674;text-align:right;margin-top:4px}
.peso-disp{font-size:54px;font-weight:900;text-align:center;background:#FFF8F0;border-radius:18px;padding:16px;margin:6px 0;min-height:90px;display:flex;align-items:center;justify-content:center;gap:10px}
.peso-u{font-size:26px;color:#9A8674}
.peso-calc{text-align:center;font-size:20px;font-weight:800;color:#6A5A4A;background:#F1F9E4;border-radius:14px;padding:12px;margin-bottom:14px}
.peso-calc b{color:#3A7A00;font-size:24px}
.precios-hint{font-size:14px;font-weight:800;color:#9A8674;margin:4px 0 10px 4px}
.row3{display:flex;gap:10px}
.row3 .campo{flex:1}
.acard-price{font-size:26px;font-weight:900;margin-bottom:16px}
.acard-price span{font-size:16px;color:#9A8674}
.acard-stocks{display:flex;gap:12px;margin-bottom:16px}
.sbox{flex:1;background:#FFF8F0;border-radius:16px;padding:14px;text-align:center}
.sbox-l{font-size:14px;font-weight:800;color:#9A8674;margin-bottom:4px}
.sbox-n{font-size:38px;font-weight:900;line-height:1}
.btn-adj{width:100%;padding:16px;background:#22B8C4;color:#fff;border:none;border-radius:16px;font-size:19px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #1A98A2}
.btn-adj:active{transform:translateY(4px);box-shadow:none}

/* KPIs */
.kpi{background:#FFF;border:3px solid #EFE3D5;border-radius:22px;padding:24px}
.kpi-l{font-size:18px;font-weight:900;color:#9A8674;margin-bottom:8px}
.kpi-v{font-size:52px;font-weight:900;line-height:1}
.kpi-s{font-size:16px;font-weight:700;color:#9A8674;margin-top:8px}

.alerta{background:#FFF0D6;border:3px solid #FFB627;color:#7A5800;font-size:18px;font-weight:800;padding:16px 20px;border-radius:18px;margin-bottom:20px}

/* Tabla */
.tbl{width:100%;border-collapse:collapse}
.tbl th{background:#FFF8F0;color:#9A8674;font-size:15px;font-weight:900;padding:14px 16px;text-align:left;border-bottom:3px solid #EFE3D5}
.tbl td{padding:14px 16px;border-bottom:1px solid #F2E9DE;font-size:16px;font-weight:600}
.badge{font-size:14px;font-weight:900;padding:4px 12px;border-radius:999px;color:#fff}
.bg-v{background:#7BC62D}.bg-e{background:#22B8C4}.bg-s{background:#FF5C8A}.bg-t{background:#9B6BF0}.bg-c{background:#999}
.tk-acciones{display:flex;gap:6px;flex-shrink:0}
.tk-cancel{padding:12px 14px;background:#FFF;color:#FF5C8A;border:2px solid #FF5C8A;border-radius:14px;font-size:14px;font-weight:900;cursor:pointer;transition:.1s}
.tk-cancel:active{transform:scale(.95)}
.tk-cancelada{opacity:.7}
.tk-badge-cancel{font-size:11px;font-weight:900;background:#999;color:#fff;padding:2px 8px;border-radius:6px;margin-left:8px}
.tk-motivo{font-size:12px;color:#FF5C8A;font-weight:800}
.cancel-aviso{background:#FFF0F4;border:2px solid #FFD0DE;border-radius:14px;padding:14px 16px;font-size:16px;font-weight:700;color:#6A5A4A;margin-bottom:8px}
.cancel-aviso b{color:#E0392B}
.motivos{display:flex;flex-wrap:wrap;gap:8px}
.motivo-chip{padding:12px 16px;border:3px solid #EFE3D5;border-radius:14px;background:#FFF;color:#9A8674;font-size:16px;font-weight:900;cursor:pointer;transition:.1s}
.motivo-on{background:#FF5C8A;color:#fff;border-color:#FF5C8A}
.btn-traspaso{font-size:18px;font-weight:900;padding:16px 24px;background:#9B6BF0;color:#fff;border:none;border-radius:18px;cursor:pointer;box-shadow:0 5px 0 #7A4FD0;transition:.1s}
.btn-traspaso:active{transform:translateY(5px);box-shadow:none}
.trasp-flujo{display:flex;align-items:center;justify-content:center;gap:16px;background:#F2EBFE;border-radius:16px;padding:16px;margin-bottom:8px;font-size:18px;font-weight:900}
.trasp-de{color:#6A5A4A}.trasp-a{color:#2C0F5E}
.trasp-flecha{font-size:28px;color:#9B6BF0}
.trasp-lista{display:flex;flex-direction:column;gap:10px;max-height:44vh;overflow-y:auto}
.trasp-opt{display:flex;justify-content:space-between;align-items:center;background:#FFF8F0;border:3px solid #EFE3D5;border-radius:16px;padding:16px 18px;cursor:pointer;transition:.1s}
.trasp-opt:active{transform:scale(.98)}
.trasp-nom{font-size:20px;font-weight:900;color:#3A2E26}
.trasp-disp{font-size:15px;font-weight:800;color:#9B6BF0}
.trasp-sel{display:flex;justify-content:space-between;align-items:center;width:100%;background:#F2EBFE;border:3px solid #9B6BF0;border-radius:16px;padding:14px 18px;cursor:pointer;margin-bottom:8px}
.trasp-cambiar{font-size:14px;font-weight:800;color:#9B6BF0}
.trasp-hay{font-size:16px;font-weight:800;color:#6A5A4A;text-align:center;margin-bottom:6px}
.trasp-hay b{color:#3A2E26}
.trasp-error{text-align:center;font-size:15px;font-weight:800;color:#E0392B;margin-bottom:8px}

/* Modal */
.ov{position:fixed;inset:0;background:rgba(58,46,38,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:80;padding:20px;animation:bounceIn .2s}
.modal{background:#FFF;border-radius:30px;padding:32px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal-title{font-size:32px;font-weight:900;margin-bottom:20px;text-align:center}
.big-label{font-size:18px;font-weight:900;color:#9A8674;margin:18px 0 10px}
.seg-big{display:flex;gap:12px}
.seg-opt{flex:1;padding:20px 0;border:3px solid #EFE3D5;border-radius:18px;background:#FFF;color:#9A8674;font-size:20px;font-weight:900;cursor:pointer;transition:.1s}
.seg-in{background:#22B8C4;color:#fff;border-color:#22B8C4}
.seg-out{background:#FF5C8A;color:#fff;border-color:#FF5C8A}
.seg-sel{background:#FF8A3D;color:#fff;border-color:#FF8A3D}
.numdisp{font-size:48px;font-weight:900;text-align:center;background:#FFF8F0;border-radius:18px;padding:16px;margin:6px 0 12px;min-height:80px;display:flex;align-items:center;justify-content:center}
.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.numk{padding:20px 0;background:#FFF8F0;border:3px solid #EFE3D5;border-radius:16px;font-size:28px;font-weight:900;cursor:pointer;transition:.1s;color:#3A2E26}
.numk:active{transform:scale(.94);background:#FF8A3D;color:#fff}
.campo{margin-bottom:14px}
.campo-l{display:block;font-size:16px;font-weight:900;color:#9A8674;margin-bottom:6px}
.inp{width:100%;padding:14px 16px;background:#FFF8F0;border:3px solid #EFE3D5;border-radius:14px;font-size:19px;font-weight:700;font-family:${F};outline:none}
.inp:focus{border-color:#FF8A3D}
.row2{display:flex;gap:12px}
.row2 .campo{flex:1}
.modal-btns{display:flex;gap:12px;margin-top:24px}
.mbtn-no{flex:1;padding:18px;border:3px solid #EFE3D5;border-radius:18px;background:#FFF;color:#9A8674;font-size:19px;font-weight:900;cursor:pointer}
.mbtn-si{flex:1.6;padding:18px;border:none;border-radius:18px;color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.18)}
.mbtn-si:active{transform:translateY(5px);box-shadow:none}

/* Festejo */
.festejo-ov{position:fixed;inset:0;background:rgba(123,198,45,.96);display:flex;align-items:center;justify-content:center;z-index:90;animation:bounceIn .25s}
.festejo-card{text-align:center;color:#fff}
.festejo-check{font-size:90px;width:140px;height:140px;margin:0 auto;background:#fff;color:#7BC62D;border-radius:70px;display:flex;align-items:center;justify-content:center;animation:pop .4s;box-shadow:0 10px 30px rgba(0,0,0,.2)}
.festejo-done{font-size:44px;font-weight:900;margin-top:20px}
.festejo-total{font-size:64px;font-weight:900;margin:6px 0}
.festejo-sub{font-size:22px;font-weight:800;opacity:.9}

/* Toast */
.toast{position:fixed;top:24px;left:50%;background:#FF5C8A;color:#fff;font-size:19px;font-weight:900;padding:16px 32px;border-radius:18px;z-index:95;box-shadow:0 8px 24px rgba(255,92,138,.4);animation:slideDown .3s}

@media(max-width:980px){.v-grid{flex-direction:column}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const S = {
  app: { minHeight: "100vh", background: "#FFF8F0" },
  shell: { maxWidth: 1340, margin: "0 auto", padding: "24px 20px 50px" },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  brandName: { fontSize: 36, fontWeight: 900, color: "#3A2E26", letterSpacing: -1 },
  nav: { display: "flex", gap: 12, flexWrap: "wrap" },

  venderGrid: { display: "flex", gap: 26, alignItems: "flex-start" },
  leftSide: { flex: "1 1 62%", minWidth: 0 },
  pregunta: { fontSize: 19, fontWeight: 900, color: "#9A8674", margin: "4px 0 12px 4px" },
  tituloRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  ubiRow: { display: "flex", gap: 14, marginBottom: 20 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 },
  noRes: { gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#B0A090", fontWeight: 700, fontSize: 18 },

  cart: { flex: "0 0 400px", background: "#FFF", borderRadius: 28, border: "3px solid #EFE3D5", position: "sticky", top: 20, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 90px)", overflow: "hidden", boxShadow: "0 6px 0 #EFE3D5" },
  cartHead: { padding: 22, fontSize: 26, fontWeight: 900, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #F2E9DE" },
  cartScroll: { flex: 1, overflowY: "auto", padding: 22, minHeight: 120 },
  cartEmpty: { textAlign: "center", color: "#C4B5A5", fontSize: 21, fontWeight: 800, padding: "40px 0", lineHeight: 1.5 },
  cartFoot: { padding: 22, borderTop: "3px solid #F2E9DE" },
  totalCard: { background: "#FFF8F0", borderRadius: 18, padding: 18, marginTop: 4 },

  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 },
  sectionTitle: { fontSize: 34, fontWeight: 900, color: "#3A2E26" },
  adminGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 22 },

  kpiRow: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 18, marginBottom: 20 },
  tableWrap: { background: "#FFF", border: "3px solid #EFE3D5", borderRadius: 22, overflow: "hidden" },
  tableHead: { padding: "18px 22px", fontSize: 22, fontWeight: 900, borderBottom: "3px solid #F2E9DE" },
};
