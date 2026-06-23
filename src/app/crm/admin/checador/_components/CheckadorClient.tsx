"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, LogIn, LogOut,
  Calendar, TrendingUp, CheckCircle2,
  AlertCircle, Loader2, Coffee, Droplets,
  Timer, Square, Package, GraduationCap, Fingerprint,
} from "lucide-react";
import { EmployeeRole } from "@prisma/client";
import { checkInAction, checkOutAction, startBreakAction, endBreakAction } from "@/app/actions/checador";

type BreakType = "BANO" | "LUNCH" | "PEDIDO" | "ENTRENAMIENTO";
type AttendanceBreak = { id: string; type: BreakType; startAt: string; endAt: string | null; duration: number | null; };
type Attendance = {
  id: string; checkIn: string; checkOut: string | null; horasTrabajadas: number | null;
  location: string | null; lat: number | null; lng: number | null;
  checkOutLat: number | null; checkOutLng: number | null; breaks?: AttendanceBreak[];
};
type Employee = { id: string; name: string; role: EmployeeRole; };
type Kpis = { totalHorasMes: number; diasTrabajados: number; promedioHoras: number; };

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN: "Administrador", SUPERVISOR: "Supervisor", VENDEDORA: "Vendedora", LOGISTICA: "Logistica", CONTABILIDAD: "Contabilidad",
};

const BREAK_CONFIG: Record<BreakType, { label: string; labelFin: string; emoji: string; icon: React.ReactNode; accent: string; }> = {
  BANO:          { label: "Bano",    labelFin: "Fin Bano",     emoji: "🚻", icon: <Droplets size={13} />,      accent: "#5b9dff" },
  LUNCH:         { label: "Lunch",   labelFin: "Fin Lunch",    emoji: "🍽️", icon: <Coffee size={13} />,        accent: "#f5a623" },
  PEDIDO:        { label: "Pedido",  labelFin: "Fin Pedido",   emoji: "📦", icon: <Package size={13} />,       accent: "#b794f6" },
  ENTRENAMIENTO: { label: "Training", labelFin: "Fin Training", emoji: "🎓", icon: <GraduationCap size={13} />, accent: "#34d399" },
};
const ALL_BREAK_TYPES: BreakType[] = ["BANO", "LUNCH", "PEDIDO", "ENTRENAMIENTO"];

function formatHoras(h: number) {
  const hrs = Math.floor(h); const min = Math.round((h - hrs) * 60);
  return `${hrs}h ${min > 0 ? `${min}m` : ""}`.trim();
}
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long" }); }

function saludoPorHora(h: number) {
  if (h < 12) return "Buenos dias";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ── Reloj analogo de lujo (rotacion SVG nativa, correcta) ──
function RelojAnalogo({ now, accent }: { now: Date; accent: string }) {
  const ms = now.getMilliseconds();
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours() % 12;
  const segDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const horDeg = h * 30 + m * 0.5;
  return (
    <div className="relative w-[150px] h-[150px] shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="clockFace" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#1c2026" />
            <stop offset="100%" stopColor="#0d0f12" />
          </radialGradient>
          <filter id="glowSeg"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* marco */}
        <circle cx="100" cy="100" r="96" fill="url(#clockFace)" stroke="#2c323b" strokeWidth="2" />
        <circle cx="100" cy="100" r="93" fill="none" stroke={accent} strokeWidth="1" opacity="0.35" />

        {/* marcas de horas */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) * (Math.PI / 180);
          const x1 = 100 + Math.sin(a) * 80, y1 = 100 - Math.cos(a) * 80;
          const x2 = 100 + Math.sin(a) * 88, y2 = 100 - Math.cos(a) * 88;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 3 === 0 ? accent : "#3f4651"} strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round" />;
        })}

        {/* manecilla HORA (rotacion nativa desde el centro 100,100) */}
        <line x1="100" y1="100" x2="100" y2="52" stroke="#e4e7eb" strokeWidth="5" strokeLinecap="round"
          transform={`rotate(${horDeg} 100 100)`} />

        {/* manecilla MINUTO */}
        <line x1="100" y1="100" x2="100" y2="34" stroke="#e4e7eb" strokeWidth="3.5" strokeLinecap="round"
          transform={`rotate(${minDeg} 100 100)`} />

        {/* SEGUNDERO (con cola, glow, color de acento) */}
        <line x1="100" y1="112" x2="100" y2="28" stroke={accent} strokeWidth="1.5" strokeLinecap="round" filter="url(#glowSeg)"
          transform={`rotate(${segDeg} 100 100)`} />

        {/* centro */}
        <circle cx="100" cy="100" r="6" fill={accent} filter="url(#glowSeg)" />
        <circle cx="100" cy="100" r="2.5" fill="#0d0f12" />
      </svg>
    </div>
  );
}

// ── Anillo gigante de jornada (8h objetivo) ──
function JornadaRing({ horas, accent, label, sub, big }: { horas: number; accent: string; label: string; sub: string; big: string }) {
  const r = 70, circ = 2 * Math.PI * r;
  const pct = Math.min(horas / 8, 1);
  const offset = circ - pct * circ;
  return (
    <div className="relative w-[180px] h-[180px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="jgrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} /><stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#22272f" strokeWidth="10" />
        <motion.circle cx="90" cy="90" r={r} fill="none" stroke="url(#jgrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-500">{label}</p>
        <p className="text-3xl font-bold tabular-nums text-zinc-100 leading-tight">{big}</p>
        <p className="text-[9px] text-zinc-500">{sub}</p>
      </div>
    </div>
  );
}

// ── Confeti simple ──
function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number; rot: number }[]>([]);
  useEffect(() => {
    if (fire === 0) return;
    const colors = ["#f5a623", "#34d399", "#5b9dff", "#b794f6", "#fbbf24"];
    const next = Array.from({ length: 40 }).map((_, i) => ({
      id: fire * 1000 + i, x: Math.random() * 100, color: colors[i % colors.length], delay: Math.random() * 0.3, rot: Math.random() * 360,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 2500);
    return () => clearTimeout(t);
  }, [fire]);
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.div key={p.id} className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ left: `${p.x}%`, top: "-5%", background: p.color }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: p.rot + 360 }}
          transition={{ duration: 2.2, delay: p.delay, ease: "easeIn" }} />
      ))}
    </div>
  );
}

export default function CheckadorClient({
  attendances: initialAttendances, activeSession: initialActive, kpis, employee,
}: { attendances: Attendance[]; activeSession: Attendance | null; kpis: Kpis; employee: Employee; }) {
  const [active, setActive] = useState<Attendance | null>(initialActive);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [elapsedHrs, setElapsedHrs] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState("00:00");
  const [locStatus, setLocStatus] = useState<"idle" | "getting" | "ok" | "error">("idle");
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState<BreakType | null>(null);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [breaks, setBreaks] = useState<AttendanceBreak[]>(initialActive?.breaks ?? []);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [confettiFire, setConfettiFire] = useState(0);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!active) { setElapsedHrs(0); return; }
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(active.checkIn).getTime();
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setElapsedHrs(diff / 3600000);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!activeBreak) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeBreak.startAt).getTime();
      const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
      setBreakElapsed(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBreak]);

  useEffect(() => { const ob = breaks.find((b) => !b.endAt); setActiveBreak(ob ?? null); }, [breaks]);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const getLocation = (): Promise<{ lat: number; lng: number; label: string }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("GPS no disponible")); return; }
      setLocStatus("getting");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d = await r.json();
            label = d.display_name?.split(",").slice(0, 3).join(",") ?? label;
          } catch { /* silent */ }
          setLocStatus("ok"); setLocLabel(label); resolve({ lat, lng, label });
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
      const na: Attendance = { ...res.data, checkIn: res.data.checkIn.toISOString(), checkOut: null, breaks: [] };
      setActive(na); setBreaks([]); setAttendances((prev) => [na, ...prev]);
      setConfettiFire((n) => n + 1);
      showToast("Check-In registrado", true);
    } catch (e: any) { showToast(e.message ?? "Error al registrar", false); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!active) return;
    if (activeBreak) { showToast("Termina tu pausa antes de hacer Check-Out", false); return; }
    setLoading(true);
    try {
      const { lat, lng } = await getLocation();
      const res = await checkOutAction(active.id, employee.id, lat, lng);
      if (!res.success || !res.data) throw new Error(res.error);
      setActive(null); setElapsed("00:00:00"); setBreaks([]); setActiveBreak(null);
      setAttendances((prev) => prev.map((a) => a.id === active.id
        ? { ...a, checkOut: new Date().toISOString(), horasTrabajadas: res.data.horasTrabajadas, breaks } : a));
      showToast("Check-Out registrado", true);
    } catch (e: any) { showToast(e.message ?? "Error al registrar", false); }
    finally { setLoading(false); }
  };

  const handleBreakStart = async (type: BreakType) => {
    if (!active || activeBreak) return;
    setBreakLoading(type);
    try {
      const res = await startBreakAction(active.id, type);
      if (!res.success || !res.data) throw new Error(res.error);
      const nb: AttendanceBreak = { ...res.data, startAt: res.data.startAt.toISOString(), endAt: null, duration: null };
      setActiveBreak(nb); setBreaks((prev) => [...prev, nb]);
      const cfg = BREAK_CONFIG[type]; showToast(`${cfg.emoji} ${cfg.label} iniciado`, true);
    } catch (e: any) { showToast(e.message ?? "Error", false); }
    finally { setBreakLoading(null); }
  };

  const handleBreakEnd = async () => {
    if (!activeBreak) return;
    setBreakLoading(activeBreak.type);
    try {
      const res = await endBreakAction(activeBreak.id);
      if (!res.success || !res.data) throw new Error(res.error);
      setBreaks((prev) => prev.map((b) => b.id === activeBreak.id
        ? { ...b, endAt: res.data.endAt?.toISOString() ?? null, duration: res.data.duration } : b));
      setActiveBreak(null); setBreakElapsed("00:00");
      showToast(`Pausa terminada — ${Math.round(res.data.duration ?? 0)} min`, true);
    } catch (e: any) { showToast(e.message ?? "Error", false); }
    finally { setBreakLoading(null); }
  };

  const breakMinsByType = (type: BreakType) =>
    breaks.filter((b) => b.type === type && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0);

  const today = now.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const horaActual = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const activeBreakCfg = activeBreak ? BREAK_CONFIG[activeBreak.type] : null;
  const initials = employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const primerNombre = employee.name.split(" ")[0];
  const estadoAccent = activeBreak ? activeBreakCfg!.accent : active ? "#34d399" : "#f5a623";

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden relative" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      <Confetti fire={confettiFire} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[70] flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-widest shadow-2xl backdrop-blur-xl"
            style={{ background: toast.ok ? "rgba(52,211,153,0.12)" : "rgba(251,111,111,0.12)", borderColor: toast.ok ? "rgba(52,211,153,0.35)" : "rgba(251,111,111,0.35)", color: toast.ok ? "#34d399" : "#fb6f6f" }}>
            {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HERO: fondo vivo + saludo + reloj analogo + boton huella ═══ */}
      <div className="shrink-0 rounded-3xl p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #15181d 0%, #101216 100%)", border: "1px solid #2c323b", minHeight: "260px" }}>

        {/* Blobs animados de fondo (reaccionan al estado) */}
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: 340, height: 340, top: -120, right: -60, background: `radial-gradient(circle, ${estadoAccent}22, transparent 70%)`, filter: "blur(20px)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: 260, height: 260, bottom: -100, left: -40, background: `radial-gradient(circle, ${estadoAccent}18, transparent 70%)`, filter: "blur(20px)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">

          {/* Izquierda: saludo + avatar + estado */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center font-black text-2xl text-black shadow-xl"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f5a623)", boxShadow: "0 10px 30px -8px rgba(245,166,35,0.5)" }}>
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: estadoAccent }} />}
                <span className="relative inline-flex rounded-full h-5 w-5 items-center justify-center border-2" style={{ background: "#101216", borderColor: estadoAccent }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: estadoAccent }} />
                </span>
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{saludoPorHora(now.getHours())},</p>
              <h2 className="text-3xl font-bold text-zinc-100 tracking-tight leading-tight">{primerNombre} 👋</h2>
              <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full" style={{ background: `${estadoAccent}1a`, border: `1px solid ${estadoAccent}33` }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: estadoAccent }}>
                  {activeBreak ? `${activeBreakCfg?.emoji} En ${activeBreakCfg?.label}` : active ? "● En turno" : "○ Fuera de turno"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5 capitalize">{today}</p>
            </div>
          </div>

          {/* Centro: reloj analogo */}
          <div className="flex flex-col items-center gap-1">
            <RelojAnalogo now={now} accent={estadoAccent} />
            <p className="text-lg font-bold tabular-nums text-zinc-200 tracking-tight">{horaActual}</p>
          </div>

          {/* Derecha: boton huella gigante */}
          <div className="flex flex-col items-center gap-3">
            {!active ? (
              <motion.button onClick={handleCheckIn} disabled={loading} whileTap={{ scale: 0.92 }}
                className="relative w-[130px] h-[130px] rounded-full flex flex-col items-center justify-center gap-1 disabled:opacity-60"
                style={{ background: "radial-gradient(circle at 50% 35%, #34d399, #10b981)", boxShadow: "0 0 0 0 rgba(52,211,153,0.5)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(52,211,153,0.4)", "0 0 0 18px rgba(52,211,153,0)", "0 0 0 0 rgba(52,211,153,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}>
                {loading ? <Loader2 size={36} className="animate-spin text-black" /> : <Fingerprint size={40} className="text-black" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-black">Entrar</span>
              </motion.button>
            ) : (
              <motion.button onClick={handleCheckOut} disabled={loading || !!activeBreak} whileTap={{ scale: 0.92 }}
                className="relative w-[130px] h-[130px] rounded-full flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: activeBreak ? "#22272f" : "radial-gradient(circle at 50% 35%, #fb6f6f, #ef4444)", boxShadow: activeBreak ? "none" : "0 10px 40px -8px rgba(251,111,111,0.5)" }}>
                {loading ? <Loader2 size={36} className="animate-spin text-white" /> : <LogOut size={38} className="text-white" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-white text-center px-2">{activeBreak ? "Pausa activa" : "Salir"}</span>
              </motion.button>
            )}
            {/* GPS mini */}
            {locStatus !== "idle" && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                style={{ color: locStatus === "getting" ? "#f5a623" : locStatus === "ok" ? "#34d399" : "#fb6f6f", borderColor: locStatus === "getting" ? "#f5a62340" : locStatus === "ok" ? "#34d39940" : "#fb6f6f40", background: locStatus === "getting" ? "#f5a6231a" : locStatus === "ok" ? "#34d3991a" : "#fb6f6f1a" }}>
                {locStatus === "getting" && <Loader2 size={9} className="animate-spin" />}
                {locStatus === "ok" && <MapPin size={9} />}
                {locStatus === "error" && <AlertCircle size={9} />}
                {locStatus === "getting" ? "GPS..." : locStatus === "ok" ? "Ubicado" : "Error GPS"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FILA MEDIA: anillo jornada + breaks + KPIs ═══ */}
      <div className="grid grid-cols-12 gap-4 shrink-0">

        {/* Anillo de jornada + tiempo trabajado */}
        <div className="col-span-12 lg:col-span-4 rounded-3xl p-6 flex items-center gap-5"
          style={{ background: "#15181d", border: "1px solid #2c323b" }}>
          <JornadaRing horas={elapsedHrs} accent={estadoAccent}
            label="Jornada" big={active ? elapsed.slice(0, 5) : "0h"} sub={active ? "de 8h" : "sin iniciar"} />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">
              {activeBreak ? "En pausa" : active ? "Trabajando" : "Sin sesion"}
            </p>
            <p className="text-3xl font-bold tabular-nums leading-none mb-2" style={{ color: estadoAccent }}>
              {active ? elapsed : "00:00:00"}
            </p>
            {active && !activeBreak && <p className="text-[10px] text-zinc-500 tabular-nums">Entrada {formatTime(active.checkIn)}</p>}
            {activeBreak && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mt-1" style={{ background: `${activeBreakCfg?.accent}1a` }}>
                <Timer size={11} style={{ color: activeBreakCfg?.accent }} />
                <span className="text-[11px] font-bold tabular-nums" style={{ color: activeBreakCfg?.accent }}>{breakElapsed}</span>
              </div>
            )}
          </div>
        </div>

        {/* Breaks (solo si hay sesion activa) */}
        <div className="col-span-12 lg:col-span-4 rounded-3xl p-5 flex flex-col justify-center"
          style={{ background: "#15181d", border: "1px solid #2c323b" }}>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">Pausas</p>
          {!active ? (
            <p className="text-[11px] text-zinc-600 text-center py-4">Registra tu entrada para tomar pausas</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ALL_BREAK_TYPES.map((type) => {
                const cfg = BREAK_CONFIG[type];
                const isActive = activeBreak?.type === type;
                const isBlocked = !!activeBreak && !isActive;
                if (isActive) return (
                  <motion.button key={type} whileTap={{ scale: 0.96 }} onClick={handleBreakEnd} disabled={!!breakLoading}
                    className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl text-black animate-pulse disabled:opacity-50"
                    style={{ background: cfg.accent }}>
                    {breakLoading === type ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}{cfg.labelFin}
                  </motion.button>
                );
                if (isBlocked) return (
                  <button key={type} disabled className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl opacity-30"
                    style={{ background: "#101216", color: "#3f4651", border: "1px solid #22272f" }}>{cfg.icon}{cfg.label}</button>
                );
                return (
                  <motion.button key={type} whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }} onClick={() => handleBreakStart(type)} disabled={!!breakLoading || loading}
                    className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: `${cfg.accent}14`, color: cfg.accent, border: `1px solid ${cfg.accent}30` }}>
                    {breakLoading === type ? <Loader2 size={12} className="animate-spin" /> : cfg.icon}{cfg.label}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* KPIs apilados */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {[
            { label: "Horas del mes", display: formatHoras(kpis.totalHorasMes), accent: "#f5a623", icon: <Clock size={15} /> },
            { label: "Dias trabajados", display: String(kpis.diasTrabajados), accent: "#5b9dff", icon: <Calendar size={15} /> },
            { label: "Promedio diario", display: formatHoras(kpis.promedioHoras), accent: "#34d399", icon: <TrendingUp size={15} /> },
          ].map((k, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "#15181d", border: "1px solid #2c323b" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.accent}1a`, color: k.accent }}>{k.icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{k.label}</p>
              </div>
              <p className="text-xl font-bold tabular-nums text-zinc-100">{k.display}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══ HISTORIAL ═══ */}
      <div className="flex-1 flex flex-col min-h-0 rounded-3xl overflow-hidden" style={{ background: "#15181d", border: "1px solid #2c323b" }}>
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
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: "#15181d" }}>
                <tr className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold" style={{ borderBottom: "1px solid #2c323b" }}>
                  <th className="px-6 py-3.5">Fecha</th><th className="px-6 py-3.5">Entrada</th><th className="px-6 py-3.5">Salida</th>
                  <th className="px-6 py-3.5">Horas</th><th className="px-6 py-3.5">Pausas</th><th className="px-6 py-3.5">Ubicacion</th><th className="px-6 py-3.5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((a, idx) => {
                  const completo = !!a.checkOut;
                  return (
                    <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                      className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid #1c2026" }}>
                      <td className="px-6 py-3.5"><p className="text-xs font-bold text-zinc-300 capitalize">{new Date(a.checkIn).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}</p></td>
                      <td className="px-6 py-3.5"><p className="text-xs font-bold tabular-nums" style={{ color: "#34d399" }}>{formatTime(a.checkIn)}</p></td>
                      <td className="px-6 py-3.5">{a.checkOut ? <p className="text-xs font-bold tabular-nums" style={{ color: "#fb6f6f" }}>{formatTime(a.checkOut)}</p> : <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded animate-pulse" style={{ color: "#f5a623", background: "#f5a6231a", border: "1px solid #f5a62330" }}>Activo</span>}</td>
                      <td className="px-6 py-3.5">{a.horasTrabajadas != null ? <p className="text-xs font-black tabular-nums" style={{ color: "#f5a623" }}>{formatHoras(a.horasTrabajadas)}</p> : <p className="text-xs text-zinc-700">—</p>}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ALL_BREAK_TYPES.map((type) => {
                            const mins = (a.breaks ?? []).filter((b) => b.type === type && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0);
                            if (mins === 0) return null;
                            const cfg = BREAK_CONFIG[type];
                            return <span key={type} className="flex items-center gap-1 text-[10px] font-mono tabular-nums px-2 py-0.5 rounded" style={{ color: cfg.accent, background: `${cfg.accent}12` }}>{cfg.icon} {Math.round(mins)}m</span>;
                          })}
                          {ALL_BREAK_TYPES.every((t) => (a.breaks ?? []).filter((b) => b.type === t && b.duration).reduce((s, b) => s + (b.duration ?? 0), 0) === 0) && <span className="text-zinc-700 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">{a.location ? <div className="flex items-center gap-1.5"><MapPin size={11} className="text-zinc-600 shrink-0" /><p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate max-w-[160px]">{a.location}</p></div> : <p className="text-zinc-700 text-xs">—</p>}</td>
                      <td className="px-6 py-3.5 text-right">{completo ? <span className="inline-flex items-center justify-end gap-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: "#34d399" }}><CheckCircle2 size={12} /> Completo</span> : <span className="inline-flex items-center justify-end gap-1.5 text-[9px] font-black uppercase tracking-widest animate-pulse" style={{ color: "#f5a623" }}><Clock size={12} /> En curso</span>}</td>
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
