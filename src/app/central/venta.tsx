'use client';

// src/app/central/venta.tsx
// - VentaForm: se abre al marcar "Venta cerrada" en la disposición.
//   Productos REALES de la bodega (Upstash) + conceptos de envío con nombre y precio manual.
// - PagosPendientes: lo ÚNICO del cliente que ven las vendedoras fuera de la interacción.

import { useEffect, useState } from 'react';

// ─── Tipos ───────────────────────────────────────────────
export type ItemVenta =
  | { tipo: 'PRODUCTO'; nombre: string; cantidad: number; precioUnit: number; tier: 'menudeo' | 'mayoreo' }
  | { tipo: 'ENVIO'; concepto: string; precio: number };

type ProductoBodega = { menudeo?: number; mayoreo?: number; info?: string };

const CONCEPTOS_RAPIDOS = ['Flete', 'Costo de colocación a paquetería', 'Paquetería (envío)'];

// ═══════════════════════════════════════════════════════════
export function VentaForm({
  items,
  setItems,
  pagoConfirmado,
  setPagoConfirmado,
}: {
  items: ItemVenta[];
  setItems: (items: ItemVenta[]) => void;
  pagoConfirmado: boolean;
  setPagoConfirmado: (v: boolean) => void;
}) {
  const [bodega, setBodega] = useState<Record<string, ProductoBodega>>({});

  // producto en captura
  const [prodNombre, setProdNombre] = useState('');
  const [prodCantidad, setProdCantidad] = useState(1);
  const [prodTier, setProdTier] = useState<'menudeo' | 'mayoreo'>('menudeo');

  // envío en captura
  const [envConcepto, setEnvConcepto] = useState('');
  const [envPrecio, setEnvPrecio] = useState('');

  useEffect(() => {
    fetch('/api/central/inventario')
      .then((r) => r.json())
      .then((d) => setBodega(d.bodega || {}))
      .catch(() => {});
  }, []);

  const precioDe = (nombre: string, tier: 'menudeo' | 'mayoreo') =>
    Number(bodega[nombre]?.[tier] ?? 0);

  const agregarProducto = () => {
    if (!prodNombre || prodCantidad <= 0) return;
    const precioUnit = precioDe(prodNombre, prodTier);
    setItems([...items, { tipo: 'PRODUCTO', nombre: prodNombre, cantidad: prodCantidad, precioUnit, tier: prodTier }]);
    setProdNombre('');
    setProdCantidad(1);
  };

  const agregarEnvio = () => {
    const precio = Number(envPrecio);
    if (!envConcepto.trim() || !precio || precio <= 0) return;
    setItems([...items, { tipo: 'ENVIO', concepto: envConcepto.trim(), precio }]);
    setEnvConcepto('');
    setEnvPrecio('');
  };

  const quitar = (i: number) => setItems(items.filter((_, ix) => ix !== i));

  const subtotal = items.reduce((s, it) => (it.tipo === 'PRODUCTO' ? s + it.cantidad * it.precioUnit : s), 0);
  const envioTotal = items.reduce((s, it) => (it.tipo === 'ENVIO' ? s + it.precio : s), 0);
  const total = subtotal + envioTotal;

  return (
    <div className="venta-form">
      <h3 style={{ marginTop: 18 }}>🛒 Detalle de la venta</h3>

      {/* ── Productos de la bodega real ── */}
      <div className="venta-fila">
        <select className="input-tel venta-sel" value={prodNombre} onChange={(e) => setProdNombre(e.target.value)}>
          <option value="">— Elegir tela de la bodega —</option>
          {Object.keys(bodega).sort().map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <input
          className="input-tel venta-num"
          type="number"
          min={1}
          value={prodCantidad}
          onChange={(e) => setProdCantidad(Number(e.target.value))}
          title="Cantidad"
        />
        <select className="input-tel venta-sel-chica" value={prodTier} onChange={(e) => setProdTier(e.target.value as 'menudeo' | 'mayoreo')}>
          <option value="menudeo">Menudeo{prodNombre ? ` $${precioDe(prodNombre, 'menudeo')}` : ''}</option>
          <option value="mayoreo">Mayoreo{prodNombre ? ` $${precioDe(prodNombre, 'mayoreo')}` : ''}</option>
        </select>
        <button className="btn-acc venta-add" onClick={agregarProducto}>＋ Agregar</button>
      </div>

      {/* ── Paquetería / flete: nombre y precio MANUALES ── */}
      <h3 style={{ marginTop: 14 }}>🚚 Paquetería / flete (manual)</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {CONCEPTOS_RAPIDOS.map((c) => (
          <button key={c} className="chip" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => setEnvConcepto(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="venta-fila">
        <input
          className="input-tel venta-sel"
          placeholder="Concepto (ej. Flete a Guadalajara)"
          value={envConcepto}
          onChange={(e) => setEnvConcepto(e.target.value)}
        />
        <input
          className="input-tel venta-num"
          type="number"
          min={0}
          placeholder="$ precio"
          value={envPrecio}
          onChange={(e) => setEnvPrecio(e.target.value)}
        />
        <button className="btn-acc venta-add" onClick={agregarEnvio}>＋ Agregar</button>
      </div>

      {/* ── Items capturados ── */}
      {items.length > 0 && (
        <table className="venta-tabla">
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  {it.tipo === 'PRODUCTO'
                    ? `🧵 ${it.nombre} × ${it.cantidad} (${it.tier} $${it.precioUnit})`
                    : `🚚 ${it.concepto}`}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800 }}>
                  ${it.tipo === 'PRODUCTO' ? (it.cantidad * it.precioUnit).toFixed(2) : it.precio.toFixed(2)}
                </td>
                <td style={{ width: 30, textAlign: 'right' }}>
                  <button className="x-sesion" onClick={() => quitar(i)} title="Quitar">✕</button>
                </td>
              </tr>
            ))}
            <tr className="venta-totales">
              <td>Subtotal telas</td><td style={{ textAlign: 'right' }}>${subtotal.toFixed(2)}</td><td />
            </tr>
            <tr className="venta-totales">
              <td>Envío / flete</td><td style={{ textAlign: 'right' }}>${envioTotal.toFixed(2)}</td><td />
            </tr>
            <tr className="venta-total-final">
              <td>TOTAL</td><td style={{ textAlign: 'right' }}>${total.toFixed(2)}</td><td />
            </tr>
          </tbody>
        </table>
      )}

      {/* ── Estado del pago ── */}
      <label className="venta-pago">
        <input type="checkbox" checked={pagoConfirmado} onChange={(e) => setPagoConfirmado(e.target.checked)} />
        <span>
          <b>Pago confirmado</b> — al guardar se emite la <b>nota de venta</b> con folio y se{' '}
          <b>descuenta del inventario</b> en tiempo real
        </span>
      </label>
      {!pagoConfirmado && items.length > 0 && (
        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--cafe-suave)', marginTop: 4 }}>
          Sin confirmar: la venta queda en <b>pagos por confirmar</b>. Se podrá confirmar después y ahí se emitirá la nota.
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Lo ÚNICO del cliente que ve una VENDEDORA fuera de la interacción
export function PagosPendientes({ telefono }: { telefono: string }) {
  const [ventas, setVentas] = useState<Array<{ id: string; total: number; createdAt: string; items: unknown }>>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');

  const cargar = () => {
    setCargando(true);
    fetch(`/api/central/venta?tel=${telefono.replace(/\D/g, '')}&pendientes=1`)
      .then((r) => r.json())
      .then((d) => setVentas(d.ventas || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [telefono]);

  const confirmar = async (ventaId: string) => {
    setMsg('');
    const r = await fetch('/api/central/venta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ventaId }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg(`✅ Pago confirmado · Nota de venta folio #${d.folio} emitida`);
      cargar();
    } else {
      setMsg(d.error || 'No se pudo confirmar');
    }
  };

  if (cargando) return <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Cargando pagos…</p>;

  return (
    <div>
      {ventas.length === 0 ? (
        <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Sin pagos pendientes o por confirmar.</p>
      ) : (
        ventas.map((v) => (
          <div key={v.id} className="pago-pend">
            <div>
              <b>${v.total.toFixed(2)}</b>
              <span style={{ fontSize: 12, color: 'var(--cafe-suave)', fontWeight: 700 }}>
                {' '}· {v.createdAt.slice(0, 10)} · por confirmar
              </span>
            </div>
            <button className="btn-acc" style={{ padding: '8px 12px' }} onClick={() => confirmar(v.id)}>
              💰 Confirmar pago
            </button>
          </div>
        ))
      )}
      {msg && <p style={{ fontWeight: 800, fontSize: 13, marginTop: 8, color: 'var(--verde)' }}>{msg}</p>}
    </div>
  );
}
