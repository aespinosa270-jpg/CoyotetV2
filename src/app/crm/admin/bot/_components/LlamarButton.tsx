"use client";

import { useZadarmaCall } from "./useZadarmaCall";
import CallWidget from "./CallWidget";

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
 * Botón click-to-call con Zadarma WebRTC.
 * Marca DESDE el navegador del agente — no necesita app móvil.
 * Renderiza un CallWidget flotante con estado de la llamada.
 */
export default function LlamarButton({
  phone,
  variant = "primary",
  size = "sm",
  label = "Llamar",
}: Props) {
  const { state, error, duration, call, hangup, isMuted, toggleMute } = useZadarmaCall();

  // No llamamos a clientes web (IDs UUID)
  const phoneNorm = phone.replace(/[^\d]/g, "");
  const phoneEsNum = /^\d{10,15}$/.test(phoneNorm);
  if (!phoneEsNum) return null;

  async function iniciar() {
    if (state !== "idle") return;
    // Normalizar: agregar 52 si es celular MX sin lada
    let toNumber = phoneNorm;
    if (toNumber.length === 10) toNumber = "52" + toNumber;
    await call(toNumber);
  }

  const baseClass =
    size === "md"
      ? "px-3 py-1.5 text-sm"
      : "px-2 py-1 text-xs";

  const variantClass =
    variant === "primary"
      ? "bg-amber-400 text-slate-900 hover:bg-amber-500 border-amber-500"
      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300";

  const occupied = state !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={iniciar}
        disabled={occupied}
        className={`${baseClass} ${variantClass} ${occupied ? "opacity-60 cursor-wait" : "cursor-pointer"} rounded border font-semibold transition`}
        title={`Llamar a ${phone} vía WebRTC`}
      >
        📞 {state === "connecting" ? "Conectando..." :
            state === "ringing" ? "Sonando..." :
            state === "connected" ? "En llamada" :
            label}
      </button>

      {/* Widget flotante con controles */}
      <CallWidget
        toNumber={phoneNorm}
        state={state}
        duration={duration}
        error={error}
        isMuted={isMuted}
        onHangup={hangup}
        onToggleMute={toggleMute}
      />
    </>
  );
}