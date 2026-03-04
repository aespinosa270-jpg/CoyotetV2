"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Plus, Phone, MoreVertical,
  CheckCheck, Clock, Smile, Paperclip,
  MessageSquare, Circle, User,
} from "lucide-react";

type WaMessage = {
  id:       string;
  role:     "AGENT" | "CLIENT";
  body:     string;
  mediaUrl: string | null;
  isRead:   boolean;
  sentAt:   string;
};

type Conversacion = {
  id:            string;
  contactName:   string | null;
  contactPhone:  string | null;
  isOpen:        boolean;
  lastMessage:   string | null;
  lastMessageAt: string | null;
  unreadCount:   number;
  user:          { id: string; name: string; email: string; phone: string | null } | null;
  messages:      WaMessage[];
};

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 168) return d.toLocaleDateString("es-MX", { weekday: "short" });
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function getContactName(c: Conversacion) {
  return c.user?.name ?? c.contactName ?? c.contactPhone ?? "Sin nombre";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function WhatsappClient({
  conversaciones,
  employeeId,
  employeeName,
}: {
  conversaciones: Conversacion[];
  employeeId:     string;
  employeeName:   string;
}) {
  const [convos,       setConvos]       = useState<Conversacion[]>(conversaciones);
  const [activeId,     setActiveId]     = useState<string | null>(convos[0]?.id ?? null);
  const [search,       setSearch]       = useState("");
  const [input,        setInput]        = useState("");
  const [messages,     setMessages]     = useState<WaMessage[]>([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [, startT]                      = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const activeConvo = convos.find((c) => c.id === activeId) ?? null;

  // Cargar mensajes al cambiar conversación
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    fetch(`/api/agente/whatsapp/messages?conversationId=${activeId}`)
      .then((r) => r.json())
      .then((data) => { setMessages(data ?? []); setLoadingMsgs(false); })
      .catch(() => setLoadingMsgs(false));
  }, [activeId]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const body = input.trim();
    if (!body || !activeId) return;
    setInput("");

    // Optimistic
    const optimistic: WaMessage = {
      id:       `tmp-${Date.now()}`,
      role:     "AGENT",
      body,
      mediaUrl: null,
      isRead:   false,
      sentAt:   new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Actualizar lastMessage en sidebar
    setConvos((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastMessage: body, lastMessageAt: optimistic.sentAt }
          : c
      )
    );

    startT(async () => {
      try {
        await fetch("/api/agente/whatsapp/send", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ conversationId: activeId, body, employeeId }),
        });
      } catch {
        // silent — en modo simulado no hay error real
      }
    });
  };

  const filtered = convos.filter((c) =>
    getContactName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* ── SIDEBAR CONVERSACIONES ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/[0.04]">

        {/* Header sidebar */}
        <div className="px-4 py-4 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              Chats
            </h2>
            <button className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-800 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all">
              <Plus size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 pl-8 pr-3 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6">
              <MessageSquare size={28} className="text-zinc-800" />
              <p className="text-[10px] text-zinc-700 uppercase tracking-widest text-center">
                Sin conversaciones
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const name    = getContactName(c);
              const initials = getInitials(name);
              const isActive = c.id === activeId;

              return (
                <button key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left border-b border-white/[0.02] ${
                    isActive ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400">
                      {initials}
                    </div>
                    {c.isOpen && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0a]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-[11px] font-bold truncate ${isActive ? "text-emerald-400" : "text-zinc-200"}`}>
                        {name}
                      </p>
                      <span className="text-[9px] text-zinc-600 font-mono shrink-0 ml-1">
                        {timeLabel(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-zinc-600 truncate max-w-[140px] italic">
                        {c.lastMessage ?? "Sin mensajes aún"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-black shrink-0 ml-1">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── ÁREA DE CHAT ── */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0a0a0a]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 shrink-0">
                {getInitials(getContactName(activeConvo))}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{getContactName(activeConvo)}</p>
                <div className="flex items-center gap-1.5">
                  <Circle size={6} className="text-emerald-400 fill-emerald-400" />
                  <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
                    {activeConvo.isOpen ? "En línea" : "Desconectado"}
                  </p>
                  {activeConvo.contactPhone && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <p className="text-[9px] text-zinc-600 font-mono">{activeConvo.contactPhone}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                <Phone size={14} />
              </button>
              <button className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                <User size={14} />
              </button>
              <button className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          >
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1.5">
                  {[0,1,2].map((i) => (
                    <motion.div key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                  ))}
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-800 flex items-center justify-center">
                  <MessageSquare size={24} className="text-emerald-400" />
                </div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
                  Sin mensajes aún
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isAgent = msg.role === "AGENT";
                  const showTime =
                    idx === 0 ||
                    new Date(msg.sentAt).getTime() - new Date(messages[idx - 1].sentAt).getTime() > 300000;

                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center my-2">
                          <span className="text-[9px] text-zinc-600 font-mono bg-zinc-900 px-3 py-0.5 rounded-full">
                            {new Date(msg.sentAt).toLocaleString("es-MX", {
                              day: "2-digit", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAgent
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                        }`}>
                          <p className="text-[13px] leading-relaxed">{msg.body}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isAgent ? "justify-end" : "justify-start"}`}>
                            <span className="text-[9px] opacity-60 font-mono">
                              {new Date(msg.sentAt).toLocaleTimeString("es-MX", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            {isAgent && (
                              <CheckCheck size={10} className={msg.isRead ? "text-sky-300" : "opacity-50"} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.04] shrink-0 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2 focus-within:border-emerald-500/40 transition-all">
              <button className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                <Smile size={18} />
              </button>
              <button className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                <Paperclip size={16} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  input.trim()
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-zinc-800 text-zinc-600"
                }`}
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[9px] text-zinc-700 text-center mt-1.5 uppercase tracking-widest">
              Simulado · Meta WhatsApp Business API ready
            </p>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-800 flex items-center justify-center">
            <MessageSquare size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-400">Selecciona una conversación</p>
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest mt-1">
              o inicia una nueva con el botón +
            </p>
          </div>
        </div>
      )}
    </div>
  );
}