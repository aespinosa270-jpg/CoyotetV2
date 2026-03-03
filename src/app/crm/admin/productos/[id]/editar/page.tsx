"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ChevronLeft, AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react';
import { updateProductAction, getProductById } from '@/app/actions/products';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Cargar datos reales de Supabase al entrar
  useEffect(() => {
    async function loadProduct() {
      const data = await getProductById(params.id as string);
      if (data) {
        setProduct(data);
      } else {
        setMessage({ type: 'error', text: 'Tela no encontrada en el sistema.' });
      }
      setLoading(false);
    }
    loadProduct();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateProductAction(params.id as string, formData);

    if (result.success) {
      setMessage({ type: 'success', text: '¡Cambios aplicados correctamente!' });
      setTimeout(() => router.push('/crm/admin/bodega'), 1500); // Regresa a bodega tras éxito
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al actualizar.' });
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <Loader2 className="text-[#FDCB02] animate-spin" size={40} />
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <Link href="/crm/admin/bodega" className="text-neutral-500 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all">
            <ChevronLeft size={14} /> Volver a Bodega
          </Link>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center gap-4">
            <div className="p-3 bg-[#FDCB02]/10 rounded-2xl">
                <Package className="text-[#FDCB02]" size={24} />
            </div>
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Editar: {product?.title}</h2>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Modificando registro en Supabase</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-2xl flex items-center gap-3 border ${
              message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[32px] space-y-4 col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Información General</label>
                <div className="grid grid-cols-2 gap-4">
                    <input name="sku" defaultValue={product?.sku} className="bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-[#FDCB02] outline-none" placeholder="SKU" />
                    <input name="title" defaultValue={product?.title} className="bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-[#FDCB02] outline-none" placeholder="Título" />
                    <select name="category" defaultValue={product?.category} className="bg-black border border-white/10 rounded-xl p-3 text-sm outline-none">
                        <option value="Telas Técnicas">Telas Técnicas</option>
                        <option value="Escolar / Deportivo">Escolar / Deportivo</option>
                        <option value="Línea Invernal">Línea Invernal</option>
                    </select>
                    <select name="unit" defaultValue={product?.unit} className="bg-black border border-white/10 rounded-xl p-3 text-sm outline-none">
                        <option value="KILO">KILO</option>
                        <option value="METRO">METRO</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[32px] space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-emerald-500">Precios</label>
                <input name="priceMenudeo" step="0.01" type="number" defaultValue={product?.priceMenudeo} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none font-mono" placeholder="Menudeo" />
                <input name="priceMayoreo" step="0.01" type="number" defaultValue={product?.priceMayoreo} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none font-mono" placeholder="Mayoreo" />
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[32px] space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-blue-500">Especificaciones</label>
                <input name="composicion" defaultValue={product?.composicion} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="Composición" />
                <div className="grid grid-cols-2 gap-2">
                    <input name="gramaje" defaultValue={product?.gramaje} className="bg-black border border-white/10 rounded-xl p-3 text-sm outline-none" placeholder="Grams" />
                    <input name="ancho" defaultValue={product?.ancho} className="bg-black border border-white/10 rounded-xl p-3 text-sm outline-none" placeholder="Ancho" />
                </div>
            </div>

            <div className="col-span-2 flex justify-end gap-4 pt-4">
               <Link href="/crm/admin/bodega" className="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-all">Cancelar</Link>
               <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#FDCB02] text-black px-10 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-[#FDCB02]/20 flex items-center gap-2"
               >
                 {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                 Guardar Cambios
               </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}