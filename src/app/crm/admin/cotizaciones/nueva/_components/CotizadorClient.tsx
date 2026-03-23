"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, FileDown, Building2, ShoppingBag, ArrowLeft, Percent } from "lucide-react";
import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CotizacionPDF from "./CotizacionPDF";

interface Cliente { id: string; name: string; company: string | null; rfc: string | null; email: string }
interface Producto { id: string; title: string; sku: string; priceMayoreo: number }
interface Partida { id: string; productId: string; quantity: number; unitPrice: number; title: string }

const fmt = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

export default function CotizadorClient({ clientes, productos }: { clientes: Cliente[], productos: Producto[] }) {
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState("");
  const [incluirIva, setIncluirIva] = useState(true);
  const [partidas, setPartidas] = useState<Partida[]>([
    { id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, title: "" }
  ]);

  // Evitar error de hidratación con @react-pdf/renderer
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ─── FUNCIONES DE PARTIDAS ───
  const addPartida = () => {
    setPartidas([...partidas, { id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, title: "" }]);
  };

  const removePartida = (id: string) => {
    setPartidas(partidas.filter(p => p.id !== id));
  };

  const updatePartida = (id: string, field: keyof Partida, value: any) => {
    setPartidas(partidas.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      
      // Auto-completar precio y título
      if (field === "productId") {
        const prod = productos.find(x => x.id === value);
        if (prod) {
          updated.unitPrice = Number(prod.priceMayoreo);
          updated.title = prod.title;
        }
      }
      return updated;
    }));
  };

  // ─── CÁLCULOS ───
  const subtotal = partidas.reduce((acc, p) => acc + (p.quantity * p.unitPrice), 0);
  const iva = incluirIva ? subtotal * 0.16 : 0;
  const total = subtotal + iva;

  const selectedClient = clientes.find(c => c.id === clientId);
  const hasValidPartidas = partidas.some(p => p.productId && p.quantity > 0);
  const folioCotizacion = `CTX-${Math.floor(Math.random() * 10000)}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <Link href="/crm/admin/cotizaciones" className="flex items-center gap-2 text-zinc-500 hover:text-[#FDCB02] transition-colors text-[10px] font-black uppercase tracking-widest mb-4">
            <ArrowLeft size={14} /> Volver a Cotizaciones
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">NUEVA <span className="text-[#FDCB02]">COTIZACIÓN</span></h1>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-[10px] font-black tracking-widest uppercase hover:bg-zinc-800 transition-all rounded-xl border border-white/5">
            <Save size={14} /> Guardar Borrador
          </button>

          {/* BOTÓN MÁGICO DEL PDF */}
          {isClient && selectedClient && hasValidPartidas ? (
            <PDFDownloadLink
              document={<CotizacionPDF 
                cliente={selectedClient} 
                partidas={partidas} 
                subtotal={subtotal} 
                iva={iva} 
                total={total} 
                folio={folioCotizacion} 
              />}
              fileName={`Cotizacion_${selectedClient?.company?.replace(/\s+/g, '') || 'Coyote'}.pdf`}
              className="flex items-center gap-2 px-6 py-3 bg-[#FDCB02] text-black text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all rounded-xl shadow-lg shadow-[#FDCB02]/10"
            >
              {({ loading }) => loading ? "Generando..." : <><FileDown size={14} /> Descargar PDF</>}
            </PDFDownloadLink>
          ) : (
            <button disabled className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-zinc-500 text-[10px] font-black tracking-widest uppercase rounded-xl cursor-not-allowed border border-white/5">
              <FileDown size={14} /> Faltan Datos
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── COLUMNA IZQUIERDA ─── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Building2 size={14} className="text-[#FDCB02]"/> Datos del Cliente
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Seleccionar Cliente</label>
                <select 
                  value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all font-mono appearance-none"
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                  ))}
                </select>
              </div>

              <AnimatePresence>
                {selectedClient && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-white/5 space-y-2 font-mono text-xs text-zinc-400 overflow-hidden">
                    <p><strong className="text-white">RFC:</strong> {selectedClient.rfc || "Público General"}</p>
                    <p><strong className="text-white">Email:</strong> {selectedClient.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Percent size={14} className="text-sky-400"/> Impuestos
            </h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${incluirIva ? 'bg-sky-500 border-sky-400' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                {incluirIva && <span className="text-white text-xs font-black">✓</span>}
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest">Incluir IVA (16%)</span>
            </label>
          </div>
        </div>

        {/* ─── COLUMNA DERECHA ─── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#FDCB02]"/> Partidas de Cotización
              </h3>
              <button onClick={addPartida} className="text-[10px] font-black text-[#FDCB02] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                <Plus size={12}/> Añadir Línea
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {partidas.map((partida, idx) => (
                  <motion.div 
                    key={partida.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col sm:flex-row gap-3 items-end bg-zinc-950/50 p-3 rounded-2xl border border-white/5 group"
                  >
                    <div className="w-full sm:w-2/5">
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 block">Producto {idx + 1}</label>
                      <select 
                        value={partida.productId} onChange={e => updatePartida(partida.id, "productId", e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all font-mono appearance-none"
                      >
                        <option value="">-- Seleccionar --</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.title}</option>)}
                      </select>
                    </div>
                    
                    <div className="w-full sm:w-1/5">
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 block">Cant.</label>
                      <input 
                        type="number" min="1" value={partida.quantity} onChange={e => updatePartida(partida.id, "quantity", Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all font-mono text-center"
                      />
                    </div>

                    <div className="w-full sm:w-1/5">
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 block">Precio Unit.</label>
                      <input 
                        type="number" min="0" step="0.01" value={partida.unitPrice} onChange={e => updatePartida(partida.id, "unitPrice", Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all font-mono text-right"
                      />
                    </div>

                    <div className="w-full sm:w-1/5 pb-2 text-right">
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Importe</p>
                      <p className="font-mono text-sm font-black text-emerald-400">{fmt(partida.quantity * partida.unitPrice)}</p>
                    </div>

                    <button 
                      onClick={() => removePartida(partida.id)} disabled={partidas.length === 1}
                      className="p-2.5 mb-0.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-[#FDCB02] rounded-3xl p-8 text-black shadow-xl flex flex-col items-end">
            <div className="w-full sm:w-1/2 space-y-2 text-right font-mono">
              <div className="flex justify-between items-center text-sm font-bold opacity-70">
                <span className="uppercase tracking-widest">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold opacity-70 border-b border-black/10 pb-4">
                <span className="uppercase tracking-widest">IVA (16%)</span>
                <span>{fmt(iva)}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-xs uppercase tracking-widest font-black">Gran Total</span>
                <span className="text-4xl font-black italic tracking-tighter">{fmt(total)}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}