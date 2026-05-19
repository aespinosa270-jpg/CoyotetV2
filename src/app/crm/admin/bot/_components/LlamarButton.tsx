"use client";

import { useState } from "react";

interface Props {
  phone: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  label?: string;
}

/**
 * Botón click-to-call que usa el widget oficial de Zadarma
 * (cargado por ZadarmaWidget en src/components/ui/ZadarmaWidget.tsx).
 *
 * El widget expone funciones globales en window. Intentamos varias
 * formas conocidas de invocar la llamada.
 */
export default function LlamarButton({
  phone,
  variant = "primary",
  size = "sm",
  label = "Llamar",
}: Props) {
  const [estado, setEstado] = useState<"idle" | "llamando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string>("");

  const phoneNorm = phone.replace(/[^\d]/g, "");
  const phoneEsNum = /^\d{10,15}$/.test(phoneNorm);
  if (!phoneEsNum) return null;

  function iniciar() {
    if (estado === "llamando") return;
    setEstado("llamando");
    setMensaje("");

    let toNumber = phoneNorm;
    if (toNumber.length === 10) toNumber = "52" + toNumber;

    try {
      const w = window as any;

      // Intento 1: zdrmWebPhone.call(numero) — API más común del widget
      if (w.zdrmWebPhone && typeof w.zdrmWebPhone.call === "function") {
        w.zdrmWebPhone.call(toNumber);
        setEstado("ok");
        setMensaje("Llamando vía widget Zadarma");
        setTimeout(() => setEstado("idle"), 4000);
        return;
      }

      // Intento 2: zadarmaWebrtc.call
      if (w.zadarmaWebrtc && typeof w.zadarmaWebrtc.call === "function") {
        w.zadarmaWebrtc.call(toNumber);
        setEstado("ok");
        setMensaje("Llamando vía Zadarma");
        setTimeout(() => setEstado("idle"), 4000);
        return;
      }

      // Intento 3: disparar el dialer del widget abriendo el widget y poniendo el número
      // Esto a veces requiere interacción del usuario con el widget
      if (w.zdrmWebPhone && typeof w.zdrmWebPhone.makeCall === "function") {
        w.zdrmWebPhone.makeCall(toNumber);
        setEstado("ok");
        setMensaje("Llamando...");
        setTimeout(() => setEstado("idle"), 4000);
        return;
      }

      // Intento 4: setear número en el widget y dar click programáticamente
      const dialerInput = document.querySelector(
        ".zdrm-webrtc-widget-wrap input[type='tel'], .zdrm-webrtc-widget-wrap input.dial-input"
      ) as HTMLInputElement | null;
      const callBtn = document.querySelector(
        ".zdrm-webrtc-widget-wrap button.call-btn, .zdrm-webrtc-widget-wrap button[data-action='call']"
      ) as HTMLButtonElement | null;
      if (dialerInput && callBtn) {
        dialerInput.value = toNumber;
        dialerInput.dispatchEvent(new Event("input", { bubbles: true }));
        callBtn.click();
        setEstado("ok");
        setMensaje("Llamando...");
        setTimeout(() => setEstado("idle"), 4000);
        return;
      }

      throw new Error("No se encontró la API del widget Zadarma. Abre el widget abajo a la derecha y marca manualmente.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEstado("error");
      setMensaje(msg);
      console.error("LlamarButton error:", err);
      setTimeout(() => setEstado("idle"), 8000);
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
        <span className="text-xs text-emerald-700 font-medium">✅ {mensaje}</span>
      )}
      {estado === "error" && (
        <span className="text-xs text-red-700 font-medium" title={mensaje}>
          ❌ {mensaje.length > 50 ? mensaje.slice(0, 50) + "…" : mensaje}
        </span>
      )}
    </span>
  );
}