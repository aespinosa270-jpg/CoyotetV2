"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import {
  RefreshCw, Plus, Clock, Truck, MapPin,
  ArrowRight, Store, Package, CheckCircle2,
  Filter, Search,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { motion } from "framer-motion";
import ModalNuevaOrdenRuta from "@/components/admin/ModalNuevaOrdenRuta";

interface RouteOrder {
  id: string; type: string; status: string;
  contactName: string; contactPhone: string | null;
  address: string; scheduledAt: string; notes: string | null;
  employee: { id: string; name: string } | null;
  originLocation: string | null; destLocation: string | null;
  items: {
    id: string; tag: string; description: string | null;
    qtyDispatched: number; qtyDelivered: number | null;
  }[];
}

type IconComponent = React.ComponentType<LucideProps>;

const TIPO_CONFIG: Record<string, { label: string; cls: string; icon: IconComponent }> = {
  RECOLECCION:        { label: "Recolección",        cls: "bg-blue-500/10 text-blue-400 border-blue-800",         icon: Package  },
  RESTOCK_INTERNO:    { label: "Restock Interno",    cls: "bg-purple-500/10 text-purple-400 border-purple-800",   icon: Store    },
  RESTOCK_PROVEEDOR:  { label: "Restock Proveedor",  cls: "bg-orange-500/10 text-orange-400 border-orange-800",   icon: Truck    },
  ENTREGA_PAQUETERIA: { label: "Paquetería",         cls: "bg-sky-500/10 text-sky-400 border-sky-800",            icon: Package  },
  ENTREGA_DOMICILIO:  { label: "Domicilio",          cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800",icon: MapPin   },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-500/10  text-amber-400  border-amber-800"      },
  ASIGNADA:   { label: "Asignada",   cls: "bg-blue-500/10   text-blue-400   border-blue-800"       },
  EN_CAMINO:  { label: "En Camino",  cls: "bg-indigo-500/10 text-indigo-400 border-indigo-800"     },
  COMPLETADA: { label: "Completada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800"  },
  CANCELADA:  { label: "Cancelada",  cls: "bg-zinc-800 text-zinc-500 border-zinc-700"              },
};

const NEXT_STATUS: Record<string, { label: string; next: string; cls: string }[]> = {
  PENDIENTE: [{ label: "Asignar",   next: "ASIGNADA",   cls: "bg-blue-500/10 text-blue-400 border-blue-800 hover:bg-blue-500 hover:text-black"            }],
  ASIGNADA:  [{ label: "En Camino", next: "EN_CAMINO",  cls: "bg-indigo-500/10 text-indigo-400 border-indigo-800 hover:bg-indigo-500 hover:text-white"     }],
  EN_CAMINO: [{ label: "Completar", next: "COMPLETADA", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800 hover:bg-emerald-500 hover:text-black"  }],
};

const ALL_STATUSES = ["TODOS", "PENDIENTE", "ASIGNADA", "EN_CAMINO", "COMPLETADA", "CANCELADA"] as const;

export default function RutasPage() {
  const [routes,     setRoutes]    = useState<RouteOrder[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [showModal,  setShowModal] = useState(false);
  const [search,     setSearch]    = useState("");
  const [statusFilt, setStatusFilt]= useState<typeof ALL_STATUSES[number]>("TODOS");
  const [expanded,   setExpanded]  = useState<string | null>(null);
  const [, startTransition]        = useTransition();

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/route-orders");
      const data = await res.json();
      setRoutes(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/route-orders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    startTransition(() => fetchRoutes());
  };

  const filtered = routes.filter((r) => {
    const matchSearch =
      r.contactName.toLowerCase().includes(search.toLowerCase()) ||
      r.address.toLowerCase().includes(search.toLowerCase())     ||
      (r.employee?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilt === "TODOS" || r.status === statusFilt;
    return matchSearch && matchStatus;
  });

  const counts = routes.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/10 pb-6 shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Flotilla / Rutas</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            RUTAS <span className="text-[#FDCB02]">DEL DÍA</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRoutes}
            className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <RefreshCw size={14} className={`text-zinc-400 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="bg-[#FDCB02] hover:bg-yellow-300 text-black px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all">
            <Plus size={14} strokeWidth={3} /> Nueva Orden
          </button>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-5 gap-2">
        {(["PENDIENTE","ASIGNADA","EN_CAMINO","COMPLETADA","CANCELADA"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s}
              onClick={() => setStatusFilt(statusFilt === s ? "TODOS" : s)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                statusFilt === s ? cfg.cls : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-600"
              }`}
            >
              <p className="text-lg font-mono font-bold">{counts[s] ?? 0}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por contacto, dirección o chofer..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02] transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-zinc-600" />
          {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setSearch(cfg.label === search ? "" : cfg.label)}
              className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border text-zinc-600 border-zinc-800 hover:border-zinc-600 transition-all"
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de rutas */}
      <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-zinc-700 font-bold text-xs uppercase tracking-widest">
              {loading ? "Cargando rutas..." : "Sin órdenes con ese filtro"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map((r, idx) => {
              const cfg      = TIPO_CONFIG[r.type] ?? TIPO_CONFIG.RECOLECCION;
              const sCfg     = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDIENTE;
              const Icon     = cfg.icon;
              const acciones = NEXT_STATUS[r.status] ?? [];
              const isExpanded = expanded === r.id;

              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  {/* Fila principal */}
                  <div
                    className="p-5 flex items-start gap-4 hover:bg-white/[0.01] transition-colors cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    {/* Ícono tipo */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.cls}`}>
                      <Icon size={15} />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${sCfg.cls}`}>
                          {sCfg.label}
                        </span>
                      </div>

                      <p className="text-sm font-black text-white uppercase">{r.contactName}</p>

                      {r.type === "RESTOCK_INTERNO" ? (
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          {r.originLocation === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                          <ArrowRight size={9} />
                          {r.destLocation === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">📍 {r.address}</p>
                      )}

                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(r.scheduledAt).toLocaleString("es-MX", {
                            day: "2-digit", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {r.employee ? (
                          <span className="text-[9px] font-bold text-zinc-600 flex items-center gap-1">
                            <Truck size={9} /> {r.employee.name}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-700 italic">Sin asignar</span>
                        )}
                        {r.contactPhone && (
                          <span className="text-[9px] font-mono text-zinc-700">{r.contactPhone}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {acciones.map((a) => (
                        <button key={a.next}
                          onClick={() => updateStatus(r.id, a.next)}
                          className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border transition-all ${a.cls}`}
                        >
                          {a.label}
                        </button>
                      ))}
                      {!["COMPLETADA","CANCELADA","EN_CAMINO"].includes(r.status) && (
                        <button onClick={() => updateStatus(r.id, "CANCELADA")}
                          className="text-[9px] font-black px-3 py-1.5 bg-zinc-900 text-zinc-600 border border-zinc-800 rounded-lg uppercase tracking-widest hover:bg-zinc-800 transition-all">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items expandidos */}
                  {isExpanded && r.items.length > 0 && (
                    <div className="px-6 pb-5">
                      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-zinc-800">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            Items — {r.items.length} bulto{r.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="divide-y divide-zinc-800">
                          {r.items.map((item) => (
                            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-zinc-300">{item.tag}</p>
                                {item.description && (
                                  <p className="text-[10px] text-zinc-600 italic">{item.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div>
                                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Despachado</p>
                                  <p className="text-xs font-mono font-bold text-zinc-300">{item.qtyDispatched}</p>
                                </div>
                                {item.qtyDelivered != null && (
                                  <div>
                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Entregado</p>
                                    <p className={`text-xs font-mono font-bold ${
                                      item.qtyDelivered === item.qtyDispatched ? "text-emerald-400" : "text-red-400"
                                    }`}>{item.qtyDelivered}</p>
                                  </div>
                                )}
                                {item.qtyDelivered === item.qtyDispatched && (
                                  <CheckCircle2 size={14} className="text-emerald-400" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {isExpanded && r.notes && (
                    <div className="px-6 pb-4">
                      <p className="text-[10px] text-zinc-600 italic border-l-2 border-zinc-800 pl-3">
                        {r.notes}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ModalNuevaOrdenRuta
          onClose={() => setShowModal(false)}
          onCreated={fetchRoutes}
        />
      )}
    </div>
  );
}