"use client"

import React from 'react';
import { 
  Users, Ticket, PhoneIncoming, Clock, 
  AlertTriangle, ArrowUpRight, Activity, MessageSquare
} from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-[1000] uppercase text-white tracking-tighter leading-none">
            Tablero <span className="text-[#FDCB02]">Central</span>
          </h2>
          <p className="text-neutral-500 font-mono text-xs mt-2 uppercase tracking-widest">
            Visión global en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#111] border border-white/10 px-4 py-2 rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">Sincronizado</span>
        </div>
      </div>

      {/* 1. ROW DE KPIS GIGANTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Leads Nuevos (Hoy)", value: "24", trend: "+12%", icon: Users, color: "text-[#FDCB02]" },
          { title: "Tickets Abiertos", value: "15", trend: "-5%", icon: Ticket, color: "text-rose-500" },
          { title: "Llamadas Entrantes", value: "142", trend: "+28%", icon: PhoneIncoming, color: "text-sky-500" },
          { title: "Horas Trabajadas", value: "32.5", trend: "Normal", icon: Clock, color: "text-emerald-500" }
        ].map((kpi, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-white/10 transition-colors flex flex-col justify-between h-36">
            <div className="flex justify-between items-start z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{kpi.title}</span>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div className="flex items-end justify-between z-10">
              <span className="text-4xl font-[900] text-white tracking-tighter">{kpi.value}</span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                <ArrowUpRight size={12} /> {kpi.trend}
              </div>
            </div>
            {/* Resplandor de fondo */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[40px] rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-current ${kpi.color}`} />
          </div>
        ))}
      </div>

      {/* 2. MAIN GRID (Alertas + Interacciones) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: ALERTAS CRÍTICAS */}
        <div className="lg:col-span-1 bg-[#0a0a0a] border border-rose-500/20 rounded-xl flex flex-col h-[400px]">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-[900] uppercase tracking-widest text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Alertas Operativas
            </h3>
            <span className="bg-rose-500 text-black text-[9px] font-black px-2 py-0.5 rounded">2 CRÍTICAS</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {[
              { time: "Hace 5m", text: "Ticket #4092 sin respuesta por más de 2h.", type: "ticket" },
              { time: "Hace 12m", text: "Agente 'Carlos R.' en pausa excedida (>30m).", type: "agent" },
              { time: "Hace 45m", text: "Caída de tasa de respuesta en WhatsApp.", type: "system" }
            ].map((alert, i) => (
              <div key={i} className="bg-[#111] border border-rose-500/10 p-3 rounded-lg flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse" />
                <div>
                  <p className="text-xs text-neutral-300 font-medium">{alert.text}</p>
                  <p className="text-[10px] text-neutral-600 font-mono mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: ÚLTIMAS INTERACCIONES & GRÁFICA PLACEHOLDER */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Gráfica Rápida (Placeholder visual) */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 h-[150px] flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm font-[900] uppercase tracking-widest text-white flex items-center gap-2">
                <Activity size={16} className="text-[#FDCB02]" /> Pulso de Ventas (Hoy)
              </h3>
            </div>
            <div className="flex items-end gap-2 h-16 relative z-10 opacity-70">
              {/* Barras simuladas por CSS para no instalar librerías aún */}
              {[40, 70, 45, 90, 65, 30, 85, 100, 50, 75].map((h, i) => (
                <div key={i} className="flex-1 bg-white/10 hover:bg-[#FDCB02]/50 transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-0" />
          </div>

          {/* Lista de Últimas Interacciones */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-sm font-[900] uppercase tracking-widest text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-sky-500" /> Actividad Reciente
              </h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="text-sm font-medium">
                  {[
                    { lead: "Textiles El Zorro", agent: "Ana G.", type: "WhatsApp", time: "10:45 AM", status: "En progreso" },
                    { lead: "Uniformes Pro", agent: "Bot IA", type: "Llamada", time: "10:42 AM", status: "Completado" },
                    { lead: "Maquilas Garza", agent: "Carlos R.", type: "Email", time: "10:30 AM", status: "Pendiente" },
                    { lead: "Deportes NØR", agent: "Ana G.", type: "WhatsApp", time: "10:15 AM", status: "Completado" }
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="p-3 pl-5">
                        <span className="text-white font-bold block">{row.lead}</span>
                        <span className="text-[10px] text-neutral-500 font-mono uppercase">Lead B2B</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#111] border border-white/10 px-2 py-1 rounded text-xs text-neutral-400">{row.agent}</span>
                      </td>
                      <td className="p-3 text-xs text-neutral-400">{row.type}</td>
                      <td className="p-3 text-[10px] text-neutral-500 font-mono">{row.time}</td>
                      <td className="p-3 pr-5 text-right">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${row.status === 'Completado' ? 'text-emerald-500' : row.status === 'En progreso' ? 'text-[#FDCB02]' : 'text-neutral-500'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}