'use client';

// src/app/central/login/page.tsx
// Login REAL de vendedoras contra la tabla Employee de la RDS

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginCentral() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async () => {
    if (!email || !password) { setError('Escribe tu correo y contraseña'); return; }
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/central/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'No se pudo iniciar sesión'); return; }
      router.push('/central');
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="central-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="conf-card" style={{ borderTopColor: 'var(--amarillo)', margin: 20 }}>
        <div className="paloma" style={{ background: 'var(--amarillo-bg)' }}>🐺</div>
        <h2>Coyote Textil</h2>
        <p style={{ marginBottom: 22 }}>Central de llamadas · Inicia sesión</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          <input
            className="input-tel"
            style={{ minWidth: 0, width: '100%' }}
            type="email"
            placeholder="correo@coyotetextil.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input-tel"
            style={{ minWidth: 0, width: '100%' }}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </div>
        <div className="aviso-falta" style={{ textAlign: 'left' }}>{error}</div>
        <button className="btn btn-sol" style={{ width: '100%', marginTop: 6 }} onClick={entrar} disabled={cargando}>
          {cargando ? 'Entrando…' : '🐺 Entrar'}
        </button>
      </div>
    </div>
  );
}
