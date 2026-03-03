"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Tag, DollarSign, Ruler, 
  Layers, Save, ChevronLeft, AlertCircle, CheckCircle2
} from 'lucide-react';
import { createProductAction } from '@/app/actions/products'; // Tu acción real
import Link from 'next/link';

export default function NuevoProductoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Función que intercepta el formulario y lo manda al Backend
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createProductAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: `¡Tela guardada en Supabase con éxito! (ID: ${result.productId})` });
      (e.target as HTMLFormElement).reset(); // Limpia el formulario
    } else {
      setMessage({ type: 'error', text: result.error || "Error desconocido." });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE COMANDO */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-neutral-500">
             <Link href="/crm/admin/bodega" className="hover:text-white transition-colors">Bodega</Link>
             <ChevronLeft size={14} />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Nueva Tela</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Alta de Catálogo</h2>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Ingreso directo a Base de Datos (Supabase)</p>
          </div>

          {/* MENSAJES DE SISTEMA */}
          {message && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 mb-6 rounded-2xl flex items-center gap-3 border ${
              message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-bold">{message.text}</span>
            </motion.div>
          )}

          {/* EL FORMULARIO REAL */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* BLOQUE 1: Identificación */}
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Tag className="text-[#FDCB02]" size={20} />
                <h3 className="text-lg font-bold">Identificación Comercial</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">SKU Único</label>
                  <input required name="sku" type="text" placeholder="Ej. SKU-MEZCLILLA-01" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none transition-all uppercase font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Nombre de la Tela</label>
                  <input required name="title" type="text" placeholder="Ej. Mezclilla Diablo Uso Rudo" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Categoría</label>
                  <select required name="category" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none appearance-none transition-all cursor-pointer">
                    <option value="Telas Técnicas">Telas Técnicas</option>
                    <option value="Escolar / Deportivo">Escolar / Deportivo</option>
                    <option value="Línea Invernal">Línea Invernal</option>
                    <option value="Deportivas / Sublimación">Deportivas / Sublimación</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Unidad de Medida</label>
                  <select required name="unit" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none appearance-none transition-all cursor-pointer">
                    <option value="KILO">Venta por Kilo</option>
                    <option value="METRO">Venta por Metro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BLOQUE 2: Precios */}
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <DollarSign className="text-emerald-500" size={20} />
                <h3 className="text-lg font-bold">Esquema de Precios (MXN)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Precio Menudeo</label>
                  <input required name="priceMenudeo" type="number" step="0.01" placeholder="95.00" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all font-mono text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Precio Mayoreo (Rollo)</label>
                  <input required name="priceMayoreo" type="number" step="0.01" placeholder="85.00" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all font-mono text-emerald-500" />
                </div>
              </div>
            </div>

            {/* BLOQUE 3: Ficha Técnica */}
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Layers className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold">Ficha Técnica</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Composición</label>
                  <input required name="composicion" type="text" placeholder="Ej. 100% Poliéster" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gramaje</label>
                  <input required name="gramaje" type="text" placeholder="Ej. 140g" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ancho</label>
                  <input required name="ancho" type="text" placeholder="Ej. 1.60m" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* BOTÓN DE ACCIÓN */}
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#FDCB02] text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(253,203,2,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Escribiendo en Supabase...</span>
                ) : (
                  <>
                    <Save size={18} /> Forjar en Catálogo
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}