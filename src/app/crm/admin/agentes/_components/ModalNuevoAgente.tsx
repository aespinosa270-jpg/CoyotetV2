"use client";

import { useState, useTransition } from "react";
import { upsertAgentAction } from "@/app/actions/agents";
import { EmployeeRole } from "@prisma/client";
import { X, Loader2, Shield, Percent, Mail, User, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onClose: () => void;
  agentToEdit?: any; // Opcional, por si luego quieres usarlo para editar
}

export default function ModalNuevoAgente({ onClose, agentToEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: agentToEdit?.name || "",
    email: agentToEdit?.email || "",
    password: "",
    role: (agentToEdit?.role as EmployeeRole) || "VENDEDORA",
    commissionRate: agentToEdit?.commissionRate?.toString() || "3.0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await upsertAgentAction({
        id: agentToEdit?.id,
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        role: form.role,
        commissionRate: parseFloat(form.commissionRate),
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const inputCls = "w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#FDCB02] transition-all placeholder:text-zinc-700 font-mono";
  const labelCls = "text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 block";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-950/50">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-zinc-600 uppercase font-black mb-1">Operaciones / Personal</p>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">
                {agentToEdit ? 'Editar' : 'Alta de'} <span className="text-[#FDCB02]">Agente</span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelCls}>Nombre Completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    required 
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className={`${inputCls} pl-12`} 
                    placeholder="EJ. ALAN PARADIX" 
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email Corporativo</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    required 
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className={`${inputCls} pl-12`} 
                    placeholder="ALAN@HUUP.COM.MX" 
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Comisión (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    required 
                    type="number" 
                    step="0.1"
                    value={form.commissionRate}
                    onChange={e => setForm({...form, commissionRate: e.target.value})}
                    className={`${inputCls} pl-12`} 
                    placeholder="3.0" 
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Rol de Acceso</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <select 
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value as EmployeeRole})}
                    className={`${inputCls} pl-12 appearance-none`}
                  >
                    <option value="VENDEDORA">VENDEDORA</option>
                    <option value="ADMIN">ADMINISTRADOR</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="LOGISTICA">LOGÍSTICA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>{agentToEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    type="password"
                    required={!agentToEdit}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className={`${inputCls} pl-12`} 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest"
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <button 
              disabled={isPending}
              type="submit"
              className="w-full bg-[#FDCB02] hover:bg-white text-black font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> PROCESANDO...
                </>
              ) : (
                agentToEdit ? "GUARDAR CAMBIOS" : "ACTIVAR AGENTE"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}