"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Paperclip, Send, Bot, User as UserIcon, ShieldAlert, Package, CheckCircle2, Phone, Loader2, UserPlus, X } from "lucide-react";
import { sendAdminMessage, toggleChatControl, createNewChat } from "../actions";

type InteraccionesClientProps = {
  initialConversations: any[];
};

export default function InteraccionesClient({ initialConversations }: InteraccionesClientProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados
  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Estados del Modal de Nuevo Contacto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const activeChat = initialConversations.find((c) => c.id === activeChatId);

  // Filtro de búsqueda
  const filteredConversations = initialConversations.filter((chat) => {
    const nameMatch = chat.contactName?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = chat.contactPhone?.includes(searchTerm);
    return nameMatch || phoneMatch;
  });

  // =========================================
  // EFECTOS (Tiempo Real y Scroll)
  // =========================================
  useEffect(() => {
    // Polling cada 3 segundos
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    // Auto-Scroll suave cuando cambian los mensajes
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // =========================================
  // ACCIONES DE SERVIDOR
  // =========================================
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChat || isPending) return;
    
    const textoAEnviar = inputText;
    setInputText(""); // Limpiamos rápido para buena UX

    startTransition(async () => {
      const res = await sendAdminMessage(activeChat.id, activeChat.contactPhone, textoAEnviar);
      if (!res?.success) {
        alert(res?.error || "Error al enviar");
        setInputText(textoAEnviar); // Regresamos el texto si falló
      }
    });
  };

  const handleTakeControl = () => {
    if (!activeChat || isPending) return;
    const newTarget = activeChat.handledBy === "BOT" ? "ADMIN" : "BOT";
    startTransition(async () => {
      await toggleChatControl(activeChat.id, newTarget);
    });
  };

  const handleCreateContact = () => {
    if (!newContactPhone.trim() || isPending) return;
    
    startTransition(async () => {
      const res = await createNewChat(newContactName, newContactPhone);
      if (res?.success) {
        setIsModalOpen(false);
        setNewContactName("");
        setNewContactPhone("");
        if (res.conversationId) setActiveChatId(res.conversationId);
      } else {
        alert(res?.error || "Error al crear el contacto");
      }
    });
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[#111b21] border border-white/[0.03] rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* =========================================
          MODAL: NUEVO CONTACTO
      ========================================= */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#202c33] p-6 rounded-2xl w-96 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg">Nuevo Contacto</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8696a0] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#8696a0] font-bold uppercase tracking-wider mb-1 block">Nombre del Cliente</label>
                <input 
                  type="text" 
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full h-10 rounded-lg bg-[#2a3942] border-none px-3 text-sm text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8696a0] font-bold uppercase tracking-wider mb-1 block">Número de WhatsApp (con código de país)</label>
                <input 
                  type="text" 
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Ej. 525512345678"
                  className="w-full h-10 rounded-lg bg-[#2a3942] border-none px-3 text-sm text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} disabled={isPending} className="px-4 py-2 rounded-lg text-sm font-bold text-[#8696a0] hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreateContact} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#00a884] text-[#111b21] hover:bg-[#06cf9c] transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Crear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          PANEL IZQUIERDO: LISTA DE CHATS
      ========================================= */}
      <div className="w-1/3 max-w-[380px] bg-[#111b21] border-r border-white/10 flex flex-col shrink-0">
        {/* Buscador y Botón Nuevo */}
        <div className="p-3 bg-[#111b21] border-b border-white/5 shrink-0 flex gap-2">
          <div className="relative flex items-center flex-1 h-9 rounded-lg bg-[#202c33] overflow-hidden px-3">
            <Search size={16} className="text-[#8696a0]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-full w-full outline-none text-sm text-[#e9edef] bg-transparent pl-3 placeholder:text-[#8696a0]"
              type="text"
              placeholder="Buscar chat..."
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-9 w-9 bg-[#202c33] rounded-lg flex items-center justify-center text-[#8696a0] hover:text-[#e9edef] transition-colors shrink-0 tooltip-trigger"
            title="Nuevo Contacto"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#374045]">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-[#8696a0] text-xs font-bold uppercase tracking-widest">
              No hay chats que coincidan
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <div 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`flex items-center p-3 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-white/[0.02] ${activeChatId === chat.id ? 'bg-[#2a3942]' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#374045] flex items-center justify-center text-[#e9edef] font-bold shrink-0">
                    {chat.contactName ? chat.contactName.charAt(0).toUpperCase() : <Phone size={20} />}
                  </div>
                  
                  <div className="ml-4 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-[#e9edef] truncate">{chat.contactName || chat.contactPhone}</h3>
                      <span className="text-[11px] text-[#8696a0] shrink-0">
                        {lastMsg ? new Date(lastMsg.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[13px] text-[#8696a0] truncate flex-1 pr-2">
                        {lastMsg ? lastMsg.body : "Sin mensajes"}
                      </p>
                      <div className="flex gap-1.5 items-center shrink-0">
                        {chat.handledBy === "BOT" ? (
                          <Bot size={14} className="text-emerald-500" />
                        ) : (
                          <UserIcon size={14} className="text-[#FDCB02]" />
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-[#111b21] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================
          PANEL CENTRAL: EL CHAT
      ======================================== */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative min-w-0">
        {activeChat ? (
          <>
            {/* Header del Chat */}
            <div className="h-16 bg-[#202c33] flex items-center justify-between px-6 border-b border-white/5 z-10 shrink-0">
              <div className="flex items-center gap-4 truncate">
                <div className="w-10 h-10 rounded-full bg-[#374045] flex items-center justify-center font-bold text-[#e9edef] shrink-0">
                  {activeChat.contactName ? activeChat.contactName.charAt(0).toUpperCase() : <Phone size={18} />}
                </div>
                <div className="truncate">
                  <h2 className="font-semibold text-[#e9edef] text-sm truncate">{activeChat.contactName || "Cliente Desconocido"}</h2>
                  <p className="text-[11px] text-[#8696a0] truncate">{activeChat.contactPhone}</p>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                {activeChat.handledBy === "BOT" ? (
                  <button onClick={handleTakeControl} disabled={isPending} className="flex items-center gap-2 bg-[#FDCB02]/10 text-[#FDCB02] border border-[#FDCB02]/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#FDCB02]/20 transition-colors disabled:opacity-50">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserIcon size={14} />} 
                    Tomar Control
                  </button>
                ) : (
                  <button onClick={handleTakeControl} disabled={isPending} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} 
                    Devolver a IA
                  </button>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#374045]">
              {activeChat.messages.length === 0 && (
                <div className="text-center mt-10 text-[#8696a0] text-xs font-bold uppercase tracking-widest">
                  Comienza la conversación
                </div>
              )}
              {activeChat.messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.role === "CLIENT" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-lg p-2 px-3 shadow-sm relative text-sm ${
                      msg.role === "CLIENT" 
                        ? "bg-[#202c33] text-[#e9edef] rounded-tl-none" 
                        : "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <div className="text-[10px] text-[#8696a0] flex justify-end items-center gap-1 mt-1">
                      {new Date(msg.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              {/* Ancla para el Scroll Automático */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="h-[60px] bg-[#202c33] px-4 flex items-center gap-3 z-10 shrink-0">
              <Paperclip size={24} className="text-[#8696a0] cursor-pointer hover:text-[#e9edef]" />
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={activeChat.handledBy === "BOT" ? "Escribe para tomar el control..." : "Escribe un mensaje..."}
                disabled={isPending}
                className="flex-1 h-10 rounded-lg bg-[#2a3942] border-none px-4 text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none disabled:opacity-50"
              />
              <button onClick={handleSendMessage} disabled={isPending} className="w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center hover:bg-[#06cf9c] transition-colors shrink-0 disabled:opacity-50">
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1 pl-0.5" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-[#8696a0]">
            <Bot size={64} className="mb-4 opacity-20" />
            <p className="text-sm uppercase tracking-widest font-bold">Selecciona un chat</p>
          </div>
        )}
      </div>

      {/* =========================================
          PANEL DERECHO: CONTEXTO CRM (Si es un User)
      ========================================= */}
      {activeChat?.user && (
        <div className="w-1/4 max-w-[300px] bg-[#111b21] border-l border-white/10 flex flex-col shrink-0">
          <div className="p-6 border-b border-white/5 flex flex-col items-center text-center shrink-0">
            <div className="w-20 h-20 rounded-full bg-[#374045] flex items-center justify-center text-2xl text-[#e9edef] font-bold mb-4">
              {activeChat.user.name?.charAt(0) || "U"}
            </div>
            <h2 className="font-bold text-[#e9edef] truncate w-full">{activeChat.user.name || activeChat.user.email}</h2>
            <p className="text-xs text-[#8696a0] mt-1">{activeChat.contactPhone}</p>
            
            {activeChat.user.membershipTier !== "NONE" && (
              <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#FDCB02] text-black">
                {activeChat.user.membershipTier}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#374045]">
            <div>
              <h3 className="text-[10px] font-black text-[#8696a0] uppercase tracking-widest mb-1.5">LTV Acumulado</h3>
              <p className="text-lg font-mono font-bold text-emerald-400">
                ${activeChat.user.ltv?.toLocaleString('es-MX') || 0}
              </p>
            </div>

            {activeChat.user.orders?.[0] ? (
              <div className="bg-[#202c33] border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-blue-400 text-xs flex items-center gap-1.5 uppercase">
                    <Package size={14} /> Pedido Activo
                  </h3>
                  <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase">
                    {activeChat.user.orders[0].status}
                  </span>
                </div>
                <p className="text-[11px] text-[#8696a0] mb-3 font-mono border-b border-white/5 pb-2">
                  Logística: <span className="text-[#e9edef]">{activeChat.user.orders[0].logisticsType.replace('_', ' ')}</span>
                </p>
                
                {activeChat.user.orders[0].logisticsType === "COYOTE_LOCAL" && (
                  <button className="w-full bg-blue-600 text-white text-[11px] font-bold py-2 rounded flex items-center justify-center gap-1.5 hover:bg-blue-500 transition-colors">
                    <CheckCircle2 size={14} /> Liberar Bodega (Pickup)
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-[10px] font-black text-[#8696a0] uppercase tracking-widest mb-1.5">Pedidos Activos</h3>
                <p className="text-xs text-[#54656f]">Sin pedidos en tránsito.</p>
              </div>
            )}

            <div className="pt-6 border-t border-white/5">
               <button className="w-full border border-red-500/30 text-red-400 bg-red-500/10 text-[10px] font-bold py-2 rounded hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert size={14} /> Suspender Agente
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}