"use client";

import { useState, useTransition, useEffect } from "react";
import { createDealAction } from "@/app/actions/deals";
import { X, ArrowRight, Loader2, CheckCircle2, Target, Building2, User2, Package, Palette, Hash, DollarSign } from "lucide-react";
import type { DealRow, Agent, Product } from "./KanbanBoard";

export default function ModalNuevoDeal({
  agents, products, onClose, onCreated,
}: {
  agents:    Agent[];
  products:  Product[];
  onClose:   () => void;
  onCreated: (deal: DealRow) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    title: "", company: "", employeeId: "",
    productId: "", color: "", quantity: "", value: "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedProduct = products.find((p) => p.id === form.productId);
  const autoValue = selectedProduct && form.quantity
    ? (selectedProduct.priceMayoreo * parseFloat(form.quantity)).toFixed(2)
    : "";

  // Efecto para cerrar el modal tras éxito
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => onClose(), 1200);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Evitamos refresh por si acaso
    setError("");
    
    startTransition(async () => {
      const finalValue = parseFloat(form.value || autoValue || "0");
      
      const result = await createDealAction({
        title:      form.title,
        company:    form.company,
        employeeId: form.employeeId,
        value:      finalValue,
        productId:  form.productId || undefined,
        color:      form.color     || undefined,
        quantity:   form.quantity  ? parseFloat(form.quantity) : undefined,
      });

      if (result.success) {
        setSuccess(true);
        const agent = agents.find((a) => a.id === form.employeeId)!;
        
        onCreated({
          id:        result.dealId,
          title:     form.title,
          company:   form.company,
          value:     finalValue,
          color:     form.color    || null,
          quantity:  form.quantity ? parseFloat(form.quantity) : null,
          status:    "PROSPECTO",
          updatedAt: new Date(),
          employee:  { id: agent.id, name: agent.name },
          product:   selectedProduct
            ? { id: selectedProduct.id, title: selectedProduct.title, sku: selectedProduct.sku }
            : null,
          user: null,
        });
      } else {
        setError(result.error);
      }
    });
  };

  const inp = "w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-[#FDCB02] transition-all placeholder:text-zinc-700";
  const lbl = "text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-1.5 block font-black";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-900 shrink-0">
          <div>
            <h2 className="text-xl font-[900] uppercase tracking-tighter text-white italic">
              Nuevo <span className="text-[#FDCB02]">Deal</span>
            </h2>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1 font-bold">Registro de Oportunidad</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center justify-center transition-colors border border-white/5">
            <X size={16} className="text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}><Target size={10} className="inline mr-1" /> Título *</label>
              <input required placeholder="Ej. Mezclilla 14oz" className={inp} value={form.title} onChange={set("title")} />
            </div>
            <div>
              <label className={lbl}><Building2 size={10} className="inline mr-1" /> Empresa *</label>
              <input required placeholder="Ej. Confecciones S.A." className={inp} value={form.company} onChange={set("company")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className={lbl}><User2 size={10} className="inline mr-1" /> Agente *</label>
                <select required className={inp} value={form.employeeId} onChange={set("employeeId")}>
                  <option value="">Seleccionar...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}><Package size={10} className="inline mr-1" /> Producto</label>
                <select className={inp} value={form.productId} onChange={set("productId")}>
                  <option value="">Sin producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
          </div>

          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}><Palette size={10} className="inline mr-1" /> Color</label>
                <input placeholder="Ej. Índigo" className={inp} value={form.color} onChange={set("color")} />
              </div>
              <div>
                <label className={lbl}><Hash size={10} className="inline mr-1" /> Cantidad ({selectedProduct.unit})</label>
                <input type="number" step="0.01" className={inp} value={form.quantity} onChange={set("quantity")} />
              </div>
            </div>
          )}

          <div>
            <label className={lbl}><DollarSign size={10} className="inline mr-1" /> Valor Estimado (MXN)</label>
            <div className="relative">
                <input
                    type="number" step="0.01"
                    placeholder={autoValue ? `Calculado: $${parseFloat(autoValue).toLocaleString()}` : "0.00"}
                    className={`${inp} font-mono ${autoValue && !form.value ? 'text-[#FDCB02]/50' : 'text-[#FDCB02]'}`} 
                    value={form.value} onChange={set("value")}
                />
            </div>
            {autoValue && !form.value && (
              <p className="text-[10px] text-[#FDCB02]/60 mt-2 italic font-medium">
                💡 Sugerido por stock: ${parseFloat(autoValue).toLocaleString("es-MX")}
              </p>
            )}
          </div>

          {error && (
            <div className="text-[10px] text-red-400 border border-red-900/30 bg-red-900/10 px-4 py-3 rounded-xl uppercase tracking-widest font-black">
              Error: {error}
            </div>
          )}
        </form>

        <div className="px-8 py-6 border-t border-zinc-900 shrink-0 bg-[#0a0a0a]">
          <button
            onClick={handleSubmit}
            disabled={isPending || success || !form.title || !form.company || !form.employeeId}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${
              success 
                ? "bg-emerald-500 text-black shadow-emerald-500/20" 
                : "bg-[#FDCB02] text-black hover:bg-yellow-400 active:scale-[0.98] shadow-yellow-500/10"
            } disabled:opacity-20`}
          >
            {success ? (
              <><CheckCircle2 size={18} strokeWidth={3} /> Deal Registrado</>
            ) : isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Procesando</>
            ) : (
              <>Crear Oportunidad <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}