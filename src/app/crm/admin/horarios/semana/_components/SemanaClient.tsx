"use client";

import { motion } from "framer-motion";
import { Clock, Shield, Zap, MoreHorizontal } from "lucide-react";
import { EmployeeRole } from "@prisma/client";

type AttendanceEntry = {
  id:       string;
  checkIn:  string;
  checkOut: string | null;
  employee: { id: string; name: string; role: EmployeeRole };
};

type DayData = {
  date:        string;
  isToday:     boolean;
  attendances: AttendanceEntry[];
};

type Employee = {
  id:   string;
  name: string;
  role: EmployeeRole;
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

const DAY_NAMES = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SemanaClient({
  days,
}: {
  days:      DayData[];
  employees: Employee[];
}) {
  return (
    <div className="flex-1 grid grid-cols-7 gap-3 min-h-0 overflow-hidden">
      {days.map((day, idx) => {
        const date    = new Date(day.date);
        const dayNum  = date.getDate().toString().padStart(2, "0");
        const dayName = DAY_NAMES[idx];

        return (
          <div key={day.date}
            className={`flex flex-col rounded-[28px] border transition-all overflow-hidden ${
              day.isToday
                ? "bg-[#0a0a0a] border-[#FDCB02]/30 shadow-[0_0_30px_rgba(253,203,2,0.04)]"
                : "bg-[#080808] border-white/[0.03]"
            }`}
          >
            {/* Header del día */}
            <div className={`px-4 py-4 border-b border-white/5 flex flex-col items-center ${day.isToday ? "bg-[#FDCB02]/5" : ""}`}>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${day.isToday ? "text-[#FDCB02]" : "text-zinc-600"}`}>
                {dayName}
              </span>
              <span className="text-2xl font-mono font-bold text-white leading-none">{dayNum}</span>
              {day.isToday && (
                <div className="mt-2 px-2 py-0.5 bg-[#FDCB02] text-black text-[8px] font-black uppercase rounded-full">
                  Hoy
                </div>
              )}
            </div>

            {/* Asistencias del día */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5
              [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
              {day.attendances.length > 0 ? (
                day.attendances.map((att, aIdx) => (
                  <motion.div
                    key={att.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (idx * 0.04) + (aIdx * 0.08) }}
                    className="bg-[#111] border border-white/[0.04] rounded-2xl p-3 group hover:border-white/10 transition-all cursor-pointer relative overflow-hidden"
                  >
                    {/* Barra lateral de rol */}
                    <div className={`absolute top-0 left-0 w-0.5 h-full ${ROLE_COLOR[att.employee.role]}`} />

                    <div className="flex justify-between items-start mb-2">
                      <div className={`w-6 h-6 rounded-lg ${ROLE_COLOR[att.employee.role]} text-black text-[8px] font-black flex items-center justify-center shrink-0`}>
                        {att.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-white transition-all">
                        <MoreHorizontal size={12} />
                      </button>
                    </div>

                    <p className="text-[11px] font-bold text-white truncate mb-1.5">
                      {att.employee.name.split(" ")[0]} {att.employee.name.split(" ")[1]?.[0]}.
                    </p>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Clock size={9} />
                        <span className="text-[9px] font-mono">
                          {formatTime(att.checkIn)}
                          {att.checkOut && ` - ${formatTime(att.checkOut)}`}
                          {!att.checkOut && <span className="text-emerald-500 ml-1">●</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-600">
                        <Zap size={9} className={ROLE_COLOR[att.employee.role].replace("bg-","text-")} />
                        <span className="text-[8px] font-bold uppercase tracking-tight">
                          {ROLE_LABEL[att.employee.role]}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-8">
                  <Shield size={28} />
                  <span className="text-[8px] font-black uppercase mt-2 tracking-widest">Cerrado</span>
                </div>
              )}
            </div>

            {/* Footer con conteo */}
            {day.attendances.length > 0 && (
              <div className="px-3 py-2.5 border-t border-white/[0.03] bg-black/30 text-center shrink-0">
                <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
                  {day.attendances.length} Check-in{day.attendances.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
