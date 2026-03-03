import React from "react";
import ZadarmaWidget from "@/components/ui/ZadarmaWidget"; // 👈 Ajusta la ruta si lo guardaste en otro lado
import Link from "next/link";
import { LayoutDashboard, Users, Package, Settings, PhoneForwarded } from "lucide-react";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden selection:bg-[#FDCB02] selection:text-black">
      
      {/* SIDEBAR B2B */}
      <aside className="w-64 border-r border-white/10 bg-[#050505] hidden md:flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <h1 className="text-2xl font-[1000] uppercase tracking-tighter text-white">
            COYOTE <span className="text-[#FDCB02]">CRM</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link href="/crm" className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">
            <LayoutDashboard size={18} /> Tablero Central
          </Link>
          <Link href="/crm/clientes" className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">
            <Users size={18} /> Base de Clientes
          </Link>
          <Link href="/crm/inventario" className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">
            <Package size={18} /> Inventario / Stock
          </Link>
          <Link href="/crm/llamadas" className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">
            <PhoneForwarded size={18} /> Registro de Llamadas
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-neutral-400 hover:text-[#FDCB02] transition-all font-bold text-sm">
            <Settings size={18} /> Configuración
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header superior */}
        <header className="h-20 border-b border-white/10 bg-[#050505]/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest font-bold">
            Portal Operativo Activo
          </span>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#FDCB02] text-black flex items-center justify-center font-black text-xs">
              CT
            </div>
          </div>
        </header>

        {/* Contenido dinámico (Aquí se cargan las pages del CRM) */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          {children}
        </div>
      </main>

      {/* ☎️ EL WIDGET DE LLAMADAS PERSISTENTE 
          Como está fuera del <main>, nunca se va a recargar aunque cambies de sección.
      */}
      <ZadarmaWidget />

    </div>
  );
}