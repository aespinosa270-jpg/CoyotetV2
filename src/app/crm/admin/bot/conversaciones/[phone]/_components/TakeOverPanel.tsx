/**
 * TakeOverPanel — UI para control humano de la conversación.
 *
 * Soporta envío de imágenes, documentos, videos y audios.
 *
 * Flujo:
 *  1. Click Adjuntar → file picker
 *  2. Upload directo a Supabase (signed URL) → URL pública
 *  3. Preview + caption opcional
 *  4. Click Enviar → POST /conversaciones/[phone]/send con mediaUrl
 *  5. Cliente recibe en WhatsApp
 */
"use client";
import { supabase } from "@/lib/supabase";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PauseState {
  pausedAt: string;
  pausedBy: string;
  lastAgentMessageAt: string;
}

interface Props {
  phone: string;
  initialPaused: boolean;
  initialState: PauseState | null;
  initialTTLSeconds: number;
}

type MediaType = "image" | "document" | "video" | "audio";

interface UploadedMedia {
  mediaUrl: string;
  mediaType: MediaType;
  filename: string;
  mimeType: string;
  size: number;
}

const SIZE_LIMITS_MB: Record<MediaType, number> = {
  image: 5,
  document: 100,
  video: 16,
  audio: 16,
};

export default function TakeOverPanel({
  phone,
  initialPaused,
  initialState,
  initialTTLSeconds,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paused, setPaused] = useState(initialPaused);
  const [state, setState] = useState<PauseState | null>(initialState);
  const [ttlSeconds, setTtlSeconds] = useState(initialTTLSeconds);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!paused || ttlSeconds <= 0) return;
    const interval = setInterval(() => {
      setTtlSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, ttlSeconds]);

  async function handleTakeOver() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/take-over`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al tomar control");
      setPaused(true);
      setState(data.state);
      setTtlSeconds(60 * 60 * 23);
      setSuccess("Control tomado. Cliente notificado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (busy) return;
    if (!confirm("¿Liberar control y reanudar el bot? Se le avisará al cliente.")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/release`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al liberar control");
      setPaused(false);
      setState(null);
      setTtlSeconds(0);
      setMedia(null);
      setText("");
      setSuccess("Bot reanudado. Cliente notificado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function detectMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType = detectMediaType(file.type);
    const limitMB = SIZE_LIMITS_MB[mediaType];
    const sizeMB = file.size / 1024 / 1024;

    if (sizeMB > limitMB) {
      setError(
        `Archivo muy grande (${sizeMB.toFixed(2)} MB). Límite para ${mediaType}: ${limitMB} MB`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      // 1) Pedir URL firmada al backend (request chiquito, sin el archivo)
      const signRes = await fetch("/api/admin/bot/upload-media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "No se pudo firmar la subida");

      // 2) Subir el archivo DIRECTO a Supabase con la URL firmada
      const mimeType = file.type || "application/octet-stream";
      const { error: upErr } = await supabase.storage
        .from("whatsapp_media")
        .uploadToSignedUrl(signData.path, signData.token, file, {
          contentType: mimeType,
        });
      if (upErr) throw new Error(`Error subiendo: ${upErr.message}`);

      setMedia({
        mediaUrl: signData.publicUrl,
        mediaType,
        filename: file.name,
        mimeType,
        size: file.size,
      });
      setSuccess(`✅ Archivo subido (${(file.size / 1024 / 1024).toFixed(2)} MB). Agregue caption o envíe.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveMedia() {
    setMedia(null);
    setSuccess(null);
  }

  async function handleSend() {
    if (busy || uploading) return;
    if (!text.trim() && !media) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const body: any = {};
      if (media) {
        body.mediaUrl = media.mediaUrl;
        body.mediaType = media.mediaType;
        body.filename = media.filename;
        if (text.trim()) body.caption = text.trim();
      } else {
        body.text = text.trim();
      }

      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar mensaje");

      setText("");
      setMedia(null);
      setTtlSeconds(60 * 60 * 23);
      setSuccess(media ? "📎 Archivo enviado al cliente." : "Mensaje enviado al cliente.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function getMediaIcon(t: MediaType): string {
    if (t === "image") return "🖼️";
    if (t === "video") return "🎥";
    if (t === "audio") return "🎙️";
    return "📄";
  }

  // ── RENDER: Bot activo (no pausado) ──
  if (!paused) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <div>
              <p className="text-xs uppercase text-slate-500 tracking-wide font-semibold">
                Control de la conversación
              </p>
              <p className="text-sm text-slate-700 font-medium">
                🤖 Bot atendiendo automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={handleTakeOver}
            disabled={busy}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg shadow transition"
          >
            {busy ? "..." : "✋ Tomar control"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        {success && <p className="text-xs text-emerald-600 mt-2">{success}</p>}
      </div>
    );
  }

  // ── RENDER: Bot pausado (control humano) ──
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase text-amber-700 tracking-wide font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse inline-block" />
            🟡 Tú tienes el control · Bot en pausa
          </p>
          {state && (
            <p className="text-xs text-amber-900 mt-1">
              Tomado por <strong>{state.pausedBy}</strong> el{" "}
              {new Date(state.pausedAt).toLocaleString("es-MX", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <p className="text-xs text-amber-700 mt-0.5">
            El bot regresa automáticamente en <strong>{formatTTL(ttlSeconds)}</strong>
          </p>
        </div>
        <button
          onClick={handleRelease}
          disabled={busy}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow transition"
        >
          🔓 Liberar control
        </button>
      </div>

      {/* Form de envío */}
      <div className="bg-white border border-amber-300 rounded-lg p-3 space-y-2">
        <p className="text-xs text-slate-600 font-medium">
          Responder como asesor (se envía con el número del bot):
        </p>

        {/* Media preview */}
        {media && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {media.mediaType === "image" ? (
                <img
                  src={media.mediaUrl}
                  alt={media.filename}
                  className="w-12 h-12 object-cover rounded border border-slate-200"
                />
              ) : (
                <span className="text-2xl">{getMediaIcon(media.mediaType)}</span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate">
                  {media.filename}
                </span>
                <span className="text-xs text-slate-500">
                  {media.mediaType.toUpperCase()} · {(media.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
            <button
              onClick={handleRemoveMedia}
              disabled={busy}
              className="text-red-500 hover:text-red-700 text-lg font-bold w-6 h-6 flex items-center justify-center"
              title="Quitar archivo"
            >
              ✕
            </button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={media ? "Caption opcional para el archivo..." : "Escribe tu mensaje al cliente..."}
          rows={3}
          disabled={busy}
          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Toolbar */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
              onChange={handleFileSelect}
              disabled={busy || uploading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || uploading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition"
              title="Adjuntar imagen, PDF, video o audio"
            >
              {uploading ? <>⏳ Subiendo...</> : <>📎 Adjuntar</>}
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              IMG 5MB · DOC 100MB · Video/Audio 16MB
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {text.length}/4000 · Ctrl+Enter
            </span>
            <button
              onClick={handleSend}
              disabled={busy || uploading || (!text.trim() && !media)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg shadow transition"
            >
              {busy ? "Enviando..." : media ? "📤 Enviar archivo" : "📤 Enviar"}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}
    </div>
  );
}

function formatTTL(seconds: number): string {
  if (seconds <= 0) return "0min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
