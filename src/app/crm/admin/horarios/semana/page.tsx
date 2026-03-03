"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Calendar as CalendarIcon, ChevronLeft, 
  ChevronRight, Plus, Clock, User, 
  MoreHorizontal, Shield, Zap
} from 'lucide-react';

// --- MOCK DATA: Estructura de la Semana en Coyote Textil ---
const weeklySchedule = [
  { day: "Lunes", date: "02 Mar", shifts: [
    { agent: "Carlos M.", time: "09:00 - 18:00", role: "Closer", color: "bg-[#FDCB02]" },
    { agent: "Ana S.", time: "10:00 - 19:00", role: "SDR", color: "bg-white" }
  ]},
  { day: "Martes", date: "03 Mar", isToday: true, shifts: [
    { agent: "Carlos M.", time: "09:00 - 18:00", role: "Closer", color: "bg-[#FDCB02]" },
    { agent: "Javier F.", time: "08:00 - 17:00", role: "Logística", color: "bg-blue-500" },
    { agent: "Ana S.", time: "10:00 - 19:00", role: "SDR", color: "bg-white" }
  ]},
  { day: "Miércoles", date: "04 Mar", shifts: [
    { agent: "Carlos M.", time: "09:00 - 18:00", role: "Closer", color: "bg-[#FDCB02]" },
    { agent: "Ana S.", time: "10:00 - 19:00", role: "SDR", color: "bg-white" }
  ]},
  { day: "Jueves", date: "05 Mar", shifts: [
    { agent: "Javier F.", time: "08:00 - 17:00", role: "Logística", color: "bg-blue-500" },
    { agent: "Ana S.", time: "10:00 - 19:00", role: "SDR", color: "bg-white" }
  ]},
  { day: "Viernes", date: "06 Mar", shifts: [
    { agent: "Carlos M.", time: "09:00 - 18:00", role: "Closer", color: "bg-[#FDCB02]" },
    { agent: "Javier F.", time: "08:00 - 17:00", role: "Logística", color: "bg-blue-500" }
  ]},
  { day: "Sábado", date: "07 Mar", shifts: [
    { agent: "Ana S.", time: "09:00 - 14:00", role: "Guardia", color: "bg-emerald-500" }
  ]},
  { day: "Domingo", date: "08 Mar", shifts: [] },
];

export default function HorarioSemanaPage() {
  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* NAVEGACIÓN DE SUBDIVISIONES */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex gap-6">
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">General</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#FDCB02] border-b-2 border-[#FDCB02] pb-1">Semana</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Excepciones</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-1.5 border border-white/5">
            <ChevronLeft size={14} className="text-neutral-500 cursor-pointer hover:text-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Marzo 2026</span>
            <ChevronRight size={14} className="text-neutral-500 cursor-pointer hover:text-white" />
          </div>
          <button className="bg-[#FDCB02] text-black px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-[#FDCB02]/10">
            <Plus size={14} /> Asignar Turno
          </button>
        </div>
      </nav>

      {/* GRID DE LA SEMANA (7 Columnas Fijas) */}
      <main className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-7 h-full gap-4">
          
          {weeklySchedule.map((day, idx) => (
            <div key={day.day} className={`flex flex-col h-full rounded-[32px] border transition-all ${
              day.isToday ? 'bg-[#0a0a0a] border-[#FDCB02]/30 shadow-[0_0_40px_rgba(253,203,2,0.05)]' : 'bg-[#080808] border-white/[0.03]'
            }`}>
              
              {/* Header del Día */}
              <div className={`p-5 border-b border-white/5 flex flex-col items-center ${day.isToday ? 'bg-[#FDCB02]/5' : ''}`}>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${day.isToday ? 'text-[#FDCB02]' : 'text-neutral-500'}`}>
                  {day.day}
                </span>
                <span className="text-2xl font-mono font-bold tracking-tighter text-white">
                  {day.date.split(' ')[0]}
                </span>
                {day.isToday && (
                  <div className="mt-2 px-2 py-0.5 bg-[#FDCB02] text-black text-[8px] font-black uppercase rounded-full">Hoy</div>
                )}
              </div>

              {/* Lista de Turnos */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {day.shifts.length > 0 ? (
                  day.shifts.map((shift, sIdx) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (idx * 0.05) + (sIdx * 0.1) }}
                      key={shift.agent}
                      className="bg-[#121212] border border-white/5 rounded-2xl p-4 group hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                    >
                      {/* Indicador de Rol */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${shift.color}`} />
                      
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                          {shift.agent.substring(0,2)}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-white transition-opacity">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      <h4 className="text-[11px] font-bold text-white mb-1 truncate">{shift.agent}</h4>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-neutral-500">
                          <Clock size={10} />
                          <span className="text-[9px] font-mono">{shift.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-500">
                          <Zap size={10} className={shift.role === 'Closer' ? 'text-[#FDCB02]' : ''} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">{shift.role}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Shield size={32} />
                    <span className="text-[8px] font-black uppercase mt-2">Cerrado</span>
                  </div>
                )}
              </div>

              {/* Footer del Día (Stats rápidos) */}
              {day.shifts.length > 0 && (
                <div className="p-4 border-t border-white/5 bg-black/40 text-center">
                  <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
                    {day.shifts.length} Agentes Activos
                  </span>
                </div>
              )}
            </div>
          ))}

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}