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
  LOGISTICA:    "Logistica",
  CONTABILIDAD: "Contabilidad",
};

const BREAK_CONFIG: Record<BreakType, {
  label: string; labelFin: string; emoji: string; icon: React.ReactNode;
  accent: string;
}> = {
  BANO:          { label: "Bano",    labelFin: "Fin Bano",     emoji: "🚻", icon: <Droplets size={13} />,      accent: "#5b9dff" },
  LUNCH:         { label: "Lunch",   labelFin: "Fin Lunch",    emoji: "🍽️", icon: <Coffee size={13} />,        accent: "#f5a623" },
  PEDIDO:        { label: "Pedido",  labelFin: "Fin Pedido",   emoji: "📦", icon: <Package size={13} />,       accent: "#b794f6" },
  ENTRENAMIENTO: { label: "Training", labelFin: "Fin Training", emoji: "🎓", icon: <GraduationCap size={13} />, accent: "#34d399" },
};

const ALL_BREAK_TYPES: BreakType[] = ["BANO", "LUNCH", "PEDIDO", "ENTRENAMIENTO"];

function formatHoras(h: number) {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return `${hrs}h ${min > 0 ? `${min}m` : ""}`.trim();
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long" });
}

// Anillo de progreso SVG
function ProgressRing({ value, max, accent, children }: { value: number; max: number; accent: string; children: React.ReactNode }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ - pct * circ;
  return (
    <div className="relative w-[84px] h-[84px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#22272f" strokeWidth="5" />
        <motion.circle
          cx="42" cy="42" r={r} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
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
  const [now, setNow] = useState<Date>(new Date());

  // Reloj de pared en vivo (hora actual)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reloj principal (tiempo trabajado)
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(active.checkIn).getTime();
      const h    = Math.floor(diff / 3600000);
      const m    = Math.floor((diff % 3600000) / 60000);
      const s    = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
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
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d = await r.json();
            label = d.display_name?.split(",").slice(0, 3).join(",") ?? label;
          } catch { /* silent */ }
          setLocStatus("ok");
          setLocLabel(label);
          resolve({ lat, lng, label });
        },
        () => { setLocStatus("error"); reject(new Error("No se pudo obtener ubicacion")); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { lat, lng, label } = await getLocation();
      const res = await checkInAction(employee.id, lat, lng, label);
      if (!res.success || !res.data) throw new Error(res.error);
      const newAttendance: Attendance = { ...res.data, checkIn: res.data.checkIn.toISOString(), checkOut: null, breaks: [] };
      setActive(newAttendance);
      setBreaks([]);
      setAttendances((prev) => [newAttendance, ...prev]);
      showToast("Check-In registrado", true);
    } catch (e: any) {
      showToast(e.message ?? "Error al registrar", false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!active) return;
    if (activeBreak) { showToast("Termina tu pausa antes de hacer Check-Out", false); return; }
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
      showToast("Check-Out registrado", true);
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

  const breakMinsByType = (type: BreakType) =>
    breaks.filter((b) => b.type === type && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0);

  const today = now.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const horaActual = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const activeBreakCfg = activeBreak ? BREAK_CONFIG[activeBreak.type] : null;
  const initials = employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-widest shadow-2xl backdrop-blur-xl"
            style={{
              background: toast.ok ? "rgba(52,211,153,0.12)" : "rgba(251,111,111,0.12)",
              borderColor: toast.ok ? "rgba(52,211,153,0.35)" : "rgba(251,111,111,0.35)",
              color: toast.ok ? "#34d399" : "#fb6f6f",
            }}
          >
            {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FILA SUPERIOR: Punch card + Reloj de pared + KPIs ═══ */}
      <div className="grid grid-cols-12 gap-4 shrink-0">

        {/* ── PUNCH CARD (col 4) ── */}
        <div className="col-span-12 lg:col-span-4 rounded-3xl p-6 flex flex-col items-center gap-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1c2026 0%, #15181d 60%, #101216 100%)",
            border: "1px solid #2c323b",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7)",
          }}>
          {/* glow de estado */}
          {active && !activeBreak && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(52,211,153,0.18), transparent 70%)" }} />
          )}
          {activeBreak && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${activeBreakCfg?.accent}30, transparent 70%)` }} />
          )}

          {/* Avatar + nombre */}
          <div className="text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2.5 font-black text-xl text-black shadow-lg"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f5a623)", boxShadow: "0 8px 24px -6px rgba(245,166,35,0.5)" }}>
              {initials}
            </div>
            <p className="text-base font-bold text-zinc-100">{employee.name}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: "#f5a623" }}>{ROLE_LABEL[employee.role]}</p>
          </div>

          {/* Reloj: tiempo trabajado o estado */}
          <div className="text-center w-full relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1.5">
              {activeBreak ? `${activeBreakCfg?.emoji} ${activeBreakCfg?.label}` : active ? "Tiempo trabajado" : "Sin sesion activa"}
            </p>
            <p className="text-[44px] leading-none font-bold tracking-tighter tabular-nums transition-colors"
              style={{ color: activeBreak ? activeBreakCfg?.accent : active ? "#34d399" : "#3f4651" }}>
              {active ? elapsed : "00:00:00"}
            </p>
            {activeBreak && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `${activeBreakCfg?.accent}1a` }}>
                <Timer size={11} style={{ color: activeBreakCfg?.accent }} />
                <span className="text-[11px] font-bold tabular-nums" style={{ color: activeBreakCfg?.accent }}>{breakElapsed}</span>
              </div>
            )}
            {active && !activeBreak && (
              <p className="text-[10px] text-zinc-500 mt-1.5 tabular-nums">Entrada {formatTime(active.checkIn)}</p>
            )}
          </div>

          {/* GPS */}
          {locStatus !== "idle" && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border relative z-10"
              style={{
                color: locStatus === "getting" ? "#f5a623" : locStatus === "ok" ? "#34d399" : "#fb6f6f",
                borderColor: locStatus === "getting" ? "#f5a62340" : locStatus === "ok" ? "#34d39940" : "#fb6f6f40",
                background: locStatus === "getting" ? "#f5a6231a" : locStatus === "ok" ? "#34d3991a" : "#fb6f6f1a",
              }}>
              {locStatus === "getting" && <Loader2 size={10} className="animate-spin" />}
              {locStatus === "ok" && <MapPin size={10} />}
              {locStatus === "error" && <AlertCircle size={10} />}
              {locStatus === "getting" ? "Obteniendo GPS..." : locStatus === "ok" ? "Ubicacion capturada" : "Error GPS"}
            </div>
          )}

          {/* Botones */}
          <div className="w-full space-y-2.5 mt-auto relative z-10">
            {!active ? (
              <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
                onClick={handleCheckIn} disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-black font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #34d399, #10b981)", boxShadow: "0 10px 30px -8px rgba(52,211,153,0.5)" }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Registrar Entrada
              </motion.button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_BREAK_TYPES.map((type) => {
                    const cfg = BREAK_CONFIG[type];
                    const isActive = activeBreak?.type === type;
                    const isBlocked = !!activeBreak && !isActive;
                    if (isActive) {
                      return (
                        <motion.button key={type} whileTap={{ scale: 0.97 }} onClick={handleBreakEnd} disabled={!!breakLoading}
                          className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition-all disabled:opacity-50 text-black animate-pulse"
                          style={{ background: cfg.accent }}>
                          {breakLoading === type ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                          {cfg.labelFin}
                        </motion.button>
                      );
                    }
                    if (isBlocked) {
                      return (
                        <button key={type} disabled
                          className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl opacity-30"
                          style={{ background: "#15181d", color: "#3f4651", border: "1px solid #22272f" }}>
                          {cfg.icon}{cfg.label}
                        </button>
                      );
                    }
                    return (
                      <motion.button key={type} whileTap={{ scale: 0.97 }} onClick={() => handleBreakStart(type)} disabled={!!breakLoading || loading}
                        className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition-all disabled:opacity-40"
                        style={{ background: `${cfg.accent}14`, color: cfg.accent, border: `1px solid ${cfg.accent}30` }}>
                        {breakLoading === type ? <Loader2 size={12} className="animate-spin" /> : cfg.icon}
                        {cfg.label}
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckOut} disabled={loading || !!activeBreak}
                  className="w-full flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all disabled:opacity-40"
                  style={{ background: "#fb6f6f14", color: "#fb6f6f", border: "1px solid #fb6f6f33" }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                  {activeBreak ? "Termina la pausa primero" : "Registrar Salida"}
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* ── RELOJ DE PARED + KPIs (col 8) ── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">

          {/* Reloj de pared en vivo */}
          <div className="rounded-3xl px-7 py-6 flex items-center justify-between relative overflow-hidden"
            style={{ background: "linear-gradient(120deg, #15181d, #101216)", border: "1px solid #2c323b" }}>
            <div className="absolute right-0 top-0 w-64 h-full pointer-events-none opacity-50"
              style={{ background: "radial-gradient(circle at right, rgba(245,166,35,0.08), transparent 70%)" }} />
            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Hora actual</p>
              <p className="text-5xl font-bold tracking-tighter tabular-nums text-zinc-100">{horaActual}</p>
              <p className="text-[11px] text-zinc-500 mt-1.5 capitalize">{today}</p>
            </div>
            <div className="relative z-10 text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: active ? "#34d3991a" : "#22272f", border: active ? "1px solid #34d39940" : "1px solid #2c323b" }}>
                <span className="relative flex h-2 w-2">
                  {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#34d399" }} />}
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: active ? "#34d399" : "#3f4651" }} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: active ? "#34d399" : "#6b7280" }}>
                  {active ? "En turno" : "Fuera"}
                </span>
              </div>
            </div>
          </div>

          {/* KPIs con anillos */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Horas del mes", raw: kpis.totalHorasMes, display: formatHoras(kpis.totalHorasMes), max: 200, accent: "#f5a623", icon: <Clock size={15} /> },
              { label: "Dias trabajados", raw: kpis.diasTrabajados, display: String(kpis.diasTrabajados), max: 26, accent: "#5b9dff", icon: <Calendar size={15} /> },
              { label: "Promedio diario", raw: kpis.promedioHoras, display: formatHoras(kpis.promedioHoras), max: 10, accent: "#34d399", icon: <TrendingUp size={15} /> },
            ].map((k, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-3xl p-5 flex items-center gap-4"
                style={{ background: "#15181d", border: "1px solid #2c323b" }}>
                <ProgressRing value={k.raw} max={k.max} accent={k.accent}>
                  <span style={{ color: k.accent }}>{k.icon}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{k.label}</p>
                  <p className="text-2xl font-bold tabular-nums text-zinc-100 leading-none">{k.display}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pausas de hoy (si hay) */}
          {breaks.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: "#15181d", border: "1px solid #2c323b" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-1.5">
                <Timer size={13} /> Pausas de hoy
              </p>
              <div className="flex flex-wrap gap-2">
                {breaks.map((b) => {
                  const cfg = BREAK_CONFIG[b.type];
                  return (
                    <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: `${cfg.accent}12`, border: `1px solid ${cfg.accent}30`, color: cfg.accent }}>
                      {cfg.icon}{cfg.label}
                      <span className="font-mono tabular-nums px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.25)" }}>
                        {formatTime(b.startAt)}{b.endAt ? ` → ${formatTime(b.endAt)}` : " · En curso"}
                      </span>
                      {b.duration != null && <span className="opacity-60">{Math.round(b.duration)}m</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ HISTORIAL ═══ */}
      <div className="flex-1 flex flex-col min-h-0 rounded-3xl overflow-hidden"
        style={{ background: "#15181d", border: "1px solid #2c323b" }}>
        <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid #2c323b" }}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-100 flex items-center gap-2">
            <Clock size={15} style={{ color: "#f5a623" }} /> Historial de asistencia
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Ultimos 30 dias</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#2c323b] [&::-webkit-scrollbar-thumb]:rounded-full">
          {attendances.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Clock size={28} className="text-zinc-700" />
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-bold">Aun no hay registros</p>
              <p className="text-[10px] text-zinc-700">Tu primer check-in aparecera aqui</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: "#15181d" }}>
                <tr className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold" style={{ borderBottom: "1px solid #2c323b" }}>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Entrada</th>
                  <th className="px-6 py-3.5">Salida</th>
                  <th className="px-6 py-3.5">Horas</th>
                  <th className="px-6 py-3.5">Pausas</th>
                  <th className="px-6 py-3.5">Ubicacion</th>
                  <th className="px-6 py-3.5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((a, idx) => {
                  const completo = !!a.checkOut;
                  return (
                    <motion.tr key={a.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "1px solid #1c2026" }}>
                      <td className="px-6 py-3.5">
                        <p className="text-xs font-bold text-zinc-300 capitalize">
                          {new Date(a.checkIn).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-xs font-bold tabular-nums" style={{ color: "#34d399" }}>{formatTime(a.checkIn)}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        {a.checkOut
                          ? <p className="text-xs font-bold tabular-nums" style={{ color: "#fb6f6f" }}>{formatTime(a.checkOut)}</p>
                          : <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded animate-pulse" style={{ color: "#f5a623", background: "#f5a6231a", border: "1px solid #f5a62330" }}>Activo</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        {a.horasTrabajadas != null
                          ? <p className="text-xs font-black tabular-nums" style={{ color: "#f5a623" }}>{formatHoras(a.horasTrabajadas)}</p>
                          : <p className="text-xs text-zinc-700">—</p>}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ALL_BREAK_TYPES.map((type) => {
                            const mins = (a.breaks ?? []).filter((b) => b.type === type && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0);
                            if (mins === 0) return null;
                            const cfg = BREAK_CONFIG[type];
                            return (
                              <span key={type} className="flex items-center gap-1 text-[10px] font-mono tabular-nums px-2 py-0.5 rounded" style={{ color: cfg.accent, background: `${cfg.accent}12` }}>
                                {cfg.icon} {Math.round(mins)}m
                              </span>
                            );
                          })}
                          {ALL_BREAK_TYPES.every((t) => (a.breaks ?? []).filter((b) => b.type === t && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0) === 0)
                            && <span className="text-zinc-700 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {a.location ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-zinc-600 shrink-0" />
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate max-w-[160px]">{a.location}</p>
                          </div>
                        ) : <p className="text-zinc-700 text-xs">—</p>}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {completo ? (
                          <span className="inline-flex items-center justify-end gap-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: "#34d399" }}>
                            <CheckCircle2 size={12} /> Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-1.5 text-[9px] font-black uppercase tracking-widest animate-pulse" style={{ color: "#f5a623" }}>
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
