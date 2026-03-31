"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Plus, Phone, MoreVertical,
  CheckCheck, MessageSquare, Circle, X, Loader2, Smile, Paperclip, FileText,
  ShoppingBag, CreditCard, Activity, StickyNote, User
} from "lucide-react";
import { supabase } from "@/lib/supabase"; // 🚀 MOTOR REALTIME

// --- TIPOS ---
type WaMessage = {
  id:       string;
  role:     string; // Relajado para no pelear con los Enums de Prisma
  body:     string;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead:   boolean;
  sentAt:   string;
  waId:     string | null; // 🚨 Corregido para que coincida perfecto con Prisma
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

const QUICK_EMOJIS = ["🐺", "📦", "💪", "👍", "🔥", "✅", "😅", "🙏", "👀", "😎", "🚀", "💰", "🧵", "👕", "🇲🇽", "📍"];

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
  const [isPending,    startT]          = useTransition();
  const [isUploading,  setIsUploading]  = useState(false);
  const [showEmojis,   setShowEmojis]   = useState(false); 
  
  // 🧠 ESTADO DEL PERFIL DE INTELIGENCIA
  const [clientProfile, setClientProfile] = useState({ ordersCount: 0, ltv: 0, loading: false });

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");

  const activeConvo = convos.find((c) => c.id === activeId) ?? null;

  // 1. Cargar contactos
  useEffect(() => {
    if (showNewChat && contacts.length === 0) {
      fetch('/api/whatsapp/contacts')
        .then(r => r.json())
        .then(data => setContacts(Array.isArray(data) ? data : []))
        .catch(() => setContacts([]));
    }
  }, [showNewChat, contacts.length]);

  // 2. Carga inicial de mensajes
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    fetch(`/api/whatsapp/messages?conversationId=${activeId}`)
      .then((r) => r.json())
      .then((data) => { 
        setMessages(Array.isArray(data) ? data : []); 
        setLoadingMsgs(false); 
      })
      .catch(() => {
        setMessages([]);
        setLoadingMsgs(false);
      });
  }, [activeId]);

  // 3. 🧠 CARGAR INTELIGENCIA DEL CLIENTE (LTV y Órdenes)
  useEffect(() => {
    if (!activeConvo) return;
    
    const fetchProfile = async () => {
      setClientProfile((p) => ({ ...p, loading: true }));
      const userId = activeConvo.user?.id || "";
      const phone = activeConvo.contactPhone || "";
      
      try {
        const res = await fetch(`/api/whatsapp/client-profile?userId=${userId}&phone=${phone}`);
        const data = await res.json();
        setClientProfile({ ordersCount: data.ordersCount || 0, ltv: data.ltv || 0, loading: false });
      } catch (error) {
        console.error("Error cargando perfil", error);
        setClientProfile((p) => ({ ...p, loading: false }));
      }
    };

    fetchProfile();
  }, [activeId, activeConvo?.user?.id, activeConvo?.contactPhone]);

  // 4. 🚀 SUPABASE REALTIME: Latencia Cero (Adiós al Polling)
  useEffect(() => {
    if (!activeId) return;

    const messageChannel = supabase
      .channel(`chat_realtime_${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'WaMessage', filter: `conversationId=eq.${activeId}` },
        (payload) => {
          const nuevoMensaje = payload.new as WaMessage;
          setMessages((prev) => {
            // Evitar duplicados por Optimistic UI
            if (prev.some(m => m.id === nuevoMensaje.id || (m.waId && m.waId === nuevoMensaje.waId))) return prev;
            return [...prev, nuevoMensaje];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = async (contact: any) => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: contact.id, phone: contact.phone, name: contact.name, employeeId, isInitial: true })
      });
      const newConvo = await res.json();
      setConvos((prev) => [newConvo, ...prev.filter(c => c.id !== newConvo.id)]);
      setActiveId(newConvo.id);
      setShowNewChat(false);
      setContactSearch(""); 
    } catch (error) {
      console.error(error);
    }
  };

  // ENVIAR TEXTO
  const handleSend = () => {
    const body = input.trim();
    if (!body || !activeId) return;
    setInput("");
    setShowEmojis(false); 

    const optimistic: WaMessage = {
      id: `tmp-${Date.now()}`,
      role: "AGENT",
      body,
      mediaUrl: null,
      mediaType: null,
      isRead: false,
      sentAt: new Date().toISOString(),
      waId: null,
    };
    
    setMessages((prev) => [...prev, optimistic]);

    startT(async () => {
      try {
        await fetch("/api/whatsapp/send", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ 
            conversationId: activeId, 
            body: body, 
            employeeId: employeeId,
            phone: activeConvo?.contactPhone 
          }),
        });
      } catch (err) {
        console.error("Fallo crítico al enviar:", err);
      }
    });
  };

  // 📁 MANEJO DE ARCHIVOS
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeId);
    formData.append("employeeId", employeeId);

    try {
      const res = await fetch("/api/whatsapp/send-media", {
        method: "POST",
        body: formData
      });
      
      const newMsg = await res.json();
      
      if(res.ok) {
         setMessages((prev) => [...prev, newMsg]);
      } else {
         console.error("Error al subir archivo:", newMsg);
         alert("Hubo un error enviando el archivo a Meta.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = convos.filter((c) =>
    getContactName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contactPhone ?? "").includes(search)
  );

  const isSearchPhone = contactSearch.replace(/\D/g, '').length >= 10;
  const cleanSearchPhone = contactSearch.replace(/\D/g, '');

  return (
    <div className="flex-1 flex min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden relative shadow-2xl">
      
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,audio/*,application/pdf" />

      {/* MODAL NUEVO CHAT */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-bold">Nuevo Mensaje</h3>
                <button onClick={() => { setShowNewChat(false); setContactSearch(""); }} className="text-zinc-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Buscar cliente o escribir 10 dígitos..." className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2 pl-9 text-sm text-white focus:outline-none" />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {contacts.filter(c => (c.name || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone || "").includes(contactSearch)).map(contact => (
                  <button key={contact.id} onClick={() => startNewChat(contact)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">{getInitials(contact.name || "C")}</div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">{contact.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{contact.phone}</p>
                    </div>
                  </button>
                ))}
                {isSearchPhone && (
                  <motion.button initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} onClick={() => startNewChat({ id: `nuevo-${Date.now()}`, name: "Nuevo Prospecto", phone: cleanSearchPhone })} className="w-full flex items-center gap-3 p-3 mt-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform"><Send size={18} className="translate-x-0.5" /></div>
                    <div><p className="text-sm font-bold text-emerald-400">Iniciar chat con número nuevo</p><p className="text-xs text-emerald-500/70 font-mono">+{cleanSearchPhone}</p></div>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 1. COLUMNA IZQUIERDA (INBOX) */}
      {/* ==================================================== */}
      <div className="w-80 shrink-0 flex flex-col border-r border-white/[0.04] bg-[#0d0d0d] z-10 relative">
        <div className="p-5 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Inbox</h2>
            <button onClick={() => setShowNewChat(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all text-xs font-bold tracking-wide">
              <Plus size={14} /> Nuevo Chat
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
                <p className="text-[11px] text-zinc-500 truncate italic">
                  {c.messages?.[c.messages.length - 1]?.mediaUrl ? '📸 Archivo adjunto' : (c.lastMessage ?? "Inicia el chat...")}
                </p>
              </div>
              {c.unreadCount > 0 && <span className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-black">{c.unreadCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. COLUMNA CENTRAL (CHAT) */}
      {/* ==================================================== */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
          
          {/* Header Chat */}
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0d0d0d]/50 backdrop-blur-md z-10">
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
              <a href={`tel:+${activeConvo.contactPhone}`} className="hover:text-emerald-400 cursor-pointer transition-colors" title="Llamada normal"><Phone size={18} /></a>
              <MoreVertical size={18} className="hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 relative" onClick={() => setShowEmojis(false)}>
            {loadingMsgs ? (
              <div className="h-full flex items-center justify-center opacity-20"><Loader2 className="animate-spin text-white" /></div>
            ) : (
              (messages ?? []).map((msg) => {
                const isMe = msg.role === "AGENT";
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-900/20" : "bg-zinc-800 text-zinc-100 rounded-bl-none border border-white/5"}`}>
                      
                      {msg.mediaUrl && (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black/20 flex flex-col items-center justify-center">
                          {msg.mediaType === "image" && <img src={msg.mediaUrl} alt="Adjunto" className="max-w-full max-h-60 object-cover rounded-lg" />}
                          {msg.mediaType === "audio" && <audio src={msg.mediaUrl} controls className="w-full max-w-[250px] h-10 mt-1" />}
                          {msg.mediaType === "document" && (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 text-emerald-300 hover:text-emerald-400 underline"><FileText size={20} /> Ver Documento</a>
                          )}
                        </div>
                      )}

                      {msg.body && <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>}

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

          {/* Input Panel */}
          <div className="px-6 py-4 bg-[#0d0d0d] border-t border-white/[0.04] z-10">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-emerald-500/40 transition-all relative">
                
                {isUploading ? <Loader2 size={20} className="text-emerald-500 animate-spin" /> : <Paperclip size={20} className="text-zinc-500 hover:text-emerald-400 cursor-pointer transition-colors" onClick={() => fileInputRef.current?.click()} />}

                <div className="relative flex items-center">
                  <Smile size={20} className={`cursor-pointer transition-colors ${showEmojis ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`} onClick={() => setShowEmojis(!showEmojis)} />
                  <AnimatePresence>
                    {showEmojis && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-10 left-0 bg-[#111] border border-zinc-800 rounded-xl p-3 shadow-2xl flex flex-wrap gap-2 w-56 z-50">
                        {QUICK_EMOJIS.map(emoji => (
                          <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform hover:bg-white/5 p-1 rounded-md">{emoji}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={isUploading ? "Subiendo archivo..." : "Escribe un mensaje..."} disabled={isUploading} className="flex-1 bg-transparent text-sm text-white focus:outline-none disabled:opacity-50" />
              </div>
              <button onClick={handleSend} disabled={!input.trim() || isPending || isUploading} className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
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

      {/* ==================================================== */}
      {/* 3. COLUMNA DERECHA (PERFIL INTELIGENTE ENTERPRISE) */}
      {/* ==================================================== */}
      {activeConvo && (
        <div className="w-80 shrink-0 border-l border-white/[0.04] bg-[#0d0d0d] flex flex-col z-10 hidden xl:flex">
          
          {/* Cabecera del Perfil */}
          <div className="p-6 border-b border-white/[0.04] flex flex-col items-center text-center bg-gradient-to-b from-[#111] to-[#0d0d0d]">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center font-black text-2xl text-emerald-400 mb-3 border border-emerald-500/20 shadow-inner">
              {getInitials(getContactName(activeConvo))}
            </div>
            <h2 className="text-lg font-bold text-white">{getContactName(activeConvo)}</h2>
            <p className="text-sm text-zinc-500 font-mono mt-1">+{activeConvo.contactPhone}</p>
            <div className="mt-4 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <User size={12} /> {activeConvo.user ? "Cliente Verificado" : "Prospecto"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 [&::-webkit-scrollbar]:w-0">
            
            {/* Métricas / Inteligencia REAL */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <Activity size={14} /> Inteligencia CRM
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 flex flex-col">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Órdenes Totales</p>
                  <p className="text-lg font-black text-white mt-auto">
                    {clientProfile.loading ? <Loader2 size={16} className="animate-spin text-zinc-600" /> : clientProfile.ordersCount}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-emerald-900/30 rounded-xl p-3 flex flex-col">
                  <p className="text-[10px] text-emerald-500/70 uppercase font-bold mb-1">Life Time Value</p>
                  <div className="text-lg font-black text-emerald-400 mt-auto flex items-center">
                    {clientProfile.loading ? (
                       <Loader2 size={16} className="animate-spin text-emerald-800" />
                    ) : (
                       <>
                         ${clientProfile.ltv.toLocaleString('es-MX')}
                         <span className="text-[10px] text-emerald-500/50 ml-1">MXN</span>
                       </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Acciones Rápidas</h3>
              <div className="space-y-2">
                <button className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold text-zinc-300 transition-all flex items-center justify-center gap-2">
                  <ShoppingBag size={14} /> Crear Cotización
                </button>
                <button className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-all flex items-center justify-center gap-2">
                  <CreditCard size={14} /> Enviar Link de Pago
                </button>
              </div>
            </div>

            {/* Notas Internas */}
            <div>
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                 <StickyNote size={14} /> Notas Internas
               </h3>
               <textarea 
                 className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40 resize-none h-24 placeholder:text-zinc-700"
                 placeholder="Ej. Este cliente siempre compra micro piqué rojo, ofrecerle descuento por volumen..."
               ></textarea>
               <button className="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-zinc-400 transition-all">Guardar Nota</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}