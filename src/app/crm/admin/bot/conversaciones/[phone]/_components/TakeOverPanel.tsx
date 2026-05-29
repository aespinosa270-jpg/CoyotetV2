/**
 * TakeOverPanel â€” UI para control humano de la conversaciÃ³n.
 *
 * G3 MEDIA: soporta envÃ­o de imÃ¡genes, documentos, videos y audios.
 *
 * Flujo:
 *  1. Click ðŸ“Ž â†’ file picker
 *  2. Upload a /api/admin/bot/upload-media â†’ URL Supabase
 *  3. Preview + caption opcional
 *  4. Click Enviar â†’ POST /conversaciones/[phone]/send con mediaUrl
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

  // Countdown del TTL en tiempo real
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
    if (!confirm("Â¿Liberar control y reanudar el bot? Se le avisarÃ¡ al cliente.")) return;
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

    // Validar tamaÃ±o en cliente antes de subir
    const mediaType = detectMediaType(file.type);
    const limitMB = SIZE_LIMITS_MB[mediaType];
    const sizeMB = file.size / 1024 / 1024;

    if (sizeMB > limitMB) {
      setError(
        `Archivo muy grande (${sizeMB.toFixed(2)} MB). LÃ­mite para ${mediaType}: ${limitMB} MB`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
        // SUBIDA DIRECTA A SUPABASE desde el navegador.
        // Evita el limite de 4.5 MB del body de serverless de Vercel.
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const uploadName = `crm-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
        const mimeType = file.type || "application/octet-stream";

        const { error: uploadError } = await supabase.storage
          .from("whatsapp_media")
          .upload(uploadName, file, { contentType: mimeType, upsert: false });
        if (uploadError) {
          throw new Error(`Error subiendo a storage: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("whatsapp_media")
          .getPublicUrl(uploadName);

        setMedia({
          mediaUrl: publicUrlData.publicUrl,
          mediaType,
          filename: file.name,
          mimeType,
          size: file.size,
        });
      setSuccess(`âœ… Archivo subido (${(file.size / 1024 / 1024).toFixed(2)} MB). Agregue caption o envÃ­e.`);
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
      setSuccess(media ? "ðŸ“Ž Archivo enviado al cliente." : "Mensaje enviado al cliente.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function getMediaIcon(t: MediaType): string {
    if (t === "image") return "ðŸ“¸";
    if (t === "video") return "ðŸŽ¥";
    if (t === "audio") return "ðŸŽ™ï¸";
    return "ðŸ“Ž";
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER: Bot activo (no pausado)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (!paused) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide font-semibold">
              Control de la conversaciÃ³n
            </p>
            <p className="text-sm text-slate-700">ðŸŸ¢ Bot atendiendo automÃ¡ticamente</p>
          </div>
          <button
            onClick={handleTakeOver}
            disabled={busy}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-bold rounded shadow"
          >
            {busy ? "..." : "âœ‹ Tomar control"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
      </div>
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER: Bot pausado (control humano)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase text-amber-700 tracking-wide font-bold">
            ðŸŸ¡ BOT PAUSADO â€” Control humano activo
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
            Bot regresa automÃ¡ticamente en <strong>{formatTTL(ttlSeconds)}</strong>
          </p>
        </div>
        <button
          onClick={handleRelease}
          disabled={busy}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded shadow"
        >
          ðŸ”“ Liberar control
        </button>
      </div>

      {/* Form de envÃ­o */}
      <div className="bg-white border border-amber-300 rounded p-3 space-y-2">
        <p className="text-xs text-slate-600 font-medium">
          Responder como asesor (se envÃ­a con el nÃºmero del bot):
        </p>

        {/* Media preview */}
        {media && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
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
                  {media.mediaType.toUpperCase()} Â· {(media.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
            <button
              onClick={handleRemoveMedia}
              disabled={busy}
              className="text-red-500 hover:text-red-700 text-lg font-bold w-6 h-6 flex items-center justify-center"
              title="Quitar archivo"
            >
              Ã—
            </button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={media ? "Caption opcional para el archivo..." : "Escribe tu mensaje al cliente..."}
          rows={3}
          disabled={busy}
          className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
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
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 border border-slate-300 text-slate-700 text-xs font-medium rounded flex items-center gap-1"
              title="Adjuntar imagen, PDF, video o audio"
            >
              {uploading ? (
                <>â³ Subiendo...</>
              ) : (
                <>ðŸ“Ž Adjuntar</>
              )}
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              IMG 5MB Â· DOC 100MB Â· Video/Audio 16MB
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {text.length}/4000 Â· Ctrl+Enter
            </span>
            <button
              onClick={handleSend}
              disabled={busy || uploading || (!text.trim() && !media)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded shadow"
            >
              {busy ? "Enviando..." : media ? "ðŸ“¤ Enviar archivo" : "ðŸ“¤ Enviar"}
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
