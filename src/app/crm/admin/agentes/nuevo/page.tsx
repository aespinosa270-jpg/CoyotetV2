"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeAction } from "@/app/actions/employees";
import { EmployeeRole } from "@prisma/client";
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const ROLES: { value: EmployeeRole; label: string; desc: string }[] = [
  { value: "ADMIN",        label: "Admin",        desc: "Acceso total al sistema"              },
  { value: "SUPERVISOR",   label: "Supervisor",   desc: "Supervisa equipos y reportes"         },
  { value: "VENDEDORA",    label: "Vendedora",    desc: "Gestión de leads y pipeline"          },
  { value: "LOGISTICA",    label: "Logística",    desc: "Rutas, flotilla y entregas"           },
  { value: "CONTABILIDAD", label: "Contabilidad", desc: "Facturación y finanzas"               },
];

export default function NuevoAgentePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success,   setSuccess]  = useState(false);
  const [error,     setError]    = useState("");
  const [showPass,  setShowPass] = useState(false);

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    role:     "VENDEDORA" as EmployeeRole,
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    setError("");
    startTransition(async () => {
      const result = await createEmployeeAction(form);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push("/crm/admin/agentes"), 1200);
      } else {
        setError(result.error);
      }
    });
  };

  const inputCls =
    "w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 text-sm rounded-xl focus:outline-none focus:border-[#FDCB02] transition-colors placeholder:text-zinc-600";
  const labelCls =
    "text-[10px] text-zinc-500 tracking-widest uppercase mb-1.5 block font-bold";

  return (
    <div className="max-w-xl mx-auto space-y-8">

      {/* Back */}
      <Link
        href="/crm/admin/agentes"
        className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
      >
        <ArrowLeft size={14} /> Agentes
      </Link>

      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
          Nuevo <span className="text-[#FDCB02]">Agente</span>
        </h1>
        <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">
          Se creará con acceso al sistema
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">

        {/* Nombre */}
        <div>
          <label className={labelCls}>Nombre completo *</label>
          <input
            placeholder="Ej. Ana Sofía Ríos"
            className={inputCls}
            value={form.name}
            onChange={set("name")}
          />
        </div>

        {/* Email */}
        <div>
          <label className={labelCls}>Email *</label>
          <input
            type="email"
            placeholder="ana@coyotetextil.com"
            className={inputCls}
            value={form.email}
            onChange={set("email")}
          />
        </div>

        {/* Contraseña */}
        <div>
          <label className={labelCls}>Contraseña temporal *</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              className={`${inputCls} pr-12`}
              value={form.password}
              onChange={set("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-700 mt-1.5">
            El agente deberá cambiarla en su primer inicio de sesión.
          </p>
        </div>

        {/* Rol */}
        <div>
          <label className={labelCls}>Rol *</label>
          <div className="grid grid-cols-1 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                  form.role === r.value
                    ? "bg-[#FDCB02]/10 border-[#FDCB02]/50 text-[#FDCB02]"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="text-sm font-bold">{r.label}</span>
                <span className="text-[10px] opacity-70">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-950 border border-red-900 px-4 py-2.5 rounded-xl">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isPending || success || !form.name || !form.email || !form.password}
          className="w-full bg-[#FDCB02] hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed text-black h-13 py-3.5 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
        >
          {success    ? <><CheckCircle2 size={18} /> Agente Creado</>
          : isPending  ? <><Loader2 size={18} className="animate-spin" /> Creando...</>
          : "Crear Agente"}
        </button>
      </div>
    </div>
  );
}