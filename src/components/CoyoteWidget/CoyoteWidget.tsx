"use client";

import { useCallback, useState } from "react";
import { useWebSession, resetWebSession } from "./useWebSession";
import { ChatWindow } from "./ChatWindow";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "./types";

interface CoyoteWidgetProps {
  /** Endpoint del bot. Default: /api/chat/v2 */
  endpoint?: string;
  /** Posición del botón flotante. Default: 'bottom-right' */
  position?: "bottom-right" | "bottom-left";
}

export function CoyoteWidget({
  endpoint = "/api/chat/v2",
  position = "bottom-right",
}: CoyoteWidgetProps) {
  const sessionId = useWebSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        type: "text",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: text,
            clientTimestamp: new Date().toISOString(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: `e_${Date.now()}`,
              role: "bot",
              type: "text",
              text: data.error ?? "Hubo un error. Intente de nuevo en un momento.",
              timestamp: new Date(),
              error: true,
            },
          ]);
          return;
        }

        const botMessages: ChatMessage[] = (data.messages ?? []).map(
          (m: any, i: number) => ({
            id: `b_${Date.now()}_${i}`,
            role: "bot" as const,
            type: m.type ?? "text",
            text: m.text,
            imageUrl: m.imageUrl,
            buttons: m.buttons,
            timestamp: new Date(),
          })
        );

        setMessages((prev) => [...prev, ...botMessages]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: "bot",
            type: "text",
            text: "Sin conexión. Verifique su internet e intente de nuevo.",
            timestamp: new Date(),
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, endpoint]
  );

  const posClass =
    position === "bottom-left" ? "left-4" : "right-4";

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-4 ${posClass} z-50 bg-yellow-400 hover:bg-yellow-500 text-neutral-900 rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl transition hover:scale-105`}
          aria-label="Abrir chat con El Coyote"
        >
          🐺
        </button>
      )}

      {/* Ventana de chat */}
      {open && (
        <div
          className={`fixed bottom-4 ${posClass} z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200`}
        >
          {/* Header */}
          <div className="bg-neutral-900 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐺</span>
              <div>
                <p className="text-sm font-semibold">El Coyote</p>
                <p className="text-xs text-neutral-400">
                  Coyote Textil · En línea
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Borrar esta conversación e iniciar una nueva?"
                    )
                  ) {
                    resetWebSession();
                  }
                }}
                className="text-neutral-400 hover:text-white text-xs px-2"
                aria-label="Reiniciar conversación"
                title="Reiniciar conversación"
              >
                ↻
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white text-lg leading-none px-2"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          </div>

          <ChatWindow messages={messages} loading={loading} />
          <ChatInput onSend={handleSend} disabled={loading || !sessionId} />

          <div className="text-[10px] text-neutral-400 text-center py-1 bg-neutral-50 border-t border-neutral-100">
            Powered by Coyote IA
          </div>
        </div>
      )}
    </>
  );
}
