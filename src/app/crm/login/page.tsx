// src/app/crm/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert, Loader2 } from 'lucide-react';

export default function CRMLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/crm'); // Si las llaves coinciden, entra a la bóveda
        router.refresh();    // Refrescamos para que el servidor lea la cookie nueva
      } else {
        setError(data.error || 'Credenciales inválidas');
        setLoading(false);
      }
    } catch (err) {
      setError('Error de conexión al servidor seguro.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-[#FDCB02] selection:text-black">
      <div className="w-full max-w-md">
        
        {/* LOGO B2B */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FDCB02] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(253,203,2,0.2)]">
            <Lock size={32} className="text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-[1000] uppercase text-white tracking-tighter">Acceso Restringido</h1>
          <p className="text-neutral-500 font-black uppercase tracking-widest text-[10px] mt-2">Coyote Textil • Bóveda B2B</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
              <ShieldAlert size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-[10px] uppercase font-black text-neutral-500 tracking-widest mb-2">Correo Operativo</label>
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm focus:border-[#FDCB02] outline-none transition-all disabled:opacity-50"
                placeholder="taquio@coyote.com"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-neutral-500 tracking-widest mb-2">Clave de Acceso</label>
              <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm focus:border-[#FDCB02] outline-none transition-all tracking-widest disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#FDCB02] hover:bg-white text-black h-14 rounded-xl font-[1000] uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Desencriptando...</> : 'Iniciar Sesión'}
          </button>
        </form>
        
      </div>
    </div>
  );
}