// src/app/admin/flotilla/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Truck, CheckCircle2, Clock, MapPin,
  Image as ImageIcon, Package,
  BarChart3, Award, AlertTriangle, Gauge,
  Plus, Calendar, ArrowRight, Store, RefreshCw
} from "lucide-react";
import BtnImprimir from "@/components/BtnImprimir";
import ModalNuevaOrdenRuta from "@/components/admin/ModalNuevaOrdenRuta";
import RadarSonoro from "@/components/admin/RadarSonoro"; // ← Importación agregada

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Orden { id: string; customerName: string; address: string | null; status: string; pickupLocation: string; evidenceUrl: string | null; deliveryLat: number | null; deliveryLng: number | null; }
interface Telemetria { id: string; lat: number; lng: number; speed: number | null; isSpeeding: boolean; timestamp: string; employee: { name: string }; }
interface RouteOrder { id: string; type: string; status: string; contactName: string; contactPhone: string | null; address: string; scheduledAt: string; notes: string | null; employee: { name: string } | null; originLocation: string | null; destLocation: string | null; }
interface Stats { entregadosEsteMes: number; enRuta: number; mesActual: string; }

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  RECOLECCION:       { label: "Recolección",       color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: Package },
  RESTOCK_INTERNO:   { label: "Restock Interno",   color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Store   },
  RESTOCK_PROVEEDOR: { label: "Restock Proveedor", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Truck   },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ASIGNADA:   { label: "Asignada",   color: "bg-blue-50 text-blue-700 border-blue-200"       },
  EN_CAMINO:  { label: "En Camino",  color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETADA: { label: "Completada", color: "bg-green-50 text-green-700 border-green-200"    },
  CANCELADA:  { label: "Cancelada",  color: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

export default function AdminFlotillaDashboard() {
  const [ordenes, setOrdenes]           = useState<Orden[]>([]);
  const [telemetria, setTelemetria]     = useState<Telemetria[]>([]);
  const [routeOrders, setRouteOrders]   = useState<RouteOrder[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [loadingData, setLoadingData]   = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [ordRes, telRes, routeRes, statsRes] = await Promise.all([
        fetch("/api/admin/flotilla/ordenes"),
        fetch("/api/admin/flotilla/telemetria-riesgosa"),
        fetch("/api/admin/route-orders"),
        fetch("/api/admin/flotilla/stats"),
      ]);
      const [ord, tel, route, st] = await Promise.all([
        ordRes.json(), telRes.json(), routeRes.json(), statsRes.json()
      ]);
      setOrdenes(ord ?? []);
      setTelemetria(tel ?? []);
      setRouteOrders(route ?? []);
      setStats(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const hayAlertas = telemetria.length > 0 || ordenes.filter(o => o.status === "SHIPPED").length > 0;

  const updateRouteStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/route-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8 font-sans selection:bg-[#FDCB02] selection:text-black">

      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-[1000] text-black uppercase tracking-tighter flex items-center gap-3">
            <Truck size={32} className="text-[#FDCB02]" /> Centro de Mando: Flotilla
          </h1>
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mt-1">
            Auditoría · Rutas · Recolecciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAll}
            className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw size={16} className={loadingData ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#FDCB02] hover:bg-yellow-400 text-black px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
          >
            <Plus size={16} strokeWidth={3} /> Nueva Orden de Ruta
          </button>
          <BtnImprimir />
        </div>
      </div>

      {/* HEADER PDF */}
      <div className="hidden print:block mb-10 border-b-4 border-black pb-6">
        <h1 className="text-4xl font-black uppercase">Coyote Textil — Reporte de Flotilla</h1>
        <p className="text-xl font-bold text-neutral-600">Corte: {stats?.mesActual}</p>
        <hr className="mt-6 border-black" />
      </div>

      {/* BLOQUE RENDIMIENTO */}
      <div className="mb-8 print:hidden">
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FDCB02] text-black rounded-2xl flex items-center justify-center shadow-lg">
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="text-xl font-[1000] text-black uppercase tracking-tighter">Rendimiento Global</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Productividad de la flota — {stats?.mesActual ?? "..."}
            </p>
          </div>
        </div>
      </div>

      {/* COMPONENTE DE SONIDO INVISIBLE */}
      <RadarSonoro hayAlertas={hayAlertas} />

      {/* RADAR ALERTAS VISUAL */}
      {hayAlertas && (
        <div className="mb-8 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <h2 className="text-xs font-black uppercase tracking-widest text-red-600">
              Radar Activo — {telemetria.length} Alertas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {telemetria.map(t => (
              <div key={t.id} className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Gauge size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-800 font-black text-[10px] uppercase tracking-widest mb-0.5">🚨 Conducción Riesgosa</p>
                    <p className="text-sm text-red-700 font-bold">{t.employee.name} — {t.speed} km/h</p>
                    <p className="text-[10px] text-red-400 font-bold">{new Date(t.timestamp).toLocaleTimeString("es-MX")}</p>
                  </div>
                </div>
                <a href={`https://www.google.com/maps?q=${t.lat},${t.lng}`} target="_blank"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                  Ver GPS
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hayAlertas && (
        <div className="mb-8 print:hidden bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          <p className="text-[11px] font-black text-green-700 uppercase tracking-widest">
            Radar tranquilo — Toda la flotilla opera dentro de parámetros normales
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-black text-[#FDCB02] rounded-2xl flex items-center justify-center shadow-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em]">Éxito Mensual</p>
            <p className="text-2xl font-[1000] text-black leading-none mt-1">{stats?.entregadosEsteMes ?? "—"} Entregas</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em]">En Movimiento</p>
            <p className="text-2xl font-[1000] text-black leading-none mt-1">{stats?.enRuta ?? "—"} Pedidos</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em]">Rutas Pendientes</p>
            <p className="text-2xl font-[1000] text-black leading-none mt-1">
              {routeOrders.filter(r => r.status === "PENDIENTE" || r.status === "ASIGNADA").length} Órdenes
            </p>
          </div>
        </div>
      </div>

      {/* ── ÓRDENES DE RUTA ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden mb-8 print:hidden">
        <div className="p-6 border-b border-neutral-50 bg-neutral-50/50 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">
            Órdenes de Ruta Asignadas
          </h2>
          <span className="text-[10px] font-black text-neutral-400 uppercase">
            {routeOrders.filter(r => r.status !== "COMPLETADA" && r.status !== "CANCELADA").length} activas
          </span>
        </div>

        {routeOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400 font-bold text-sm uppercase tracking-widest">Sin órdenes de ruta</p>
            <p className="text-neutral-300 text-xs mt-1">Crea una con el botón amarillo ↑</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {routeOrders
              .filter(r => r.status !== "CANCELADA")
              .map(r => {
                const cfg = TIPO_CONFIG[r.type] ?? TIPO_CONFIG.RECOLECCION;
                const sCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDIENTE;
                const Icon = cfg.icon;
                return (
                  <div key={r.id} className="p-5 flex items-start gap-4 hover:bg-neutral-50/50 transition-colors">
                    {/* Ícono tipo */}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon size={18} className={cfg.color} strokeWidth={2.5} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${sCfg.color}`}>
                          {sCfg.label}
                        </span>
                      </div>

                      <p className="text-sm font-[900] text-black uppercase truncate">{r.contactName}</p>

                      {r.type === "RESTOCK_INTERNO" ? (
                        <p className="text-[11px] font-bold text-neutral-500 flex items-center gap-1 mt-0.5">
                          {r.originLocation === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                          <ArrowRight size={11} />
                          {r.destLocation === "PLOMO_203" ? "Plomo 203" : "Guatemala 97"}
                        </p>
                      ) : (
                        <p className="text-[11px] font-bold text-neutral-500 truncate mt-0.5">
                          📍 {r.address}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(r.scheduledAt).toLocaleString("es-MX", {
                            day: "2-digit", month: "short",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                        {r.employee && (
                          <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                            <Truck size={11} /> {r.employee.name}
                          </span>
                        )}
                      </div>

                      {r.notes && (
                        <p className="text-[10px] text-neutral-400 mt-1 italic">{r.notes}</p>
                      )}
                    </div>

                    {/* Acciones rápidas de status */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {r.status === "PENDIENTE" && (
                        <button onClick={() => updateRouteStatus(r.id, "ASIGNADA")}
                          className="text-[9px] font-black px-3 py-1.5 bg-blue-600 text-white rounded-lg uppercase tracking-widest hover:bg-blue-700 transition-colors">
                          Asignar
                        </button>
                      )}
                      {r.status === "ASIGNADA" && (
                        <button onClick={() => updateRouteStatus(r.id, "EN_CAMINO")}
                          className="text-[9px] font-black px-3 py-1.5 bg-indigo-600 text-white rounded-lg uppercase tracking-widest hover:bg-indigo-700 transition-colors">
                          En Camino
                        </button>
                      )}
                      {(r.status === "ASIGNADA" || r.status === "EN_CAMINO") && (
                        <button onClick={() => updateRouteStatus(r.id, "COMPLETADA")}
                          className="text-[9px] font-black px-3 py-1.5 bg-green-600 text-white rounded-lg uppercase tracking-widest hover:bg-green-700 transition-colors">
                          Completar
                        </button>
                      )}
                      <button onClick={() => updateRouteStatus(r.id, "CANCELADA")}
                        className="text-[9px] font-black px-3 py-1.5 bg-neutral-100 text-neutral-500 rounded-lg uppercase tracking-widest hover:bg-neutral-200 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* TABLA ENTREGAS */}
      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-neutral-50 bg-neutral-50/50">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">
            Logística de Entregas Recientes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                <th className="p-5 pl-8">ID / Destino</th>
                <th className="p-5">Bodega Salida</th>
                <th className="p-5">Estatus</th>
                <th className="p-5 text-right pr-8">Evidencia GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {ordenes.map(orden => {
                const isDelivered = orden.status === "DELIVERED";
                const isGuatemala = orden.pickupLocation === "GUATEMALA_97";
                return (
                  <tr key={orden.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-5 pl-8 align-top">
                      <p className="text-sm font-black text-black uppercase mb-1">{orden.customerName}</p>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <MapPin size={12} />
                        <span className="text-[10px] font-bold truncate max-w-[200px]">{orden.address}</span>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${
                        isGuatemala ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                      }`}>
                        <Package size={11} strokeWidth={2.5} />
                        {isGuatemala ? "Guatemala 97" : "Plomo 203"}
                      </span>
                    </td>
                    <td className="p-5 align-top">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          <CheckCircle2 size={12} strokeWidth={3} /> Éxito
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          <Clock size={12} strokeWidth={3} /> En Ruta
                        </span>
                      )}
                    </td>
                    <td className="p-5 pr-8 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        {orden.evidenceUrl && (
                          <a href={orden.evidenceUrl} target="_blank" className="p-2 bg-neutral-100 rounded-lg hover:bg-[#FDCB02] transition-colors">
                            <ImageIcon size={16} />
                          </a>
                        )}
                        {orden.deliveryLat && (
                          <a href={`https://www.google.com/maps?q=${orden.deliveryLat},${orden.deliveryLng}`} target="_blank"
                            className="p-2 bg-neutral-100 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                            <MapPin size={16} />
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