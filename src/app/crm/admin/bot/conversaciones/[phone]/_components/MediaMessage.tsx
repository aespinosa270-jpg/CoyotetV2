/**
 * MediaMessage — renderiza media inline en la conversación del CRM.
 *
 * Soporta:
 *  - image → <img> clickeable (abre tamaño completo en tab nueva)
 *  - audio → <audio controls> nativo
 *  - video → <video controls> nativo
 *  - document → link descargable
 *
 * Si la media tiene análisis vision o transcripción Whisper adjunta, las muestra.
 */
"use client";

import { useState } from "react";

interface VisionAnalysis {
  esProducto?: boolean;
  tipoTela?: string;
  confianza?: number;
  colores?: string[];
  descripcion?: string;
}

interface Props {
  mediaId: string;
  tipo: "image" | "audio" | "video" | "document";
  caption?: string;
  mimeType?: string;
  vision?: VisionAnalysis;
  transcripcion?: string;
}

export default function MediaMessage({
  mediaId,
  tipo,
  caption,
  mimeType,
  vision,
  transcripcion,
}: Props) {
  const url = `/api/admin/bot/media/${mediaId}`;

  return (
    <div className="space-y-2">
      {tipo === "image" && <ImageBlock url={url} caption={caption} />}
      {tipo === "audio" && <AudioBlock url={url} mimeType={mimeType} />}
      {tipo === "video" && <VideoBlock url={url} mimeType={mimeType} />}
      {tipo === "document" && (
        <DocumentBlock url={url} mimeType={mimeType} caption={caption} />
      )}

      {caption && tipo !== "image" && tipo !== "document" && (
        <p className="text-sm text-slate-600 italic">"{caption}"</p>
      )}

      {/* Análisis vision (sólo para imágenes) */}
      {tipo === "image" && vision && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs">
          <p className="font-bold text-amber-900 mb-1">
            🔍 Análisis del bot (vision):
          </p>
          {vision.tipoTela && (
            <p>
              <span className="font-semibold">Tela:</span> {vision.tipoTela}
            </p>
          )}
          {typeof vision.confianza === "number" && (
            <p>
              <span className="font-semibold">Confianza:</span>{" "}
              {(vision.confianza * 100).toFixed(0)}%
            </p>
          )}
          {vision.colores && vision.colores.length > 0 && (
            <p>
              <span className="font-semibold">Colores:</span>{" "}
              {vision.colores.join(", ")}
            </p>
          )}
          {vision.descripcion && (
            <p className="text-slate-700 mt-1">{vision.descripcion}</p>
          )}
        </div>
      )}

      {/* Transcripción Whisper (sólo para audios) */}
      {tipo === "audio" && transcripcion && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs">
          <p className="font-bold text-blue-900 mb-1">
            🎙️ Transcripción:
          </p>
          <p className="text-slate-700">"{transcripcion}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────

function ImageBlock({ url, caption }: { url: string; caption?: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-md p-3 text-xs text-slate-500">
        ⚠️ Imagen expiró o no disponible (WhatsApp guarda media por 30 días)
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || "Imagen del cliente"}
          className="max-w-xs max-h-80 rounded-md border border-slate-200 hover:opacity-90 cursor-zoom-in"
          onError={() => setErrored(true)}
        />
      </a>
      {caption && (
        <p className="text-sm text-slate-600 italic max-w-xs">"{caption}"</p>
      )}
    </div>
  );
}

function AudioBlock({ url, mimeType }: { url: string; mimeType?: string }) {
  return (
    <audio
      controls
      preload="metadata"
      className="w-full max-w-sm"
    >
      <source src={url} type={mimeType || "audio/ogg"} />
      Tu navegador no soporta audio HTML5.
    </audio>
  );
}

function VideoBlock({ url, mimeType }: { url: string; mimeType?: string }) {
  return (
    <video
      controls
      preload="metadata"
      className="max-w-xs max-h-80 rounded-md border border-slate-200"
    >
      <source src={url} type={mimeType || "video/mp4"} />
      Tu navegador no soporta video HTML5.
    </video>
  );
}

function DocumentBlock({
  url,
  mimeType,
  caption,
}: {
  url: string;
  mimeType?: string;
  caption?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 text-sm"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span>{caption || "Descargar documento"}</span>
      <span className="text-xs text-slate-400">({mimeType})</span>
    </a>
  );
}
