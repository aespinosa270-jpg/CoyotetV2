"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Save, RefreshCw, Zap, MessageSquare,
  Mail, Database, ShieldCheck, Key,
  Smartphone, CheckCircle2, User,
  Globe, Building2,
} from "lucide-react";
import { EmployeeRole } from "@prisma/client";

type Employee = {
  id:        string;
  name:      string;
  email:     string;
  role:      EmployeeRole;
  createdAt: Date;
} | null;

const TABS = ["General", "Integraciones", "Seguridad"] as const;
type Tab = typeof TABS[number];

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Administrador",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FDCB02] focus:outline-none transition-all placeholder:text-zinc-600";
const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block";

export default function ConfiguracionClient({
  employee,
}: {
  employee: Employee;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const [saved,     setSaved]     = useState(false);
  const [, startTransition]       = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      // Aquí iría la lógica de persistencia real cuando se necesite
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Tabs + botón guardar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-0 shrink-0 mb-6">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === tab
                  ? "text-[#FDCB02] border-[#FDCB02]"
                  : "text-zinc-600 border-transparent hover:text-zinc-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
            saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-800"
              : "bg-[#FDCB02] text-black hover:bg-yellow-300"
          }`}
        >
          {saved
            ? <><CheckCircle2 size={13} /> Guardado</>
            : <><Save size={13} /> Aplicar Cambios</>
          }
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-4xl mx-auto pb-12">

          {/* ── GENERAL ── */}
          {activeTab === "General" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Perfil del admin en sesión */}
              {employee && (
                <section className="grid grid-cols-3 gap-10">
                  <div>
                    <h3 className="text-base font-bold text-white">Mi Perfil</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                      Datos de la sesión activa
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-4 p-5 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#FDCB02] text-black text-sm font-black flex items-center justify-center shrink-0">
                        {employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{employee.name}</p>
                        <p className="text-[10px] text-zinc-500">{employee.email}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full mt-1 inline-block">
                          {ROLE_LABEL[employee.role]}
                        </span>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Miembro desde</p>
                        <p className="text-[11px] font-mono text-zinc-400">
                          {new Date(employee.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <div className="h-px bg-white/[0.04]" />

              {/* Identidad corporativa */}
              <section className="grid grid-cols-3 gap-10">
                <div>
                  <h3 className="text-base font-bold text-white">Identidad Corporativa</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                    Configuración visual del sistema
                  </p>
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Nombre de la Empresa</label>
                      <input
                        type="text"
                        defaultValue="Coyote Textil S.A. de C.V."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Dominio Oficial</label>
                      <input
                        type="text"
                        defaultValue="coyotetextil.com"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-5 p-5 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl">
                    <div className="w-14 h-14 bg-[#FDCB02] rounded-2xl flex items-center justify-center text-black font-black italic text-lg shrink-0">
                      CT
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Logo del CRM</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Isotipo para la barra de navegación
                      </p>
                    </div>
                    <button className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-2 rounded-xl transition-all">
                      Cambiar
                    </button>
                  </div>
                </div>
              </section>

              <div className="h-px bg-white/[0.04]" />

              {/* Región y moneda */}
              <section className="grid grid-cols-3 gap-10">
                <div>
                  <h3 className="text-base font-bold text-white">Región y Moneda</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                    Ajustes para facturación
                  </p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Moneda Base</label>
                    <select className={inputCls + " cursor-pointer appearance-none"}>
                      <option>Pesos Mexicanos (MXN)</option>
                      <option>Dólares (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Idioma del Sistema</label>
                    <select className={inputCls + " cursor-pointer appearance-none"}>
                      <option>Español (Latam)</option>
                      <option>English (US)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Zona Horaria</label>
                    <select className={inputCls + " cursor-pointer appearance-none"}>
                      <option>GMT-6 — Mexico City</option>
                      <option>GMT-5 — Monterrey</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>IVA por Defecto</label>
                    <input
                      type="text"
                      defaultValue="16%"
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ── INTEGRACIONES ── */}
          {activeTab === "Integraciones" && (
            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-6">
                Servicios externos conectados al sistema
              </p>
              {[
                {
                  name:   "Zadarma PBX",
                  status: "Conectado",
                  icon:   Zap,
                  color:  "text-[#FDCB02] bg-[#FDCB02]/10",
                  desc:   "Control de telefonía IP, grabaciones y WebRTC.",
                },
                {
                  name:   "WhatsApp Business API",
                  status: "No configurado",
                  icon:   MessageSquare,
                  color:  "text-emerald-400 bg-emerald-500/10",
                  desc:   "Envío masivo de catálogos y avisos de stock.",
                },
                {
                  name:   "Gmail for Business",
                  status: "Conectado",
                  icon:   Mail,
                  color:  "text-red-400 bg-red-500/10",
                  desc:   "Sincronización de hilos de venta con clientes.",
                },
                {
                  name:   "ERP Almacén (Custom)",
                  status: "Desconectado",
                  icon:   Database,
                  color:  "text-blue-400 bg-blue-500/10",
                  desc:   "Enlace directo con los sensores de rollos en bodega.",
                },
              ].map((svc) => (
                <div key={svc.name}
                  className="flex items-center gap-5 p-5 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl hover:border-white/[0.06] transition-all group"
                >
                  <div className={`p-3 rounded-2xl shrink-0 ${svc.color}`}>
                    <svc.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-white">{svc.name}</h4>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                        svc.status === "Conectado"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-800"
                          : svc.status === "No configurado"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-800"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}>
                        {svc.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{svc.desc}</p>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-[#FDCB02] hover:underline px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    Configurar
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── SEGURIDAD ── */}
          {activeTab === "Seguridad" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* 2FA */}
              <div className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl">
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0">
                  <ShieldCheck size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Autenticación de 2 Factores (2FA)</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">
                    Protege el acceso con tu dispositivo móvil
                  </p>
                </div>
                <div className="h-6 w-11 bg-[#FDCB02] rounded-full relative cursor-pointer shadow-lg shadow-[#FDCB02]/20 shrink-0">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* API Keys */}
                <div className="p-6 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl space-y-4">
                  <Key size={20} className="text-zinc-600" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Claves de API</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Genera llaves seguras para integraciones externas con el CRM.
                    </p>
                  </div>
                  <button className="text-[9px] font-black uppercase text-[#FDCB02] tracking-widest border border-[#FDCB02]/20 px-4 py-2 rounded-xl hover:bg-[#FDCB02]/5 transition-all">
                    Gestionar Keys
                  </button>
                </div>

                {/* Sesiones activas */}
                <div className="p-6 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl space-y-4">
                  <Smartphone size={20} className="text-zinc-600" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Sesiones Activas</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Monitorea desde qué dispositivos se ha logueado tu equipo.
                    </p>
                  </div>
                  <button className="text-[9px] font-black uppercase text-zinc-400 tracking-widest border border-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-900 transition-all">
                    Ver Dispositivos
                  </button>
                </div>
              </div>

              {/* Cambiar contraseña */}
              <div className="p-6 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl">
                <h4 className="text-sm font-bold text-white mb-4">Cambiar Contraseña</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Contraseña Actual</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Nueva Contraseña</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Confirmar</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
                  </div>
                </div>
                <button className="mt-4 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all">
                  Actualizar Contraseña
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}