"use client";

import { useState, useTransition } from "react";
import { Search, Eye, CreditCard, Truck, FileText, CheckCircle2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { OrderStatus } from "@prisma/client";

export default function AdminOrdersClient({ initialOrders }: { initialOrders: any[] }) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = initialOrders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = (id: string, status: OrderStatus) => {
    startTransition(async () => {
      await updateOrderStatus(id, status);
    });
  };

  return (
    <div className="bg-[#111111] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[700px]">
      
      {/* Buscador */}
      <div className="p-6 border-b border-white/5 bg-[#0a0a0a] flex justify-between items-center shrink-0">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por #Orden o Cliente..."
            className="w-full bg-black border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all"
          />
        </div>
      </div>

      {/* Tabla Admin */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-20 border-b border-white/5">
            <tr className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black">
              <th className="px-6 py-5">Orden & Fecha</th>
              <th className="px-6 py-5">Cliente & Contacto</th>
              <th className="px-6 py-5">Pago / Total</th>
              <th className="px-6 py-5">Logística</th>
              <th className="px-6 py-5">Estado Actual</th>
              <th className="px-6 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.01] transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-xs font-black text-white">{order.orderNumber}</p>
                  <p className="text-[9px] text-zinc-600 font-mono mt-1">
                    {new Date(order.createdAt).toLocaleString('es-MX')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-zinc-300">{order.customerName}</p>
                  <p className="text-[9px] text-zinc-600 lowercase">{order.customerEmail}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={12} className="text-[#FDCB02]" />
                    <p className="text-sm font-black font-mono text-white">
                      ${order.total.toLocaleString("es-MX")}
                    </p>
                  </div>
                  <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1 font-bold">
                    MÉTODO: {order.paymentMethod}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Truck size={12} />
                    <span className="text-[10px] font-bold uppercase">{order.logisticsType.split('_')[0]}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    disabled={isPending}
                    className="bg-black border border-white/10 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#FDCB02] cursor-pointer"
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="PAID">Pagado</option>
                    <option value="SHIPPED">Enviado</option>
                    <option value="DELIVERED">Entregado</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {order.wantsInvoice && (
                      <div title="Requiere Factura" className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <FileText size={14} />
                      </div>
                    )}
                    <button className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-[#FDCB02] transition-colors">
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}} />
    </div>
  );
}