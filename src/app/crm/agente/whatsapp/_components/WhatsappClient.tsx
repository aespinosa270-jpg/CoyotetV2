"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Plus, Phone, MoreVertical,
  CheckCheck, MessageSquare, Circle, X, Loader2, Smile, Paperclip
} from "lucide-react";

// --- TIPOS ---
type WaMessage = {
  id:       string;
  role:     "AGENT" | "CLIENT" | "CUSTOMER";
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

// --- HELPERS ---
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
  return name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
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
  const [messages,     setMessages]     = useState<WaMessage[]>([]); // 🛡️ Blindado: inicializado como array
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [isPending,    startT]          = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");

  const activeConvo = convos.find((c) => c.id === activeId) ?? null;

  // 1. Cargar contactos (Ajustado a tu ruta /api/crm/chat/...)
  useEffect(() => {
    if (showNewChat && contacts.length === 0) {
      fetch('/api/crm/chat/contacts')
        .then(r => r.json())
        .then(data => setContacts(Array.isArray(data) ? data : []))
        .catch(() => setContacts([]));
    }
  }, [showNewChat, contacts.length]);

  // 2. Carga inicial de mensajes (CON VALIDACIÓN DE ARRAY)
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    fetch(`/api/crm/chat/messages?conversationId=${activeId}`)
      .then((r) => r.json())
      .then((data) => { 
        // 🛡️ Si data no es un array (ej. un objeto de error), seteamos array vacío
        setMessages(Array.isArray(data) ? data : []); 
        setLoadingMsgs(false); 
      })
      .catch(() => {
        setMessages([]);
        setLoadingMsgs(false);
      });
  }, [activeId]);

  // 3. Polling (CON VALIDACIÓN DE ARRAY)
  useEffect(() => {
    if (!activeId) return;
    const interval = setInterval(() => {
      fetch(`/api/crm/chat/messages?conversationId=${activeId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > messages.length) {
            setMessages(data);
          }
        })
        .catch(err => console.error("Error en polling:", err));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = async (contact: any) => {
    try {
      const res = await fetch('/api/crm/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: contact.id, phone: contact.phone, name: contact.name, employeeId, isInitial: true })
      });
      const newConvo = await res.json();
      setConvos((prev) => [newConvo, ...prev.filter(c => c.id !== newConvo.id)]);
      setActiveId(newConvo.id);
      setShowNewChat(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = () => {
    const body = input.trim();
    if (!body || !activeId) return;
    setInput("");

    const optimistic: WaMessage = {
      id: `tmp-${Date.now()}`,
      role: "AGENT",
      body,
      mediaUrl: null,
      isRead: false,
      sentAt: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimistic]);

    startT(async () => {
      try {
        await fetch("/api/crm/chat/send", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ conversationId: activeId, body, employeeId }),
        });
      } catch (err) {
        console.error("Fallo al enviar:", err);
      }
    });
  };

  const filtered = convos.filter((c) =>
    getContactName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden relative shadow-2xl">
      
      {/* MODAL NUEVO CHAT */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-bold">Nuevo Mensaje</h3>
                <button onClick={() => setShowNewChat(false)} className="text-zinc-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2 pl-9 text-sm text-white focus:outline-none" />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {contacts.filter(c => (c.name || "").toLowerCase().includes(contactSearch.toLowerCase())).map(contact => (
                  <button key={contact.id} onClick={() => startNewChat(contact)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">{getInitials(contact.name || "C")}</div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">{contact.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{contact.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div className="w-80 shrink-0 flex flex-col border-r border-white/[0.04] bg-[#0d0d0d]">
        <div className="p-5 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Inbox</h2>
            <button onClick={() => setShowNewChat(true)} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all">
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar chat..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full flex items-center gap-3 px-5 py-4 transition-all text-left border-b border-white/[0.02] ${c.id === activeId ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : "hover:bg-white/[0.01]"}`}>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 shrink-0">{getInitials(getContactName(c))}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[12px] font-bold text-zinc-200 truncate">{getContactName(c)}</p>
                  <span className="text-[9px] text-zinc-600 font-mono">{timeLabel(c.lastMessageAt)}</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate italic">{c.lastMessage ?? "Inicia el chat..."}</p>
              </div>
              {c.unreadCount > 0 && <span className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-black">{c.unreadCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ÁREA DE CHAT */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0d0d0d]/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-zinc-400">{getInitials(getContactName(activeConvo))}</div>
              <div>
                <p className="text-sm font-bold text-white">{getContactName(activeConvo)}</p>
                <div className="flex items-center gap-2">
                   <Circle size={6} className="text-emerald-500 fill-emerald-500" />
                   <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-tighter">En línea</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-zinc-500">
              <Phone size={18} className="hover:text-emerald-400 cursor-pointer transition-colors" />
              <MoreVertical size={18} className="hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* MENSAJES (🛡️ BLINDADO CON EL FALLBACK []) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800">
            {loadingMsgs ? (
              <div className="h-full flex items-center justify-center opacity-20"><Loader2 className="animate-spin text-white" /></div>
            ) : (
              (messages ?? []).map((msg) => {
                const isMe = msg.role === "AGENT";
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-900/20" : "bg-zinc-800 text-zinc-100 rounded-bl-none border border-white/5"}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 opacity-50 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className="text-[9px] font-mono">{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={12} className={msg.isRead ? "text-sky-300" : "text-white"} />}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Input */}
          <div className="px-6 py-4 bg-[#0d0d0d] border-t border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-emerald-500/40 transition-all">
                <Smile size={20} className="text-zinc-500 hover:text-emerald-400 cursor-pointer" />
                <Paperclip size={20} className="text-zinc-500 hover:text-white cursor-pointer" />
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Escribe un mensaje..." className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
              </div>
              <button onClick={handleSend} disabled={!input.trim() || isPending} className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                {isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="translate-x-0.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] opacity-20">
          <MessageSquare size={64} />
          <p className="text-xs uppercase tracking-widest mt-4 font-black">Selecciona un chat</p>
        </div>
      )}
    </div>
  );
}