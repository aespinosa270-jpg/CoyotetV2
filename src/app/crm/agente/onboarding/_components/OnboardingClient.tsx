"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Building2, FileText,
  Package, DollarSign, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, Sparkles,
  MapPin, Hash, Target, Clock,
} from "lucide-react";
import { PipelineStatus } from "@prisma/client";

type Producto = {
  id:           string;
  title:        string;
  sku:          string;
  priceMayoreo: number;
  category:     string;
};

type DealReciente = {
  id:        string;
  title:     string;
  company:   string;
  value:     number;
  status:    PipelineStatus;
  createdAt: string;
  user:      { id: string; name: string; email: string; phone: string | null; company: string | null } | null;
  product:   { title: string; sku: string } | null;
};

type FormData = {
  // Cliente
  nombre:       string;
  email:        string;
  telefono:     string;
  empresa:      string;
  rfc:          string;
  ciudad:       string;
  notas:        string;
  // Deal
  dealTitulo:   string;
  productoId:   string;
  cantidad:     string;
  valorEstimado:string;
  pipeline:     PipelineStatus;
  color:        string;
  dealNotas:    string;
};

const STEPS = [
  { id: 1, label: "Datos del Cliente",  icon: User      },
  { id: 2, label: "Deal Inicial",       icon: Target    },
  { id: 3, label: "Confirmación",       icon: CheckCircle2 },
];

const PIPELINE_CFG: Record<PipelineStatus, { label: string; cls: string }> = {
  PROSPECTO:       { label: "Prospecto",   cls: "border-zinc-700 text-zinc-400"                            },
  COTIZANDO:       { label: "Cotizando",   cls: "border-sky-700 text-sky-400 bg-sky-500/10"               },
  NEGOCIACION:     { label: "Negociación", cls: "border-amber-700 text-amber-400 bg-amber-500/10"         },
  CERRADO_GANADO:  { label: "Ganado",      cls: "border-emerald-700 text-emerald-400 bg-emerald-500/10"   },
  CERRADO_PERDIDO: { label: "Perdido",     cls: "border-red-700 text-red-400 bg-red-500/10"               },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

const INPUT_CLS = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02]/40 transition-all";
const LABEL_CLS = "block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5";

export default function OnboardingClient({
  productos,
  recientes,
  employeeId,
}: {
  productos:  Producto[];
  recientes:  DealReciente[];
  employeeId: string;
}) {
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ userId: string; dealId: string } | null>(null);
  const [, startT]            = useTransition();

  const [form, setForm] = useState<FormData>({
    nombre:        "",
    email:         "",
    telefono:      "",
    empresa:       "",
    rfc:           "",
    ciudad:        "",
    notas:         "",
    dealTitulo:    "",
    productoId:    "",
    cantidad:      "",
    valorEstimado: "",
    pipeline:      "PROSPECTO",
    color:         "",
    dealNotas:     "",
  });

  const set = (k: keyof FormData, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Auto-fill deal title
  const productoSeleccionado = productos.find((p) => p.id === form.productoId);
  const autoTitle = form.empresa
    ? `${form.empresa} — ${productoSeleccionado?.title ?? "Deal"}`
    : productoSeleccionado?.title ?? "";

  const canNext1 = form.nombre.trim() && form.email.trim() && form.telefono.trim() && form.empresa.trim();
  const canNext2 = form.productoId && form.valorEstimado;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agente/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          employeeId,
          cliente: {
            nombre:   form.nombre,
            email:    form.email,
            telefono: form.telefono,
            empresa:  form.empresa,
            rfc:      form.rfc,
            ciudad:   form.ciudad,
            notas:    form.notas,
          },
          deal: {
            titulo:        form.dealTitulo || autoTitle,
            productoId:    form.productoId,
            cantidad:      parseFloat(form.cantidad) || null,
            valorEstimado: parseFloat(form.valorEstimado),
            pipeline:      form.pipeline,
            color:         form.color,
            notas:         form.dealNotas,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setResult(data);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      nombre: "", email: "", telefono: "", empresa: "",
      rfc: "", ciudad: "", notas: "", dealTitulo: "",
      productoId: "", cantidad: "", valorEstimado: "",
      pipeline: "PROSPECTO", color: "", dealNotas: "",
    });
    setStep(1);
    setSuccess(false);
    setResult(null);
    setError(null);
  };

  // ── SUCCESS ──
  if (success) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles size={36} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
              ¡Cliente Registrado!
            </h2>
            <p className="text-zinc-500 text-sm">
              <span className="text-[#FDCB02] font-bold">{form.nombre}</span> fue agregado al CRM
              con su deal inicial en pipeline.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Cliente</p>
              <p className="text-xs font-bold text-white">{form.nombre}</p>
              <p className="text-[10px] text-zinc-600">{form.email}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Deal</p>
              <p className="text-xs font-bold text-white truncate">{form.dealTitulo || autoTitle}</p>
              <p className="text-[10px] text-[#FDCB02] font-mono">{fmt(parseFloat(form.valorEstimado) || 0)}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-[#FDCB02] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-300 transition-all"
          >
            Registrar Otro Cliente
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 gap-4 overflow-hidden">

      {/* ── FORMULARIO ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

        {/* Steps header */}
        <div className="px-6 py-5 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done    = step > s.id;
              const current = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 ${current ? "opacity-100" : done ? "opacity-70" : "opacity-30"}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      done    ? "bg-emerald-500 text-black" :
                      current ? "bg-[#FDCB02] text-black"  : "bg-zinc-800 text-zinc-600"
                    }`}>
                      {done
                        ? <CheckCircle2 size={13} />
                        : <s.icon size={13} />
                      }
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest hidden md:block ${
                      current ? "text-white" : "text-zinc-600"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${done ? "bg-emerald-500/30" : "bg-zinc-800"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Cliente ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#FDCB02] mb-4 flex items-center gap-2">
                    <User size={13} /> Información Personal
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLS}>Nombre Completo *</label>
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                          placeholder="María García López"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Email *</label>
                      <div className="relative">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.email} onChange={(e) => set("email", e.target.value)}
                          placeholder="maria@empresa.com" type="email"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Teléfono *</label>
                      <div className="relative">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
                          placeholder="+52 55 1234 5678"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Empresa *</label>
                      <div className="relative">
                        <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.empresa} onChange={(e) => set("empresa", e.target.value)}
                          placeholder="Textiles del Norte SA"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2 mt-4">
                    <FileText size={13} /> Datos Fiscales y Ubicación
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLS}>RFC</label>
                      <div className="relative">
                        <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.rfc} onChange={(e) => set("rfc", e.target.value)}
                          placeholder="GALO800101XXX"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Ciudad</label>
                      <div className="relative">
                        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)}
                          placeholder="Ciudad de México"
                          className={INPUT_CLS + " pl-9"} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className={LABEL_CLS}>Notas del Cliente</label>
                      <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)}
                        placeholder="Referencias, canal de contacto, contexto..."
                        rows={3}
                        className={INPUT_CLS + " resize-none"} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Deal ── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-xs font-black uppercase tracking-widest text-[#FDCB02] mb-4 flex items-center gap-2">
                  <Target size={13} /> Deal Inicial
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Título del Deal</label>
                    <input
                      value={form.dealTitulo || autoTitle}
                      onChange={(e) => set("dealTitulo", e.target.value)}
                      placeholder={autoTitle || "Nombre del deal..."}
                      className={INPUT_CLS}
                    />
                    {autoTitle && !form.dealTitulo && (
                      <p className="text-[9px] text-zinc-600 mt-1 flex items-center gap-1">
                        <Sparkles size={9} /> Auto-generado — puedes editarlo
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Producto de Interés *</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {productos.map((p) => (
                        <button key={p.id}
                          onClick={() => set("productoId", p.id)}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            form.productoId === p.id
                              ? "border-[#FDCB02] bg-[#FDCB02]/10"
                              : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/40"
                          }`}
                        >
                          <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                            form.productoId === p.id ? "text-[#FDCB02]" : "text-zinc-300"
                          }`}>
                            {p.title}
                          </p>
                          <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{p.sku}</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{fmt(p.priceMayoreo)}/u</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Cantidad Estimada</label>
                    <input value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)}
                      placeholder="500 kg" type="number" min="0"
                      className={INPUT_CLS} />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Valor Estimado MXN *</label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input value={form.valorEstimado} onChange={(e) => set("valorEstimado", e.target.value)}
                        placeholder="50000" type="number" min="0"
                        className={INPUT_CLS + " pl-9"} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Color / Referencia</label>
                    <input value={form.color} onChange={(e) => set("color", e.target.value)}
                      placeholder="Negro, Blanco, Ref. 04..."
                      className={INPUT_CLS} />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Etapa Pipeline</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["PROSPECTO", "COTIZANDO", "NEGOCIACION"] as PipelineStatus[]).map((s) => (
                        <button key={s}
                          onClick={() => set("pipeline", s)}
                          className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                            form.pipeline === s
                              ? PIPELINE_CFG[s].cls
                              : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
                          }`}
                        >
                          {PIPELINE_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Notas del Deal</label>
                    <textarea value={form.dealNotas} onChange={(e) => set("dealNotas", e.target.value)}
                      placeholder="Contexto de la negociación, requerimientos especiales..."
                      rows={3}
                      className={INPUT_CLS + " resize-none"} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Confirmación ── */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-xs font-black uppercase tracking-widest text-[#FDCB02] mb-4 flex items-center gap-2">
                  <CheckCircle2 size={13} /> Confirmar Registro
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Resumen cliente */}
                  <div className="bg-zinc-900/60 border border-white/[0.04] rounded-2xl p-5 space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                      <User size={11} /> Cliente
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FDCB02] text-black font-black text-sm flex items-center justify-center shrink-0">
                        {form.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{form.nombre}</p>
                        <p className="text-[10px] text-zinc-500">{form.empresa}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      {[
                        { icon: <Mail size={10} />,     val: form.email    },
                        { icon: <Phone size={10} />,    val: form.telefono },
                        { icon: <MapPin size={10} />,   val: form.ciudad   },
                        { icon: <Hash size={10} />,     val: form.rfc      },
                      ].filter((r) => r.val).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="text-zinc-700 shrink-0">{r.icon}</span>
                          {r.val}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen deal */}
                  <div className="bg-zinc-900/60 border border-[#FDCB02]/10 rounded-2xl p-5 space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                      <Target size={11} /> Deal
                    </p>
                    <div>
                      <p className="text-sm font-bold text-white">{form.dealTitulo || autoTitle}</p>
                      <span className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight mt-1 ${PIPELINE_CFG[form.pipeline].cls}`}>
                        {PIPELINE_CFG[form.pipeline].label}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      {[
                        { icon: <Package size={10} />,    val: productoSeleccionado?.title },
                        { icon: <DollarSign size={10} />, val: form.valorEstimado ? fmt(parseFloat(form.valorEstimado)) : null },
                        { icon: <Hash size={10} />,       val: form.cantidad ? `${form.cantidad} unidades` : null },
                        { icon: <FileText size={10} />,   val: form.color || null },
                      ].filter((r) => r.val).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="text-zinc-700 shrink-0">{r.icon}</span>
                          {r.val}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-white/[0.04] shrink-0 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={13} /> Anterior
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canNext1 : !canNext2}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#FDCB02] text-black hover:bg-yellow-300 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Siguiente <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
                : <><CheckCircle2 size={13} /> Registrar Cliente</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── SIDEBAR: Recientes ── */}
      <div className="w-72 shrink-0 flex flex-col bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04] shrink-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Clock size={13} className="text-[#FDCB02]" /> Últimos Registrados
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] [&::-webkit-scrollbar]:w-0">
          {recientes.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-[10px] text-zinc-700 uppercase tracking-widest text-center">
                Sin registros aún
              </p>
            </div>
          ) : (
            recientes.map((d, idx) => (
              <motion.div key={d.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="px-5 py-4 hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 text-[9px] font-black flex items-center justify-center shrink-0">
                    {(d.user?.name ?? d.company).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-200 truncate">
                      {d.user?.name ?? "Sin nombre"}
                    </p>
                    <p className="text-[9px] text-zinc-600 truncate">{d.company}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-tight ${PIPELINE_CFG[d.status].cls}`}>
                    {PIPELINE_CFG[d.status].label}
                  </span>
                  <span className="text-[9px] font-mono text-[#FDCB02]">
                    {fmt(d.value)}
                  </span>
                </div>
                {d.product && (
                  <p className="text-[9px] text-zinc-700 mt-1 truncate">{d.product.title}</p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}