"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatWindow({ messages, loading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando llega un mensaje nuevo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-neutral-50 p-3 space-y-2"
    >
      {messages.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-4xl mb-3">🐺</div>
          <p className="text-sm text-neutral-700 font-medium">
            Hola, soy El Coyote
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Pregúnteme sobre telas, hilos, elásticos o haga su pedido. Estoy 24/7.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 pl-2">
          <TypingDots />
          <span>El Coyote está escribiendo...</span>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
          isUser
            ? "bg-yellow-400 text-neutral-900 rounded-br-md"
            : "bg-white text-neutral-900 border border-neutral-200 rounded-bl-md"
        } ${message.pending ? "opacity-60" : ""} ${
          message.error ? "bg-red-50 border-red-200" : ""
        }`}
      >
        {message.type === "image" && message.imageUrl && (
          <img
            src={message.imageUrl}
            alt=""
            className="rounded mb-1 max-w-full"
          />
        )}
        {message.text && (
          <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
        )}
        {message.error && (
          <p className="text-xs text-red-600 mt-1">⚠ No se pudo enviar</p>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
      <span
        className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </span>
  );
}
