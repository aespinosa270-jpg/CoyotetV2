"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, User, Lock, Bell, Globe, 
  Database, Zap, Key, ShieldCheck, 
  Save, RefreshCw, Smartphone, Mail, MessageSquare
} from 'lucide-react';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE SISTEMA */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          {/* Tabs de Configuración */}
          <div className="flex gap-6">
            {["General", "Integraciones", "Seguridad", "Notificaciones"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[10px] font-black uppercase tracking-widest transition-all pb-1 ${
                  activeTab === tab ? 'text-[#FDCB02] border-b-2 border-[#FDCB02]' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="bg-[#FDCB02] text-black px-6 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-[#FDCB02]/10"
        >
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? "Guardando..." : "Aplicar Cambios"}
        </button>
      </nav>

      {/* CUERPO DE CONFIGURACIÓN */}
      <main className="flex-1 p-10 overflow-y-auto custom-scrollbar">
        
        <div className="max-w-5xl mx-auto space-y-12">
          
          {activeTab === "General" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              {/* Sección: Identidad */}
              <section className="grid grid-cols-3 gap-10">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Identidad Corporativa</h3>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Configuración visual de Coyote Textil</p>
                </div>
                <div className="col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Nombre de la Empresa</label>
                      <input type="text" defaultValue="Coyote Textil S.A. de C.V." className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Dominio Oficial</label>
                      <input type="text" defaultValue="coyotetextil.com" className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none transition-all" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 rounded-[24px]">
                    <div className="w-16 h-16 bg-[#FDCB02] rounded-2xl flex items-center justify-center text-black font-black italic text-xl">CT</div>
                    <div>
                      <p className="text-sm font-bold">Logo del CRM</p>
                      <p className="text-xs text-neutral-500 mt-1">Sube el isotipo para la barra de navegación.</p>
                    </div>
                    <button className="ml-auto text-[10px] font-bold uppercase bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10">Cambiar</button>
                  </div>
                </div>
              </section>

              <div className="h-px bg-white/5" />

              {/* Sección: Regionalización */}
              <section className="grid grid-cols-3 gap-10">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Región y Moneda</h3>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Ajustes para cálculos de facturación</p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Moneda Base</label>
                    <select className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none appearance-none transition-all cursor-pointer">
                      <option>Pesos Mexicanos (MXN)</option>
                      <option>Dólares (USD)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Idioma del Sistema</label>
                    <select className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-[#FDCB02] outline-none appearance-none transition-all cursor-pointer">
                      <option>Español (Latam)</option>
                      <option>English (US)</option>
                    </select>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "Integraciones" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {[
                { name: "Zadarma PBX", status: "Conectado", icon: Zap, color: "text-[#FDCB02]", desc: "Control de telefonía IP, grabaciones y WebRTC." },
                { name: "WhatsApp Business API", status: "No configurado", icon: MessageSquare, color: "text-emerald-500", desc: "Envío masivo de catálogos y avisos de stock." },
                { name: "Gmail for Business", status: "Conectado", icon: Mail, color: "text-red-400", desc: "Sincronización de hilos de venta con clientes." },
                { name: "ERP Almacén (Custom)", status: "Desconectado", icon: Database, color: "text-blue-400", desc: "Enlace directo con los sensores de rollos en bodega." },
              ].map((service) => (
                <div key={service.name} className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 rounded-[32px] group hover:border-white/10 transition-all">
                  <div className={`p-4 rounded-2xl bg-white/5 ${service.color}`}>
                    <service.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      {service.name} 
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                        service.status === 'Conectado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-500'
                      }`}>{service.status}</span>
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">{service.desc}</p>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-[#FDCB02] hover:underline px-4">Configurar</button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "Seguridad" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[40px] flex items-center justify-between">
                 <div className="flex items-center gap-6">
                   <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                     <ShieldCheck size={32} />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold">Autenticación de 2 Factores (2FA)</h3>
                     <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">Protege el acceso a la jauría con tu celular.</p>
                   </div>
                 </div>
                 <div className="h-6 w-12 bg-[#FDCB02] rounded-full relative cursor-pointer shadow-lg shadow-[#FDCB02]/20">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                 <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[40px] space-y-4">
                    <Key className="text-neutral-700" size={24} />
                    <h4 className="font-bold text-sm">Claves de API de Usuario</h4>
                    <p className="text-xs text-neutral-500 leading-relaxed uppercase tracking-tight">Genera llaves seguras para integraciones externas con el CRM.</p>
                    <button className="text-[9px] font-black uppercase text-[#FDCB02] tracking-widest border border-[#FDCB02]/20 px-4 py-2 rounded-lg hover:bg-[#FDCB02]/5">Gestionar Keys</button>
                 </div>
                 <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[40px] space-y-4">
                    <Smartphone className="text-neutral-700" size={24} />
                    <h4 className="font-bold text-sm">Sesiones Activas</h4>
                    <p className="text-xs text-neutral-500 leading-relaxed uppercase tracking-tight">Monitorea desde qué dispositivos se ha logueado tu equipo.</p>
                    <button className="text-[9px] font-black uppercase text-neutral-400 tracking-widest border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5">Ver Dispositivos</button>
                 </div>
               </div>
            </motion.div>
          )}

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}