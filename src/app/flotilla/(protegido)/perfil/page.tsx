import { ShieldCheck, Settings, Bell } from "lucide-react";
import BtnFinalizarTurno from "@/components/flotilla/BtnFinalizarTurno";
import { auth } from "@/auth";

export default async function PerfilChofer() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 pb-24 font-sans">
      {/* CARD DE USUARIO PREMIUM - COYOTE OS */}
      <div className="bg-black rounded-[3rem] p-10 text-center text-white shadow-2xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#FDCB02] opacity-5 blur-3xl rounded-full translate-y-1/2"></div>
        <div className="relative z-10">
          <div className="w-28 h-28 bg-[#FDCB02] rounded-full mx-auto mb-6 flex items-center justify-center text-black text-5xl font-[1000] border-8 border-white/5 shadow-2xl">
            {session?.user?.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-2">
            {session?.user?.name || "Chofer Coyote"}
          </h2>
          <div className="bg-[#FDCB02] text-black text-[9px] font-black uppercase tracking-[0.3em] py-1 px-4 rounded-full inline-block">
            Operador de Flotilla
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* ESTATUS OPERATIVO */}
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-black shadow-inner">
            <ShieldCheck size={24} strokeWidth={2.5}/>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Estatus del Operador</p>
            <p className="text-sm font-[900] text-black uppercase">Verificado / Activo</p>
          </div>
        </div>

        {/* PANEL DE AJUSTES */}
        <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-50">
          <button className="w-full p-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left">
            <div className="flex items-center gap-4 text-black font-[900] uppercase text-xs tracking-widest">
              <Bell size={20} className="text-neutral-400" /> Notificaciones
            </div>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </button>
          <button className="w-full p-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left">
            <div className="flex items-center gap-4 text-black font-[900] uppercase text-xs tracking-widest">
              <Settings size={20} className="text-neutral-400" /> Configuración
            </div>
          </button>
        </div>

        {/* COMPONENTE FUNCIONAL DE CIERRE */}
        <BtnFinalizarTurno />
      </div>
    </div>
  );
}