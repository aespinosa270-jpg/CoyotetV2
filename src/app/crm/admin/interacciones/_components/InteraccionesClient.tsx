"use client";

import { useState } from "react";
import { Search, Paperclip, Send, Bot, User as UserIcon, ShieldAlert, Package, CheckCircle2, Phone } from "lucide-react";

type InteraccionesClientProps = {
  initialConversations: any[];
};

export default function InteraccionesClient({ initialConversations }: InteraccionesClientProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activeChat = initialConversations.find((c) => c.id === activeChatId);

  // Filtro de búsqueda en tiempo real
  const filteredConversations = initialConversations.filter((chat) => {
    const nameMatch = chat.contactName?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = chat.contactPhone?.includes(searchTerm);
    return nameMatch || phoneMatch;
  });

  // Funciones placeholder para las Server Actions
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChat) return;
    console.log("Enviando mensaje a:", activeChat.contactPhone, "Texto:", inputText);
    setInputText("");
    // TODO: Llamar a la Server Action para enviar a Meta y guardar en Prisma
  };

  const handleTakeControl = () => {
    if (!activeChat) return;
    console.log("Tomando control del chat:", activeChat.id);
    // TODO: Llamar a Server Action para actualizar handledBy a "ADMIN"
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[#111b21] border border-white/[0.03] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* =========================================
          PANEL IZQUIERDO: LISTA DE CHATS
      ========================================= */}
      <div className="w-1/3 max-w-[380px] bg-[#111b21] border-r border-white/10 flex flex-col shrink-0">
        {/* Buscador */}
        <div className="p-3 bg-[#111b21] border-b border-white/5 shrink-0">
          <div className="relative flex items-center w-full h-9 rounded-lg bg-[#202c33] overflow-hidden px-3">
            <Search size={16} className="text-[#8696a0]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-full w-full outline-none text-sm text-[#e9edef] bg-transparent pl-3 placeholder:text-[#8696a0]"
              type="text"
              placeholder="Buscar un chat o número..."
            />
          </div>
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
      ========================================= */}
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
                  <button onClick={handleTakeControl} className="flex items-center gap-2 bg-[#FDCB02]/10 text-[#FDCB02] border border-[#FDCB02]/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#FDCB02]/20 transition-colors">
                    <UserIcon size={14} /> Tomar Control
                  </button>
                ) : (
                  <button className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                    <Bot size={14} /> IA Activa
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
                className="flex-1 h-10 rounded-lg bg-[#2a3942] border-none px-4 text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
              />
              <button onClick={handleSendMessage} className="w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center hover:bg-[#06cf9c] transition-colors shrink-0">
                <Send size={18} className="ml-1 pl-0.5" />
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
          {/* Perfil */}
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
            {/* LTV */}
            <div>
              <h3 className="text-[10px] font-black text-[#8696a0] uppercase tracking-widest mb-1.5">LTV Acumulado</h3>
              <p className="text-lg font-mono font-bold text-emerald-400">
                ${activeChat.user.ltv?.toLocaleString('es-MX') || 0}
              </p>
            </div>

            {/* Pedidos Activos (Bodega) */}
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

            {/* Auditoría Religiosa */}
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