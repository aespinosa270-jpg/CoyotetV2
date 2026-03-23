"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, LogIn, LogOut,
  Calendar, TrendingUp, CheckCircle2,
  AlertCircle, Loader2, Coffee, Droplets,
  Timer, Square, Package, GraduationCap,
} from "lucide-react";
import { EmployeeRole } from "@prisma/client";
import { checkInAction, checkOutAction, startBreakAction, endBreakAction } from "@/app/actions/checador";

type BreakType = "BANO" | "LUNCH" | "PEDIDO" | "ENTRENAMIENTO";

type AttendanceBreak = {
  id:       string;
  type:     BreakType;
  startAt:  string;
  endAt:    string | null;
  duration: number | null;
};

type Attendance = {
  id:              string;
  checkIn:         string;
  checkOut:        string | null;
  horasTrabajadas: number | null;
  location:        string | null;
  lat:             number | null;
  lng:             number | null;
  checkOutLat:     number | null;
  checkOutLng:     number | null;
  breaks?:         AttendanceBreak[];
};

type Employee = {
  id:   string;
  name: string;
  role: EmployeeRole;
};

type Kpis = {
  totalHorasMes:  number;
  diasTrabajados: number;
  promedioHoras:  number;
};

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Administrador",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

// ── Configuración centralizada de tipos de pausa ──────────────────────────────
const BREAK_CONFIG: Record<BreakType, {
  label:        string;
  labelFin:     string;
  emoji:        string;
  icon:         React.ReactNode;
  color:        string;   // text color
  border:       string;   // border color
  bg:           string;   // background (idle)
  bgActive:     string;   // background (active button)
  bgBadge:      string;   // background (badge)
  borderBadge:  string;
}> = {
  BANO: {
    label:       "Baño",
    labelFin:    "Fin Baño",
    emoji:       "🚻",
    icon:        <Droplets size={12} />,
    color:       "text-sky-400",
    border:      "border-sky-800",
    bg:          "bg-sky-500/10 hover:bg-sky-500/20",
    bgActive:    "bg-sky-500 text-black",
    bgBadge:     "bg-sky-500/5",
    borderBadge: "border-sky-800/50",
  },
  LUNCH: {
    label:       "Lunch",
    labelFin:    "Fin Lunch",
    emoji:       "🍽️",
    icon:        <Coffee size={12} />,
    color:       "text-amber-400",
    border:      "border-amber-800",
    bg:          "bg-amber-500/10 hover:bg-amber-500/20",
    bgActive:    "bg-amber-500 text-black",
    bgBadge:     "bg-amber-500/5",
    borderBadge: "border-amber-800/50",
  },
  PEDIDO: {
    label:       "Pedido",
    labelFin:    "Fin Pedido",
    emoji:       "📦",
    icon:        <Package size={12} />,
    color:       "text-violet-400",
    border:      "border-violet-800",
    bg:          "bg-violet-500/10 hover:bg-violet-500/20",
    bgActive:    "bg-violet-500 text-white",
    bgBadge:     "bg-violet-500/5",
    borderBadge: "border-violet-800/50",
  },
  ENTRENAMIENTO: {
    label:       "Training",
    labelFin:    "Fin Training",
    emoji:       "🎓",
    icon:        <GraduationCap size={12} />,
    color:       "text-emerald-400",
    border:      "border-emerald-800",
    bg:          "bg-emerald-500/10 hover:bg-emerald-500/20",
    bgActive:    "bg-emerald-500 text-black",
    bgBadge:     "bg-emerald-500/5",
    borderBadge: "border-emerald-800/50",
  },
};

const ALL_BREAK_TYPES: BreakType[] = ["BANO", "LUNCH", "PEDIDO", "ENTRENAMIENTO"];

function formatHoras(h: number) {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return `${hrs}h ${min > 0 ? `${min}m` : ""}`.trim();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

export default function CheckadorClient({
  attendances: initialAttendances,
  activeSession: initialActive,
  kpis,
  employee,
}: {
  attendances:   Attendance[];
  activeSession: Attendance | null;
  kpis:          Kpis;
  employee:      Employee;
}) {
  const [active,        setActive]      = useState<Attendance | null>(initialActive);
  const [attendances,   setAttendances] = useState<Attendance[]>(initialAttendances);
  const [elapsed,       setElapsed]     = useState("00:00:00");
  const [breakElapsed,  setBreakElapsed]= useState("00:00");
  const [locStatus,     setLocStatus]   = useState<"idle" | "getting" | "ok" | "error">("idle");
  const [locLabel,      setLocLabel]    = useState<string | null>(null);
  const [loading,       setLoading]     = useState(false);
  const [breakLoading,  setBreakLoading]= useState<BreakType | null>(null);
  const [activeBreak,   setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [breaks,        setBreaks]      = useState<AttendanceBreak[]>(initialActive?.breaks ?? []);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Reloj principal
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(active.checkIn).getTime();
      const h    = Math.floor(diff / 3600000);
      const m    = Math.floor((diff % 3600000) / 60000);
      const s    = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  // Reloj de pausa
  useEffect(() => {
    if (!activeBreak) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeBreak.startAt).getTime();
      const m    = Math.floor(diff / 60000);
      const s    = Math.floor((diff % 60000) / 1000);
      setBreakElapsed(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBreak]);

  // Detectar break activo al cargar
  useEffect(() => {
    const openBreak = breaks.find((b) => !b.endAt);
    setActiveBreak(openBreak ?? null);
  }, [breaks]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const getLocation = (): Promise<{ lat: number; lng: number; label: string }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("GPS no disponible")); return; }
      setLocStatus("getting");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const d = await r.json();
            label = d.display_name?.split(",").slice(0, 3).join(",") ?? label;
          } catch { /* silent */ }
          setLocStatus("ok");
          setLocLabel(label);
          resolve({ lat, lng, label });
        },
        () => { setLocStatus("error"); reject(new Error("No se pudo obtener ubicación")); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { lat, lng, label } = await getLocation();
      const res = await checkInAction(employee.id, lat, lng, label);
      
      if (!res.success || !res.data) throw new Error(res.error);
      
      const newAttendance: Attendance = { 
        ...res.data, 
        checkIn: res.data.checkIn.toISOString(),
        checkOut: null, 
        breaks: [] 
      };
      
      setActive(newAttendance);
      setBreaks([]);
      setAttendances((prev) => [newAttendance, ...prev]);
      showToast("Check-In registrado ✓", true);
    } catch (e: any) {
      showToast(e.message ?? "Error al registrar", false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!active) return;
    if (activeBreak) {
      showToast("Termina tu pausa antes de hacer Check-Out", false);
      return;
    }
    setLoading(true);
    try {
      const { lat, lng } = await getLocation();
      const res = await checkOutAction(active.id, employee.id, lat, lng);
      
      if (!res.success || !res.data) throw new Error(res.error);
      
      setActive(null);
      setElapsed("00:00:00");
      setBreaks([]);
      setActiveBreak(null);
      setAttendances((prev) =>
        prev.map((a) => a.id === active.id 
          ? { ...a, checkOut: new Date().toISOString(), horasTrabajadas: res.data.horasTrabajadas, breaks } 
          : a
        )
      );
      showToast("Check-Out registrado ✓", true);
    } catch (e: any) {
      showToast(e.message ?? "Error al registrar", false);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakStart = async (type: BreakType) => {
    if (!active || activeBreak) return;
    setBreakLoading(type);
    try {
      const res = await startBreakAction(active.id, type);
      if (!res.success || !res.data) throw new Error(res.error);
      
      const newBreak: AttendanceBreak = { ...res.data, startAt: res.data.startAt.toISOString(), endAt: null, duration: null };
      setActiveBreak(newBreak);
      setBreaks((prev) => [...prev, newBreak]);
      
      const cfg = BREAK_CONFIG[type];
      showToast(`${cfg.emoji} ${cfg.label} iniciado`, true);
    } catch (e: any) {
      showToast(e.message ?? "Error", false);
    } finally {
      setBreakLoading(null);
    }
  };

  const handleBreakEnd = async () => {
    if (!activeBreak) return;
    setBreakLoading(activeBreak.type);
    try {
      const res = await endBreakAction(activeBreak.id);
      if (!res.success || !res.data) throw new Error(res.error);
      
      setBreaks((prev) =>
        prev.map((b) => b.id === activeBreak.id
          ? { ...b, endAt: res.data.endAt?.toISOString() ?? null, duration: res.data.duration }
          : b
        )
      );
      setActiveBreak(null);
      setBreakElapsed("00:00");
      showToast(`Pausa terminada — ${Math.round(res.data.duration ?? 0)} min`, true);
    } catch (e: any) {
      showToast(e.message ?? "Error", false);
    } finally {
      setBreakLoading(null);
    }
  };

  // Stats de breaks del día por tipo
  const breakMinsByType = (type: BreakType) =>
    breaks.filter((b) => b.type === type && b.duration)
          .reduce((s, b) => s + (b.duration ?? 0), 0);

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const activeBreakCfg = activeBreak ? BREAK_CONFIG[activeBreak.type] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest shadow-2xl ${
              toast.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-4 shrink-0">

        {/* ── PUNCH CARD ── */}
        <div className="col-span-1 bg-[#0a0a0a] border border-white/[0.04] rounded-3xl p-6 flex flex-col items-center gap-4 relative overflow-hidden shadow-2xl">
          {active      && !activeBreak && <div className="absolute inset-0 bg-emerald-500/3 rounded-3xl pointer-events-none" />}
          {activeBreak && <div className={`absolute inset-0 rounded-3xl pointer-events-none ${activeBreakCfg?.bgBadge}`} />}

          {/* Avatar */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FDCB02] text-black font-black text-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
              {employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-black text-white">{employee.name}</p>
            <p className="text-[9px] text-[#FDCB02] uppercase tracking-widest">{ROLE_LABEL[employee.role]}</p>
            <p className="text-[9px] text-zinc-600 mt-1 font-mono capitalize">{today}</p>
          </div>

          {/* Reloj principal */}
          <div className="text-center w-full">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
              {activeBreak
                ? `${activeBreakCfg?.emoji} ${activeBreakCfg?.label}`
                : active ? "Tiempo trabajado" : "Sin sesión activa"
              }
            </p>
            <p className={`text-3xl font-mono font-black tracking-tighter transition-colors ${
              activeBreak ? activeBreakCfg?.color :
              active      ? "text-emerald-400" : "text-zinc-700"
            }`}>
              {active ? elapsed : "00:00:00"}
            </p>
            {activeBreak && (
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Timer size={10} className={activeBreakCfg?.color} />
                <p className={`text-[10px] font-mono ${activeBreakCfg?.color}`}>{breakElapsed}</p>
              </div>
            )}
            {active && !activeBreak && (
              <p className="text-[9px] text-zinc-600 font-mono mt-1">
                Desde {formatTime(active.checkIn)}
              </p>
            )}
          </div>

          {/* GPS status */}
          {locStatus !== "idle" && (
            <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              locStatus === "getting" ? "text-amber-400 border-amber-800 bg-amber-500/10" :
              locStatus === "ok"      ? "text-emerald-400 border-emerald-800 bg-emerald-500/10" :
                                        "text-red-400 border-red-800 bg-red-500/10"
            }`}>
              {locStatus === "getting" && <Loader2 size={10} className="animate-spin" />}
              {locStatus === "ok"      && <MapPin size={10} />}
              {locStatus === "error"   && <AlertCircle size={10} />}
              {locStatus === "getting" ? "Obteniendo GPS..." :
               locStatus === "ok"      ? "Ubicación capturada" : "Error GPS"}
            </div>
          )}

          {/* ── BOTONES ── */}
          <div className="w-full space-y-2 mt-auto">

            {!active ? (
              // ── CHECK-IN ──
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleCheckIn} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Check-In
              </motion.button>
            ) : (
              <>
                {/* ── GRID 2x2 DE PAUSAS ── */}
                <div className="grid grid-cols-2 gap-2">
                  {ALL_BREAK_TYPES.map((type) => {
                    const cfg       = BREAK_CONFIG[type];
                    const isActive  = activeBreak?.type === type;
                    const isBlocked = !!activeBreak && !isActive;

                    if (isActive) {
                      // Botón para terminar esta pausa
                      return (
                        <motion.button key={type} whileTap={{ scale: 0.97 }}
                          onClick={handleBreakEnd}
                          disabled={!!breakLoading}
                          className={`flex items-center justify-center gap-1.5 ${cfg.bgActive} font-black text-[9px] uppercase tracking-widest py-2.5 rounded-xl transition-all disabled:opacity-50 animate-pulse`}
                        >
                          {breakLoading === type
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Square size={12} />
                          }
                          {cfg.labelFin}
                        </motion.button>
                      );
                    }

                    if (isBlocked) {
                      // Deshabilitado mientras hay otra pausa activa
                      return (
                        <button key={type} disabled
                          className={`flex items-center justify-center gap-1.5 bg-zinc-900 text-zinc-700 border border-zinc-800 font-black text-[9px] uppercase tracking-widest py-2.5 rounded-xl opacity-40`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </button>
                      );
                    }

                    // Botón normal para iniciar pausa
                    return (
                      <motion.button key={type} whileTap={{ scale: 0.97 }}
                        onClick={() => handleBreakStart(type)}
                        disabled={!!breakLoading || loading}
                        className={`flex items-center justify-center gap-1.5 ${cfg.bg} ${cfg.color} border ${cfg.border} font-black text-[9px] uppercase tracking-widest py-2.5 rounded-xl transition-all disabled:opacity-40`}
                      >
                        {breakLoading === type
                          ? <Loader2 size={12} className="animate-spin" />
                          : cfg.icon
                        }
                        {cfg.label}
                      </motion.button>
                    );
                  })}
                </div>

                {/* ── CHECK-OUT ── */}
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handleCheckOut}
                  disabled={loading || !!activeBreak}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-40"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  {activeBreak ? "Termina la pausa primero" : "Check-Out"}
                </motion.button>
              </>
            )}
          </div>

          {/* ── Mini stats de pausas del día ── */}
          {active && ALL_BREAK_TYPES.some((t) => breakMinsByType(t) > 0) && (
            <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
              {ALL_BREAK_TYPES.map((type) => {
                const mins = breakMinsByType(type);
                if (mins === 0) return null;
                const cfg = BREAK_CONFIG[type];
                return (
                  <div key={type} className={`flex items-center gap-1.5 ${cfg.bgBadge} border ${cfg.borderBadge} rounded-lg px-2 py-1.5`}>
                    <span className={cfg.color + " shrink-0"}>{cfg.icon}</span>
                    <div>
                      <p className={`text-[8px] ${cfg.color} font-black uppercase tracking-widest`}>{cfg.label}</p>
                      <p className={`text-[9px] font-mono ${cfg.color}`}>{Math.round(mins)} min</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KPIs + sesión activa ── */}
        <div className="col-span-2 grid grid-cols-3 gap-4 content-start">
          {[
            { label: "Horas Este Mes",  value: formatHoras(kpis.totalHorasMes),  icon: <Clock      size={14} className="text-[#FDCB02]"  />, sub: "Total acumulado"   },
            { label: "Días Trabajados", value: kpis.diasTrabajados,              icon: <Calendar   size={14} className="text-sky-400"    />, sub: "Con check-out"     },
            { label: "Promedio Diario", value: formatHoras(kpis.promedioHoras),  icon: <TrendingUp size={14} className="text-emerald-400"/>, sub: "Por día trabajado" },
          ].map((k, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl p-6 flex flex-col justify-between h-32 shadow-xl">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{k.label}</p>
                {k.icon}
              </div>
              <div>
                <p className="text-3xl font-mono font-bold text-white">{k.value}</p>
                <p className="text-[10px] text-zinc-700 mt-1">{k.sub}</p>
              </div>
            </div>
          ))}

          {/* Sesión activa */}
          {active && (
            <div className={`col-span-3 rounded-2xl p-5 flex items-center gap-4 border shadow-lg ${
              activeBreak
                ? `${activeBreakCfg?.bgBadge} ${activeBreakCfg?.borderBadge}`
                : "bg-emerald-500/5 border-emerald-500/20"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                activeBreak ? activeBreakCfg?.color.replace("text-", "bg-") : "bg-emerald-500"
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold uppercase tracking-widest ${
                  activeBreak ? activeBreakCfg?.color : "text-emerald-400"
                }`}>
                  {activeBreak
                    ? `${activeBreakCfg?.emoji} En pausa — ${activeBreakCfg?.label}`
                    : "Sesión Activa"
                  }
                </p>
                <p className="text-xs text-zinc-500 mt-1 capitalize">
                  {formatDate(active.checkIn)} · Entrada: {formatTime(active.checkIn)}
                </p>
                {active.location && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin size={11} className="text-zinc-600 shrink-0" />
                    <p className="text-[10px] text-zinc-600 truncate uppercase tracking-widest">{active.location}</p>
                  </div>
                )}
              </div>
              {activeBreak && (
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Tiempo</p>
                  <p className={`text-lg font-mono font-bold ${activeBreakCfg?.color}`}>{breakElapsed}</p>
                </div>
              )}
            </div>
          )}

          {/* Breaks del día */}
          {breaks.length > 0 && (
            <div className="col-span-3 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl p-5 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-1.5">
                <Timer size={13} /> Pausas Registradas Hoy
              </p>
              <div className="flex flex-wrap gap-2">
                {breaks.map((b) => {
                  const cfg = BREAK_CONFIG[b.type];
                  return (
                    <div key={b.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${cfg.bgBadge} ${cfg.borderBadge} ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                      <span className="font-mono bg-black/20 px-2 py-0.5 rounded-md">
                        {formatTime(b.startAt)}
                        {b.endAt ? ` → ${formatTime(b.endAt)}` : " · En curso"}
                      </span>
                      {b.duration != null && (
                        <span className="opacity-60">{Math.round(b.duration)}m</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/[0.04] shrink-0 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Clock size={15} className="text-[#FDCB02]" /> Historial de Asistencia
          </h3>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Últimos 30 días</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {attendances.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">Sin registros</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 backdrop-blur-md">
                <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold bg-[#0a0a0a]/90">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4">Check-Out</th>
                  <th className="px-6 py-4">Horas</th>
                  <th className="px-6 py-4">Pausas</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {attendances.map((a, idx) => {
                  const completo = !!a.checkOut;
                  return (
                    <motion.tr key={a.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-zinc-300 capitalize">
                          {new Date(a.checkIn).toLocaleDateString("es-MX", {
                            weekday: "short", day: "2-digit", month: "short",
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono font-bold text-emerald-400">{formatTime(a.checkIn)}</p>
                      </td>
                      <td className="px-6 py-4">
                        {a.checkOut
                          ? <p className="text-xs font-mono font-bold text-red-400">{formatTime(a.checkOut)}</p>
                          : <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest animate-pulse border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded">Activo</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        {a.horasTrabajadas != null
                          ? <p className="text-xs font-mono text-[#FDCB02] font-black">{formatHoras(a.horasTrabajadas)}</p>
                          : <p className="text-xs text-zinc-700">—</p>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ALL_BREAK_TYPES.map((type) => {
                            const mins = (a.breaks ?? [])
                              .filter((b) => b.type === type && b.duration)
                              .reduce((s, b) => s + (b.duration ?? 0), 0);
                            if (mins === 0) return null;
                            const cfg = BREAK_CONFIG[type];
                            return (
                              <span key={type} className={`flex items-center gap-1 text-[10px] ${cfg.color} font-mono bg-white/5 px-2 py-0.5 rounded`}>
                                {cfg.icon} {Math.round(mins)}m
                              </span>
                            );
                          })}
                          {ALL_BREAK_TYPES.every((t) =>
                            (a.breaks ?? []).filter((b) => b.type === t && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0) === 0
                          ) && <span className="text-zinc-700 text-xs font-bold">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {a.location ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-zinc-600 shrink-0" />
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate max-w-[160px]">{a.location}</p>
                          </div>
                        ) : <p className="text-zinc-700 text-xs font-bold">—</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {completo ? (
                          <span className="flex items-center justify-end gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            <CheckCircle2 size={12} /> Completo
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1.5 text-[9px] font-black text-amber-400 uppercase tracking-widest animate-pulse">
                            <Clock size={12} /> En curso
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}