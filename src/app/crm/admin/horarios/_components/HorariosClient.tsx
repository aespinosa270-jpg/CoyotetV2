"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Sun, Moon, AlertCircle,
  Plus, Save, ShieldCheck, MoreVertical,
  Zap, CheckCircle2,
} from "lucide-react";
import { EmployeeRole } from "@prisma/client";

type Employee = {
  id:       string;
  name:     string;
  role:     EmployeeRole;
  isOnline: boolean;
  checkIn:  string | null;
  checkOut: string | null;
};

const ROLE_COLOR: Record<EmployeeRole, string> = {
  ADMIN:        "bg-red-500",
  SUPERVISOR:   "bg-purple-500",
  VENDEDORA:    "bg-[#FDCB02]",
  LOGISTICA:    "bg-blue-500",
  CONTABILIDAD: "bg-emerald-500",
};

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Admin",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

type DayConfig = { enabled: boolean; start: string; end: string };

const DEFAULT_SCHEDULE: Record<string, DayConfig> = {
  Lunes:     { enabled: true,  start: "09:00", end: "18:00" },
  Martes:    { enabled: true,  start: "09:00", end: "18:00" },
  Miércoles: { enabled: true,  start: "09:00", end: "18:00" },
  Jueves:    { enabled: true,  start: "09:00", end: "18:00" },
  Viernes:   { enabled: true,  start: "09:00", end: "18:00" },
  Sábado:    { enabled: true,  start: "09:00", end: "14:00" },
  Domingo:   { enabled: false, start: "09:00", end: "18:00" },
};

export default function HorariosClient({ employees }: { employees: Employee[] }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [saved,    setSaved]    = useState(false);

  const setDay = (day: string, key: keyof DayConfig, value: string | boolean) => {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], [key]: value } }));
    setSaved(false);
  };

  const handleSave = () => {
    // Aquí iría el server action para persistir el horario
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeToday = employees.filter((e) => e.isOnline).length;

  return (
    <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden min-h-0">

      {/* ── COLUMNA IZQ: Horario Comercial (2/5) ── */}
      <section className="col-span-2 flex flex-col gap-4 overflow-y-auto min-h-0
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">

        <div className="bg-[#0a0a0a] border border-white/[0.03] p-6 rounded-3xl flex flex-col gap-6">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">Horario Comercial</h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                Configuración global del sistema
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sun size={18} />
            </div>
          </div>

          {/* Días */}
          <div className="space-y-2">
            {DIAS.map((day) => {
              const cfg = schedule[day];
              return (
                <div key={day}
                  className="flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl border border-zinc-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) => setDay(day, "enabled", e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-black text-[#FDCB02] focus:ring-0 focus:ring-offset-0"
                    />
                    <span className={`text-sm font-bold ${cfg.enabled ? "text-zinc-200" : "text-zinc-600"}`}>
                      {day}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={cfg.start}
                      onChange={(e) => setDay(day, "start", e.target.value)}
                      disabled={!cfg.enabled}
                      className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2 text-[10px] font-mono text-center text-zinc-300 focus:border-[#FDCB02] outline-none disabled:opacity-30"
                    />
                    <span className="text-zinc-600 text-[10px]">—</span>
                    <input
                      type="text" value={cfg.end}
                      onChange={(e) => setDay(day, "end", e.target.value)}
                      disabled={!cfg.enabled}
                      className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2 text-[10px] font-mono text-center text-zinc-300 focus:border-[#FDCB02] outline-none disabled:opacity-30"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota */}
          <div className="p-4 bg-[#FDCB02]/5 border border-[#FDCB02]/10 rounded-2xl flex items-start gap-3">
            <AlertCircle size={15} className="text-[#FDCB02] shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              <span className="text-[#FDCB02] font-black">Nota:</span> Fuera de este horario las llamadas se envían al buzón de voz o al IVR de guardia.
            </p>
          </div>

          {/* Guardar */}
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-800"
                : "bg-[#FDCB02] text-black hover:bg-yellow-300"
            }`}
          >
            {saved ? <><CheckCircle2 size={14} /> Guardado</> : <><Save size={14} /> Guardar Cambios</>}
          </button>
        </div>
      </section>

      {/* ── COLUMNA DER: Turnos de agentes (3/5) ── */}
      <section className="col-span-3 flex flex-col gap-4 overflow-hidden min-h-0">

        <div className="flex items-end justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Turnos de Agentes</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              {activeToday} activo{activeToday !== 1 ? "s" : ""} ahora · {employees.length} en sistema
            </p>
          </div>
          <button className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
            <Plus size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                  <th className="px-6 py-4">Agente</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Check-In Hoy</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                      Sin empleados registrados
                    </td>
                  </tr>
                )}
                {employees.map((emp, idx) => (
                  <motion.tr key={emp.id}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${ROLE_COLOR[emp.role]} text-black flex items-center justify-center text-[10px] font-black shrink-0`}>
                          {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-zinc-200">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Zap size={10} className={ROLE_COLOR[emp.role].replace("bg-", "text-").replace("/10", "")} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {ROLE_LABEL[emp.role]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.checkIn ? (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock size={10} className="text-[#FDCB02]" />
                          <span className="text-[10px] font-mono">
                            {new Date(emp.checkIn).toLocaleTimeString("es-MX", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {emp.checkOut && (
                            <>
                              <span className="text-zinc-700">→</span>
                              <span className="text-[10px] font-mono text-zinc-600">
                                {new Date(emp.checkOut).toLocaleTimeString("es-MX", {
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-700">Sin registro hoy</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          {emp.isOnline && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${emp.isOnline ? "bg-emerald-500" : "bg-zinc-700"}`} />
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${emp.isOnline ? "text-emerald-400" : "text-zinc-600"}`}>
                          {emp.isOnline ? "Activo" : "Fuera"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-zinc-700 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 bg-zinc-950/50 flex items-center gap-2 shrink-0">
            <ShieldCheck size={13} className="text-zinc-600" />
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Zona Horaria: (GMT-6) Mexico City / Central Time
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}