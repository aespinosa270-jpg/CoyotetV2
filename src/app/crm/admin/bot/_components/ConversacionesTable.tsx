"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Paperclip, Phone, MoreVertical, Hand,
  Unlock, Bot, Flame, Snowflake, Gem, DollarSign, Eye,
  Check, CheckCheck, ArrowLeft, MessageSquare, Sparkles,
  TrendingUp, ShieldCheck, Package, X, FileText, Loader2,
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
   Tipos del payload del endpoint /detail (espejo del repo)
   ============================================================ */
interface MensajeHistorial {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp?: string;
  waId?: string;
  status?: string;
  mediaUrl?: string;
  mediaType?: string;
  // FIX MEDIA: para imagenes que el cliente envio (se sirven via proxy)
  mediaNativeId?: string;
  mediaTipo?: "image" | "audio" | "video" | "document";
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
interface MediaItemDTO {
  messageId: string;
  nativeId: string;
  tipo: "image" | "audio" | "video" | "document";
  mimeType?: string;
  caption?: string;
  timestamp: string;
}

interface Props {
  items: ConversacionResumen[];
}

/* ============================================================
   Lead badges (sin mojibake, iconos lucide)
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
    return new Date(iso).toLocaleString("es-MX", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}
function fmtTTL(seconds: number): string {
  if (seconds <= 0) return "0min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
/**
 * Quita surrogates huerfanos (mitades de emoji) que pueden venir de un
 * substring mal cortado en el backend. Es una transformacion pura y
 * determinista -> identica en server y cliente, asi el hydration cuadra.
 */
function cleanPreview(s?: string): string {
  if (!s) return "";
  // Elimina high-surrogate sin low-surrogate y low-surrogate sin high-surrogate
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

type Filtro = "todas" | "sin_responder" | "calientes" | "bot";

/**
 * Fusiona el historial de texto con la media que el cliente envio (v2:media),
 * ordenando todo por timestamp. Cada media del cliente se convierte en un
 * "mensaje" role=user con su nativeId, para que la Bubble pinte la imagen
 * via el proxy /api/admin/bot/media/{nativeId}.
 */
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
    const sa = Number.isNaN(ta) ? 0 : ta;
    const sb = Number.isNaN(tb) ? 0 : tb;
    return sa - sb;
  });
  return merged;
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export function ConversacionesTable({ items }: Props) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [activePhone, setActivePhone] = useState<string | null>(null);

  const counts = useMemo(() => ({
    total: items.length,
    sinResp: items.filter((c) => c.sinResponder).length,
    calientes: items.filter((c) => c.leadScore === "hot" || c.leadScore === "vip").length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filtro === "sin_responder" && !c.sinResponder) return false;
      if (filtro === "calientes" && c.leadScore !== "hot" && c.leadScore !== "vip") return false;
      if (filtro === "bot" && c.ultimoMensajeRole !== "assistant") return false;
      if (!q) return true;
      return [c.phone, c.nombre, c.ultimoMensajeTexto ?? ""]
        .join(" ").toLowerCase().includes(q);
    });
  }, [items, search, filtro]);

  const activeResumen = useMemo(
    () => items.find((c) => c.phone === activePhone) ?? null,
    [items, activePhone]
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0b]">
      {/* ---------- BARRA SUPERIOR INMERSIVA ---------- */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-zinc-800 bg-[#0d0d0f]">
        <a
          href="/crm/admin/bot"
          title="Volver al panel del bot"
          className="group flex items-center gap-2.5 pr-3 rounded-lg transition hover:opacity-80"
        >
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
        <div className="ml-auto text-[11px] text-zinc-600 hidden md:block">
          Clic en el logo para volver al panel
        </div>
      </header>

      {/* ---------- CUERPO: 3 COLUMNAS ---------- */}
      <div className="flex-1 flex min-h-0">

      {/* ---------- COLUMNA 1: LISTA ---------- */}
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.3) }}
                  className={`group relative w-full text-left flex gap-3 px-3 py-3 rounded-xl mb-0.5 transition-colors ${
                    isActive ? "bg-zinc-800/80" : "hover:bg-zinc-900"
                  }`}
                >
                  {isActive && (
                    <motion.span layoutId="activebar" className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                  )}
                  <div className={`relative w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${avatarColor(c.nombre || c.phone)} grid place-items-center font-bold text-base text-black/80`}>
                    {initial(c.nombre)}
                    <span className={`absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d0f] ${
                      c.ultimoMensajeRole === "assistant" ? "bg-amber-400" : c.sinResponder ? "bg-red-500" : "bg-zinc-600"
                    }`} />
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
                    {lead && (
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${lead.cls}`}>
                        <lead.Icon className="w-3 h-3" />{lead.label}
                      </span>
                    )}
                    {(c as any).plantillaSinRespuesta && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-orange-400/30 bg-orange-400/10 text-orange-300">
                        <Send className="w-3 h-3" />Plantilla · sin respuesta
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </aside>

      {/* ---------- COLUMNA 2+3: CHAT + CONTEXTO ---------- */}
      {activePhone && activeResumen ? (
        <ChatPane
          key={activePhone}
          phone={activePhone}
          resumen={activeResumen}
          onBack={() => setActivePhone(null)}
        />
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center bg-[#0a0a0b]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">Selecciona una conversacion</p>
            <p className="text-zinc-600 text-sm mt-1">Elige un cliente de la lista para ver el chat</p>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/detail`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error || "Error al cargar");
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [data?.historial?.length, loading]);

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

    // Si el bot esta activo, tomamos control primero (composer con aviso)
    if (data && !data.paused) {
      const ok = await takeOver();
      if (!ok) { setSending(false); return; }
    }

    // Optimistic UI
    const optimisticContent = media
      ? `${media.mediaType === "image" ? "📸" : media.mediaType === "video" ? "🎥" : media.mediaType === "audio" ? "🎙️" : "📎"} ${media.filename}${t ? `\n${t}` : ""}`
      : t;
    const optimistic: MensajeHistorial = {
      role: "assistant", content: optimisticContent, timestamp: new Date().toISOString(), status: "sent",
    };
    setData((d) => d ? { ...d, historial: [...d.historial, optimistic] } : d);

    // Construir body: media usa {mediaUrl,...}, texto usa {text}
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
      await load(); // re-sync, quita el optimista si fallo
    } finally {
      setSending(false);
    }
  }

  const lead = resumen.leadScore ? LEAD[resumen.leadScore] : null;
  const paused = data?.paused ?? false;

  return (
    <>
      {/* ===== CENTRO: CHAT ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b] relative">
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        {/* header */}
        <header className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-zinc-800/70 bg-[#0d0d0f]/70 backdrop-blur-md">
          <button onClick={onBack} className="sm:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100"><ArrowLeft className="w-5 h-5" /></button>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(resumen.nombre || phone)} grid place-items-center font-bold text-black/80`}>{initial(resumen.nombre)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-100 truncate">{resumen.nombre}</h2>
              {lead && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${lead.cls}`}><lead.Icon className="w-3 h-3" />{lead.label}</span>}
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="font-mono">{phone}</span>
              <span className="text-zinc-700">·</span>
              {paused
                ? <span className="text-amber-400 font-medium flex items-center gap-1"><Hand className="w-3 h-3" />Control humano</span>
                : <span className="text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />El Coyote atendiendo</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {paused
              ? <button onClick={release} disabled={taking} className="px-3 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition disabled:opacity-50"><Unlock className="w-3.5 h-3.5" />Liberar</button>
              : <button onClick={takeOver} disabled={taking} className="px-3 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-xs font-bold text-black flex items-center gap-1.5 transition disabled:opacity-50 shadow-[0_0_18px_rgba(251,191,36,0.25)]"><Hand className="w-3.5 h-3.5" />{taking ? "..." : "Tomar control"}</button>}
            <a href={`tel:${phone}`} className="w-9 h-9 rounded-lg border border-zinc-800 grid place-items-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"><Phone className="w-4 h-4" /></a>
          </div>
        </header>

        {/* stream */}
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
                {mergeHistorialMedia(data?.historial ?? [], data?.media ?? []).map((m, i) => <Bubble key={i} m={m} idx={i} />)}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* composer */}
        <div className="relative z-10 px-4 pt-3 pb-4 border-t border-zinc-800/70 bg-[#0d0d0f]/75 backdrop-blur-md">
          {!paused && (
            <div className="flex items-center gap-2 mb-2.5 px-1 text-[11px] text-amber-400/90">
              <Bot className="w-3.5 h-3.5" />
              <span>El Coyote esta atendiendo — al enviar tomas el control automaticamente.</span>
            </div>
          )}
          {paused && data?.pauseState && (
            <div className="flex items-center gap-2 mb-2.5 px-1 text-[11px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Control tomado por <b className="text-zinc-400">{data.pauseState.pausedBy}</b> · el bot regresa en <b className="text-zinc-400">{fmtTTL(data.ttlSeconds)}</b>
            </div>
          )}
          {/* preview de media adjunta */}
          {media && (
            <div className="flex items-center gap-3 mb-2.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              {media.mediaType === "image" ? (
                <img src={media.mediaUrl} alt={media.filename} className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-800 grid place-items-center text-zinc-400">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{media.filename}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{media.mediaType} · {(media.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={removeMedia} disabled={sending} className="w-7 h-7 rounded-lg grid place-items-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition" title="Quitar">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            onChange={handleFileSelect}
            disabled={sending || uploading}
            className="hidden"
          />
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl pl-3 pr-2 py-2 focus-within:border-amber-400/50 focus-within:ring-2 focus-within:ring-amber-400/10 transition">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={media ? "Caption opcional para el archivo..." : "Escribe un mensaje..."}
              className="flex-1 bg-transparent resize-none text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none py-1.5 max-h-[120px]"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              title="Adjuntar imagen, PDF, video o audio"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition disabled:opacity-40"
            >
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
          <p className="text-center text-xs text-zinc-500 mt-0.5 capitalize">{resumen.segmento} · {resumen.totalCompras} compra{resumen.totalCompras !== 1 ? "s" : ""}</p>

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
  // FIX MEDIA: imagen que el cliente envio (via proxy de Meta)
  const proxySrc = m.mediaNativeId ? `/api/admin/bot/media/${m.mediaNativeId}` : null;
  const isImg = m.mediaTipo === "image" || (m.mediaType === "image" && m.mediaUrl);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.01, 0.2) }}
      className={`flex flex-col max-w-[76%] ${isUser ? "self-start items-start" : "self-end items-end"}`}
    >
      {/* Imagen del cliente (proxy) o imagen saliente (mediaUrl) */}
      {(proxySrc || m.mediaUrl) && isImg && (
        <a href={proxySrc || m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
          <img
            src={proxySrc || m.mediaUrl}
            alt={m.content || "imagen"}
            className="rounded-2xl max-w-[240px] max-h-[320px] object-cover border border-zinc-700/50"
            loading="lazy"
          />
        </a>
      )}
      {/* Media no-imagen del cliente: enlace de descarga */}
      {proxySrc && !isImg && (
        <a href={proxySrc} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 mb-1 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700/50 text-zinc-200 text-sm hover:bg-zinc-700 transition">
          <FileText className="w-4 h-4" />
          {m.mediaTipo === "audio" ? "Audio" : m.mediaTipo === "video" ? "Video" : "Documento"} del cliente
        </a>
      )}
      {(m.content || (!proxySrc && !m.mediaUrl)) && (
      <div className={`px-3.5 py-2 text-sm leading-relaxed rounded-2xl whitespace-pre-line break-words ${
        isUser
          ? "bg-zinc-800 text-zinc-100 rounded-bl-md border border-zinc-700/50"
          : "bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 rounded-br-md font-medium"
      }`}>
        {m.content}
      </div>
      )}
      <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-zinc-500">
        {!isUser && <span className="text-amber-400/80 font-medium">El Coyote</span>}
        {!isUser && <span>·</span>}
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
        <span className="text-xs font-bold text-amber-400">{pct}°</span>
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
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition ${
        on ? active : "bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
      } [&>b]:opacity-70 [&>b]:font-bold`}>
      {children}
    </button>
  );
}
