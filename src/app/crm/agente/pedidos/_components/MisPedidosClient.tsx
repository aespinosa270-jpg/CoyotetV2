"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Truck, Package, MapPin,
  Clock, ChevronDown, CheckCircle2,
  AlertCircle, XCircle, RotateCcw,
} from "lucide-react";
import { RouteOrderStatus, RouteOrderType } from "@prisma/client";

type OrderItem = {
  id:            string;
  tag:           string;
  description:   string | null;
  qtyDispatched: number;
  qtyDelivered:  number | null;
  createdAt:     string;
  updatedAt:     string;
};

type Order = {
  id:             string;
  type:           RouteOrderType;
  status:         RouteOrderStatus;
  contactName:    string | null;
  address:        string;
  originLocation: string | null;
  destLocation:   string | null;
  notes:          string | null;
  scheduledAt:    string | null;
  completedAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
  items:          OrderItem[];
};

const STATUS_CFG: Record<RouteOrderStatus, {
  label: string; cls: string; icon: React.ReactNode;
}> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-500/10 text-amber-400 border-amber-800",      icon: <Clock        size={11} /> },
  ASIGNADA:   { label: "Asignada",   cls: "bg-blue-500/10 text-blue-400 border-blue-800",         icon: <Truck        size={11} /> },
  EN_CAMINO:  { label: "En Camino",  cls: "bg-indigo-500/10 text-indigo-400 border-indigo-800",   icon: <Truck        size={11} /> },
  COMPLETADA: { label: "Completada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800", icon: <CheckCircle2 size={11} /> },
  CANCELADA:  { label: "Cancelada",  cls: "bg-zinc-800 text-zinc-500 border-zinc-700",             icon: <XCircle      size={11} /> },
};

const TYPE_CFG: Record<RouteOrderType, { label: string; icon: React.ReactNode; color: string }> = {
  RECOLECCION:        { label: "Recolección",       icon: <RotateCcw size={12} />, color: "text-orange-400"  },
  RESTOCK_INTERNO:    { label: "Restock Interno",   icon: <Package   size={12} />, color: "text-blue-400"    },
  RESTOCK_PROVEEDOR:  { label: "Restock Proveedor", icon: <Package   size={12} />, color: "text-violet-400"  },
  ENTREGA_PAQUETERIA: { label: "Paquetería",        icon: <Truck     size={12} />, color: "text-sky-400"     },
  ENTREGA_DOMICILIO:  { label: "A Domicilio",       icon: <MapPin    size={12} />, color: "text-emerald-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CFG) as RouteOrderStatus[];

export default function MisPedidosClient({ orders }: { orders: Order[] }) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<RouteOrderStatus | "TODOS">("TODOS");
  const [expanded,     setExpanded]     = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    const matchSearch =
      (o.contactName  ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.address      ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.notes        ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "TODOS" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, contacto o dirección..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02]/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterStatus("TODOS")}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              filterStatus === "TODOS"
                ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
            }`}
          >
            Todos <span className="ml-1 opacity-60">{orders.length}</span>
          </button>
          {ALL_STATUSES.map((s) => {
            const cnt = orders.filter((o) => o.status === s).length;
            if (cnt === 0) return null;
            const cfg = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  filterStatus === s ? cfg.cls : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                }`}
              >
                {cfg.icon} {cfg.label}
                <span className="opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin pedidos</p>
          </div>
        ) : (
          filtered.map((order, idx) => {
            const s          = STATUS_CFG[order.status];
            const t          = TYPE_CFG[order.type];
            const isOpen     = expanded === order.id;
            const allDelivered = order.items.length > 0 &&
              order.items.every((i) => i.qtyDelivered === i.qtyDispatched);

            return (
              <motion.div key={order.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
              >
                {/* Fila principal */}
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/[0.01] transition-colors text-left group"
                >
                  {/* Tipo icon */}
                  <div className={`w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 ${t.color}`}>
                    {t.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {order.contactName ?? order.destLocation ?? "Sin destino"}
                      </p>
                      <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight ${s.cls}`}>
                        {s.icon} {s.label}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${t.color}`}>
                        {t.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {order.address && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <MapPin size={9} />
                          <span className="truncate max-w-[200px]">{order.address}</span>
                        </div>
                      )}
                      {order.originLocation && order.destLocation && (
                        <p className="text-[10px] text-zinc-600 truncate max-w-[200px]">
                          {order.originLocation} → {order.destLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fecha + items count */}
                  <div className="text-right shrink-0 mr-2">
                    {order.scheduledAt && (
                      <div className="flex items-center justify-end gap-1 mb-0.5">
                        <Clock size={9} className="text-zinc-600" />
                        <p className="text-[10px] font-mono text-zinc-500">
                          {new Date(order.scheduledAt).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short",
                          })}
                        </p>
                      </div>
                    )}
                    {order.items.length > 0 && (
                      <p className="text-[9px] text-zinc-700 uppercase tracking-widest">
                        {order.items.length} ítem{order.items.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <ChevronDown size={13} className={`text-zinc-700 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 pl-20">
                        <div className="bg-zinc-900/60 border border-white/[0.04] rounded-xl p-4 space-y-3">

                          {/* Notes */}
                          {order.notes && (
                            <div className="flex items-start gap-2">
                              <AlertCircle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-zinc-400">{order.notes}</p>
                            </div>
                          )}

                          {/* Items */}
                          {order.items.length > 0 ? (
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                                Ítems del Pedido
                              </p>
                              <div className="space-y-1.5">
                                {order.items.map((item) => {
                                  const delivered = item.qtyDelivered === item.qtyDispatched;
                                  return (
                                    <div key={item.id}
                                      className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/30 border border-white/[0.03]"
                                    >
                                      <div className="min-w-0">
                                        {item.tag && (
                                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mr-2">
                                            {item.tag}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-zinc-400 truncate">
                                          {item.description ?? "Sin descripción"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="text-[10px] font-mono text-zinc-500">
                                          {item.qtyDelivered ?? 0}/{item.qtyDispatched}
                                        </span>
                                        {delivered
                                          ? <CheckCircle2 size={11} className="text-emerald-400" />
                                          : <AlertCircle  size={11} className="text-amber-400"   />
                                        }
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {allDelivered && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <CheckCircle2 size={11} className="text-emerald-400" />
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                    Entrega completa
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-700 italic">Sin ítems registrados</p>
                          )}

                          {/* Fechas */}
                          <div className="pt-2 border-t border-white/[0.04] space-y-1">
                            <p className="text-[9px] text-zinc-700 font-mono">
                              Creado: {new Date(order.createdAt).toLocaleString("es-MX", {
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                            {order.completedAt && (
                              <p className="text-[9px] text-emerald-600 font-mono">
                                Completado: {new Date(order.completedAt).toLocaleString("es-MX", {
                                  day: "2-digit", month: "short",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}