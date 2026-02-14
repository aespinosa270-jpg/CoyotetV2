"use client"

import { useSession } from "next-auth/react"
import { 
  User, ShieldCheck, Star, Crown, 
  Settings, LogOut, CreditCard, Package 
} from "lucide-react"

export default function ProfileStatus() {
  const { data: session } = useSession()

  // Mapeo de estilos por nivel
  const tierConfig = {
    black: {
      label: "Socio Black",
      sub: "Distribuidor Master",
      color: "from-neutral-800 to-black",
      text: "text-white",
      badge: "bg-white text-black",
      icon: <Crown className="text-white" size={20} />
    },
    gold: {
      label: "Socio Gold",
      sub: "Cliente VIP",
      color: "from-[#FDCB02] to-[#B89600]",
      text: "text-black",
      badge: "bg-black text-[#FDCB02]",
      icon: <Star className="text-black" size={20} />
    },
    silver: {
      label: "Socio Silver",
      sub: "Público General",
      color: "from-neutral-200 to-neutral-400",
      text: "text-black",
      badge: "bg-white text-black",
      icon: <ShieldCheck className="text-black" size={20} />
    }
  }

  const tier = session?.user?.role as "black" | "gold" | "silver" || "silver"
  const config = tierConfig[tier]

  return (
    <div className="w-full max-w-md bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      {/* HEADER CON DEGRADADO SEGÚN NIVEL */}
      <div className={`h-24 bg-gradient-to-br ${config.color} p-6 flex justify-between items-start`}>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-xl ${config.badge}`}>
          Nivel {tier}
        </div>
        {config.icon}
      </div>

      {/* CONTENIDO DEL PERFIL */}
      <div className="px-6 pb-6 relative">
        {/* Avatar Flotante */}
        <div className="w-20 h-20 bg-black border-4 border-[#0A0A0A] rounded-2xl absolute -top-10 left-6 flex items-center justify-center overflow-hidden">
          {session?.user?.image ? (
            <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="text-neutral-500" size={40} />
          )}
        </div>

        <div className="pt-12">
          <h2 className="text-2xl font-[1000] text-white uppercase tracking-tighter leading-none">
            {session?.user?.name || "Usuario Coyote"}
          </h2>
          <p className="text-neutral-500 text-xs font-medium mt-1 uppercase tracking-widest">
            {session?.user?.email}
          </p>
        </div>

        {/* INFO DE MEMBRESÍA */}
        <div className="mt-8 space-y-3">
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} ${config.text}`}>
                {config.icon}
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Membresía Actual</p>
                <p className="text-sm font-black text-white uppercase">{config.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Rango</p>
              <p className="text-sm font-black text-[#FDCB02] uppercase">{config.sub}</p>
            </div>
          </div>
        </div>

        {/* MENÚ DE ACCIONES RÁPIDAS */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="flex items-center gap-2 bg-[#111] hover:bg-[#181818] border border-white/5 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all">
            <Package size={14} className="text-[#FDCB02]" /> Mis Pedidos
          </button>
          <button className="flex items-center gap-2 bg-[#111] hover:bg-[#181818] border border-white/5 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all">
            <CreditCard size={14} className="text-[#FDCB02]" /> Facturación
          </button>
          <button className="flex items-center gap-2 bg-[#111] hover:bg-[#181818] border border-white/5 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all">
            <Settings size={14} /> Ajustes
          </button>
          <button className="flex items-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-500 py-3 px-4 rounded-xl text-xs font-bold transition-all">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>
    </div>
  )
}