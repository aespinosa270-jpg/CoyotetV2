'use client';

// src/app/central/clientes.tsx
// Buscador de clientes + alta manual, para trabajar SIN llamada de por medio.

import { useState } from 'react';

export type FichaCliente = Record<string, unknown> & {
  telefono?: string;
  nombre?: string;
  empresa?: string;
};

// ═══════════════════════════════════════════════════════════
export function BuscadorClientes({
  onAbrir,
  esVendedora,
  altaAbierta,
  setAltaAbierta,
}: {
  onAbrir: (ficha: FichaCliente, modo: 'ficha' | 'interaccion') => void;
  esVendedora: boolean;
  altaAbierta: boolean;
  setAltaAbierta: (v: boolean) => void;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<FichaCliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [msg, setMsg] = useState('');

  const buscar = async () => {
    if (!q.trim()) return;
    setBuscando(true);
    setMsg('');
    try {
      const r = await fetch(`/api/central/clientes?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setResultados(d.clientes || []);
      if ((d.clientes || []).length === 0) setMsg('Sin resultados. Puedes darlo de alta abajo.');
    } catch {
      setMsg('Error buscando');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input-tel"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Buscar por teléfono, nombre o empresa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
        />
        <button type="button" className="btn btn-sol" onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando…' : '🔍 Buscar'}
        </button>
      </div>
      {msg && <p className="aviso-falta" style={{ marginTop: 6 }}>{msg}</p>}

      {resultados.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {resultados.map((c) => (
            <div key={String(c.telefono)} className="fila-cliente">
              <div>
                <b>{String(c.nombre || 'Sin nombre')}</b>
                {c.empresa ? <span className="mini-emp"> · {String(c.empresa)}</span> : null}
                <div className="mini-tel">{String(c.telefono)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn-acc" style={{ padding: '8px 12px' }} onClick={() => onAbrir(c, 'interaccion')}>
                  📝 Registrar interacción
                </button>
                {!esVendedora && (
                  <button className="btn-acc" style={{ padding: '8px 12px' }} onClick={() => onAbrir(c, 'ficha')}>
                    🐺 Ver ficha
                  </button>
                )}
                <button
                  className="btn-acc"
                  style={{ padding: '8px 12px' }}
                  onClick={() => window.open(`https://wa.me/${String(c.telefono)}`, '_blank')}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AltaCliente
        telefonoSugerido={q.replace(/\D/g, '')}
        abierto={altaAbierta}
        setAbierto={setAltaAbierta}
        onCreado={(c) => onAbrir(c, 'interaccion')}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export function AltaCliente({
  telefonoSugerido = '',
  abierto,
  setAbierto,
  onCreado,
}: {
  telefonoSugerido?: string;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  onCreado: (ficha: FichaCliente) => void;
}) {
  const [telefono, setTelefono] = useState(telefonoSugerido);
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const crear = async () => {
    setError('');
    if (telefono.replace(/\D/g, '').length < 10) {
      setError('El teléfono debe tener al menos 10 dígitos');
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch('/api/central/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, nombre, empresa, notas }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || 'No se pudo registrar');
        return;
      }
      onCreado(d.cliente);
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn btn-nuevo"
        style={{ marginTop: 16, width: '100%' }}
        onClick={() => setAbierto(true)}
      >
        ＋ Dar de alta un cliente nuevo
      </button>
    );
  }

  return (
    <div className="venta-form" style={{ marginTop: 12 }}>
      <h3>＋ Cliente nuevo</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input className="input-tel" placeholder="Teléfono (10 dígitos, con 521 si aplica)" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <input className="input-tel" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="input-tel" placeholder="Empresa (opcional)" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
        <textarea placeholder="Notas iniciales (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ minHeight: 70 }} />
      </div>
      {error && <p className="aviso-falta">{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-sol" onClick={crear} disabled={guardando}>
          {guardando ? 'Guardando…' : '🐺 Registrar cliente'}
        </button>
        <button type="button" className="btn btn-linea" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </div>
  );
}
