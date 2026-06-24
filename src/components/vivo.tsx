"use client";

/**
 * Coyote Vivo — Componentes base del sistema de diseño (Fase 1)
 *
 * Building blocks reutilizables para las pantallas rediseñadas.
 * Todos viven bajo el namespace .coyote-vivo (las clases cv-*).
 * Importar donde se necesiten: import { VivoCard, VivoButton } from "@/components/vivo";
 */

import React from "react";

// Contenedor raiz: activa el sistema Coyote Vivo en su arbol
export function VivoRoot({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`coyote-vivo ${className}`}>{children}</div>;
}

// Tarjeta
export function VivoCard({
  children, hover = false, tinted = false, className = "", style,
}: {
  children: React.ReactNode; hover?: boolean; tinted?: boolean; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`cv-card ${hover ? "cv-card-hover" : ""} ${tinted ? "cv-card-tinted" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

// Boton
type VivoBtnVariant = "primary" | "warm" | "fresh" | "soft";
export function VivoButton({
  children, variant = "primary", onClick, disabled, className = "", type = "button",
}: {
  children: React.ReactNode; variant?: VivoBtnVariant; onClick?: () => void;
  disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`cv-btn cv-btn-${variant} ${className}`}>
      {children}
    </button>
  );
}

// Badge
type VivoBadgeTone = "hot" | "ai" | "wait" | "new";
export function VivoBadge({ children, tone = "ai", className = "" }: { children: React.ReactNode; tone?: VivoBadgeTone; className?: string }) {
  return <span className={`cv-badge cv-badge-${tone} ${className}`}>{children}</span>;
}

// Pill de IA
export function VivoPillAI({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`cv-pill-ai ${className}`}>{children}</span>;
}

// Avatar con gradiente por nombre
const CV_GRADIENTS = [
  "linear-gradient(135deg,#36d6a0,#3db8ff)",
  "linear-gradient(135deg,#ff6ba6,#ff6b6b)",
  "linear-gradient(135deg,#ffb340,#ff6ba6)",
  "linear-gradient(135deg,#7c5cff,#3db8ff)",
  "linear-gradient(135deg,#9d7bff,#ff6ba6)",
];
export function vivoGradientFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return CV_GRADIENTS[Math.abs(h) % CV_GRADIENTS.length];
}
export function VivoAvatar({ name, size = 44, className = "" }: { name: string; size?: number; className?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`cv-avatar ${className}`} style={{ width: size, height: size, background: vivoGradientFor(name), fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

// Mascota Coyote (con bob animado)
export function VivoMascota({ size = 74, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`cv-bob ${className}`}
      style={{
        width: size, height: size, borderRadius: size * 0.32,
        background: "var(--cv-grad-warm)", display: "grid", placeItems: "center",
        fontSize: size * 0.5, boxShadow: "0 14px 30px -10px rgba(255,107,166,0.5)", flexShrink: 0,
      }}
    >
      🐺
    </div>
  );
}
