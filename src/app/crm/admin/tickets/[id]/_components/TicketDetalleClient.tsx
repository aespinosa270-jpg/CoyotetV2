"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Lock, User, ShieldAlert } from "lucide-react";
import { addTicketMessageAction } from "@/app/actions/tickets";

type SerializedMessage = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  employeeId: string | null;
  userId: string | null;
  employee: { name: string } | null;
  user: { name: string } | null;
};

type SerializedTicketDetail = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  user: { id: string; name: string; email: string; company: string | null };
  employee: { id: string; name: string } | null;
  messages: SerializedMessage[];
};

export default function TicketDetalleClient({ 
  ticket, 
  currentEmployeeId 
}: { 
  ticket: SerializedTicketDetail;
  currentEmployeeId: string;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages]);

  const handleSend = () => {
    if (!body.trim()) return;
    
    startTransition(async () => {
      await addTicketMessageAction(ticket.id, body, isInternal, currentEmployeeId);
      setBody("");
    });
  };

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      
      {/* AREA DE CHAT (Izquierda) */}
      <div className="flex-[2] flex flex-col bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Historial de Mensajes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800">
          
          {/* Descripción original del ticket (El primer "mensaje") */}
          <div className="flex flex-col items-start max-w-[85%]">
            <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1 ml-1">
              {ticket.user.name} (Cliente)
            </span>
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-3 rounded-2xl rounded-tl-sm leading-relaxed">
              {ticket.description}
            </div>
          </div>

          {/* Mapeo de respuestas */}
          {ticket.messages.map((msg) => {
            const isAgent = !!msg.employeeId;

            // ESTILOS PARA NOTA INTERNA
            if (msg.isInternal) {
              return (
                <div key={msg.id} className="flex flex-col items-center my-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-start gap-3 max-w-[85%]">
                    <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-500/70 font-black uppercase tracking-widest mb-0.5">
                        Nota Interna - {msg.employee?.name}
                      </p>
                      <p className="text-amber-400 text-xs">{msg.body}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ESTILOS PARA MENSAJE DE AGENTE (Derecha)
            if (isAgent) {
              return (
                <div key={msg.id} className="flex flex-col items-end self-end ml-auto max-w-[85%]">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1 mr-1">
                    {msg.employee?.name} (Staff)
                  </span>
                  <div className="bg-emerald-600 text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm leading-relaxed shadow-lg shadow-emerald-900/20">
                    {msg.body}
                  </div>
                </div>
              );
            }

            // ESTILOS PARA MENSAJE DE CLIENTE (Izquierda)
            return (
              <div key={msg.id} className="flex flex-col items-start max-w-[85%]">
                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1 ml-1">
                  {msg.user?.name}
                </span>
                <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-3 rounded-2xl rounded-tl-sm leading-relaxed">
                  {msg.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Formulario de Respuesta */}
        <div className="p-4 bg-[#0a0a0a] border-t border-white/5 shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 transition-all focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-white/10">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isInternal ? "Escribe una nota privada para el equipo..." : "Respondele al cliente..."}
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 resize-none outline-none p-2 h-20"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isInternal ? 'bg-amber-500' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
                  {isInternal && <Lock size={10} className="text-black" />}
                </div>
                <input type="checkbox" className="hidden" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isInternal ? 'text-amber-500' : 'text-zinc-500'}`}>
                  Nota Interna
                </span>
              </label>

              <button 
                onClick={handleSend}
                disabled={isPending || !body.trim()}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  isInternal 
                    ? "bg-amber-500 hover:bg-amber-400 text-black disabled:bg-amber-500/30" 
                    : "bg-emerald-500 hover:bg-emerald-400 text-black disabled:bg-emerald-500/30"
                }`}
              >
                {isPending ? "Enviando..." : isInternal ? "Guardar Nota" : "Enviar"} <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR (Derecha) - Info del Cliente y Ticket */}
      <div className="flex-1 flex flex-col gap-4 min-w-[280px] max-w-[320px]">
        
        {/* Tarjeta del Cliente */}
        <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl p-6 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <User size={14} /> Información del Cliente
          </h3>
          <p className="text-lg font-bold text-zinc-200">{ticket.user.name}</p>
          <p className="text-xs text-zinc-400 mt-1">{ticket.user.email}</p>
          {ticket.user.company && (
            <div className="mt-3 inline-block bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] uppercase text-zinc-500">
              Empresa: {ticket.user.company}
            </div>
          )}
        </div>

        {/* Tarjeta de Detalles del Ticket */}
        <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl p-6 shadow-xl flex-1">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
            Detalles Operativos
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Prioridad</p>
              <p className="text-xs font-bold text-white mt-0.5">{ticket.priority}</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Asignado a</p>
              <p className="text-xs font-bold text-white mt-0.5">{ticket.employee?.name || "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Fecha de Apertura</p>
              <p className="text-xs font-bold text-zinc-300 mt-0.5">
                {new Date(ticket.createdAt).toLocaleDateString("es-MX", {
                  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}