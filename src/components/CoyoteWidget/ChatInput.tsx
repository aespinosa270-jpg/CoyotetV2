"use client";

import { useState, type FormEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-neutral-200 bg-white p-2 flex gap-2"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        maxLength={4000}
        className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-full focus:outline-none focus:border-yellow-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="bg-yellow-400 hover:bg-yellow-500 text-neutral-900 rounded-full w-9 h-9 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label="Enviar"
      >
        ➤
      </button>
    </form>
  );
}
