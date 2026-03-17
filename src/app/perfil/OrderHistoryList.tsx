'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/cart-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Clock, CheckCircle2, AlertCircle, RotateCw, 
  Map, FileText, ShoppingBag, Box, Truck, Loader2
} from 'lucide-react'; // 🔥 Loader2 importado

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  PENDING:    { label: 'Pendiente de Pago', color: 'bg-orange-950 text-orange-400 border-orange-900', icon: Clock },
  PAID:       { label: 'Pagado / Preparando', color: 'bg-blue-950 text-blue-400 border-blue-900', icon: Box },
  PROCESSING: { label: 'En Corte', color: 'bg-purple-950 text-purple-400 border-purple-900', icon: RotateCw },
  SHIPPED:    { label: 'En Tránsito', color: 'bg-yellow-950 text-yellow-500 border-yellow-900', icon: Truck },
  DELIVERED:  { label: 'Entregado', color: 'bg-green-950 text-green-400 border-green-900', icon: CheckCircle2 },
  FAILED:     { label: 'Pago Fallido', color: 'bg-red-950 text-red-400 border-red-900', icon: AlertCircle },
  CANCELLED:  { label: 'Cancelado', color: 'bg-neutral-900 text-neutral-400 border-neutral-800', icon: AlertCircle },
};

export default function OrderHistoryList({ orders }: { orders: any[] }) {
  const router = useRouter();
  const { addItem, clearCart } = useCart();
  const [activeTab, setActiveTab] = useState<'pedidos' | 'facturas'>('pedidos');

  const handleReorder = (order: any) => {
    if (!confirm('¿Quieres limpiar tu carrito actual y agregar los artículos de este pedido?')) return;
    
    clearCart();
    
    order.items.forEach((item: any) => {
      const cartId = `${item.productId || 'custom'}-${Date.now()}-${Math.random()}`;
      
      addItem({
        id: cartId,
        productId: item.productId || 'desc',
        title: item.title,
        price: item.price, 
        quantity: item.quantity,
        unit: item.unit || 'Kg',
        image: '/assets/products/placeholder_licra.jpg', 
        meta: { color: item.color, mode: item.unit?.toLowerCase().includes('rollo') ? 'rollo' : 'kilo' }
      });
    });

    router.push('/checkout');
  };

  return (
    <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 overflow-hidden mt-8 shadow-2xl">
      <div className="flex border-b border-white/5">
        <button onClick={() => setActiveTab('pedidos')} className={`flex-1 py-6 text-xs font-[1000] uppercase tracking-widest transition-all ${activeTab === 'pedidos' ? 'bg-white/5 text-[#FDCB02] border-b-2 border-[#FDCB02]' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}>
          Historial de Pedidos
        </button>
        <button onClick={() => setActiveTab('facturas')} className={`flex-1 py-6 text-xs font-[1000] uppercase tracking-widest transition-all ${activeTab === 'facturas' ? 'bg-white/5 text-[#FDCB02] border-b-2 border-[#FDCB02]' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}>
          Facturas (CFDI 4.0)
        </button>
      </div>

      <div className="p-6 md:p-10">
        <AnimatePresence mode="wait">
          
          {activeTab === 'pedidos' && (
            <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag size={48} className="mx-auto text-neutral-800 mb-4"/>
                  <h3 className="text-xl font-[1000] text-white uppercase tracking-tight">Sin historial</h3>
                  <p className="text-neutral-500 text-xs font-bold mt-2">Aún no has realizado ninguna orden.</p>
                </div>
              ) : (
                orders.map((order: any) => {
                  const StatusIcon = STATUS_MAP[order.status]?.icon || Package;
                  const statusStyles = STATUS_MAP[order.status] || STATUS_MAP['PENDING'];

                  return (
                    <div key={order.id} className="bg-black rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-[1000] text-white uppercase tracking-tight">Orden #{order.orderNumber?.slice(-8) || order.id.slice(-8)}</h3>
                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1.5 border ${statusStyles.color}`}>
                              <StatusIcon size={12}/> {statusStyles.label}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                            {new Date(order.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-black mb-1">Total Pagado</p>
                          <p className="text-xl font-[1000] text-white">${order.total?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 mb-6">
                        <ul className="space-y-3">
                          {order.items?.map((item: any) => (
                            <li key={item.id} className="flex justify-between items-center text-xs">
                              <span className="font-bold text-neutral-300">
                                <span className="text-[#FDCB02] mr-2">{item.quantity} {item.unit || 'Kg'}</span> 
                                {item.title} {item.color ? <span className="text-neutral-500">({item.color})</span> : ''}
                              </span>
                              <span className="font-bold text-white">${(item.price * item.quantity).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => handleReorder(order)}
                          className="bg-[#FDCB02] hover:bg-white text-black px-6 py-3 rounded-xl text-[10px] font-[1000] uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(253,203,2,0.15)]"
                        >
                          <RotateCw size={14}/> Volver a Comprar
                        </button>
                        
                        {order.trackingUrl && (
                          <a 
                            href={order.trackingUrl} target="_blank" rel="noreferrer"
                            className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800/50 px-6 py-3 rounded-xl text-[10px] font-[1000] uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <Map size={14}/> Rastrear Envío
                          </a>
                        )}

                        {/* 🔥 EL BOTÓN INTELIGENTE DE FACTURAPI */}
                        {order.wantsInvoice && order.invoiceStatus?.startsWith('http') ? (
                          <a 
                            href={order.invoiceStatus} target="_blank" rel="noreferrer"
                            className="bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-[1000] uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <FileText size={14}/> Descargar PDF/XML
                          </a>
                        ) : order.wantsInvoice && order.invoiceStatus === "ERROR" ? (
                          <span className="bg-red-950/30 text-red-500 border border-red-900/50 px-6 py-3 rounded-xl text-[10px] font-[1000] uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={14}/> Error Fiscal (Contactar Soporte)
                          </span>
                        ) : order.wantsInvoice ? (
                          <span className="bg-white/5 text-neutral-600 border border-white/5 px-6 py-3 rounded-xl text-[10px] font-[1000] uppercase tracking-widest flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin"/> Generando CFDI...
                          </span>
                        ) : null}

                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'facturas' && (
            <motion.div key="facturas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-16">
              <FileText size={48} className="mx-auto text-neutral-800 mb-4"/>
              <h3 className="text-xl font-[1000] text-white uppercase tracking-tight">Portal Fiscal</h3>
              <p className="text-neutral-500 text-xs font-bold mt-2 max-w-sm mx-auto">
                Tus comprobantes fiscales (XML y PDF) se envían automáticamente al correo registrado en tu cuenta 24 horas hábiles después de procesar tu pago.
              </p>
              
              {/* 🔥 NUEVO: Lista de Facturas Listas para descargar */}
              <div className="mt-8 flex flex-col items-center gap-3">
                {orders.filter(o => o.wantsInvoice && o.invoiceStatus?.startsWith('http')).map(order => (
                   <a 
                     key={`fac-${order.id}`}
                     href={order.invoiceStatus} target="_blank" rel="noreferrer"
                     className="bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10 px-6 py-4 rounded-xl text-xs font-[1000] uppercase tracking-widest transition-all flex items-center gap-4 w-full max-w-md justify-between"
                   >
                     <span className="flex items-center gap-3"><FileText size={16} className="text-[#FDCB02]"/> Orden #{order.orderNumber?.slice(-8) || order.id.slice(-8)}</span>
                     <span className="text-[10px] bg-black px-2 py-1 rounded border border-white/10">Descargar</span>
                   </a>
                ))}
                {orders.filter(o => o.wantsInvoice && o.invoiceStatus?.startsWith('http')).length === 0 && (
                  <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-black">Aún no hay facturas listas para descargar.</p>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}