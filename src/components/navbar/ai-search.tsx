'use client';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { useState, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AISearch() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsOpen(true);
    setIsLoading(true);

    // Placeholder para el streaming
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        // Parsear el protocolo de Vercel AI: líneas tipo `0:"chunk"\n`
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const chunk = JSON.parse(line.slice(2));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + chunk } : m
                )
              );
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Error al conectar con Coyote AI. Intenta de nuevo.' }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta a Coyote AI... (ej: ¿Qué tela me rinde más?)"
          className="w-full bg-[#111] border border-white/10 rounded-full py-3 px-12 text-sm text-white focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FDCB02] hover:text-white transition-colors"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        </button>
      </form>

      {isOpen && messages.length > 0 && (
        <div className="absolute top-full mt-4 w-full bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 shadow-2xl z-[100] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
            <span className="text-[10px] font-black uppercase text-[#FDCB02] tracking-widest flex items-center gap-2">
              <Sparkles size={12} /> Coyote Intelligence
            </span>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm ${
                  m.role === 'user' ? 'text-neutral-500 italic' : 'text-white font-medium'
                }`}
              >
                {m.content}
                {m.role === 'assistant' && isLoading && !m.content && (
                  <span className="inline-block w-2 h-4 bg-[#FDCB02] animate-pulse ml-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}