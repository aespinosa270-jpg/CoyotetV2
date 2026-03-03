"use client"

import React, { useState, useEffect } from 'react';
import { Package, ArrowRightLeft, CheckCircle2, AlertTriangle, Loader2, Save } from 'lucide-react';
import { getProductsForInventory, registerMovementAction } from '@/app/actions/inventory';

export default function MovimientosInventarioPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getProductsForInventory();
      setProducts(data);
    }
    load();
  }, []);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prod = products.find(p => p.id === e.target.value);
    setSelectedProduct(prod || null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerMovementAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'Movimiento registrado y firmado en el Kardex.' });
      (e.target as HTMLFormElement).reset();
      setSelectedProduct(null);
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-3xl font-[1000] uppercase text-white tracking-tighter flex items-center gap-3">
          <ArrowRightLeft className="text-[#FDCB02]" size={32} /> 
          Control de <span className="text-[#FDCB02]">Existencias</span>
        </h2>
        <p className="text-neutral-500 font-mono text-xs mt-2 uppercase tracking-widest">
          Registro de Entradas y Salidas (Kardex Interno)
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-bold uppercase tracking-widest">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* BLOQUE 1: QUÉ Y DÓNDE */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">1. Identificación y Ubicación</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tipo de Movimiento</label>
              <select required name="type" className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#FDCB02] outline-none font-bold">
                <option value="ENTRADA">ENTRADA (Recepción)</option>
                <option value="SALIDA">SALIDA (Despacho)</option>
                <option value="AJUSTE">AJUSTE (Inventario Físico)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sucursal / Bodega</label>
              <select required name="location" className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#FDCB02] outline-none">
                <option value="GUATEMALA_97">Guatemala 97 (Centro)</option>
                <option value="PLOMO_203">Plomo 203</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tela a mover</label>
              <select required name="productId" onChange={handleProductChange} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#FDCB02] outline-none">
                <option value="">-- Selecciona una Tela --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Variante de Color</label>
              <select required name="colorId" disabled={!selectedProduct || selectedProduct.colors.length === 0} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#FDCB02] outline-none disabled:opacity-50">
                <option value="">{selectedProduct?.colors.length ? '-- Selecciona un Color --' : 'Sin colores / Único'}</option>
                {selectedProduct?.colors.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: CANTIDADES Y PROVEEDOR */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">2. Cantidades y Origen</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Rollos Físicos</label>
              <input required name="rollCount" type="number" min="1" placeholder="Ej. 10" className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none font-mono text-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Metraje / Kilaje Total</label>
              <input required name="quantity" type="number" step="0.01" min="0.1" placeholder="Ej. 250.5" className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none font-mono text-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Proveedor (Solo Entradas)</label>
              <input name="provider" type="text" placeholder="Ej. Textiles El Zorro" className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm outline-none" />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: AUDITORÍA (FIRMA) */}
        <div className="space-y-4 bg-rose-500/5 border border-rose-500/10 p-6 rounded-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500 border-b border-rose-500/10 pb-2 flex items-center gap-2">
            <AlertTriangle size={12} /> 3. Autorización y Registro
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">¿Quién autoriza este movimiento?</label>
              <input required name="authorizedBy" type="text" placeholder="Ej. Jack Rizk / Stephany Rizk" className="w-full bg-[#111] border border-rose-500/20 rounded-lg px-4 py-3 text-sm focus:border-rose-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Notas / Razón de Movimiento</label>
              <input name="notes" type="text" placeholder="Ej. Recepción de lote #4092, llegó incompleto" className="w-full bg-[#111] border border-rose-500/20 rounded-lg px-4 py-3 text-sm focus:border-rose-500 outline-none" />
            </div>
          </div>
          <p className="text-[9px] text-neutral-500 font-mono mt-2 uppercase tracking-widest">
            * El sistema estampará automáticamente la fecha y hora exacta del servidor al procesar.
          </p>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-[#FDCB02] text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isSubmitting ? 'Cifrando en Kardex...' : 'Firmar y Ejecutar Movimiento'}
        </button>

      </form>
    </div>
  );
}