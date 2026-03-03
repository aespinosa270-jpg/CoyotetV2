"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getProductsWithColors, registerMovementAction } from "@/app/actions/inventory";

type Product = Awaited<ReturnType<typeof getProductsWithColors>>[number];

export default function MovimientoPage() {
  const router   = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [products,     setProducts]     = useState<Product[]>([]);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");

  const [form, setForm] = useState({
    type:         "ENTRADA" as "ENTRADA" | "SALIDA" | "AJUSTE",
    productId:    "",
    colorId:      "",
    location:     "GUATEMALA_97" as "GUATEMALA_97" | "PLOMO_203",
    quantity:     "",
    rollCount:    "",
    provider:     "",
    authorizedBy: "",
    notes:        "",
  });

  useEffect(() => {
    getProductsWithColors().then(setProducts);
  }, []);

  // Al cambiar producto, actualizar el objeto seleccionado y limpiar color
  useEffect(() => {
    const p = products.find((p) => p.id === form.productId) ?? null;
    setSelectedProd(p);
    setForm((f) => ({ ...f, colorId: "" }));
  }, [form.productId, products]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await registerMovementAction({
        type:         form.type,
        productId:    form.productId,
        colorId:      form.colorId || undefined,
        location:     form.location,
        quantity:     parseFloat(form.quantity),
        rollCount:    parseInt(form.rollCount || "0"),
        provider:     form.provider || undefined,
        authorizedBy: form.authorizedBy,
        notes:        form.notes || undefined,
      });

      if (result.success) {
        setSuccess(`✓ Movimiento registrado — ID: ${result.movementId}`);
        setTimeout(() => router.push("/crm/admin/inventario"), 1500);
      } else {
        setError(result.error);
      }
    });
  };

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors placeholder:text-zinc-600";
  const labelCls = "text-xs text-zinc-500 tracking-widest uppercase mb-1.5 block";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-1">Kardex Operacional</p>
          <h1 className="text-2xl font-bold tracking-tight">
            REGISTRAR <span className="text-amber-400">MOVIMIENTO</span>
          </h1>
        </div>

        {/* Tipo de movimiento */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {(["ENTRADA", "SALIDA", "AJUSTE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`py-3 text-xs tracking-widest font-bold border transition-colors ${
                form.type === t
                  ? t === "ENTRADA"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : t === "SALIDA"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-amber-500/20 border-amber-500 text-amber-400"
                  : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {/* Sucursal */}
          <div>
            <label className={labelCls}>Sucursal</label>
            <select className={inputCls} value={form.location} onChange={set("location")}>
              <option value="GUATEMALA_97">Guatemala #97</option>
              <option value="PLOMO_203">Plomo #203</option>
            </select>
          </div>

          {/* Producto */}
          <div>
            <label className={labelCls}>Producto</label>
            <select className={inputCls} value={form.productId} onChange={set("productId")}>
              <option value="">— Selecciona un producto —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Color — solo si el producto tiene colores */}
          {selectedProd && selectedProd.colors.length > 0 && (
            <div>
              <label className={labelCls}>Color / Variante</label>
              <select className={inputCls} value={form.colorId} onChange={set("colorId")}>
                <option value="">— Sin color específico —</option>
                {selectedProd.colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {/* Preview de colores */}
              <div className="flex gap-2 mt-2">
                {selectedProd.colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setForm((f) => ({ ...f, colorId: c.id }))}
                    title={c.name}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      form.colorId === c.id ? "border-amber-400 scale-125" : "border-zinc-700"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cantidad y Rollos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Cantidad ({selectedProd?.unit ?? "kg/m"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={inputCls}
                value={form.quantity}
                onChange={set("quantity")}
              />
            </div>
            <div>
              <label className={labelCls}>Rollos físicos</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                className={inputCls}
                value={form.rollCount}
                onChange={set("rollCount")}
              />
            </div>
          </div>

          {/* Proveedor (solo ENTRADA) */}
          {form.type === "ENTRADA" && (
            <div>
              <label className={labelCls}>Proveedor</label>
              <input
                type="text"
                placeholder="Ej. Textiles El Zorro"
                className={inputCls}
                value={form.provider}
                onChange={set("provider")}
              />
            </div>
          )}

          {/* Autorizó */}
          <div>
            <label className={labelCls}>Autorizó *</label>
            <input
              type="text"
              placeholder="Nombre completo de quien autoriza"
              className={inputCls}
              value={form.authorizedBy}
              onChange={set("authorizedBy")}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <textarea
              rows={2}
              placeholder="Observaciones adicionales..."
              className={`${inputCls} resize-none`}
              value={form.notes}
              onChange={set("notes")}
            />
          </div>

          {/* Timestamp info */}
          <p className="text-xs text-zinc-600 border border-zinc-900 px-3 py-2">
            ⏱ El timestamp se registra automáticamente en el servidor — no modificable.
          </p>

          {/* Feedback */}
          {error   && <p className="text-xs text-red-400 border border-red-900 px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-emerald-400 border border-emerald-900 px-3 py-2">{success}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.productId || !form.quantity || !form.authorizedBy}
            className="w-full py-4 bg-amber-400 text-black font-bold tracking-widest text-sm hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? "REGISTRANDO..." : `CONFIRMAR ${form.type}`}
          </button>
        </div>
      </div>
    </div>
  );
}