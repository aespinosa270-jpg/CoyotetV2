"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Clock, Calendar, Save, 
  Plus, Moon, Sun, Coffee, 
  ChevronRight, MoreVertical, ShieldCheck, 
  AlertCircle, ToggleRight
} from 'lucide-react';

// --- MOCK DATA: Horarios de la Jauría ---
const initialShifts = [
  { id: "SH-01", agent: "Carlos Mendoza", days: "Lun - Vie", shift: "09:00 - 18:00", status: "Activo" },
  { id: "SH-02", agent: "Ana S. Ríos", days: "Lun - Vie", shift: "10:00 - 19:00", status: "Activo" },
  { id: "SH-03", agent: "Javier Franco", days: "Sábados", shift: "09:00 - 14:00", status: "Activo" },
  { id: "SH-04", agent: "Elena Torres", days: "Lun - Vie", shift: "08:00 - 17:00", status: "En Pausa" },
];

export default function HorariosPage() {
  const [businessOpen, setBusinessOpen] = useState(true);

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE CONTROL TEMPORAL */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Gestión de Horarios y Turnos</h2>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#FDCB02] text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-[#FDCB02]/10">
            <Save size={14} /> Guardar Cambios
          </button>
        </div>
      </nav>

      {/* ÁREA DE TRABAJO EN GRID DE 2 COLUMNAS */}
      <main className="flex-1 p-8 grid grid-cols-5 gap-8 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN GENERAL (2/5) */}
        <section className="col-span-2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-8 rounded-[40px] flex flex-col gap-8 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold tracking-tight mb-1 text-white">Horario Comercial</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Configuración global del PBX</p>
              </div>
              <div className={`p-2 rounded-xl ${businessOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {businessOpen ? <Sun size={20} /> : <Moon size={20} />}
              </div>
            </div>

            <div className="space-y-4">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
                <div key={day} className="group flex items-center justify-between p-4 bg-[#111] hover:bg-[#151515] rounded-2xl border border-white/[0.02] transition-all">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" defaultChecked={day !== "Domingo"} className="w-4 h-4 rounded border-white/10 bg-black text-[#FDCB02] focus:ring-0" />
                    <span className="text-sm font-bold text-neutral-300">{day}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="text" defaultValue="09:00" className="w-16 bg-black border border-white/10 rounded-lg py-1 px-2 text-[10px] font-mono text-center focus:border-[#FDCB02] outline-none" />
                    <span className="text-neutral-600 text-[10px]">—</span>
                    <input type="text" defaultValue="18:00" className="w-16 bg-black border border-white/10 rounded-lg py-1 px-2 text-[10px] font-mono text-center focus:border-[#FDCB02] outline-none" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#FDCB02]/5 border border-[#FDCB02]/10 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-[#FDCB02] shrink-0" size={18} />
              <p className="text-[10px] text-neutral-400 leading-relaxed uppercase tracking-tight">
                <span className="text-[#FDCB02] font-black">Nota:</span> Fuera de este horario, las llamadas de Zadarma serán enviadas automáticamente al buzón de voz o al IVR de guardia.
              </p>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: TURNOS DE LA JAURÍA (3/5) */}
        <section className="col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Turnos de Agentes</h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Disponibilidad individual para ventas</p>
            </div>
            <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                  <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                    <th className="px-8 py-6">Agente</th>
                    <th className="px-8 py-6">Días Laborales</th>
                    <th className="px-8 py-6">Rango de Turno</th>
                    <th className="px-8 py-6">Estado</th>
                    <th className="px-8 py-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {initialShifts.map((shift, idx) => (
                    <motion.tr 
                      key={shift.id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-[#FDCB02]">
                          {shift.agent.substring(0,2)}
                        </div>
                        <span className="text-sm font-bold text-neutral-200">{shift.agent}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{shift.days}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-[#FDCB02]">
                          <Clock size={12} />
                          <span className="font-mono text-xs">{shift.shift}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                          shift.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="text-neutral-700 hover:text-white transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer de la tabla con info de zona horaria */}
            <div className="p-6 border-t border-white/5 bg-[#0d0d0d] flex items-center gap-3">
               <ShieldCheck size={16} className="text-neutral-600" />
               <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Zona Horaria: (GMT-6) Mexico City / Central Time</p>
            </div>
          </div>
        </section>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}