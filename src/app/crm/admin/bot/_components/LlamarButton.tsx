"use client";

import { useState } from "react";

interface Props {
  phone: string;
  /** Estilo: "primary" (amarillo destacado) | "secondary" (gris discreto) */
  variant?: "primary" | "secondary";
  /** Tamaño: "sm" | "md" */
  size?: "sm" | "md";
  /** Texto del botón. Default: "Llamar" */
  label?: string;
}

/**
 * Botón click-to-call con Zadarma.
 * Manda POST a /api/admin/bot/llamadas/iniciar y muestra feedback inline.
 */
export default function LlamarButton({
  phone,
  variant = "primary",
  size = "sm",
  label = "Llamar",
}: Props) {
  const [estado, setEstado] = useState<"idle" | "llamando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string>("");

  // No llamamos a clientes web (IDs UUID)
  const phoneEsNum = /^\d{10,15}$/.test(phone.replace(/[^\d]/g, ""));
  if (!phoneEsNum) return null;

  async function iniciar() {
    setEstado("llamando");
    setMensaje("");
    try {
      const res = await fetch("/api/admin/bot/llamadas/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setEstado("ok");
        setMensaje(data.message ?? "Llamada iniciada");
        // Reset después de 6s
        setTimeout(() => setEstado("idle"), 6000);
      } else {
        setEstado("error");
        setMensaje(data.error ?? "Error iniciando llamada");
        setTimeout(() => setEstado("idle"), 8000);
      }
    } catch (err) {
      setEstado("error");
      setMensaje("Error de red");
      setTimeout(() => setEstado("idle"), 6000);
    }
  }

  const baseClass =
    size === "md"
      ? "px-3 py-1.5 text-sm"
      : "px-2 py-1 text-xs";

  const variantClass =
    variant === "primary"
      ? "bg-amber-400 text-slate-900 hover:bg-amber-500 border-amber-500"
      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300";

  const disabledClass =
    estado === "llamando" ? "opacity-60 cursor-wait" : "cursor-pointer";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={iniciar}
        disabled={estado === "llamando"}
        className={`${baseClass} ${variantClass} ${disabledClass} rounded border font-semibold transition`}
        title={`Llamar a ${phone} vía Zadarma`}
      >
        📞 {estado === "llamando" ? "Llamando..." : label}
      </button>
      {estado === "ok" && (
        <span className="text-xs text-emerald-700 font-medium">
          ✅ {mensaje}
        </span>
      )}
      {estado === "error" && (
        <span className="text-xs text-red-700 font-medium" title={mensaje}>
          ❌ {mensaje.length > 40 ? mensaje.slice(0, 40) + "…" : mensaje}
        </span>
      )}
    </span>
  );
}