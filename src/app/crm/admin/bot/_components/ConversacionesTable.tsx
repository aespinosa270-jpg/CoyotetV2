"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Paperclip, Phone, Hand,
  Bot, Flame, Snowflake, Gem, DollarSign, Eye,
  Check, CheckCheck, ArrowLeft, MessageSquare, Sparkles,
  TrendingUp, ShieldCheck, Package, X, FileText, Loader2,
  Tag, CheckCircle2, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ConversacionResumen } from "@/lib/bot/repositories/admin-queries";

type MediaType = "image" | "document" | "video" | "audio";
interface UploadedMedia {
  mediaUrl: string;
  mediaType: MediaType;
  filename: string;
  mimeType: string;
  size: number;
}
const SIZE_LIMITS_MB: Record<MediaType, number> = { image: 5, document: 100, video: 16, audio: 16 };
function detectMediaType(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

/* ============================================================
   CHIPS de respuesta rapida (editables) y ETIQUETAS
   ============================================================ */
const QUICK_REPLIES: { label: string; text: string }[] = [
  { label: "Cotizacion", text: "Con gusto le preparo la cotizacion. Que tela y cuantos kilos necesita?" },
  { label: "Datos de envio", text: "Para calcular el envio, me comparte su codigo postal y ciudad?" },
  { label: "Horario", text: "Nuestro horario es de lunes a viernes de 9 a 6 y sabados de 9 a 2." },
  { label: "Disponibilidad", text: "Dejeme confirmar disponibilidad en almacen y le aviso enseguida." },
  { label: "Formas de pago", text: "Aceptamos transferencia, deposito y tarjeta. Cual le acomoda?" },
  { label: "Seguimiento", text: "Hola! Le doy seguimiento a su cotizacion. Sigue interesado?" },
];

const ETIQUETAS = ["Hot", "Mayoreo", "Menudeo", "Cotizado", "Pagado", "Seguimiento"];

/* ============================================================
   Tipos del payload del endpoint /detail
   ============================================================ */
interface MensajeHistorial {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp?: string;
  waId?: string;
  status?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaNativeId?: string;
  mediaTipo?: "image" | "audio" | "video" | "document";
}
interface MediaItemDTO {
  messageId: string;
  nativeId: string;
  tipo: "image" | "audio" | "video" | "document";
  mimeType?: string;
  caption?: string;
  timestamp: string;
}
interface PauseStateDTO {
  pausedAt: string;
  pausedBy: string;
  lastAgentMessageAt: string;
}
interface DetalleDTO {
  perfil: any;
  historial: MensajeHistorial[];
  resumen: string | null;
  memoria: any;
  pedidos: any[];
  topObjeciones: Array<{ label: string; score: number }>;
  paused: boolean;
  pauseState: PauseStateDTO | null;
  ttlSeconds: number;
  media?: MediaItemDTO[];
}

interface Props {
  items: ConversacionResumen[];
}

/* ============================================================
   Lead badges
   ============================================================ */
const LEAD: Record<
  string,
  { label: string; Icon: typeof Flame; cls: string }
> = {
  hot: { label: "Hot", Icon: Flame, cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  vip: { label: "VIP", Icon: Gem, cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  premium: { label: "Premium", Icon: DollarSign, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  precio: { label: "Precio", Icon: DollarSign, cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  casual: { label: "Casual", Icon: Eye, cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  frio: { label: "Frio", Icon: Snowflake, cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  curioso: { label: "Curioso", Icon: Eye, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

const AVATARS = [
  "from-amber-400 to-yellow-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-orange-400 to-red-500",
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATARS[Math.abs(h) % AVATARS.length];
}
function initial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}
function relTime(iso?: string): string {
  if (!iso || iso === "1970-01-01T00:00:00.000Z") return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mes`;
}
function fmtTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
function fmtTTL(seconds: number): string {
  if (seconds <= 0) return "0min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
function cleanPreview(s?: string): string {
  if (!s) return "";
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
/** Fusiona historial con media del cliente, ordenado por timestamp. */
function mergeHistorialMedia(
  historial: MensajeHistorial[],
  media: MediaItemDTO[]
): MensajeHistorial[] {
  if (!media || media.length === 0) return historial;
  const mediaMsgs: MensajeHistorial[] = media.map((md) => ({
    role: "user" as const,
    content: md.caption || "",
    timestamp: md.timestamp,
    mediaNativeId: md.nativeId,
    mediaTipo: md.tipo,
  }));
  const merged = [...historial, ...mediaMsgs];
  merged.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
  });
  return merged;
}

/** Reproduce un tono de notificacion estilo WhatsApp (du-dun) usando
 *  Web Audio. No requiere archivo .mp3. Los navegadores bloquean audio
 *  hasta el primer clic del usuario; despues suena sin problema. */
let _audioCtx: AudioContext | null = null;
function playDing() {
  try {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!_audioCtx) _audioCtx = new AC();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    // dos notas cortas: la primera mas grave, la segunda mas aguda
    [[880, 0], [1175, 0.13]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
  } catch { /* silencio si falla */ }
}

type Filtro = "todas" | "sin_responder" | "calientes" | "bot";

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export function ConversacionesTable({ items }: Props) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [hoverPhone, setHoverPhone] = useState<string | null>(null);
  const [liveItems, setLiveItems] = useState<ConversacionResumen[]>(items);
  const prevSinRespRef = useRef<number>(items.filter((c) => c.sinResponder).length);

  // POLLING GLOBAL: cada 15s revisa si hay mensajes nuevos -> ding global
  useEffect(() => {
    let cancel = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/bot/conversaciones/lista", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const nuevos: ConversacionResumen[] = json.items ?? [];
        if (cancel || nuevos.length === 0) return;
        const sinResp = nuevos.filter((c) => c.sinResponder).length;
        if (sinResp > prevSinRespRef.current) playDing();
        prevSinRespRef.current = sinResp;
        setLiveItems(nuevos);
      } catch { /* ignore */ }
    }, 15000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  const counts = useMemo(() => ({
    total: liveItems.length,
    sinResp: liveItems.filter((c) => c.sinResponder).length,
    calientes: liveItems.filter((c) => c.leadScore === "hot" || c.leadScore === "vip").length,
  }), [liveItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return liveItems.filter((c) => {
      if (filtro === "sin_responder" && !c.sinResponder) return false;
      if (filtro === "calientes" && c.leadScore !== "hot" && c.leadScore !== "vip") return false;
      if (filtro === "bot" && c.ultimoMensajeRole !== "assistant") return false;
      if (tagFiltro && !((c as any).tags ?? []).includes(tagFiltro)) return false;
      if (!q) return true;
      return [c.phone, c.nombre, c.ultimoMensajeTexto ?? ""]
        .join(" ").toLowerCase().includes(q);
    });
  }, [liveItems, search, filtro, tagFiltro]);

  const activeResumen = useMemo(
    () => liveItems.find((c) => c.phone === activePhone) ?? null,
    [liveItems, activePhone]
  );

  // ATAJOS DE TECLADO: J/K navegar, Enter abrir, Esc cerrar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // no interferir al escribir
      if (e.key === "Escape") { setActivePhone(null); return; }
      if (e.key !== "j" && e.key !== "k") return;
      e.preventDefault();
      const idx = filtered.findIndex((c) => c.phone === activePhone);
      if (e.key === "j") {
        const next = filtered[Math.min(idx + 1, filtered.length - 1)] ?? filtered[0];
        if (next) setActivePhone(next.phone);
      } else if (e.key === "k") {
        const prev = filtered[Math.max(idx - 1, 0)] ?? filtered[0];
        if (prev) setActivePhone(prev.phone);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, activePhone]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0b]">
      {/* BARRA SUPERIOR */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-zinc-800 bg-[#0d0d0f]">
        <a href="/crm/admin/bot" title="Volver al panel del bot" className="group flex items-center gap-2.5 pr-3 rounded-lg transition hover:opacity-80">
          <span className="w-8 h-8 rounded-lg bg-amber-400 grid place-items-center font-extrabold text-black text-lg shadow-[0_0_18px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform">C</span>
          <span className="hidden sm:block leading-tight">
            <span className="block text-sm font-bold text-zinc-100">El Coyote</span>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Bandeja de ventas</span>
          </span>
        </a>
        <div className="h-6 w-px bg-zinc-800" />
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{counts.total}</span> conversaciones
          {counts.sinResp > 0 && (
            <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{counts.sinResp} sin responder
            </span>
          )}
        </div>
        <div className="ml-auto text-[11px] text-zinc-600 hidden md:flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono">J</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono">K</kbd>
          navegar
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* COLUMNA 1: LISTA */}
        <aside className={`w-full sm:w-[340px] shrink-0 flex flex-col border-r border-zinc-800 bg-[#0d0d0f] ${activePhone ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 pb-3 border-b border-zinc-800/70">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, telefono o mensaje..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 transition"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Chip on={filtro === "todas"} onClick={() => setFiltro("todas")}>Todas <b>{counts.total}</b></Chip>
              <Chip on={filtro === "sin_responder"} onClick={() => setFiltro("sin_responder")} tone="red">Sin responder <b>{counts.sinResp}</b></Chip>
              <Chip on={filtro === "calientes"} onClick={() => setFiltro("calientes")} tone="amber">Calientes <b>{counts.calientes}</b></Chip>
              <Chip on={filtro === "bot"} onClick={() => setFiltro("bot")}>Bot</Chip>
            </div>
            {/* FILTRO POR ETIQUETA */}
            {Array.from(new Set(items.flatMap((c) => ((c as any).tags ?? []) as string[]))).length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1.5 scrollbar-none">
                {Array.from(new Set(items.flatMap((c) => ((c as any).tags ?? []) as string[]))).map((tg) => (
                  <button key={tg} onClick={() => setTagFiltro(tagFiltro === tg ? null : tg)}
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition ${tagFiltro === tg ? "bg-amber-400/20 border-amber-400/50 text-amber-300" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}>
                    <Tag className="w-2.5 h-2.5" />{tg}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">Sin resultados.</div>
            ) : (
              filtered.map((c, idx) => {
                const lead = c.leadScore ? LEAD[c.leadScore] : null;
                const isActive = c.phone === activePhone;
                return (
                  <motion.button
                    key={c.phone}
                    onClick={() => setActivePhone(c.phone)}
                    onMouseEnter={() => setHoverPhone(c.phone)}
                    onMouseLeave={() => setHoverPhone(null)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.3) }}
                    className={`group relative w-full text-left flex gap-3 px-3 py-3 rounded-xl mb-0.5 transition-colors ${isActive ? "bg-zinc-800/80" : "hover:bg-zinc-900"}`}
                  >
                    {isActive && <motion.span layoutId="activebar" className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />}
                    <div className={`relative w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${avatarColor(c.nombre || c.phone)} grid place-items-center font-bold text-base text-black/80`}>
                      {initial(c.nombre)}
                      <span className={`absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d0f] ${c.ultimoMensajeRole === "assistant" ? "bg-amber-400" : c.sinResponder ? "bg-red-500" : "bg-zinc-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-100 truncate">{c.nombre}</span>
                        <span className={`text-[11px] shrink-0 font-medium ${c.sinResponder ? "text-amber-400" : "text-zinc-500"}`}>{relTime(c.ultimoMensajeAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.ultimoMensajeRole === "user" && <span className="text-[11px] font-semibold text-red-400 shrink-0">Cliente:</span>}
                        {c.ultimoMensajeRole === "assistant" && <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        <span className={`text-xs truncate ${c.sinResponder ? "text-zinc-200" : "text-zinc-400"}`}>{cleanPreview(c.ultimoMensajeTexto) || "Sin mensajes"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lead && (
                          <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${lead.cls}`}>
                            <lead.Icon className="w-3 h-3" />{lead.label}
                          </span>
                        )}
                        {(c as any).plantillaSinRespuesta && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-orange-400/30 bg-orange-400/10 text-orange-300">
                            <Send className="w-3 h-3" />Plantilla
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </aside>

        {/* COLUMNA 2+3: CHAT + CONTEXTO */}
        {activePhone && activeResumen ? (
          <ChatPane key={activePhone} phone={activePhone} resumen={activeResumen} onBack={() => setActivePhone(null)} />
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center bg-[#0a0a0b]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">Selecciona una conversacion</p>
              <p className="text-zinc-600 text-sm mt-1">O usa <kbd className="px-1 rounded bg-zinc-800 text-[10px]">J</kbd> / <kbd className="px-1 rounded bg-zinc-800 text-[10px]">K</kbd> para navegar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CHAT PANE (centro + contexto). Se re-monta por key={phone}.
   ============================================================ */
function ChatPane({ phone, resumen, onBack }: {
  phone: string;
  resumen: ConversacionResumen;
  onBack: () => void;
}) {
  const [data, setData] = useState<DetalleDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [taking, setTaking] = useState(false);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(((resumen as any).tags as string[]) || []);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [atendido, setAtendido] = useState<boolean>(!!(resumen as any).atendido);
  const [nota, setNota] = useState("");
  const [notaSaving, setNotaSaving] = useState(false);
  const [notaSaved, setNotaSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/detail`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error || "Error al cargar");
      const d = await res.json();
      setData(d);
      // cargar nota interna
      fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/notas`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((j) => { if (j && typeof j.nota === "string") setNota(j.nota); })
        .catch(() => {});
      if (Array.isArray(d?.perfil?.tags)) setTags(d.perfil.tags);
      if (typeof d?.perfil?.atendido === "boolean") setAtendido(d.perfil.atendido);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  // POLLING DEL CHAT: cada 10s recarga; si hay mas mensajes del cliente -> ding
  const prevUserMsgsRef = useRef<number>(0);
  useEffect(() => {
    const id = setInterval(() => { load(); }, 10000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    const userMsgs = (data?.historial ?? []).filter((m) => m.role === "user").length;
    if (prevUserMsgsRef.current > 0 && userMsgs > prevUserMsgsRef.current) playDing();
    prevUserMsgsRef.current = userMsgs;
  }, [data?.historial]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [data?.historial?.length, loading]);

  // ATAJOS dentro del chat: R enfoca respuesta, E marca atendido
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "r") { e.preventDefault(); textRef.current?.focus(); }
      else if (e.key === "e") { e.preventDefault(); toggleAtendido(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendido]);

  async function takeOver(): Promise<boolean> {
    setTaking(true);
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/take-over`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error al tomar control");
      await load();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setTaking(false);
    }
  }

  async function release() {
    if (!confirm("Liberar control y reanudar el bot? Se le avisara al cliente.")) return;
    setTaking(true);
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/release`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error al liberar");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setTaking(false);
    }
  }

  // ACCION RAPIDA: marcar atendido (toggle)
  async function toggleAtendido() {
    const nuevo = !atendido;
    setAtendido(nuevo); // optimista
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/atendido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atendido: nuevo }),
      });
      if (!res.ok) throw new Error("No se pudo marcar atendido");
    } catch (e) {
      setAtendido(!nuevo); // revertir
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  // ACCION RAPIDA: etiquetar (add/remove)
  async function toggleTag(tag: string) {
    const has = tags.includes(tag);
    const action = has ? "remove" : "add";
    const optimista = has ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(optimista);
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, action }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la etiqueta");
    } catch (e) {
      setTags(tags); // revertir
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function insertQuickReply(t: string) {
    setText((prev) => (prev ? prev + " " + t : t));
    textRef.current?.focus();
  }

  function generarCotizacion() {
    const tela = cotizTela.trim();
    const kilos = parseFloat(cotizKilos);
    const precio = parseFloat(cotizPrecio);
    if (!tela || !kilos || !precio || kilos <= 0 || precio <= 0) return;
    const total = kilos * precio;
    const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const texto = `Cotizacion: ${tela}\n${kilos} kg x $${fmt(precio)}/kg = $${fmt(total)} total\nPrecios sujetos a disponibilidad. Le interesa?`;
    setText((prev) => (prev ? prev + "\n" + texto : texto));
    setCotizOpen(false);
    setCotizTela(""); setCotizKilos(""); setCotizPrecio("");
    textRef.current?.focus();
  }

  async function guardarNota() {
    setNotaSaving(true);
    setNotaSaved(false);
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la nota");
      setNotaSaved(true);
      setTimeout(() => setNotaSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setNotaSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mediaType = detectMediaType(file.type);
    const limitMB = SIZE_LIMITS_MB[mediaType];
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > limitMB) {
      setErr(`Archivo muy grande (${sizeMB.toFixed(1)} MB). Limite ${mediaType}: ${limitMB} MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const signRes = await fetch("/api/admin/bot/upload-media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "No se pudo firmar la subida");
      const mimeType = file.type || "application/octet-stream";
      const { error: upErr } = await supabase.storage
        .from("whatsapp_media")
        .uploadToSignedUrl(signData.path, signData.token, file, { contentType: mimeType });
      if (upErr) throw new Error(`Error subiendo: ${upErr.message}`);
      setMedia({ mediaUrl: signData.publicUrl, mediaType, filename: file.name, mimeType, size: file.size });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeMedia() { setMedia(null); }

  async function send() {
    const t = text.trim();
    if ((!t && !media) || sending || uploading) return;
    setSending(true);
    setErr(null);

    if (data && !data.paused) {
      const ok = await takeOver();
      if (!ok) { setSending(false); return; }
    }

    const optimisticContent = media
      ? `${media.mediaType === "image" ? "[img]" : media.mediaType === "video" ? "[video]" : media.mediaType === "audio" ? "[audio]" : "[doc]"} ${media.filename}${t ? `\n${t}` : ""}`
      : t;
    const optimistic: MensajeHistorial = {
      role: "assistant", content: optimisticContent, timestamp: new Date().toISOString(), status: "sent",
      mediaUrl: media?.mediaUrl, mediaType: media?.mediaType,
    };
    setData((d) => d ? { ...d, historial: [...d.historial, optimistic] } : d);

    const body: any = {};
    if (media) {
      body.mediaUrl = media.mediaUrl;
      body.mediaType = media.mediaType;
      body.filename = media.filename;
      if (t) body.caption = t;
    } else {
      body.text = t;
    }
    setText("");
    setMedia(null);

    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al enviar");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      await load();
    } finally {
      setSending(false);
    }
  }

  const lead = resumen.leadScore ? LEAD[resumen.leadScore] : null;
  const paused = data?.paused ?? false;
  const mensajes = mergeHistorialMedia(data?.historial ?? [], data?.media ?? []);
  // BUSQUEDA dentro del chat
  const [chatSearch, setChatSearch] = useState("");
  const [cotizOpen, setCotizOpen] = useState(false);
  const [cotizTela, setCotizTela] = useState("");
  const [cotizKilos, setCotizKilos] = useState("");
  const [cotizPrecio, setCotizPrecio] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const mensajesFiltrados = chatSearch.trim()
    ? mensajes.filter((m) => (m.content || "").toLowerCase().includes(chatSearch.trim().toLowerCase()))
    : mensajes;

  return (
    <>
      {/* ===== CENTRO: CHAT ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b] relative">
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        {/* HEADER con acciones rapidas */}
        <header className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-zinc-800/70 bg-[#0d0d0f]/70 backdrop-blur-md">
          <button onClick={onBack} className="sm:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100"><ArrowLeft className="w-5 h-5" /></button>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(resumen.nombre || phone)} grid place-items-center font-bold text-black/80`}>{initial(resumen.nombre)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-100 truncate">{resumen.nombre}</h2>
              {lead && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${lead.cls}`}><lead.Icon className="w-3 h-3" />{lead.label}</span>}
              {atendido && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"><CheckCircle2 className="w-3 h-3" />Atendido</span>}
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="font-mono">{phone}</span>
              <span className="text-zinc-700">-</span>
              {paused
                ? <span className="text-amber-400 font-medium flex items-center gap-1"><Hand className="w-3 h-3" />Tu al control</span>
                : <span className="text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />El Coyote atendiendo</span>}
            </p>
          </div>
          {/* Botones de accion rapida */}
          <div className="flex items-center gap-1.5">
            <button onClick={toggleAtendido} title="Marcar como atendido (E)"
              className={`w-9 h-9 rounded-lg grid place-items-center transition ${atendido ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "border border-zinc-800 text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900"}`}>
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setTagMenuOpen((v) => !v)} title="Etiquetar"
                className={`w-9 h-9 rounded-lg grid place-items-center transition ${tags.length > 0 ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "border border-zinc-800 text-zinc-400 hover:text-amber-300 hover:bg-zinc-900"}`}>
                <Tag className="w-4 h-4" />
              </button>
              {tagMenuOpen && (
                <div className="absolute right-0 top-11 z-30 w-44 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">Etiquetas</p>
                  {ETIQUETAS.map((tg) => (
                    <button key={tg} onClick={() => toggleTag(tg)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-zinc-200 hover:bg-zinc-800 transition">
                      <span>{tg}</span>
                      {tags.includes(tg) && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {paused
              ? <button onClick={release} disabled={taking} title="Devolver al bot" className="px-3 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition disabled:opacity-50"><Bot className="w-3.5 h-3.5" />Al bot</button>
              : <button onClick={takeOver} disabled={taking} title="Tomar control" className="px-3 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-xs font-bold text-black flex items-center gap-1.5 transition disabled:opacity-50 shadow-[0_0_18px_rgba(251,191,36,0.25)]"><Hand className="w-3.5 h-3.5" />{taking ? "..." : "Control"}</button>}
            <button onClick={() => setSearchOpen((v) => !v)} title="Buscar en la conversacion" className={`w-9 h-9 rounded-lg grid place-items-center transition ${searchOpen ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "border border-zinc-800 text-zinc-400 hover:text-amber-300 hover:bg-zinc-900"}`}><Search className="w-4 h-4" /></button>
            <a href={`tel:${phone}`} className="w-9 h-9 rounded-lg border border-zinc-800 grid place-items-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"><Phone className="w-4 h-4" /></a>
          </div>
        </header>

        {/* BARRA DE BUSQUEDA EN EL CHAT */}
        {searchOpen && (
          <div className="relative z-10 px-4 py-2 border-b border-zinc-800/70 bg-[#0d0d0f]/90 backdrop-blur-md flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Buscar en esta conversacion..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {chatSearch && <span className="text-[11px] text-zinc-500 shrink-0">{mensajesFiltrados.length} result.</span>}
            <button onClick={() => { setChatSearch(""); setSearchOpen(false); }} className="w-7 h-7 rounded-lg grid place-items-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* STREAM */}
        <div ref={streamRef} className="relative z-[1] flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-1 scrollbar-thin">
          {loading ? (
            <div className="m-auto text-zinc-600 text-sm flex items-center gap-2"><span className="w-4 h-4 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />Cargando conversacion...</div>
          ) : (
            <>
              {data?.resumen && (
                <div className="self-center max-w-md text-center text-[11px] text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2 mb-2">
                  <Sparkles className="w-3 h-3 inline mr-1 text-amber-400" />{data.resumen}
                </div>
              )}
              <AnimatePresence initial={false}>
                {mensajesFiltrados.length === 0 && chatSearch.trim() ? (
                  <div className="self-center text-zinc-600 text-xs py-4">Sin mensajes que coincidan con &quot;{chatSearch}&quot;</div>
                ) : (
                  mensajesFiltrados.map((m, i) => <Bubble key={i} m={m} idx={i} />)
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* COMPOSER */}
        <div className="relative z-10 px-4 pt-3 pb-4 border-t border-zinc-800/70 bg-[#0d0d0f]/75 backdrop-blur-md">
          {!paused && (
            <div className="flex items-center gap-2 mb-2.5 px-1 text-[11px] text-amber-400/90">
              <Bot className="w-3.5 h-3.5" />
              <span>El Coyote esta atendiendo - al enviar tomas el control automaticamente.</span>
            </div>
          )}
          {paused && data?.pauseState && (
            <div className="flex items-center gap-2 mb-2.5 px-1 text-[11px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Control tomado por <b className="text-zinc-400">{data.pauseState.pausedBy}</b> - el bot regresa en <b className="text-zinc-400">{fmtTTL(data.ttlSeconds)}</b>
            </div>
          )}

          {/* PANEL COTIZADOR */}
          {cotizOpen && (
            <div className="mb-2 p-3 rounded-xl bg-zinc-900 border border-amber-400/30 space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold">
                <DollarSign className="w-3.5 h-3.5" />Cotizacion rapida
              </div>
              <input value={cotizTela} onChange={(e) => setCotizTela(e.target.value)} placeholder="Tela (ej. Micro pique)"
                className="w-full h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40" />
              <div className="flex gap-2">
                <input value={cotizKilos} onChange={(e) => setCotizKilos(e.target.value)} type="number" min="0" placeholder="Kilos"
                  className="flex-1 h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40" />
                <input value={cotizPrecio} onChange={(e) => setCotizPrecio(e.target.value)} type="number" min="0" placeholder="$ por kg"
                  className="flex-1 h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
              {cotizKilos && cotizPrecio && parseFloat(cotizKilos) > 0 && parseFloat(cotizPrecio) > 0 && (
                <p className="text-[11px] text-zinc-400">Total: <b className="text-amber-300">${(parseFloat(cotizKilos) * parseFloat(cotizPrecio)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
              )}
              <button onClick={generarCotizacion} disabled={!cotizTela.trim() || !cotizKilos || !cotizPrecio}
                className="w-full h-8 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black text-xs font-bold transition">
                Generar y poner en el mensaje
              </button>
            </div>
          )}

          {/* CHIPS de respuesta rapida */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none">
              <button onClick={() => setCotizOpen((v) => !v)} title="Cotizacion rapida"
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition ${cotizOpen ? "bg-amber-400/20 border-amber-400/50 text-amber-300" : "border-amber-400/30 bg-amber-400/5 text-amber-300/90 hover:bg-amber-400/15"}`}>
                <DollarSign className="w-3 h-3" />Cotizacion
              </button>
            {QUICK_REPLIES.map((qr) => (
              <button key={qr.label} onClick={() => insertQuickReply(qr.text)}
                title={qr.text}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-amber-400/40 hover:text-amber-300 transition whitespace-nowrap">
                <Zap className="w-3 h-3" />{qr.label}
              </button>
            ))}
          </div>

          {/* preview de media adjunta */}
          {media && (
            <div className="flex items-center gap-3 mb-2.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              {media.mediaType === "image" ? (
                <img src={media.mediaUrl} alt={media.filename} className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-800 grid place-items-center text-zinc-400"><FileText className="w-5 h-5" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{media.filename}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{media.mediaType} - {(media.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={removeMedia} disabled={sending} className="w-7 h-7 rounded-lg grid place-items-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition" title="Quitar"><X className="w-4 h-4" /></button>
            </div>
          )}
          <input ref={fileInputRef} type="file"
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            onChange={handleFileSelect} disabled={sending || uploading} className="hidden" />
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl pl-3 pr-2 py-2 focus-within:border-amber-400/50 focus-within:ring-2 focus-within:ring-amber-400/10 transition">
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => { setText(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={media ? "Caption opcional para el archivo..." : "Escribe un mensaje..."}
              className="flex-1 bg-transparent resize-none text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none py-1.5 max-h-[120px]"
            />
            <button onClick={() => fileInputRef.current?.click()} disabled={sending || uploading} title="Adjuntar" className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition disabled:opacity-40">
              {uploading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Paperclip className="w-[18px] h-[18px]" />}
            </button>
            <button onClick={send} disabled={sending || uploading || (!text.trim() && !media)} className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black grid place-items-center transition shadow-[0_0_18px_rgba(251,191,36,0.25)] disabled:shadow-none active:scale-95">
              <Send className="w-[18px] h-[18px]" />
            </button>
          </div>
          {uploading && <p className="text-[11px] text-amber-400/80 mt-2 px-1 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Subiendo archivo...</p>}
          {err && <p className="text-[11px] text-red-400 mt-2 px-1 flex items-center gap-1"><X className="w-3 h-3" />{err}</p>}
        </div>
      </main>

      {/* ===== COLUMNA 3: CONTEXTO ===== */}
      <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-zinc-800 bg-[#0d0d0f] overflow-y-auto scrollbar-thin">
        <div className="p-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(resumen.nombre || phone)} grid place-items-center font-bold text-2xl text-black/80 mx-auto`}>{initial(resumen.nombre)}</div>
          <h3 className="text-center text-base font-bold text-zinc-100 mt-3">{resumen.nombre}</h3>
          <p className="text-center text-xs text-zinc-500 mt-0.5 capitalize">{resumen.segmento} - {resumen.totalCompras} compra{resumen.totalCompras !== 1 ? "s" : ""}</p>

          {/* TAGS del cliente */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {tags.map((tg) => (
                <span key={tg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  <Tag className="w-2.5 h-2.5" />{tg}
                  <button onClick={() => toggleTag(tg)} className="ml-0.5 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}

          {/* NOTAS INTERNAS (privadas, no se envian al cliente) */}
          <div className="mt-4">
            <SecTitle>Notas internas</SecTitle>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={guardarNota}
              placeholder="Apuntes privados sobre este cliente..."
              rows={3}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 p-2 resize-none focus:outline-none focus:border-amber-400/40 transition"
            />
            <div className="flex items-center justify-between mt-1 h-4">
              <span className="text-[10px] text-zinc-600">Solo tu las ves</span>
              {notaSaving ? <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Guardando</span>
                : notaSaved ? <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="w-2.5 h-2.5" />Guardada</span>
                : null}
            </div>
          </div>

          <Scoring label="Temperatura de compra" value={data?.perfil?.temperaturaCompra ?? resumen.temperaturaCompra ?? 0} Icon={TrendingUp} />
          <Scoring label="Nivel de confianza" value={data?.perfil?.nivelConfianza ?? resumen.nivelConfianza ?? 0} Icon={ShieldCheck} />

          {(data?.perfil?.tacticaActual || resumen.tacticaActual) && (
            <div className="mt-4">
              <SecTitle>Tactica activa</SecTitle>
              <p className="text-sm text-zinc-200 capitalize">{(data?.perfil?.tacticaActual || resumen.tacticaActual).replace(/_/g, " ")}</p>
            </div>
          )}

          {data?.topObjeciones && data.topObjeciones.length > 0 && (
            <div className="mt-4">
              <SecTitle>Objeciones detectadas</SecTitle>
              {data.topObjeciones.slice(0, 5).map((o, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/60 last:border-0">
                  <span className="text-xs text-zinc-300">{o.label}</span>
                  <span className="text-[11px] text-amber-400 font-medium">{o.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}

          {data?.pedidos && data.pedidos.length > 0 && (
            <div className="mt-4">
              <SecTitle><Package className="w-3 h-3 inline mr-1" />Pedidos ({data.pedidos.length})</SecTitle>
              {data.pedidos.slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="rounded-lg border border-zinc-800 p-2 mb-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-200">${(p.total ?? 0).toLocaleString("es-MX")}</span>
                    <span className="text-zinc-500">{relTime(p.fecha)}</span>
                  </div>
                  {p.metodo && <p className="text-[11px] text-zinc-500 mt-0.5">{p.metodo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   SUBCOMPONENTES
   ============================================================ */
function Bubble({ m, idx }: { m: MensajeHistorial; idx: number }) {
  if (m.role === "tool") {
    return (
      <div className="self-center max-w-[70%] text-[11px] text-zinc-500 bg-zinc-900/70 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono my-1">
        {m.content?.slice(0, 160)}
      </div>
    );
  }
  const isUser = m.role === "user";
  const proxySrc = m.mediaNativeId ? `/api/admin/bot/media/${m.mediaNativeId}` : null;
  const isImg = m.mediaTipo === "image" || (m.mediaType === "image" && !!m.mediaUrl);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.01, 0.2) }}
      className={`flex flex-col max-w-[76%] ${isUser ? "self-start items-start" : "self-end items-end"}`}
    >
      {(proxySrc || m.mediaUrl) && isImg && (
        <a href={proxySrc || m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
          <img src={proxySrc || m.mediaUrl} alt={m.content || "imagen"} className="rounded-2xl max-w-[240px] max-h-[320px] object-cover border border-zinc-700/50" loading="lazy" />
        </a>
      )}
      {proxySrc && !isImg && (
        <a href={proxySrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-1 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700/50 text-zinc-200 text-sm hover:bg-zinc-700 transition">
          <FileText className="w-4 h-4" />
          {m.mediaTipo === "audio" ? "Audio" : m.mediaTipo === "video" ? "Video" : "Documento"} del cliente
        </a>
      )}
      {(m.content || (!proxySrc && !m.mediaUrl)) && (
        <div className={`px-3.5 py-2 text-sm leading-relaxed rounded-2xl whitespace-pre-line break-words ${isUser ? "bg-zinc-800 text-zinc-100 rounded-bl-md border border-zinc-700/50" : "bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 rounded-br-md font-medium"}`}>
          {m.content}
        </div>
      )}
      <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-zinc-500">
        {!isUser && <span className="text-amber-400/80 font-medium">El Coyote</span>}
        {!isUser && <span>-</span>}
        <span>{fmtTime(m.timestamp)}</span>
        {!isUser && (m.status === "sent" ? <CheckCheck className="w-3.5 h-3.5 text-sky-400" /> : <Check className="w-3.5 h-3.5" />)}
      </div>
    </motion.div>
  );
}

function Scoring({ label, value, Icon }: { label: string; value: number; Icon: typeof TrendingUp }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</span>
        <span className="text-xs font-bold text-amber-400">{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-red-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
      </div>
    </div>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">{children}</p>;
}

function Chip({ children, on, onClick, tone = "default" }: {
  children: React.ReactNode; on: boolean; onClick: () => void; tone?: "default" | "red" | "amber";
}) {
  const active = tone === "red" ? "bg-red-500 border-red-500 text-white"
    : tone === "amber" ? "bg-amber-400 border-amber-400 text-black"
    : "bg-amber-400 border-amber-400 text-black";
  return (
    <button onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition ${on ? active : "bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"} [&>b]:opacity-70 [&>b]:font-bold`}>
      {children}
    </button>
  );
}
