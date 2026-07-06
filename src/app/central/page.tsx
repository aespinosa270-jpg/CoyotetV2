'use client';

/**
 * COYOTE TEXTIL · Central de llamadas
 * Módulo nuevo, desde cero. Ruta: /central
 * Fiel al mock coyote-textil-llamadas.html
 *
 * Estados: idle → entrante → llamada → dispo (obligatoria) → conf → idle
 * Próximo paso: conectar SIP.js en los puntos marcados con TODO(SIP)
 */

import { useEffect, useRef, useState } from 'react';
import './central.css';

// ─── Tipos ───────────────────────────────────────────────
type Pantalla = 'idle' | 'llamada' | 'dispo' | 'conf';

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

// ─── Datos demo (luego se jalan de Upstash/RDS por teléfono) ──
const CLIENTE_DEMO: Cliente = {
  iniciales: 'RM',
  nombre: 'Rosa Martínez',
  empresa: 'Deportes RM',
  telefono: '+52 55 3408 1869',
  tier: 'ELITE',
  leadScore: 87,
  leadTemp: 'Caliente',
};

const GUION_DEMO: LineaTrans[] = [
  { tipo: 'cli', quien: 'Rosa', texto: 'Oye Katy, ¿tienes el micro piqué en azul rey todavía?' },
  { tipo: 'agt', quien: 'Katy', texto: '¡Claro Rosa! Tenemos 8 rollos en Guatemala 97.' },
  { tipo: 'cli', quien: 'Rosa', texto: 'Perfecto, apártame 5 y el resto lo veo la otra semana.' },
  { tipo: 'agt', quien: 'Katy', texto: 'Listo, te los aparto ahorita. ¿Te los mando el jueves como siempre?' },
  { tipo: 'cli', quien: 'Rosa', texto: 'Sí porfa, jueves está perfecto 🙌' },
];

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

const AGENTE = { iniciales: 'KT', nombre: 'Katy Torres', rol: 'Vendedora', nombreCorto: 'Katy' };

// ─── Helpers ─────────────────────────────────────────────
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cliente = CLIENTE_DEMO;

  // ── Timer de llamada ──
  useEffect(() => {
    if (pantalla === 'llamada') {
      timerRef.current = setInterval(() => setSeg((s: number) => s + 1), 1000);
      // Transcripción simulada (TODO(SIP): reemplazar por stream real de Whisper)
      let i = 0;
      transRef.current = setInterval(() => {
        if (i >= GUION_DEMO.length) {
          if (transRef.current) clearInterval(transRef.current);
          return;
        }
        const linea = GUION_DEMO[i++];
        setTrans((t: LineaTrans[]) => [...t, linea]);
      }, 2600);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transRef.current) clearInterval(transRef.current);
    };
  }, [pantalla]);

  // ── Acciones ──
  const simularEntrante = () => setEntrante(true); // TODO(SIP): evento real 'invite'

  const contestar = () => {
    // TODO(SIP): session.accept()
    setEntrante(false);
    setSeg(0);
    setTrans([]);
    setScriptVisible(true);
    setGrabando(true);
    setMute(false);
    setHold(false);
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
    // TODO(API): POST /api/central/interaccion { resultado, nota, durFinal, telefono, grabacionUrl }
    setPantalla('conf');
  };

  const volverIdle = () => {
    setSeg(0);
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
          <div className="foto">{AGENTE.iniciales}</div>
          {AGENTE.nombre} · {AGENTE.rol}
          <span className="punto-verde" /> Disponible
        </div>
      </div>

      {/* ═══ 1. IDLE ═══ */}
      {pantalla === 'idle' && (
        <div className="pantalla">
          <div className="idle-grid">
            <div className="hero-idle">
              <div className="saludo-hora">Turno matutino</div>
              <h2>Buenos días, {AGENTE.nombreCorto} 🌞</h2>
              <p>
                Tu línea está activa. Sin llamadas en cola por ahora — cuando entre una, la verás
                aquí al instante con toda la ficha del cliente.
              </p>
              <div style={{ marginTop: 26 }}>
                <button className="btn btn-sol" onClick={simularEntrante}>
                  📞 Simular llamada entrante
                </button>
              </div>
            </div>
            <div className="stats-dia">
              <div className="stat"><div className="icono i-amarillo">📞</div><div><b>12</b><span>Llamadas hoy</span></div></div>
              <div className="stat"><div className="icono i-verde">🛒</div><div><b>4</b><span>Ventas cerradas</span></div></div>
              <div className="stat"><div className="icono i-coral">⏱️</div><div><b>3:42</b><span>Duración promedio</span></div></div>
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
              <div className="onditas"><i /><i /><i /><i /><i /></div>
              <div className="timer-grande">{fmt(seg)}</div>
            </div>
            <div className="controles">
              <button className={`ctrl ${mute ? 'on' : ''}`} onClick={() => setMute(!mute)} title="Silenciar">🎙️</button>
              <button className={`ctrl ${hold ? 'on' : ''}`} onClick={() => setHold(!hold)} title="En espera">⏸️</button>
              <button className="ctrl" title="Transferir">🔀</button>
              <button className={`ctrl-rec ${grabando ? 'grabando' : ''}`} onClick={() => setGrabando(!grabando)}>
                <span className="puntito" />
                <span>{grabando ? 'Grabando' : 'REC'}</span>
              </button>
              <button className="ctrl-colgar" onClick={colgar}>📵 Colgar</button>
            </div>
          </div>

          {scriptVisible && (
            <div className="script">
              <p>
                💬 "Hola, soy <b>{AGENTE.nombreCorto}</b> de <b>Coyote Textil</b> 🐺.
                {saludoTier && <> Gracias por ser cliente <b>{saludoTier}</b>.</>}
                {' '}¿Cómo le ayudamos el día de hoy?"
              </p>
              <button className="x" onClick={() => setScriptVisible(false)}>✕</button>
            </div>
          )}

          <div className="grid-llamada">
            <div>
              {/* Membresía estilo Prime */}
              <div className="card-elite">
                <div className="sello">coyote ELITE ⭐<small>Membresía anual</small></div>
                <div className="datos">
                  $4,999 MXN / año
                  <small>Vence 15 mar 2027 · 2,340 puntos</small>
                  <small>3 de 12 colocaciones usadas</small>
                </div>
              </div>

              {/* Pedidos estilo Amazon */}
              <div className="cards-pedidos">
                <div className="pedido"><span className="em">🧵</span><b>14 rollos micro piqué azul rey</b><span className="est e1">En camino · llega mañana 10 PM</span></div>
                <div className="pedido"><span className="em">📦</span><b>Dry-fit 145g negro · 8 rollos</b><span className="est e2">Preparando en Plomo 203</span></div>
                <div className="pedido"><span className="em">✅</span><b>Felpa francesa · 5 rollos</b><span className="est e3">Entregado 20 jun</span></div>
              </div>

              <details>
                <summary>💬 Últimos WhatsApp</summary>
                <div className="cont">
                  <div className="chip-wa"><span className="h-wa">ayer 6:12pm</span> — "¿Llegó el azul rey?"</div><br />
                  <div className="chip-wa"><span className="h-wa">ayer 6:15pm</span> — Bot 🐺: "Sí Rosa, 8 rollos en Guatemala 97"</div><br />
                  <div className="chip-wa"><span className="h-wa">hoy 9:03am</span> — "Te marco al rato para apartar"</div>
                </div>
              </details>

              <details>
                <summary>📦 Pedidos y saldo</summary>
                <div className="cont">
                  <table>
                    <tbody>
                      <tr><td>Pedido activo</td><td>#ORD-2201 · preparando</td></tr>
                      <tr><td>Saldo pendiente</td><td className="txt-rojo">$12,400</td></tr>
                      <tr><td>LTV</td><td className="txt-verde">$184,500</td></tr>
                      <tr><td>Sucursal preferida</td><td>Guatemala 97</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>

              <details>
                <summary>🧵 Telas que siempre compra</summary>
                <div className="cont">Micro piqué (azul rey, negro) · Dry-fit 145g · Felpa francesa. Promedio: 12 rollos/mes.</div>
              </details>

              <details>
                <summary>📝 Notas de llamadas anteriores</summary>
                <div className="cont">12 jun — Pidió precio mayoreo actualizado. Prefiere entregas jueves. No llamar antes de 10am 🕙</div>
              </details>
            </div>

            <div>
              <details open>
                <summary>🎙️ Transcripción en vivo <span className="tag-whisper">● Whisper</span></summary>
                <div className="cont">
                  {trans.map((l, i) => (
                    <p key={i} className="trans-linea">
                      <span className={`h h-${l.tipo}`}>{l.quien}:</span> {l.texto}
                    </p>
                  ))}
                </div>
              </details>

              <div className="acciones">
                <button className="btn-acc">🛒 Crear pedido</button>
                <button className="btn-acc">📝 Añadir nota</button>
                <button className="btn-acc">💬 Ir a su WhatsApp</button>
                <button className="btn-acc">🧵 Inventario en vivo</button>
              </div>
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
                <h2>¿Qué pasó en la llamada?</h2>
                <div className="sub">{cliente.nombre} · {cliente.empresa} · duró {fmt(durFinal)}</div>
              </div>
            </div>
            <div className="dispo-body">
              <h3>Resultado de la llamada <span className="obligatorio">* obligatorio</span></h3>
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

              <h3>Notas de la interacción <span className="obligatorio">* obligatorio</span></h3>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Apartó 5 rollos de micro piqué azul rey, entrega el jueves. Quedé de mandarle cotización de dry-fit por WhatsApp."
              />
              <div className="aviso-falta">{aviso}</div>

              <div className="dispo-footer">
                <div className="meta-llamada">🎙️ Grabación guardada · Transcripción lista (Whisper)</div>
                <button className={`btn btn-sol btn-guardar ${listo ? 'listo' : ''}`} onClick={guardar}>
                  💾 Guardar y cerrar llamada
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
              <div><span>Duración</span><b>{fmt(durFinal)}</b></div>
              <div><span>Nota</span><b style={{ maxWidth: 280 }}>{nota.length > 60 ? nota.slice(0, 60) + '…' : nota}</b></div>
              <div><span>Grabación</span><b className="txt-verde">Guardada 🎙️</b></div>
            </div>
            <button className="btn btn-sol" onClick={volverIdle}>🐺 Volver a disponible</button>
          </div>
        </div>
      )}
    </div>
  );
}
