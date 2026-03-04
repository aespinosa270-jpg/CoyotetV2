"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Users, DollarSign, Award, Filter, Download, 
  Mail, Phone, Building2, Crown
} from 'lucide-react';

export interface ClientData {
  id: string;
  hashId: string;
  name: string;
  email: string;
  phone: string;
  rfc: string;
  ltv: number;
  points: number;
  membershipTier: string;
  createdAt: string;
}

interface ClientesClientProps {
  initialData: ClientData[];
}

export default function ClientesClient({ initialData = [] }: ClientesClientProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filtrado a prueba de nulos
  const filteredClients = initialData.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) || 
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.rfc && c.rfc.toLowerCase().includes(term)) ||
      (c.hashId && c.hashId.toLowerCase().includes(term))
    );
  });

  // KPIs dinámicos
  const totalClients = initialData.length;
  const totalLTV = initialData.reduce((acc, client) => acc + client.ltv, 0);
  const vipClients = initialData.filter(c => c.membershipTier === 'ELITE' || c.membershipTier === 'BLACK').length;
  
  // Formateador de moneda
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans animate-in fade-in duration-500">
      
      {/* BARRA SUPERIOR */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Base de Clientes B2B/B2C</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo, RFC o ID..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-80 focus:ring-1 focus:ring-[#FDCB02] transition-all text-white placeholder-neutral-700 outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm || ""} 
            />
          </div>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Download size={18} />
          </button>
        </div>
      </nav>

      {/* MÉTRICAS (KPIs) */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        <div className="flex-none grid grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl relative overflow-hidden group">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Total Clientes</p>
            <p className="text-3xl font-mono font-bold text-white">{totalClients}</p>
            <Users className="absolute -right-2 -bottom-2 text-white/[0.02] group-hover:text-white/[0.05] transition-all" size={60} />
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl relative overflow-hidden group">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">LTV Global (Ventas)</p>
            <p className="text-2xl font-mono font-bold text-emerald-500">{formatCurrency(totalLTV)}</p>
            <DollarSign className="absolute -right-2 -bottom-2 text-emerald-500/[0.02] group-hover:text-emerald-500/[0.05] transition-all" size={60} />
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Clientes VIP (Elite/Black)</p>
            <p className="text-3xl font-mono font-bold text-[#FDCB02]">{vipClients}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Salud de Base</p>
            <p className="text-3xl font-mono font-bold text-blue-500">Optima</p>
          </div>
        </div>

        {/* TABLA DEL DIRECTORIO */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">ID / Fecha Alta</th>
                  <th className="px-8 py-6">Cliente & Contacto</th>
                  <th className="px-8 py-6">Datos Fiscales (RFC)</th>
                  <th className="px-8 py-6">Membresía / Puntos</th>
                  <th className="px-8 py-6 text-right">Lifetime Value (LTV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-neutral-600 font-mono text-sm">
                      No se encontraron clientes en la base de datos.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, idx) => (
                    <motion.tr 
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                    >
                      {/* COL 1: ID y Alta */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-2xl bg-white/5 text-neutral-400">
                            <Users size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold text-[#FDCB02]">{client.hashId}</span>
                            <span className="text-[10px] text-neutral-600">Alta: {client.createdAt}</span>
                          </div>
                        </div>
                      </td>

                      {/* COL 2: Info Personal */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-neutral-200">{client.name}</span>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
                            <span className="flex items-center gap-1"><Mail size={10}/> {client.email}</span>
                            <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* COL 3: Datos Fiscales */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                          <Building2 size={12} className="text-neutral-600" />
                          <span className={client.rfc === 'Público General' ? 'italic text-neutral-600' : ''}>
                            {client.rfc}
                          </span>
                        </div>
                      </td>

                      {/* COL 4: Lealtad */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-1 rounded border uppercase font-black tracking-tighter ${
                            client.membershipTier === 'ELITE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            client.membershipTier === 'BLACK' ? 'bg-zinc-800 text-white border-zinc-700' :
                            client.membershipTier === 'GOLD' ? 'bg-[#FDCB02]/10 text-[#FDCB02] border-[#FDCB02]/20' :
                            'bg-neutral-900 text-neutral-500 border-neutral-800'
                          }`}>
                            {client.membershipTier === 'NONE' ? 'ESTÁNDAR' : client.membershipTier}
                          </span>
                          <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-1">
                            <Award size={12} className="text-[#FDCB02]"/> {client.points} pts
                          </span>
                        </div>
                      </td>

                      {/* COL 5: LTV */}
                      <td className="px-8 py-6 text-right font-mono text-sm font-bold text-emerald-500">
                        {formatCurrency(client.ltv)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}