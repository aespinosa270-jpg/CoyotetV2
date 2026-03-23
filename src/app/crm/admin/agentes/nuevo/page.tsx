"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAgentAction } from "@/app/actions/agents";
import { EmployeeRole } from "@prisma/client";
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Shield, Percent, Mail, User } from "lucide-react";
import Link from "next/link";

const ROLES: { value: EmployeeRole; label: string; desc: string }[] = [
  { value: "ADMIN",        label: "Admin",       desc: "Acceso total al sistema" },
  { value: "SUPERVISOR",   label: "Supervisor",  desc: "Supervisa equipos y reportes" },
  { value: "VENDEDORA",    label: "Vendedora",   desc: "Gestión de leads y pipeline" },
  { value: "LOGISTICA",    label: "Logística",   desc: "Rutas, flotilla y entregas" },
  { value: "CONTABILIDAD", label: "Contabilidad",desc: "Facturación y finanzas" },
];

export default function NuevoAgentePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VENDEDORA" as EmployeeRole,
    commissionRate: "3.0", // Valor default para Coyote Textil
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await upsertAgentAction({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        commissionRate: parseFloat(form.commissionRate),
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push("/crm/admin/agentes"), 2000);
      } else {
        setError(result.error);
      }
    });
  };

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#FDCB02] transition-all placeholder:text-zinc-700 font-mono";
  const labelCls = "text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 block";

  if (success) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center space-y-4 font-mono">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <CheckCircle2 size={40} className="animate-bounce" />
        </div>
        <h2 className="text-2xl font-black uppercase italic">¡Agente Registrado!</h2>
        <p className="text-zinc-500 text-xs tracking-widest uppercase">Redirigiendo a la fuerza de ventas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 font-mono">
      {/* Back Button */}
      <Link href="/crm/admin/agentes" className="flex items-center gap-2 text-zinc-600 hover:text-[#FDCB02] transition-colors text-[10px] font-black uppercase tracking-widest mb-10">
        <ArrowLeft size={14} /> Volver a Agentes
      </Link>

      <div className="space-y-2 mb-10">
        <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-black">Reclutamiento / Alta</p>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">NUEVO <span className="text-[#FDCB02]">AGENTE</span></h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/20 border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
        
        {/* Sección: Identidad */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Nombre Completo</label>
              <div className="relative">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={`${inputCls} pl-12`} placeholder="EJ. ALAN PARADIX" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email Corporativo</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={`${inputCls} pl-12`} placeholder="ALAN@HUUP.COM.MX" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className={labelCls}>Contraseña de Acceso</label>
              <div className="relative">
                <input required type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputCls} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Tasa de Comisión (%)</label>
              <div className="relative">
                <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                <input required type="number" step="0.1" value={form.commissionRate} onChange={e => setForm({...form, commissionRate: e.target.value})} className={`${inputCls} pl-12`} />
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Rol en el Sistema */}
        <div>
          <label className={labelCls}>Asignación de Rol</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({...form, role: r.value})}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${
                  form.role === r.value 
                  ? 'bg-[#FDCB02]/10 border-[#FDCB02] text-white' 
                  : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                <div className={`mt-1 p-2 rounded-lg ${form.role === r.value ? 'bg-[#FDCB02] text-black' : 'bg-zinc-900 text-zinc-700'}`}>
                  <Shield size={14} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">{r.label}</p>
                  <p className="text-[9px] opacity-60 leading-tight mt-1">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest">
            <Shield size={16} /> {error}
          </div>
        )}

        <button
          disabled={isPending}
          className="w-full bg-[#FDCB02] hover:bg-white text-black font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/5 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={18} /> PROCESANDO ALTA...
            </>
          ) : (
            "ACTIVAR AGENTE EN SISTEMA"
          )}
        </button>
      </form>
    </div>
  );
}