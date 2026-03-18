'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Phone, Search, Loader2, Bot, ShieldAlert } from 'lucide-react';

export default function ChatInterface({ initialConversations }: { initialConversations: any[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvo, setActiveConvo] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll hacia abajo cuando hay nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar mensajes cuando seleccionas un chat
  const loadMessages = async (convo: any) => {
    setActiveConvo(convo);
    setMessages([]); // Limpiamos la pantalla
    const res = await fetch(`/api/crm/chat/messages?convoId=${convo.id}`);
    const data = await res.json();
    if (data.success) {
      setMessages(data.messages);
      
      // Actualizamos la lista lateral para quitar la "negrita" de no leído
      setConversations(conversations.map(c => 
        c.id === convo.id ? { ...c, _count: { messages: 0 } } : c
      ));
    }
  };

  // Enviar mensaje a Meta
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvo) return;

    const textoAEnviar = inputText;
    setInputText('');
    setIsSending(true);

    // Lo agregamos a la pantalla de inmediato (Optimistic UI)
    const tempMsg = { id: Date.now(), role: 'AGENT', body: textoAEnviar, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/crm/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvo.id, message: textoAEnviar })
      });
      const data = await res.json();
      if (!data.success) {
        alert("Error al enviar mensaje: " + data.error);
      }
    } catch (error) {
      alert("Error de conexión al enviar.");
    } finally {
      setIsSending(false);
    }
  };

  // Refrescar mensajes automáticamente cada 5 segundos si hay un chat abierto
  useEffect(() => {
    if (!activeConvo) return;
    const interval = setInterval(() => {
      fetch(`/api/crm/chat/messages?convoId=${activeConvo.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages.length > messages.length) {
            setMessages(data.messages);
          }
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvo, messages.length]);

  return (
    <div className="flex h-[85vh] bg-[#0A0A0A] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
      
      {/* 📱 PANEL IZQUIERDO: LISTA DE CHATS */}
      <div className="w-1/3 border-r border-white/5 flex flex-col bg-black/40">
        <div className="p-6 border-b border-white/5 bg-[#111]">
          <h2 className="text-xl font-[1000] uppercase tracking-tight text-white flex items-center gap-3">
            <Phone className="text-[#FDCB02]" size={20}/> Bandeja de Entrada
          </h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14}/>
            <input 
              type="text" 
              placeholder="Buscar número o cliente..." 
              className="w-full bg-black border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {conversations.length === 0 ? (
            <p className="p-6 text-xs text-neutral-500 font-bold text-center mt-10">No hay chats asignados a humanos.</p>
          ) : (
            conversations.map((convo) => {
              const hasUnread = convo._count?.messages > 0;
              return (
                <div 
                  key={convo.id} 
                  onClick={() => loadMessages(convo)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/[0.02] flex items-center gap-4 ${activeConvo?.id === convo.id ? 'bg-white/5 border-l-4 border-l-[#FDCB02]' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center border border-white/10 shrink-0 relative">
                    <User size={20} className="text-neutral-500"/>
                    {hasUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-[#FDCB02] rounded-full border-2 border-black"></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={`text-sm truncate ${hasUnread ? 'font-[1000] text-white' : 'font-bold text-neutral-300'}`}>
                        {convo.contactPhone}
                      </p>
                      <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest">
                        {new Date(convo.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${hasUnread ? 'text-neutral-300 font-bold' : 'text-neutral-500'}`}>
                      {convo.lastMessage || "Sin mensajes..."}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 💬 PANEL DERECHO: ÁREA DE CHAT */}
      <div className="flex-1 flex flex-col bg-[url('/grid.svg')] bg-center relative">
        <div className="absolute inset-0 bg-black/80 pointer-events-none" />

        {activeConvo ? (
          <>
            {/* Cabecera del chat activo */}
            <div className="p-6 border-b border-white/5 bg-[#111] relative z-10 flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center border border-white/10">
                  <User size={20} className="text-[#FDCB02]"/>
                </div>
                <div>
                  <h3 className="text-lg font-[1000] text-white tracking-tight">{activeConvo.contactPhone}</h3>
                  <p className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1">
                    <ShieldAlert size={10}/> IA Silenciada - Control Humano
                  </p>
                </div>
              </div>
            </div>

            {/* Historial de Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
              {messages.map((msg, idx) => {
                const isClient = msg.role === 'CLIENT';
                return (
                  <div key={msg.id || idx} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 text-sm ${
                      isClient 
                        ? 'bg-neutral-900 border border-white/10 text-white rounded-tl-sm' 
                        : 'bg-[#FDCB02] text-black rounded-tr-sm shadow-[0_0_15px_rgba(253,203,2,0.15)] font-bold'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <p className={`text-[9px] mt-2 text-right uppercase tracking-widest font-black ${isClient ? 'text-neutral-500' : 'text-black/60'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de envío */}
            <div className="p-6 border-t border-white/5 bg-[#111] relative z-10">
              <form onSubmit={sendMessage} className="flex gap-4 items-center">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe un mensaje al cliente..." 
                  className="flex-1 bg-black border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-[#FDCB02] transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!inputText.trim() || isSending}
                  className="bg-[#FDCB02] hover:bg-white text-black p-4 rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center">
            <Bot size={64} className="text-neutral-800 mb-6"/>
            <h3 className="text-2xl font-[1000] text-white uppercase tracking-tight">Centro de Comunicaciones</h3>
            <p className="text-sm text-neutral-500 font-bold max-w-sm mt-2">
              Selecciona un chat en el panel izquierdo. Recuerda que la IA atiende el 90% de las dudas, aquí solo ves los casos VIP o escalados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}