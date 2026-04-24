"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarClienteAction } from "../actions";
import { UserPlus, Building2, MapPin, Mail, Phone, FileText, Loader2 } from "lucide-react";

export default function NuevoClienteForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    rfc: "", street: "", neighborhood: "", 
    zipCode: "", city: "", state: "", notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await registrarClienteAction(form);
      if (res.success) {
        router.push("/crm/admin/clientes");
      } else {
        setError(res.error || "Algo salió mal");
      }
    });
  };

  const inputCls = "w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FDCB02] transition-all placeholder:text-zinc-700";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECCIÓN 1: DATOS PERSONALES */}
        <div className="bg-[#111111] p-6 rounded-[2rem] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
            <UserPlus size={16} className="text-[#FDCB02]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white">Datos Generales</h2>
          </div>
          
          <div>
            <label className={labelCls}>Nombre Completo *</label>
            <input name="name" required value={form.name} onChange={handleChange} className={inputCls} placeholder="Ej. Juan Pérez" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} className={inputCls} placeholder="juan@ejemplo.com" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} placeholder="5512345678" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Empresa</label>
            <input name="company" value={form.company} onChange={handleChange} className={inputCls} placeholder="Nombre de la empresa (Opcional)" />
          </div>

          <div>
            <label className={labelCls}>Notas Internas</label>
            <textarea name="notes" rows={2} value={form.notes} onChange={handleChange} className={`${inputCls} resize-none`} placeholder="Detalles relevantes del cliente..." />
          </div>
        </div>

        {/* SECCIÓN 2: FISCALES Y DIRECCIÓN */}
        <div className="bg-[#111111] p-6 rounded-[2rem] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
            <MapPin size={16} className="text-[#FDCB02]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white">Ubicación y Facturación</h2>
          </div>

          <div>
            <label className={labelCls}>RFC</label>
            <input name="rfc" value={form.rfc} onChange={handleChange} className={`${inputCls} font-mono`} placeholder="XAXX010101000" />
          </div>

          <div>
            <label className={labelCls}>Calle y Número</label>
            <input name="street" value={form.street} onChange={handleChange} className={inputCls} placeholder="Ej. Av. Reforma 123" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Colonia</label>
              <input name="neighborhood" value={form.neighborhood} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>C.P.</label>
              <input name="zipCode" value={form.zipCode} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ciudad</label>
              <input name="city" value={form.city} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <input name="state" value={form.state} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* BOTÓN DE ACCIÓN */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#FDCB02] text-black font-black uppercase tracking-widest text-xs px-10 py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-400/10 flex items-center gap-2"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {isPending ? "Registrando..." : "Crear Cliente Nuevo"}
        </button>
      </div>
    </form>
  );
}