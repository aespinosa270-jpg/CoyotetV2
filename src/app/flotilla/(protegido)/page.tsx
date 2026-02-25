"use client";

import { useEffect, useState } from "react";
import {
  MapPin, PhoneCall, Navigation2, Package,
  AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight,
  TrendingUp, Clock, Store, Truck, RefreshCw, Map
} from "lucide-react";
import Link from "next/link";
import FlotillaClient from "./FlotillaClient";

// ─── Tipos alineados al schema real de Coyote OS ────────────────────────────
interface RouteOrderItem {
  id: string;
  description: string;
  qtyDispatched: number;
  qtyDelivered: number | null;
}

interface RouteOrder {
  id: string;
  type: "RECOLECCION" | "RESTOCK_INTERNO" | "RESTOCK_PROVEEDOR" | "ENTREGA_PAQUETERIA" | "ENTREGA_DOMICILIO";
  status: "PENDIENTE" | "ASIGNADA" | "EN_CAMINO" | "COMPLETADA" | "CANCELADA";
  contactName: string;
  contactPhone: string | null;
  address: string;
  addressLat: number | null;
  addressLng: number | null;
  scheduledAt: string;
  notes: string | null;
  originLocation: string | null;
  destLocation: string | null;
  items: RouteOrderItem[];
}

interface Employee {
  id: string;
  name: string;
}

interface MisOrdenesResponse {
  employee: Employee;
  ordenes: RouteOrder[];
  entregasDelMes: number;
}

// ─── Configuración Táctica por tipo de orden ─────────────────────────────────
const TIPO_CONFIG = {
  RECOLECCION:        { label: "Recolección",       Icon: Package, color: "bg-blue-50 text-blue-700 border-blue-200" },
  RESTOCK_INTERNO:    { label: "Restock Interno",   Icon: Store,   color: "bg-purple-50 text-purple-700 border-purple-200" },
  RESTOCK_PROVEEDOR:  { label: "Restock Proveedor", Icon: Truck,   color: "bg-orange-50 text-orange-700 border-orange-200" },
  ENTREGA_PAQUETERIA: { label: "Drop-off Paquetería",Icon: Package, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ENTREGA_DOMICILIO:  { label: "Entrega Domicilio", Icon: MapPin,  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const STATUS_ACENTO = {
  PENDIENTE: "bg-yellow-400",
  ASIGNADA:  "bg-blue-500",
  EN_CAMINO: "bg-indigo-500",
  COMPLETADA:"bg-green-500",
  CANCELADA: "bg-neutral-400",
};

// ─── Helpers Operativos ──────────────────────────────────────────────────────
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function labelUbicacion(loc: string | null) {
  if (loc === "PLOMO_203")    return "Plomo 203 — Bodega Central";
  if (loc === "GUATEMALA_97") return "Guatemala 97 — Sucursal";
  return loc ?? "—";
}

export default function FlotillaDashboard() {
  const [data, setData]       = useState<MisOrdenesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flotilla/mis-ordenes");
      if (res.status === 401) { setError("sesion"); return; }
      if (res.status === 404) { setError("empleado"); return; }
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const mesActual = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const ordenes   = data?.ordenes ?? [];
  const activas   = ordenes.filter(o => o.status !== "COMPLETADA" && o.status !== "CANCELADA");

  // ── Loading Matrix ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center gap-4">
      {/* El cliente GPS sigue inyectando telemetría aunque la UI cargue */}
      <FlotillaClient />
      <div className="w-12 h-12 border-4 border-[#FDCB02] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Sincronizando Radar...</p>
    </div>
  );

  // ── Error: Sin Sesión ──────────────────────────────────────────────────────
  if (error === "sesion") return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center">
        <ShieldAlert size={32} className="text-[#FDCB02]" />
      </div>
      <p className="text-lg font-[900] text-black uppercase tracking-tighter">Acceso Restringido</p>
      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Inicia sesión con tu llave de empleado</p>
      <Link href="/flotilla/login" className="mt-4 bg-[#FDCB02] text-black px-8 py-4 rounded-2xl font-[900] uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-yellow-500/20">
        Identificarse
      </Link>
    </div>
  );

  // ── Error: No Autorizado ───────────────────────────────────────────────────
  if (error === "empleado") return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-lg font-[900] text-black uppercase tracking-tighter">Credencial Inválida</p>
      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No tienes rol de logística asignado.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans selection:bg-[#FDCB02] selection:text-black pb-32">
      {/* Motor GPS en segundo plano */}
      <FlotillaClient />

      {/* ── 1. HEADER TÁCTICO ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#F4F5F7]/80 backdrop-blur-xl border-b border-neutral-200/50 px-5 pt-6 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="relative flex items-center justify-center w-3 h-3">
                <span className="absolute inline-flex w-full h-full bg-green-500 rounded-full animate-ping opacity-60" />
                <span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full" />
              </div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">GPS En Línea</span>
            </div>
            <h1 className="text-3xl font-[900] text-black tracking-tight leading-none">
              {data?.employee.name.split(" ")[0] ?? "Mi Ruta"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/flotilla/mapa"
              className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center text-black hover:bg-black hover:text-[#FDCB02] transition-colors shadow-sm active:scale-95">
              <Map size={18} strokeWidth={2.5} />
            </Link>
            <button onClick={fetchData}
              className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95 text-black">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="text-right ml-2">
              <span className="block text-3xl font-[900] text-[#FDCB02] leading-none">{activas.length}</span>
              <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mt-1">Pendientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. RENDIMIENTO MENSUAL ─────────────────────────────────────────── */}
      <div className="px-5 mt-5 mb-5">
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 capitalize">
              Tu Rendimiento ({mesActual})
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-[1000] text-black">{data?.entregasDelMes ?? 0}</span>
              <span className="text-xs font-bold text-green-600 uppercase">Completadas</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* ── 3. PANEL DE AUXILIO SOS ────────────────────────────────────────── */}
      <div className="px-5 mb-6">
        <div className="flex gap-3">
          <a href="tel:911"
            className="flex-1 bg-white border border-red-100 rounded-[1.25rem] p-3 flex items-center gap-3 shadow-[0_4px_20px_-4px_rgba(220,38,38,0.1)] active:scale-95 transition-all">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest leading-none mb-1">Emergencia</span>
              <span className="text-sm font-[900] text-red-600 leading-none">911</span>
            </div>
          </a>
          <a href="tel:5627301525"
            className="flex-1 bg-black border border-neutral-800 rounded-[1.25rem] p-3 flex items-center gap-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.2)] active:scale-95 transition-all">
            <div className="w-10 h-10 bg-[#FDCB02] rounded-full flex items-center justify-center text-black shrink-0">
              <ShieldAlert size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest leading-none mb-1">Base Central</span>
              <span className="text-sm font-[900] text-white leading-none">Despacho</span>
            </div>
          </a>
        </div>
      </div>

      {/* ── 4. FEED DE OPERACIONES ─────────────────────────────────────────── */}
      <div className="px-5 space-y-5">
        {ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <div className="w-24 h-24 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={48} className="text-neutral-400" />
            </div>
            <p className="text-lg font-[900] text-neutral-500 uppercase tracking-widest">Sin órdenes activas</p>
            <p className="text-xs font-bold text-neutral-400 mt-2 uppercase tracking-widest text-center">
              El centro de mando no ha <br /> despachado rutas para ti aún.
            </p>
          </div>
        ) : (
          ordenes.map((orden, index) => {
            // @ts-ignore - Fallback en caso de tipos no mapeados
            const cfg = TIPO_CONFIG[orden.type] ?? TIPO_CONFIG.RECOLECCION;
            const Icon = cfg.Icon;
            const acento = STATUS_ACENTO[orden.status] ?? "bg-neutral-300";
            const isCompletada = orden.status === "COMPLETADA";
            const totalItems = orden.items?.length || 0;

            // Generador de URL de Navegación seguro
            const navUrl = orden.addressLat && orden.addressLng 
              ? `https://www.google.com/maps/dir/?api=1&destination=${orden.addressLat},${orden.addressLng}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(orden.address)}`;

            return (
              <div
                key={orden.id}
                className={`bg-white rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100/50 relative overflow-hidden transition-opacity ${
                  isCompletada ? "opacity-60 grayscale-[0.2]" : ""
                }`}
              >
                {/* Acento lateral */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${acento}`} />

                {/* Encabezado */}
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-black text-[#FDCB02] rounded-full flex items-center justify-center font-[900] text-xl shadow-md shrink-0">
                      {isCompletada ? <CheckCircle2 size={22} /> : index + 1}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">
                        {formatHora(orden.scheduledAt)}
                      </span>
                      <span className="text-sm font-mono font-bold text-black leading-none">
                        #{orden.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Badge Tipo Operación */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-[900] uppercase tracking-widest ${cfg.color}`}>
                    <Icon size={11} strokeWidth={2.5} />
                    {cfg.label}
                  </div>
                </div>

                {/* Restock interno: Flecha de Bodegas */}
                {orden.type === "RESTOCK_INTERNO" && (
                  <div className="pl-2 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-[9px] font-black text-purple-700 uppercase tracking-widest">
                      <Store size={12} strokeWidth={2.5} />
                      {labelUbicacion(orden.originLocation)}
                      <span className="opacity-50 mx-1">→</span>
                      {labelUbicacion(orden.destLocation)}
                    </div>
                  </div>
                )}

                {/* Destino y Notas */}
                <div className="pl-2 mb-5">
                  <h3 className="font-[900] text-lg text-black uppercase leading-tight mb-2 pr-4 truncate">
                    {orden.contactName}
                  </h3>
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-500 font-bold leading-relaxed line-clamp-2">
                      {orden.address}
                    </p>
                  </div>
                  {orden.notes && (
                    <div className="mt-3 bg-yellow-50/50 border border-yellow-100 p-2 rounded-lg">
                      <p className="text-[10px] font-bold text-yellow-800 italic uppercase">
                        <span className="mr-1">⚠️</span> {orden.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Métricas de la parada */}
                <div className="pl-2 grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#F4F5F7] rounded-xl p-3 flex items-center gap-3">
                    <Clock size={16} className="text-neutral-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Cita pactada</span>
                      <span className="text-xs font-[900] text-black">{formatHora(orden.scheduledAt)}</span>
                    </div>
                  </div>
                  <div className="bg-[#F4F5F7] rounded-xl p-3 flex items-center gap-3">
                    <Package size={16} className="text-neutral-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Volumen</span>
                      <span className="text-xs font-[900] text-black">{totalItems} Bulto{totalItems !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Botonera de Acción */}
                {!isCompletada ? (
                  <div className="pl-2 grid grid-cols-12 gap-3">
                    {/* Botón Navegar Corregido */}
                    <a
                      href={navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-6 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-black h-14 rounded-2xl flex justify-center items-center gap-2 text-[10px] font-[900] uppercase tracking-widest transition-all border border-neutral-200/50"
                    >
                      <Navigation2 size={16} /> Navegar
                    </a>

                    <a
                      href={`tel:${orden.contactPhone ?? ""}`}
                      className="col-span-6 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-black h-14 rounded-2xl flex justify-center items-center gap-2 text-[10px] font-[900] uppercase tracking-widest transition-all border border-neutral-200/50"
                    >
                      <PhoneCall size={16} /> Llamar
                    </a>

                    <Link
                      href={`/flotilla/entregar/${orden.id}`}
                      className="col-span-12 bg-[#FDCB02] active:scale-95 text-black h-16 rounded-2xl flex justify-between items-center px-6 shadow-lg shadow-yellow-500/20 transition-all group mt-1"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} strokeWidth={2.5} />
                        <span className="text-xs font-[900] uppercase tracking-widest">
                          {orden.status === "EN_CAMINO" ? "Completar Entrega" : "Iniciar Protocolo"}
                        </span>
                      </div>
                      <ChevronRight size={20} className="opacity-50 group-active:translate-x-2 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="pl-2">
                    <div className="bg-green-50 border border-green-100 h-14 rounded-2xl flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                      <span className="text-[10px] font-[900] uppercase tracking-widest">Misión Cumplida</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}