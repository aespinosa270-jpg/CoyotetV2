'use client';

/**
 * COYOTE TEXTIL · Central de llamadas — REAL
 * Ruta: /central
 * - Ficha del cliente: se busca EN VIVO en Upstash por teléfono (/api/central/cliente)
 * - Disposición: se guarda EN VIVO en la RDS vía Prisma (/api/central/llamada)
 * - Voz: pendiente de troncal SIP → puntos marcados TODO(SIP)
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VentaForm, PagosPendientes, type ItemVenta } from './venta';
import { BuscadorClientes, type FichaCliente } from './clientes';
// @ts-ignore TS7016: CSS imports are handled by Next.js
import './central.css';

// ─── Tipos ───────────────────────────────────────────────
type Pantalla = 'idle' | 'clientes' | 'llamada' | 'dispo' | 'conf';

type LineaTrans = { tipo: 'cli' | 'agt'; quien: string; texto: string };

type Cliente = {
  iniciales: string;
  nombre: string;
  empresa: string;
  telefono: string;
  tier: 'ELITE' | 'BLACK' | 'GOLD' | 'NONE';
  leadScore: number;
  leadTemp: string;
};

// ─── Ficha vacía por defecto (se llena EN VIVO desde Upstash) ──
const CLIENTE_VACIO: Cliente = {
  iniciales: '??',
  nombre: 'Desconocido',
  empresa: '',
  telefono: '',
  tier: 'NONE',
  leadScore: 0,
  leadTemp: 'Nuevo',
};

function inicialesDe(nombre: string, tel: string): string {
  const limpio = (nombre || '').trim();
  if (!limpio) return tel.slice(-2) || '??';
  const partes = limpio.split(/\s+/);
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
}

const RESULTADOS = [
  { v: 'Venta cerrada', e: '🛒' },
  { v: 'Cotización enviada', e: '📋' },
  { v: 'Seguimiento agendado', e: '📅' },
  { v: 'Pregunta de inventario', e: '🧵' },
  { v: 'Cobranza / pago', e: '💰' },
  { v: 'Queja o problema', e: '😠' },
  { v: 'No interesado', e: '🚫' },
  { v: 'Número equivocado', e: '📵' },
];

type Agente = { id: string; nombre: string; rol: string };
type Stats = { llamadasHoy: number; ventasHoy: number; duracionPromedio: string };

// ─── Helpers ─────────────────────────────────────────────
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;


// ─── Historial real de llamadas anteriores (RDS) ─────────
function HistorialLlamadas({ telefono }: { telefono: string }) {
  const [items, setItems] = useState<Array<{ id: string; resultado: string; nota: string; createdAt: string }>>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/central/llamada')
      .then((r) => r.json())
      .then((d) => {
        const propias = (d.llamadas || []).filter(
          (l: { telefono: string }) => l.telefono === telefono.replace(/\D/g, ''),
        );
        setItems(propias.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [telefono]);

  if (cargando) return <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Cargando…</p>;
  if (items.length === 0)
    return <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Sin llamadas anteriores registradas.</p>;
  return (
    <>
      {items.map((l) => (
        <p key={l.id} style={{ marginBottom: 8 }}>
          <b>{l.createdAt.slice(0, 10)}</b> · {l.resultado} — {l.nota.slice(0, 90)}
        </p>
      ))}
    </>
  );
}

// ─── Componente ──────────────────────────────────────────
export default function CentralLlamadas() {
  const [pantalla, setPantalla] = useState<Pantalla>('idle');
  const [entrante, setEntrante] = useState(false);
  const [seg, setSeg] = useState(0);
  const [durFinal, setDurFinal] = useState(0);
  const [grabando, setGrabando] = useState(true);
  const [mute, setMute] = useState(false);
  const [hold, setHold] = useState(false);
  const [scriptVisible, setScriptVisible] = useState(true);
  const [trans, setTrans] = useState<LineaTrans[]>([]);
  const [resultado, setResultado] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [cliente, setCliente] = useState<Cliente>(CLIENTE_VACIO);
  const [ficha, setFicha] = useState<Record<string, unknown>>({});
  const [agente, setAgente] = useState<Agente | null>(null);
  const [stats, setStats] = useState<Stats>({ llamadasHoy: 0, ventasHoy: 0, duracionPromedio: '0:00' });
  const [inventario, setInventario] = useState<Record<string, { menudeo?: number; mayoreo?: number; info?: string }>>({});
  const [invVisible, setInvVisible] = useState(false);
  const [invFiltro, setInvFiltro] = useState('');
  const [ventaItems, setVentaItems] = useState<ItemVenta[]>([]);
  const [ventaPagoConf, setVentaPagoConf] = useState(false);
  const [pedidoVisible, setPedidoVisible] = useState(false);
  const [canal, setCanal] = useState<'Llamada' | 'WhatsApp' | 'Presencial' | 'Correo'>('Llamada');
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [folioNota, setFolioNota] = useState<number | null>(null);
  const router = useRouter();

  const esVendedora = agente?.rol === 'VENDEDORA';
  const [telPrueba, setTelPrueba] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sesión REAL: exige login contra Employee de la RDS ──
  useEffect(() => {
    fetch('/api/central/yo')
      .then((r) => {
        if (r.status === 401) { router.push('/central/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d?.empleado) setAgente(d.empleado); })
      .catch(() => {});
    // Stats REALES del día desde la tabla Llamada
    fetch('/api/central/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, [router]);

  // ── Timer de llamada ──
  useEffect(() => {
    if (pantalla === 'llamada' && canal === 'Llamada') {
      timerRef.current = setInterval(() => setSeg((s: number) => s + 1), 1000);
      // TODO(SIP): aquí se conectará el stream de audio → Whisper para transcripción real
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transRef.current) clearInterval(transRef.current);
    };
  }, [pantalla, canal]);

  // ── Acciones ──
  // Hoy: se dispara a mano con un teléfono real de tu Upstash.
  // TODO(SIP): cuando haya troncal, el evento 'invite' de SIP.js llamará a esta misma función con el caller ID.
  const entrarLlamada = async (telefonoRaw: string) => {
    const tel = telefonoRaw.replace(/\D/g, '');
    if (!tel) { setErrorMsg('Escribe un teléfono'); return; }
    setBuscando(true);
    setErrorMsg('');
    try {
      const r = await fetch(`/api/central/cliente?tel=${tel}`);
      const data = await r.json();
      const c = data.cliente || {};
      setFicha(c);
      setCliente({
        iniciales: inicialesDe(c.nombre, tel),
        nombre: c.nombre || 'Cliente nuevo',
        empresa: c.empresa || '',
        telefono: tel,
        tier: (c.membershipTier as Cliente['tier']) || 'NONE',
        leadScore: c.leadScore ?? c.engagementScore ?? 0,
        leadTemp: c.temperatura || (data.encontrado ? 'Conocido' : 'Nuevo'),
      });
      setEntrante(true);
    } catch {
      setErrorMsg('No se pudo consultar la ficha');
    } finally {
      setBuscando(false);
    }
  };

  // Abrir un cliente SIN llamada: ficha o registro de interacción manual
  const abrirCliente = (f: FichaCliente, modo: 'ficha' | 'interaccion') => {
    const tel = String(f.telefono || '').replace(/\D/g, '');
    setFicha(f);
    setCliente({
      iniciales: inicialesDe(String(f.nombre || ''), tel),
      nombre: String(f.nombre || 'Cliente nuevo'),
      empresa: String(f.empresa || ''),
      telefono: tel,
      tier: (f.membershipTier as Cliente['tier']) || 'NONE',
      leadScore: Number(f.leadScore ?? f.engagementScore ?? 0),
      leadTemp: String(f.temperatura || 'Conocido'),
    });
    setVentaItems([]);
    setVentaPagoConf(false);
    setPedidoVisible(false);
    setSeg(0);
    if (modo === 'interaccion') {
      setCanal('WhatsApp');
      setDurFinal(0);
      setResultado(null);
      setNota('');
      setPantalla('dispo'); // va directo a registrar qué pasó
    } else {
      setScriptVisible(false);
      setCanal('Presencial');
      setPantalla('llamada'); // usa la vista de ficha completa, sin timer de voz
    }
  };

  const contestar = () => {
    // TODO(SIP): session.accept()
    setEntrante(false);
    setSeg(0);
    setTrans([]);
    setScriptVisible(true);
    setGrabando(true);
    setMute(false);
    setHold(false);
    setVentaItems([]);
    setVentaPagoConf(false);
    setPedidoVisible(false);
    setCanal('Llamada');
    setPantalla('llamada');
  };

  const rechazar = () => {
    // TODO(SIP): session.reject()
    setEntrante(false);
  };

  const colgar = () => {
    // TODO(SIP): session.bye()
    setDurFinal(seg);
    setResultado(null);
    setNota('');
    setPantalla('dispo');
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorMsg('');
    setFolioNota(null);
    try {
      // 1. Guardar la llamada
      const r = await fetch('/api/central/llamada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: cliente.telefono,
          nombre: cliente.nombre,
          empresa: cliente.empresa,
          resultado,
          nota: `[${canal}] ${nota}`,
          duracionSeg: durFinal,
          agente: agente?.nombre || 'Sin sesión',
        }),
      });
      const dataLlamada = await r.json();
      if (!r.ok) {
        setErrorMsg(dataLlamada.error || 'No se pudo guardar la llamada.');
        return;
      }

      // 2. Si fue venta cerrada con items → guardar la venta REAL
      if (resultado === 'Venta cerrada' && ventaItems.length > 0) {
        const rv = await fetch('/api/central/venta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: cliente.telefono,
            clienteNombre: cliente.nombre,
            agente: agente?.nombre,
            items: ventaItems,
            pagoConfirmado: ventaPagoConf,
            llamadaId: dataLlamada.id,
          }),
        });
        const dv = await rv.json();
        if (!rv.ok) {
          setErrorMsg(dv.error || 'La llamada se guardó pero la venta falló.');
          return;
        }
        if (dv.folio) setFolioNota(dv.folio);
      }

      setPantalla('conf');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const volverIdle = () => {
    setSeg(0);
    setCanal('Llamada');
    setVentaItems([]);
    setVentaPagoConf(false);
    setPantalla('idle');
  };

  const notaOk = nota.trim().length >= 5;
  const listo = Boolean(resultado) && notaOk;
  const aviso = !resultado && !notaOk
    ? 'Elige un resultado y escribe tu nota para poder cerrar.'
    : !resultado
      ? 'Falta elegir el resultado de la llamada.'
      : !notaOk
        ? 'Falta tu nota de la interacción (mínimo unas palabras).'
        : '';

  const nombreCorto = (agente?.nombre || '').split(' ')[0] || '';
  const inicialesAgente = agente
    ? agente.nombre.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '··';

  const cargarInventario = async () => {
    setInvVisible(!invVisible);
    if (Object.keys(inventario).length === 0) {
      try {
        const r = await fetch('/api/central/inventario');
        const d = await r.json();
        setInventario(d.bodega || {});
      } catch { /* silencioso */ }
    }
  };

  const cerrarSesion = async () => {
    await fetch('/api/central/yo', { method: 'DELETE' });
    router.push('/central/login');
  };

  const saludoTier =
    cliente.tier === 'ELITE' ? 'Elite' : cliente.tier === 'BLACK' ? 'Black' : cliente.tier === 'GOLD' ? 'Gold' : '';

  return (
    <div className="central-root">
      {/* ═══ TOPBAR ═══ */}
      <div className="topbar">
        <div className="marca">
          <div className="sello-lobo">🐺</div>
          <div>
            <h1>Coyote Textil</h1>
            <small>Central de llamadas</small>
          </div>
        </div>
        <div className="agente-chip">
          <div className="foto">{inicialesAgente}</div>
          {agente ? `${agente.nombre} · ${agente.rol}` : 'Cargando…'}
          <span className="punto-verde" /> Disponible
          <button className="x-sesion" onClick={cerrarSesion} title="Cerrar sesión">⏻</button>
        </div>
      </div>

      {/* ═══ 1. IDLE ═══ */}
      {pantalla === 'idle' && (
        <div className="pantalla">
          <div className="idle-grid">
            <div className="hero-idle">
              <div className="saludo-hora">Turno matutino</div>
              <h2>Buenos días{nombreCorto ? `, ${nombreCorto}` : ''} 🌞</h2>
              <p>
                Tu línea está activa. Sin llamadas en cola por ahora — cuando entre una, la verás
                aquí al instante con toda la ficha del cliente.
              </p>
              <div className="hero-acciones">
                <input
                  className="input-tel"
                  placeholder="Teléfono (ej. 5215534081869)"
                  value={telPrueba}
                  onChange={(e) => setTelPrueba(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && entrarLlamada(telPrueba)}
                />
                <button type="button" className="btn btn-sol" onClick={() => entrarLlamada(telPrueba)} disabled={buscando}>
                  {buscando ? 'Buscando…' : '📞 Entrar llamada'}
                </button>
                <button type="button" className="btn btn-linea" onClick={() => setPantalla('clientes')}>
                  🔍 Buscar clientes
                </button>
                <button type="button" className="btn btn-nuevo" onClick={() => { setAltaAbierta(true); setPantalla('clientes'); }}>
                  ＋ Nuevo cliente
                </button>
              </div>
              {errorMsg && <div className="aviso-falta" style={{ marginTop: 8 }}>{errorMsg}</div>}
              <p style={{ marginTop: 10, fontSize: 12, color: 'var(--cafe-suave)', fontWeight: 700 }}>
                Prueba con un teléfono real de tu base — la ficha se busca en vivo en Upstash.
                Cuando conectemos el troncal SIP, esto se disparará solo con cada llamada entrante.
              </p>
            </div>
            <div className="stats-dia">
              <div className="stat"><div className="icono i-amarillo">📞</div><div><b>{stats.llamadasHoy}</b><span>Llamadas hoy</span></div></div>
              <div className="stat"><div className="icono i-verde">🛒</div><div><b>{stats.ventasHoy}</b><span>Ventas cerradas</span></div></div>
              <div className="stat"><div className="icono i-coral">⏱️</div><div><b>{stats.duracionPromedio}</b><span>Duración promedio</span></div></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 1b. CLIENTES (sin llamada) ═══ */}
      {pantalla === 'clientes' && (
        <div className="pantalla">
          <div className="dispo-wrap">
            <div className="dispo-head">
              <div className="foto">🔍</div>
              <div>
                <h2>Clientes</h2>
                <div className="sub">Busca, registra interacciones o da de alta sin necesidad de llamada</div>
              </div>
            </div>
            <div className="dispo-body">
              <BuscadorClientes
                onAbrir={abrirCliente}
                esVendedora={Boolean(esVendedora)}
                altaAbierta={altaAbierta}
                setAltaAbierta={setAltaAbierta}
              />
              <div style={{ marginTop: 18 }}>
                <button className="btn btn-linea" onClick={() => setPantalla('idle')}>← Volver</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. ENTRANTE (overlay) ═══ */}
      {entrante && (
        <div className="velo">
          <div className="card-entrante">
            <div className="anillo">{cliente.iniciales}</div>
            <div className="etiqueta-entrante">📳 Llamada entrante</div>
            <h2>{cliente.nombre}</h2>
            <div className="empresa">{cliente.empresa}</div>
            <div className="numero">{cliente.telefono}</div>
            <div className="fila-badges">
              {cliente.tier !== 'NONE' && (
                <span className={`badge b-${cliente.tier.toLowerCase()}`}>⭐ Cliente {saludoTier}</span>
              )}
              <span className="badge b-lead">🔥 Lead {cliente.leadScore} · {cliente.leadTemp}</span>
            </div>
            <div className="botones-entrante">
              <button className="btn btn-verde" onClick={contestar}>✅ Contestar</button>
              <button className="btn btn-linea" onClick={rechazar}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3. EN LLAMADA ═══ */}
      {pantalla === 'llamada' && (
        <div className="pantalla">
          <div className="barra-viva">
            <div className="quien">
              <div className="foto-med">{cliente.iniciales}</div>
              <div>
                <h2>{cliente.nombre}</h2>
                <div className="mini">{cliente.empresa} · {cliente.telefono} · ⭐ {saludoTier}</div>
              </div>
              {canal === 'Llamada' && (
                <>
                  <div className="onditas"><i /><i /><i /><i /><i /></div>
                  <div className="timer-grande">{fmt(seg)}</div>
                </>
              )}
              {canal !== 'Llamada' && (
                <span className="badge b-lead" style={{ marginLeft: 8 }}>Sin llamada · {canal}</span>
              )}
            </div>
            <div className="controles">
              {canal === 'Llamada' ? (
                <>
                  <button className={`ctrl ${mute ? 'on' : ''}`} onClick={() => setMute(!mute)} title="Silenciar">🎙️</button>
                  <button className={`ctrl ${hold ? 'on' : ''}`} onClick={() => setHold(!hold)} title="En espera">⏸️</button>
                  <button className={`ctrl-rec ${grabando ? 'grabando' : ''}`} onClick={() => setGrabando(!grabando)}>
                    <span className="puntito" />
                    <span>{grabando ? 'Grabando' : 'REC'}</span>
                  </button>
                  <button className="ctrl-colgar" onClick={colgar}>📵 Colgar</button>
                </>
              ) : (
                <>
                  <button className="ctrl-colgar" style={{ background: 'var(--verde)' }} onClick={colgar}>
                    📝 Registrar interacción
                  </button>
                  <button className="ctrl" onClick={() => setPantalla('clientes')} title="Volver a clientes">✕</button>
                </>
              )}
            </div>
          </div>

          {scriptVisible && (
            <div className="script">
              <p>
                💬 "Hola, soy <b>{nombreCorto || 'tu asesora'}</b> de <b>Coyote Textil</b> 🐺.
                {saludoTier && <> Gracias por ser cliente <b>{saludoTier}</b>.</>}
                {' '}¿Cómo le ayudamos el día de hoy?"
              </p>
              <button className="x" onClick={() => setScriptVisible(false)}>✕</button>
            </div>
          )}

          <div className="grid-llamada">
            <div>
              {/* Membresía: solo si el cliente la tiene en su ficha real */}
              {typeof ficha.membershipTier === 'string' && ficha.membershipTier !== 'NONE' && (
                <div className="card-elite">
                  <div className="sello">coyote {String(ficha.membershipTier)} ⭐<small>Membresía</small></div>
                  <div className="datos">
                    {ficha.membershipExpiry ? <small>Vence {String(ficha.membershipExpiry).slice(0, 10)}</small> : null}
                    {ficha.points != null ? <small>{String(ficha.points)} puntos</small> : null}
                  </div>
                </div>
              )}

              {/* PERMISOS por rol:
                  - VENDEDORA: solo pagos pendientes/por confirmar (sin datos personales del cliente)
                  - ADMIN/SUPERVISOR: ficha completa de Upstash */}
              {esVendedora ? (
                <details open>
                  <summary>💰 Pagos pendientes / por confirmar</summary>
                  <div className="cont">
                    <PagosPendientes telefono={cliente.telefono} />
                  </div>
                </details>
              ) : (
                <>
                  <details open>
                    <summary>🐺 Ficha del cliente (Upstash en vivo)</summary>
                    <div className="cont">
                      {Object.keys(ficha).length === 0 ? (
                        <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Sin ficha en Redis para este teléfono.</p>
                      ) : (
                        <table>
                          <tbody>
                            {Object.entries(ficha).map(([k, v]) => (
                              <tr key={k}>
                                <td>{k}</td>
                                <td>{typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>
                  <details>
                    <summary>💰 Pagos pendientes / por confirmar</summary>
                    <div className="cont">
                      <PagosPendientes telefono={cliente.telefono} />
                    </div>
                  </details>
                </>
              )}

              <details>
                <summary>📝 Notas de llamadas anteriores</summary>
                <div className="cont">
                  <HistorialLlamadas telefono={cliente.telefono} />
                </div>
              </details>
            </div>

            <div>
              <details open>
                <summary>🎙️ Transcripción en vivo <span className="tag-whisper">● Whisper</span></summary>
                <div className="cont">
                  {trans.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--cafe-suave)', fontWeight: 700 }}>
                      La transcripción en vivo se activará al conectar el troncal SIP + Whisper.
                    </p>
                  )}
                  {trans.map((l, i) => (
                    <p key={i} className="trans-linea">
                      <span className={`h h-${l.tipo}`}>{l.quien}:</span> {l.texto}
                    </p>
                  ))}
                </div>
              </details>

              <div className="acciones">
                <button
                  className="btn-acc"
                  onClick={() => window.open(`https://wa.me/${cliente.telefono}`, '_blank')}
                >
                  💬 Ir a su WhatsApp
                </button>
                <button className="btn-acc" onClick={cargarInventario}>
                  🧵 {invVisible ? 'Ocultar inventario' : 'Inventario en vivo'}
                </button>
                <button className="btn-acc" onClick={() => setPedidoVisible(!pedidoVisible)}>
                  🛒 {pedidoVisible ? 'Ocultar pedido' : `Crear pedido${ventaItems.length ? ` (${ventaItems.length})` : ''}`}
                </button>
                <button className="btn-acc btn-acc-off" disabled title="Requiere troncal SIP">
                  🔀 Transferir (requiere SIP)
                </button>
              </div>

              {pedidoVisible && (
                <div style={{ marginTop: 10 }}>
                  <VentaForm
                    items={ventaItems}
                    setItems={setVentaItems}
                    pagoConfirmado={ventaPagoConf}
                    setPagoConfirmado={setVentaPagoConf}
                  />
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cafe-suave)', marginTop: 6 }}>
                    El pedido se guarda al cerrar la llamada (elige "Venta cerrada" en el resultado).
                  </p>
                </div>
              )}

              {invVisible && (
                <details open style={{ marginTop: 10 }}>
                  <summary>🧵 Bodega Coyote (Upstash en vivo)</summary>
                  <div className="cont">
                    <input
                      className="input-tel"
                      style={{ minWidth: 0, width: '100%', marginBottom: 10 }}
                      placeholder="Buscar tela…"
                      value={invFiltro}
                      onChange={(e) => setInvFiltro(e.target.value)}
                    />
                    {Object.keys(inventario).length === 0 ? (
                      <p style={{ fontWeight: 700, color: 'var(--cafe-suave)' }}>Cargando bodega…</p>
                    ) : (
                      <table>
                        <tbody>
                          {Object.entries(inventario)
                            .filter(([nombre]) => nombre.toLowerCase().includes(invFiltro.toLowerCase()))
                            .slice(0, 30)
                            .map(([nombre, p]) => (
                              <tr key={nombre}>
                                <td>{nombre}</td>
                                <td>
                                  ${p.menudeo ?? '—'} men · ${p.mayoreo ?? '—'} may
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. DISPOSICIÓN (obligatoria) ═══ */}
      {pantalla === 'dispo' && (
        <div className="pantalla">
          <div className="dispo-wrap">
            <div className="dispo-head">
              <div className="foto">{cliente.iniciales}</div>
              <div>
                <h2>{canal === 'Llamada' ? '¿Qué pasó en la llamada?' : '¿Qué pasó en la interacción?'}</h2>
                <div className="sub">
                  {cliente.nombre}{cliente.empresa ? ` · ${cliente.empresa}` : ''}
                  {canal === 'Llamada' ? ` · duró ${fmt(durFinal)}` : ` · ${cliente.telefono}`}
                </div>
              </div>
            </div>
            <div className="dispo-body">
              {canal !== 'Llamada' && (
                <>
                  <h3>Canal de la interacción</h3>
                  <div className="chips" style={{ marginBottom: 18 }}>
                    {(['WhatsApp', 'Presencial', 'Correo', 'Llamada'] as const).map((c) => (
                      <button key={c} className={`chip ${canal === c ? 'sel' : ''}`} onClick={() => setCanal(c)}>
                        {c === 'WhatsApp' ? '💬' : c === 'Presencial' ? '🤝' : c === 'Correo' ? '✉️' : '📞'} {c}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <h3>Resultado <span className="obligatorio">* obligatorio</span></h3>
              <div className="chips">
                {RESULTADOS.map((r) => (
                  <button
                    key={r.v}
                    className={`chip ${resultado === r.v ? 'sel' : ''}`}
                    onClick={() => setResultado(r.v)}
                  >
                    {r.e} {r.v}
                  </button>
                ))}
              </div>

              {resultado === 'Venta cerrada' && (
                <VentaForm
                  items={ventaItems}
                  setItems={setVentaItems}
                  pagoConfirmado={ventaPagoConf}
                  setPagoConfirmado={setVentaPagoConf}
                />
              )}

              <h3>Notas de la interacción <span className="obligatorio">* obligatorio</span></h3>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Apartó 5 rollos de micro piqué azul rey, entrega el jueves. Quedé de mandarle cotización de dry-fit por WhatsApp."
              />
              <div className="aviso-falta">{aviso || errorMsg}</div>

              <div className="dispo-footer">
                <div className="meta-llamada">🎙️ Grabación y transcripción: se activan al conectar el troncal SIP</div>
                <button className={`btn btn-sol btn-guardar ${listo && !guardando ? 'listo' : ''}`} onClick={guardar}>
                  {guardando ? 'Guardando…' : '💾 Guardar y cerrar llamada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 5. CONFIRMACIÓN ═══ */}
      {pantalla === 'conf' && (
        <div className="pantalla">
          <div className="conf-card">
            <div className="paloma">✅</div>
            <h2>Interacción registrada</h2>
            <p>{cliente.nombre} · {cliente.empresa} · ⭐ {saludoTier}</p>
            <div className="conf-resumen">
              <div><span>Resultado</span><b>{resultado}</b></div>
              <div><span>Canal</span><b>{canal}</b></div>
              {canal === 'Llamada' && <div><span>Duración</span><b>{fmt(durFinal)}</b></div>}
              <div><span>Nota</span><b style={{ maxWidth: 280 }}>{nota.length > 60 ? nota.slice(0, 60) + '…' : nota}</b></div>
              <div><span>Guardado en</span><b className="txt-verde">RDS · tabla Llamada ✅</b></div>
              {folioNota != null && (
                <div><span>Nota de venta</span><b className="txt-verde">Folio #{folioNota} emitida 🧾</b></div>
              )}
            </div>
            <button className="btn btn-sol" onClick={volverIdle}>🐺 Volver a disponible</button>
          </div>
        </div>
      )}
    </div>
  );
}
