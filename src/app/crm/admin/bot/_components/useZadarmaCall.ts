"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import JsSIP from "jssip";

export type CallState = "idle" | "connecting" | "ringing" | "connected" | "ended" | "error";

interface UseZadarmaCallReturn {
  state: CallState;
  error: string | null;
  duration: number; // segundos
  call: (toNumber: string) => Promise<void>;
  hangup: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

/**
 * Hook que maneja una llamada SIP/WebRTC con Zadarma.
 *
 * Flujo:
 *  1. Pide credenciales a /api/zadarma-webrtc (key + sip)
 *  2. Conecta JsSIP a wss://wss.zadarma.com con esas credenciales
 *  3. Cuando call() es invocado, establece sesión SIP al número destino
 *  4. Maneja eventos: ringing, accepted, ended, failed
 *  5. Renderea audio remoto en un <audio> oculto
 */
export function useZadarmaCall(): UseZadarmaCallReturn {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const uaRef = useRef<JsSIP.UA | null>(null);
  const sessionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Crear elemento <audio> oculto al montar
  useEffect(() => {
    if (typeof document === "undefined") return;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;

    return () => {
      try { document.body.removeChild(audio); } catch {}
      audioRef.current = null;
    };
  }, []);

  // Timer de duración
  useEffect(() => {
    if (state === "connected") {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (state === "idle" || state === "ended" || state === "error") {
        setDuration(0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const cleanup = useCallback(() => {
    try {
      if (sessionRef.current) {
        sessionRef.current.terminate?.();
        sessionRef.current = null;
      }
    } catch {}
    try {
      if (uaRef.current) {
        uaRef.current.stop();
        uaRef.current = null;
      }
    } catch {}
  }, []);

  const hangup = useCallback(() => {
    cleanup();
    setState("ended");
    setTimeout(() => setState("idle"), 2000);
  }, [cleanup]);

  const call = useCallback(async (toNumber: string) => {
    setError(null);
    setState("connecting");

    try {
      // 1. Obtener credenciales WebRTC de nuestro endpoint
      const credRes = await fetch("/api/zadarma-webrtc");
      const cred = await credRes.json();
      if (!credRes.ok || !cred.sip || !cred.key) {
        throw new Error(cred.error || "No se obtuvieron credenciales de Zadarma");
      }

      // 2. Configurar JsSIP
      const socket = new JsSIP.WebSocketInterface("wss://wss.zadarma.com:443");
      const configuration = {
        sockets: [socket],
        uri: `sip:${cred.sip}@sip.zadarma.com`,
        password: cred.key,
        register: true,
        session_timers: false,
      };

      const ua = new JsSIP.UA(configuration);
      uaRef.current = ua;

      ua.on("registered", () => {
        // 3. Una vez registrado, hacer la llamada
        const session = ua.call(`sip:${toNumber}@sip.zadarma.com`, {
          mediaConstraints: { audio: true, video: false },
          rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
        });
        sessionRef.current = session;

        session.on("progress", () => setState("ringing"));
        session.on("accepted", () => setState("connected"));
        session.on("ended", () => {
          cleanup();
          setState("ended");
          setTimeout(() => setState("idle"), 2000);
        });
        session.on("failed", (e: any) => {
          cleanup();
          setError(e?.cause || "Llamada fallida");
          setState("error");
          setTimeout(() => setState("idle"), 4000);
        });

        // Conectar el stream remoto al audio
        session.connection?.addEventListener("track", (event: RTCTrackEvent) => {
          if (audioRef.current && event.streams[0]) {
            audioRef.current.srcObject = event.streams[0];
          }
        });
      });

      ua.on("registrationFailed", (e: any) => {
        cleanup();
        setError(e?.cause || "No se pudo registrar SIP");
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      });

      ua.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      cleanup();
      setError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    if (isMuted) {
      sessionRef.current.unmute?.({ audio: true });
      setIsMuted(false);
    } else {
      sessionRef.current.mute?.({ audio: true });
      setIsMuted(true);
    }
  }, [isMuted]);

  return { state, error, duration, call, hangup, isMuted, toggleMute };
}