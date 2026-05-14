"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "coyote_web_session";

/**
 * Hook que devuelve un sessionId único persistente.
 * - Lee de localStorage al montar
 * - Si no existe, genera UUID y lo guarda
 * - El mismo browser/device siempre tiene el mismo sessionId
 *   (hasta que el usuario limpie storage)
 */
export function useWebSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      existing = generateSessionId();
      window.localStorage.setItem(STORAGE_KEY, existing);
    }
    setSessionId(existing);
  }, []);

  return sessionId;
}

function generateSessionId(): string {
  // crypto.randomUUID si está disponible (browsers modernos), fallback simple
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 11) +
    Math.random().toString(36).slice(2, 11)
  );
}

/**
 * Permite resetear la sesión desde el botón "limpiar conversación"
 */
export function resetWebSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
