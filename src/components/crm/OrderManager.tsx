'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// 🔥 AQUÍ ESTÁ LA CORRECCIÓN: Agregamos FileText al final de los íconos importados
import { Search, Package, Truck, CheckCircle2, AlertCircle, Clock, RotateCw, Map, Save, X, Loader2, ExternalLink, FileText } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  PENDING:    { label: 'Pendiente', color: 'bg-orange-950 text-orange-400 border-orange-900', icon: Clock },
  PAID:       { label: 'Pagado', color: 'bg-blue-950 text-blue-400 border-blue-900', icon: Package },
  PROCESSING: { label: 'En Corte', color: 'bg-purple-950 text-purple-400 border-purple-900', icon: RotateCw },
  SHIPPED:    { label: 'Enviado', color: 'bg-yellow-950 text-yellow-500 border-yellow-900', icon: Truck },
  DELIVERED:  { label: 'Entregado', color: 'bg-green-950 text-green-400 border-green-900', icon: CheckCircle2 },
  FAILED:     { label: 'Fallido', color: 'bg-red-950 text-red-400 border-red-900', icon: AlertCircle },
  CANCELLED:  { label: 'Cancelado', color: 'bg-neutral-900 text-neutral-400 border-neutral-800', icon: AlertCircle },
};

export default function OrderManager({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Estados del formulario de edición
  const [editStatus, setEditStatus] = useState('');
  const [editTrackingUrl, setEditTrackingUrl] = useState('');

  const filteredOrders = orders.filter(o => 
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || 
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const openEditModal = (order: any) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditTrackingUrl(order.trackingUrl || '');
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);

    try {
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: editStatus,
          trackingUrl: editTrackingUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        // Actualizamos la lista en memoria sin recargar la página
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: editStatus, trackingUrl: editTrackingUrl } : o));
        setSelectedOrder(null);
        router.refresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Hubo un error de conexión.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative">
      {/* HEADER Y BUSCADOR */}
      <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/40">
        <div>
          <h2 className="text-2xl font-[1000] uppercase tracking-tight text-white flex items-center gap-3">
            <Package className="text-[#FDCB02]" size={28}/> Centro de Despacho
          </h2>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Gestiona los pedidos de la jauría</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18}/>
          <input 
            type="text" 
            placeholder="Buscar por cliente, email o número de orden..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#FDCB02] transition-colors"
          />
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase tracking-widest text-neutral-500 font-black">
              <th className="p-6">Orden / Fecha</th>
              <th className="p-6">Cliente</th>
              <th className="p-6">Total</th>
              <th className="p-6">Estatus</th>
              <th className="p-6 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOrders.map((order) => {
              const SIcon = STATUS_MAP[order.status]?.icon || Package;
              const sColor = STATUS_MAP[order.status]?.color || STATUS_MAP['PENDING'].color;
              
              return (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6">
                    <p className="font-[1000] text-white text-sm">#{order.orderNumber?.slice(-8) || order.id.slice(-8)}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">
                      {new Date(order.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </td>
                  <td className="p-6">
                    <p className="font-bold text-sm text-neutral-300">{order.customerName}</p>
                    <p className="text-[10px] text-neutral-500">{order.customerEmail}</p>
                    {order.user?.membershipTier && order.user.membershipTier !== 'NONE' && (
                      <span className="inline-block mt-1 text-[8px] bg-[#FDCB02]/20 text-[#FDCB02] border border-[#FDCB02]/30 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                        {order.user.membershipTier}
                      </span>
                    )}
                  </td>
                  <td className="p-6">
                    <p className="font-[1000] text-white">${order.total.toLocaleString()}</p>
                    <p className="text-[10px] text-neutral-500 uppercase">{order.items?.length || 0} artículos</p>
                  </td>
                  <td className="p-6">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1.5 border w-max ${sColor}`}>
                      <SIcon size={12}/> {STATUS_MAP[order.status]?.label}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => openEditModal(order)}
                      className="bg-white/5 hover:bg-[#FDCB02] hover:text-black text-white px-4 py-2 rounded-lg text-[10px] font-[1000] uppercase tracking-widest transition-all border border-white/10"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-neutral-500 text-sm font-bold">
                  No se encontraron pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/50">
              <div>
                <h3 className="text-xl font-[1000] text-white uppercase tracking-tight">Orden #{selectedOrder.orderNumber?.slice(-8)}</h3>
                <p className="text-xs text-neutral-500">{selectedOrder.customerName}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Artículos de la orden */}
              <div className="bg-black rounded-2xl p-5 border border-white/5">
                <p className="text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-3">Contenido del Pedido</p>
                <ul className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <li key={item.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="font-bold text-neutral-300">
                        <span className="text-[#FDCB02] mr-2">{item.quantity} {item.unit || 'Kg'}</span> 
                        {item.title} {item.color ? <span className="text-neutral-500">({item.color})</span> : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Controles de Estatus */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-2">Estatus Operativo</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm text-white font-bold focus:outline-none focus:border-[#FDCB02]"
                >
                  <option value="PAID">🔵 Pagado (Listo para cortar)</option>
                  <option value="PROCESSING">🟣 En Corte / Preparación</option>
                  <option value="SHIPPED">🟡 Enviado / En Tránsito</option>
                  <option value="DELIVERED">🟢 Entregado</option>
                  <option value="CANCELLED">🔴 Cancelado</option>
                </select>
              </div>

              {/* Tracking Skydropx */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-2">Link de Rastreo (SkydropX)</label>
                <div className="relative">
                  <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18}/>
                  <input 
                    type="url" 
                    placeholder="https://skydropx.com/track/..." 
                    value={editTrackingUrl}
                    onChange={(e) => setEditTrackingUrl(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#FDCB02]"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-2">
                  Pega aquí la URL pública de SkydropX. El cliente la verá como un botón en su perfil.
                </p>
              </div>

              {/* Facturación (Solo lectura) */}
              {selectedOrder.wantsInvoice && (
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-900/50 rounded-xl"><FileText size={20} className="text-blue-400"/></div>
                  <div>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Factura CFDI</p>
                    {selectedOrder.invoiceStatus?.startsWith('http') ? (
                      <a href={selectedOrder.invoiceStatus} target="_blank" rel="noreferrer" className="text-xs text-blue-300 font-bold flex items-center gap-1 mt-1 hover:text-white transition-colors">
                        Ver PDF de Facturapi <ExternalLink size={12}/>
                      </a>
                    ) : (
                      <p className="text-xs text-neutral-400 font-bold mt-1">{selectedOrder.invoiceStatus}</p>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            <div className="p-6 border-t border-white/10 bg-black/50 flex justify-end gap-4">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-3 font-bold text-neutral-500 uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-[#FDCB02] hover:bg-white text-black px-8 py-3 rounded-xl text-xs font-[1000] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? <><Loader2 size={16} className="animate-spin"/> Guardando...</> : <><Save size={16}/> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}