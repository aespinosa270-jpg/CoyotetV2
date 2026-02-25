// src/components/admin/ModalNuevaOrdenRuta.tsx
"use client";

import { useState, useEffect } from "react";
import {
  X, Package, Truck, Store, MapPin, User,
  Phone, Mail, Clock, FileText, ArrowRight,
  Loader2, CheckCircle2, ShoppingBag, Home
} from "lucide-react";

interface Chofer { id: string; name: string; }
interface Props { onClose: () => void; onCreated: () => void; }

const TIPOS = [
  
  {
    id: "RESTOCK_INTERNO",
    label: "Restock Interno",
    desc: "Plomo 203 ↔ Guatemala 97",
    icon: Store,
    active: "bg-purple-600 text-white border-purple-600",
    idle:   "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "RESTOCK_PROVEEDOR",
    label: "Restock Proveedor",
    desc: "Recolección en proveedor externo",
    icon: Truck,
    active: "bg-orange-500 text-white border-orange-500",
    idle:   "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    id: "ENTREGA_PAQUETERIA",
    label: "Drop-off Paquetería",
    desc: "Llevar a sucursal de envíos",
    icon: ShoppingBag,
    active: "bg-sky-600 text-white border-sky-600",
    idle:   "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "ENTREGA_DOMICILIO",
    label: "Entrega a Domicilio",
    desc: "Directo al cliente con horario",
    icon: Home,
    active: "bg-green-600 text-white border-green-600",
    idle:   "bg-green-50 text-green-700 border-green-200",
  },
];

const UBICACIONES = [
  { id: "GUATEMALA_97", label: "Guatemala 97 — Centro"        },
  { id: "PLOMO_203",    label: "Plomo 203 — Valle Gómez"      },
];

const CARRIERS = ["ESTAFETA", "FEDEX", "DHL", "J&T", "REDPACK", "OTRO"];

export default function ModalNuevaOrdenRuta({ onClose, onCreated }: Props) {
  const [tipo, setTipo]       = useState("RECOLECCION");
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    contactName:    "",
    contactPhone:   "",
    contactEmail:   "",
    address:        "",
    addressLat:     "",
    addressLng:     "",
    scheduledAt:    "",
    notes:          "",
    assignedTo:     "",
    originLocation: "PLOMO_203",
    destLocation:   "GUATEMALA_97",
    carrier:        "ESTAFETA",
    sucursalNombre: "",
  });

  useEffect(() => {
    fetch("/api/admin/choferes")
      .then(r => r.json())
      .then(d => setChoferes(d ?? []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/route-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:           tipo,
          contactName:    form.contactName,
          contactPhone:   form.contactPhone   || null,
          contactEmail:   form.contactEmail   || null,
          address:        form.address,
          addressLat:     form.addressLat     ? parseFloat(form.addressLat)  : null,
          addressLng:     form.addressLng     ? parseFloat(form.addressLng)  : null,
          scheduledAt:    form.scheduledAt,
          notes:          form.notes          || null,
          assignedTo:     form.assignedTo     || null,
          originLocation: tipo === "RESTOCK_INTERNO" ? form.originLocation : null,
          destLocation:   tipo === "RESTOCK_INTERNO" ? form.destLocation   : null,
          carrier:        tipo === "ENTREGA_PAQUETERIA" ? form.carrier        : null,
          sucursalNombre: tipo === "ENTREGA_PAQUETERIA" ? form.sucursalNombre : null,
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      setTimeout(() => { onCreated(); onClose(); }, 1200);
    } catch {
      alert("Error al crear la orden. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const tipoActual = TIPOS.find(t => t.id === tipo)!;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-xl font-[1000] text-black uppercase tracking-tighter leading-none">
              Nueva Orden de Ruta
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
              Asignar tarea al chofer
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-8 py-6 space-y-6">

            {/* ── Tipo de orden (grid 3+2) ────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                Tipo de Orden
              </label>
              {/* Fila 1: 3 tipos */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                {TIPOS.slice(0, 3).map(t => {
                  const Icon = t.icon;
                  const isActive = tipo === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${isActive ? t.active : `bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300`}`}>
                      <Icon size={18} strokeWidth={2.5} className="mb-1.5" />
                      <p className="text-[10px] font-[900] uppercase tracking-tight leading-none mb-0.5">{t.label}</p>
                      <p className={`text-[9px] font-bold leading-tight ${isActive ? "opacity-80" : "text-neutral-400"}`}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              {/* Fila 2: 2 tipos */}
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.slice(3).map(t => {
                  const Icon = t.icon;
                  const isActive = tipo === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${isActive ? t.active : `bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300`}`}>
                      <Icon size={18} strokeWidth={2.5} className="mb-1.5" />
                      <p className="text-[10px] font-[900] uppercase tracking-tight leading-none mb-0.5">{t.label}</p>
                      <p className={`text-[9px] font-bold leading-tight ${isActive ? "opacity-80" : "text-neutral-400"}`}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── RESTOCK INTERNO: selector origen → destino ──────────────── */}
            {tipo === "RESTOCK_INTERNO" && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-3">
                  Ruta de Transferencia
                </label>
                <div className="flex items-center gap-3">
                  <select value={form.originLocation} onChange={e => set("originLocation", e.target.value)}
                    className="flex-1 bg-white border border-purple-200 rounded-xl px-3 py-2.5 text-xs font-bold text-black focus:outline-none focus:border-purple-500">
                    {UBICACIONES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                  <ArrowRight size={18} className="text-purple-400 shrink-0" />
                  <select value={form.destLocation} onChange={e => set("destLocation", e.target.value)}
                    className="flex-1 bg-white border border-purple-200 rounded-xl px-3 py-2.5 text-xs font-bold text-black focus:outline-none focus:border-purple-500">
                    {UBICACIONES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── ENTREGA PAQUETERÍA: carrier + sucursal ───────────────────── */}
            {tipo === "ENTREGA_PAQUETERIA" && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">
                  Datos de la Paquetería
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Carrier</label>
                    <select value={form.carrier} onChange={e => set("carrier", e.target.value)}
                      className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2.5 text-xs font-bold text-black focus:outline-none focus:border-sky-500">
                      {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Nombre Sucursal</label>
                    <input
                      value={form.sucursalNombre}
                      onChange={e => set("sucursalNombre", e.target.value)}
                      placeholder="Ej: Estafeta Tepito"
                      className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2.5 text-sm font-bold text-black placeholder:text-neutral-300 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Datos del contacto ───────────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                {tipo === "RESTOCK_INTERNO"    ? "Responsable"  :
                 tipo === "RESTOCK_PROVEEDOR"  ? "Proveedor"    :
                 tipo === "ENTREGA_PAQUETERIA" ? "Referencia"   :
                 tipo === "ENTREGA_DOMICILIO"  ? "Cliente"      : "Cliente / Contacto"}
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input required value={form.contactName} onChange={e => set("contactName", e.target.value)}
                    placeholder="Nombre completo *"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)}
                      placeholder="Teléfono"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                  </div>
                  <div className="relative">
                    <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)}
                      placeholder="Correo"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Dirección ───────────────────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                {tipo === "ENTREGA_PAQUETERIA" ? "Dirección de la Sucursal" : "Dirección de Recolección / Entrega"}
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input required value={form.address} onChange={e => set("address", e.target.value)}
                    placeholder="Calle, número, colonia, CDMX *"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.addressLat} onChange={e => set("addressLat", e.target.value)}
                    placeholder="Latitud (opcional)" type="number" step="any"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                  <input value={form.addressLng} onChange={e => set("addressLng", e.target.value)}
                    placeholder="Longitud (opcional)" type="number" step="any"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors" />
                </div>
                <p className="text-[10px] text-neutral-400 font-bold">
                  💡 Google Maps → clic derecho en la ubicación → copiar coordenadas
                </p>
              </div>
            </div>

            {/* ── Horario ─────────────────────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                {tipo === "ENTREGA_DOMICILIO" ? "Horario Pactado con el Cliente" : "Horario de Recolección"}
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input required type="datetime-local" value={form.scheduledAt}
                  onChange={e => set("scheduledAt", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" />
              </div>
            </div>

            {/* ── Asignar chofer ───────────────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                Asignar Chofer
              </label>
              <div className="relative">
                <Truck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors appearance-none">
                  <option value="">Sin asignar (queda pendiente)</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* ── Notas ───────────────────────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-3">
                Notas Adicionales
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-4 top-4 text-neutral-400" />
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Instrucciones especiales, cantidad de bultos, etc."
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors resize-none" />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-neutral-100 bg-neutral-50/50 shrink-0">
            <button type="submit" disabled={loading || success}
              className="w-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-[#FDCB02] h-14 rounded-2xl font-[900] uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
              {success  ? <><CheckCircle2 size={20} /> Orden Creada</>    :
               loading  ? <><Loader2 size={20} className="animate-spin" /> Creando...</> :
                          <>Crear Orden de Ruta <ArrowRight size={18} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}