"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import {
  Truck, CheckCircle2, Clock, MapPin,
  Package, BarChart3, Plus, Calendar,
  ArrowRight, Store, RefreshCw, Gauge,
  AlertTriangle, Image as ImageIcon,
} from "lucide-react";
import ModalNuevaOrdenRuta from "@/components/admin/ModalNuevaOrdenRuta";
import RadarSonoro from "@/components/admin/RadarSonoro";
import { motion } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Orden {
  id: string; customerName: string; address: string | null;
  status: string; pickupLocation: string;
  evidenceUrl: string | null; deliveryLat: number | null; deliveryLng: number | null;
}
interface Telemetria {
  id: string; lat: number; lng: number; speed: number | null;
  isSpeeding: boolean; timestamp: string;
  employee: { name: string };
}
interface RouteOrder {
  id: string; type: string; status: string; contactName: string;
  contactPhone: string | null; address: string; scheduledAt: string;
  notes: string | null;
  employee: { name: string } | null;
  originLocation: string | null; destLocation: string | null;
}
interface Stats { entregadosEsteMes: number; enRuta: number; mesActual: string; }

const TIPO_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  RECOLECCION:       { label: "Recolección",       cls: "bg-blue-500/10 text-blue-400 border-blue-800",    icon: Package },
  RESTOCK_INTERNO:   { label: "Restock Interno",   cls: "bg-purple-500/10 text-purple-400 border-purple-800", icon: Store },
  RESTOCK_PROVEEDOR: { label: "Restock Proveedor", cls: "bg-orange-500/10 text-orange-400 border-orange-800", icon: Truck },
  ENTREGA_PAQUETERIA:{ label: "Paquetería",        cls: "bg-sky-500/10 text-sky-400 border-sky-800",       icon: Package },
  ENTREGA_DOMICILIO: { label: "Domicilio",         cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800", icon: MapPin },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-500/10  text-amber-400  border-amber-800"  },
  ASIGNADA:   { label: "Asignada",   cls: "bg-blue-500/10   text-blue-400   border-blue-800"   },
  EN_CAMINO:  { label: "En Camino",  cls: "bg-indigo-500/10 text-indigo-400 border-indigo-800" },
  COMPLETADA: { label: "Completada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800" },
  CANCELADA:  { label: "Cancelada",  cls: "bg-zinc-800 text-zinc-500 border-zinc-700"          },
};

const NEXT_STATUS: Record<string, { label: string; next: string; cls: string }[]> = {
  PENDIENTE: [{ label: "Asignar",   next: "ASIGNADA",   cls: "bg-blue-500/10 text-blue-400 border-blue-800 hover:bg-blue-500 hover:text-black" }],
  ASIGNADA:  [{ label: "En Camino", next: "EN_CAMINO",  cls: "bg-indigo-500/10 text-indigo-400 border-indigo-800 hover:bg-indigo-500 hover:text-white" }],
  EN_CAMINO: [
    { label: "Completar", next: "COMPLETADA", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800 hover:bg-emerald-500 hover:text-black" },
    { label: "Cancelar",  next: "CANCELADA",  cls: "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700" },
  ],
};

export default function FlotillaPage() {
  const [ordenes,     setOrdenes]     = useState<Orden[]>([]);
  const [telemetria,  setTelemetria]  = useState<Telemetria[]>([]);
  const [routeOrders, setRouteOrders] = useState<RouteOrder[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [, startTransition]           = useTransition();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, telRes, routeRes, statsRes] = await Promise.all([
        fetch("/api/admin/flotilla/ordenes"),
        fetch("/api/admin/flotilla/telemetria-riesgosa"),
        fetch("/api/admin/route-orders"),
        fetch("/api/admin/flotilla/stats"),
      ]);
      const [ord, tel, route, st] = await Promise.all([
        ordRes.json(), telRes.json(), routeRes.json(), statsRes.json(),
      ]);
      setOrdenes(ord     ?? []);
      setTelemetria(tel  ?? []);
      setRouteOrders(route ?? []);
      setStats(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/route-orders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    startTransition(() => { fetchAll(); });
  };

  const hayAlertas   = telemetria.length > 0;
  const activas      = routeOrders.filter((r) => !["COMPLETADA","CANCELADA"].includes(r.status));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Flotilla / Centro de Mando</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            GESTIÓN DE <span className="text-[#FDCB02]">FLOTILLA</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAll}
            className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw size={14} className={`text-zinc-400 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#FDCB02] hover:bg-yellow-300 text-black px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> Nueva Orden de Ruta
          </button>
        </div>
      </div>

      {/* Radar sonoro */}
      <RadarSonoro hayAlertas={hayAlertas} />

      {/* Alertas de telemetría */}
      {hayAlertas && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Radar Activo — {telemetria.length} Alerta{telemetria.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {telemetria.map((t) => (
              <div key={t.id} className="bg-red-950/40 border border-red-900/60 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-900/40 rounded-xl flex items-center justify-center shrink-0">
                    <Gauge size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-400 font-black text-[9px] uppercase tracking-widest mb-0.5">Conducción Riesgosa</p>
                    <p className="text-sm text-red-300 font-bold">{t.employee.name} — {t.speed} km/h</p>
                    <p className="text-[10px] text-red-600 font-mono">{new Date(t.timestamp).toLocaleTimeString("es-MX")}</p>
                  </div>
                </div>
                <a href={`https://www.google.com/maps?q=${t.lat},${t.lng}`} target="_blank"
                  className="bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">
                  Ver GPS
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hayAlertas && (
        <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            Radar tranquilo — Toda la flotilla opera dentro de parámetros normales
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Éxito Mensual",     value: `${stats?.entregadosEsteMes ?? "—"} Entregas`, icon: BarChart3, color: "text-[#FDCB02]"  },
          { label: "En Movimiento",     value: `${stats?.enRuta ?? "—"} Pedidos`,             icon: Clock,     color: "text-blue-400"   },
          { label: "Rutas Activas",     value: `${activas.length} Órdenes`,                   icon: Calendar,  color: "text-amber-400"  },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-2xl flex items-center gap-4">
            <div className="w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shrink-0">
              <k.icon size={20} className={k.color} />
            </div>
            <div>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">{k.label}</p>
              <p className="text-lg font-mono font-bold text-white">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Órdenes de Ruta */}
      <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Órdenes de Ruta
          </p>
          <span className="text-[10px] font-black text-zinc-600 uppercase">
            {activas.length} activa{activas.length !== 1 ? "s" : ""}
          </span>
        </div>

        {routeOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-700 font-bold text-xs uppercase tracking-widest">Sin órdenes de ruta</p>
            <p className="text-zinc-800 text-[10px] mt-1">Crea una con el botón amarillo ↑</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {routeOrders
              .filter((r) => r.status !== "CANCELADA")
              .map((r, idx) => {
                const cfg  = TIPO_CONFIG[r.type]   ?? TIPO_CONFIG.RECOLECCION;
                const sCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDIENTE;
                const Icon = cfg.icon;
                const acciones = NEXT_STATUS[r.status] ?? [];
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-5 flex items-start gap-4 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Ícono */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.cls}`}>
                      <Icon size={15} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${sCfg.cls}`}>
                          {sCfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-black text-white uppercase truncate">{r.contactName}</p>
                      {r.type === "RESTOCK_INTERNO" ? (
                        <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 mt-0.5">
                          {r.originLocation === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                          <ArrowRight size={10} />
                          {r.destLocation  === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-zinc-500 truncate mt-0.5">📍 {r.address}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(r.scheduledAt).toLocaleString("es-MX", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {r.employee && (
                          <span className="text-[9px] font-bold text-zinc-600 flex items-center gap-1">
                            <Truck size={10} /> {r.employee.name}
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-[10px] text-zinc-700 italic mt-1">{r.notes}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5 shrink-0">
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
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Tabla entregas recientes */}
      <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Logística de Entregas Recientes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                <th className="px-6 py-4">ID / Destino</th>
                <th className="px-6 py-4">Bodega</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Evidencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                    Sin entregas recientes
                  </td>
                </tr>
              )}
              {ordenes.map((orden) => {
                const isDelivered  = orden.status === "DELIVERED";
                const isGuatemala  = orden.pickupLocation === "GUATEMALA_97";
                return (
                  <tr key={orden.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-white uppercase">{orden.customerName}</p>
                      <div className="flex items-center gap-1 text-zinc-600 mt-0.5">
                        <MapPin size={10} />
                        <span className="text-[10px] font-mono truncate max-w-[200px]">{orden.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${
                        isGuatemala
                          ? "bg-blue-500/10 text-blue-400 border-blue-800"
                          : "bg-purple-500/10 text-purple-400 border-purple-800"
                      }`}>
                        <Package size={10} />
                        {isGuatemala ? "Guatemala 97" : "Plomo 203"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-800 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          <CheckCircle2 size={11} /> Entregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-800 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          <Clock size={11} /> En Ruta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {orden.evidenceUrl && (
                          <a href={orden.evidenceUrl} target="_blank"
                            className="p-1.5 bg-zinc-800 rounded-lg hover:bg-[#FDCB02] hover:text-black text-zinc-400 transition-colors">
                            <ImageIcon size={13} />
                          </a>
                        )}
                        {orden.deliveryLat && (
                          <a href={`https://www.google.com/maps?q=${orden.deliveryLat},${orden.deliveryLng}`}
                            target="_blank"
                            className="p-1.5 bg-zinc-800 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-white transition-colors">
                            <MapPin size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalNuevaOrdenRuta
          onClose={() => setShowModal(false)}
          onCreated={fetchAll}
        />
      )}
    </div>
  );
}