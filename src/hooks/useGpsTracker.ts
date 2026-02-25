// src/hooks/useGpsTracker.ts
"use client";

import { useEffect } from "react";

const LIMITE_VELOCIDAD = 80; // km/h

export function useGpsTracker(employeeId: string | null | undefined) {
  useEffect(() => {
    // No rastrear si no hay empleado autenticado
    if (!employeeId) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const speedKmH = speed ? Math.round(speed * 3.6) : 0;

        try {
          await fetch("/api/flotilla/telemetria", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              speed: speedKmH,
              isSpeeding: speedKmH > LIMITE_VELOCIDAD,
              employeeId,
            }),
          });
        } catch (err) {
          console.error("Error enviando telemetría:", err);
        }
      },
      (err) => console.error("Error GPS:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [employeeId]);
}