"use client";

import { useState, useTransition } from "react";
import { createDealAction } from "@/app/actions/deals";
import { X, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
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

  const handleSubmit = () => {
    setError("");
    startTransition(async () => {
      const result = await createDealAction({
        title:      form.title,
        company:    form.company,
        employeeId: form.employeeId,
        value:      parseFloat(form.value || autoValue || "0"),
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
          value:     parseFloat(form.value || autoValue || "0"),
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

  const inp = "w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:border-[#FDCB02] transition-colors placeholder:text-zinc-600";
  const lbl = "text-[10px] text-zinc-500 tracking-widest uppercase mb-1.5 block font-bold";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-[900] uppercase tracking-tighter text-white">
              Nuevo <span className="text-[#FDCB02]">Deal</span>
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Entra como Prospecto</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors">
            <X size={14} className="text-zinc-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Título *</label>
              <input placeholder="Ej. Lote 5,000m Mezclilla" className={inp} value={form.title} onChange={set("title")} />
            </div>
            <div>
              <label className={lbl}>Empresa *</label>
              <input placeholder="Ej. Confecciones Ramírez" className={inp} value={form.company} onChange={set("company")} />
            </div>
          </div>

          <div>
            <label className={lbl}>Agente Asignado *</label>
            <select className={inp} value={form.employeeId} onChange={set("employeeId")}>
              <option value="">— Selecciona un agente —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={lbl}>Producto (opcional en Prospecto)</label>
            <select className={inp} value={form.productId} onChange={set("productId")}>
              <option value="">— Sin producto aún —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title} — {p.sku}</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Color / Variante</label>
                <input placeholder="Ej. Azul Rey" className={inp} value={form.color} onChange={set("color")} />
              </div>
              <div>
                <label className={lbl}>Cantidad ({selectedProduct.unit})</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" className={inp} value={form.quantity} onChange={set("quantity")} />
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>Valor Estimado MXN</label>
            <input
              type="number" min="0" step="0.01"
              placeholder={autoValue ? `Auto: $${parseFloat(autoValue).toLocaleString("es-MX")}` : "0.00"}
              className={inp} value={form.value} onChange={set("value")}
            />
            {autoValue && !form.value && (
              <p className="text-[10px] text-[#FDCB02] mt-1">
                💡 Calculado: ${parseFloat(autoValue).toLocaleString("es-MX")} MXN
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 border border-red-900 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isPending || success || !form.title || !form.company || !form.employeeId}
            className="w-full h-12 bg-[#FDCB02] text-black font-[900] text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {success  ? <><CheckCircle2 size={16} /> Deal Creado</>
            : isPending? <><Loader2 size={16} className="animate-spin" /> Creando...</>
            : <>Crear Deal <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}