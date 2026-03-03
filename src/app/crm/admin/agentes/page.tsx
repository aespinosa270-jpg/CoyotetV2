"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, PhoneCall, TrendingUp, 
  MoreVertical, ShieldAlert, Clock, UserCheck
} from 'lucide-react';

// --- MOCK DATA: Simulando la base de datos de tus agentes ---
const mockAgents = [
  { 
    id: "AGT-001", name: "Carlos Mendoza", role: "Closer (Tier 1)", 
    status: "in-call", callsToday: 42, salesMonth: "$45,200", winRate: "28%", 
    lastActive: "Ahora" 
  },
  { 
    id: "AGT-002", name: "Ana Sofía Ríos", role: "SDR / Filtro", 
    status: "online", callsToday: 115, salesMonth: "$12,400", winRate: "15%", 
    lastActive: "Hace 2 min" 
  },
  { 
    id: "AGT-003", name: "Javier Franco", role: "Closer (Tier 2)", 
    status: "offline", callsToday: 12, salesMonth: "$8,900", winRate: "10%", 
    lastActive: "Hace 4 horas" 
  },
  { 
    id: "AGT-004", name: "Elena Torres", role: "Soporte VIP", 
    status: "online", callsToday: 38, salesMonth: "$0", winRate: "N/A", 
    lastActive: "Hace 1 min" 
  },
];

export default function AgentesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtro simple para la barra de búsqueda
  const filteredAgents = mockAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    agent.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000000] text-white p-8 font-sans">
      
      {/* HEADER DE LA VISTA */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Fuerza de Ventas</h1>
          <p className="text-neutral-500 text-sm tracking-widest uppercase">
            Monitor de Agentes y Rendimiento PBX
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar agente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111] border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02]/50 transition-all w-64 text-white placeholder-neutral-600"
            />
          </div>
          <button className="bg-[#FDCB02] text-black hover:bg-yellow-400 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(253,203,2,0.2)]">
            <Plus size={16} />
            Nuevo Agente
          </button>
        </div>
      </header>

      {/* KPI WIDGETS (Resumen General) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Agentes Activos", value: "3/4", icon: UserCheck, color: "text-emerald-500" },
          { label: "Llamadas (Hoy)", value: "207", icon: PhoneCall, color: "text-white" },
          { label: "Ventas Totales (Mes)", value: "$66,500", icon: TrendingUp, color: "text-[#FDCB02]" },
          { label: "Win Rate Promedio", value: "18.5%", icon: ShieldAlert, color: "text-neutral-400" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
              <kpi.icon size={48} className={kpi.color} />
            </div>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className="text-3xl font-light tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* TABLA PRINCIPAL DE AGENTES */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-neutral-500 bg-[#111]">
                <th className="p-6 font-medium">Agente</th>
                <th className="p-6 font-medium">Estado</th>
                <th className="p-6 font-medium">Rol</th>
                <th className="p-6 font-medium text-right">Llamadas (Hoy)</th>
                <th className="p-6 font-medium text-right">Cierre (Mes)</th>
                <th className="p-6 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAgents.map((agent, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={agent.id} 
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Columna Nombre & Avatar */}
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-xs font-bold text-[#FDCB02]">
                        {agent.name.split(' ').map(n => n[0]).join('').substring(0,2)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{agent.name}</p>
                        <p className="text-xs text-neutral-500 font-mono mt-1">{agent.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Columna Estado */}
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        {agent.status === 'in-call' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FDCB02] opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 
                          ${agent.status === 'online' ? 'bg-emerald-500' : 
                            agent.status === 'in-call' ? 'bg-[#FDCB02]' : 'bg-neutral-600'}`}
                        ></span>
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-neutral-300">
                        {agent.status === 'in-call' ? 'En Llamada' : agent.status === 'online' ? 'En Línea' : 'Desconectado'}
                      </span>
                    </div>
                    {agent.status === 'offline' && (
                      <p className="text-[10px] text-neutral-600 mt-1 flex items-center gap-1">
                        <Clock size={10}/> {agent.lastActive}
                      </p>
                    )}
                  </td>

                  {/* Columna Rol */}
                  <td className="p-6">
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {agent.role}
                    </span>
                  </td>

                  {/* Columna Llamadas */}
                  <td className="p-6 text-right">
                    <span className="font-mono text-lg">{agent.callsToday}</span>
                  </td>

                  {/* Columna Ventas/Rendimiento */}
                  <td className="p-6 text-right">
                    <p className="font-bold text-emerald-400">{agent.salesMonth}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Win Rate: <span className="text-white">{agent.winRate}</span></p>
                  </td>

                  {/* Columna Acciones */}
                  <td className="p-6 text-center">
                    <button className="p-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredAgents.length === 0 && (
            <div className="p-12 text-center text-neutral-500 text-sm">
              No se encontraron agentes con ese criterio de búsqueda.
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}