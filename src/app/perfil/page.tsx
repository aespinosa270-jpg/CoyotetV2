// src/app/perfil/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { 
  ChevronLeft, LayoutDashboard, TrendingUp, Package, 
  ShieldCheck, KeyRound, User, Crown, Star, 
  ArrowRight, ArrowUpRight, Clock, Activity, Zap, Gem, Trophy,
  Calendar, Percent, Truck, Gift, QrCode, CreditCard
} from "lucide-react"
import OrderHistoryList from "./OrderHistoryList"
// Formateadores
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

const formatPoints = (points: number) => 
  new Intl.NumberFormat('es-MX').format(Math.floor(points))

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/cuenta")
  }

  // 1. DATA MINING: Extracción de ADN del Socio y Finanzas
  const userStats = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      orders: { 
        orderBy: { createdAt: 'desc' },
        // 🔥 ACTUALIZADO: Traemos todo lo necesario para el OrderHistoryList
        include: { items: true } 
      }
    }
  })

  if (!userStats) redirect("/cuenta")

  const tier = userStats.membershipTier || "NONE"
  const orders = userStats.orders || []

  // Cálculos Reales
  const totalSpent = orders
    .filter(o => o.status === 'PAID' || o.status === 'DELIVERED')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  const activeOrdersCount = orders
    .filter(o => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status))
    .length

  // 2. CONFIGURACIÓN DE IDENTIDAD POR RANGO (Diferenciación Total)
  const TIER_UI: Record<string, any> = {
    NONE: {
      label: "Socio Silver",
      sub: "Acceso Estándar",
      gradient: "from-neutral-400 via-neutral-200 to-neutral-500",
      text: "text-black",
      badge: "bg-black text-white",
      icon: <ShieldCheck size={28} className="text-black" />,
      glow: "shadow-[0_0_40px_rgba(255,255,255,0.05)]",
      accent: "text-neutral-400",
      factor: "0.5x",
      perks: [
        { icon: <Percent size={14}/>, text: "Precios de Lista" },
        { icon: <Zap size={14}/>, text: "Acumulación Base" }
      ]
    },
    GOLD: {
      label: "Socio Gold",
      sub: "Distribuidor Autorizado",
      gradient: "from-[#FDCB02] via-[#FFD700] to-[#B8860B]",
      text: "text-black",
      badge: "bg-black text-[#FDCB02]",
      icon: <Star size={28} fill="black" />,
      glow: "shadow-[0_0_50px_rgba(253,203,2,0.2)]",
      accent: "text-[#FDCB02]",
      factor: "1.0x",
      perks: [
        { icon: <Percent size={14}/>, text: "10% de Descuento Activo" },
        { icon: <Calendar size={14}/>, text: "7 Días de Apartado" },
        { icon: <Zap size={14}/>, text: "Puntos por Compra" }
      ]
    },
    BLACK: {
      label: "Socio Black",
      sub: "Socio Ejecutivo",
      gradient: "from-[#222] via-[#0a0a0a] to-black",
      text: "text-white",
      badge: "bg-white text-black",
      icon: <Crown size={28} className="text-white" />,
      glow: "shadow-[0_0_60px_rgba(255,255,255,0.05)]",
      accent: "text-white",
      factor: "2.0x",
      perks: [
        { icon: <Percent size={14}/>, text: "15% de Descuento Activo" },
        { icon: <Truck size={14}/>, text: "Prioridad SkydropX" },
        { icon: <Gift size={14}/>, text: "Muestrarios Gratis" }
      ]
    },
    ELITE: {
      label: "Socio Elite",
      sub: "Master Partner",
      gradient: "from-[#0b0e11] via-[#1c252b] to-[#2b3a42]",
      text: "text-white",
      badge: "bg-[#FDCB02] text-black",
      icon: <Gem size={28} className="text-[#FDCB02]" />,
      glow: "shadow-[0_0_80px_rgba(0,180,255,0.15)]",
      accent: "text-cyan-400",
      factor: "4.0x",
      perks: [
        { icon: <Truck size={14}/>, text: "Envío Local GRATIS" },
        { icon: <Percent size={14}/>, text: "Tarifa Preferencial Elite" },
        { icon: <Trophy size={14}/>, text: "Acceso a Novedades 30d" },
        { icon: <Calendar size={14}/>, text: "15 Días de Apartado" }
      ]
    }
  }

  const current = TIER_UI[tier]

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#FDCB02] selection:text-black font-sans pb-20">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] pointer-events-none" />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 lg:pt-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#FDCB02] transition-all text-[10px] font-black uppercase tracking-widest">
              <ChevronLeft size={14} /> Back to Coyote
            </Link>
            <h1 className="text-6xl md:text-8xl font-[1000] uppercase tracking-tighter leading-none italic">
              Dashboard<span className={current.accent}>.</span>
            </h1>
          </div>
          {userStats.role === 'ADMIN' && (
            <Link href="/admin" className="h-16 px-10 bg-white text-black hover:bg-[#FDCB02] rounded-2xl flex items-center gap-4 text-xs font-black uppercase tracking-widest transition-all shadow-2xl">
              <LayoutDashboard size={20} /> Admin Panel
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* COL IZQ: IDENTIDAD Y PERKS (DISEÑO MUTABLE) */}
          <div className="xl:col-span-4 space-y-8">
            <div className={`rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/5 ${current.glow}`}>
              <div className={`h-40 bg-gradient-to-br ${current.gradient} p-10 flex justify-between items-start relative`}>
                 <div className="absolute inset-0 bg-black/10 mix-blend-overlay opacity-50" />
                 <div className={`px-5 py-2 rounded-xl text-[10px] font-[1000] uppercase tracking-widest z-10 ${current.badge} shadow-2xl`}>
                   {current.label}
                 </div>
                 <div className="z-10 bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/10">
                   {current.icon}
                 </div>
              </div>

              <div className="px-10 pb-10 relative">
                <div className="w-28 h-28 bg-black border-8 border-[#0A0A0A] rounded-[2rem] absolute -top-14 left-10 overflow-hidden shadow-2xl">
                  {userStats.image ? <img src={userStats.image} className="w-full h-full object-cover" /> : <User size={48} className="m-auto mt-6 text-neutral-800" />}
                </div>

                <div className="pt-20">
                  <h2 className="text-4xl font-[1000] uppercase tracking-tighter leading-none mb-2">{userStats.name || "Socio B2B"}</h2>
                  <div className="flex items-center gap-2 text-neutral-500 font-bold uppercase text-[10px] tracking-widest">
                    <KeyRound size={12} className={current.accent} /> {userStats.email}
                  </div>
                </div>

                {/* ESTATUS Y EXPIRACIÓN */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Estatus</p>
                    <p className="text-xs font-black text-green-500 uppercase flex items-center gap-1.5"><Activity size={12}/> Activo</p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Expira</p>
                    <p className="text-xs font-black text-white uppercase">{userStats.membershipExpiry ? new Date(userStats.membershipExpiry).toLocaleDateString('es-MX') : 'Indefinido'}</p>
                  </div>
                </div>

                {/* BENEFICIOS REALES */}
                <div className="mt-8 space-y-3">
                  <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-4">Privilegios de Nivel</p>
                  {current.perks.map((perk: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 text-xs font-bold uppercase tracking-tight text-neutral-300 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className={current.accent}>{perk.icon}</div>
                      {perk.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTÓN DE UPGRADE SI NO ES ELITE */}
            {tier !== 'ELITE' && (
              <Link href="/membresia" className="flex items-center justify-between p-6 bg-[#FDCB02] text-black rounded-3xl font-[1000] uppercase text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(253,203,2,0.2)] group">
                <span>Subir de Nivel</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>

          {/* COL DER: BILLETERA Y FINANZAS */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* 💳 COYOTE WALLET (Puntos Reales) */}
            <div className="bg-gradient-to-br from-[#111] to-black border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute -right-10 -bottom-10 text-white/[0.03] rotate-12 group-hover:scale-110 transition-transform duration-1000">
                <QrCode size={280} />
              </div>
              
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.4em] mb-3">Bóveda de Recompensas</p>
                  <h3 className="text-4xl font-[1000] uppercase italic tracking-tighter">Coyote Wallet<span className={current.accent}>.</span></h3>
                </div>
                <div className={`p-5 bg-black border ${tier !== 'NONE' ? 'border-[#FDCB02]/50' : 'border-white/10'} rounded-[2rem] shadow-inner`}>
                  <Zap size={32} className={current.accent} fill="currentColor" />
                </div>
              </div>

              <div className="flex items-baseline gap-4 mb-10 relative z-10">
                <span className="text-8xl md:text-9xl font-[1000] tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {formatPoints(userStats.points)}
                </span>
                <span className="text-2xl font-black text-neutral-500 uppercase tracking-widest">Pts</span>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 relative z-10 max-w-sm">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-3">
                  <span className="text-neutral-400">Factor de Acumulación</span>
                  <span className={current.accent}>{current.factor}</span>
                </div>
                <div className="h-2 w-full bg-black rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-white to-white transition-all`} style={{ width: '45%' }} />
                </div>
                <p className="text-[8px] text-neutral-600 mt-3 uppercase font-bold text-center">Desbloquea canje por mercancía a los 5,000 pts</p>
              </div>
            </div>

            {/* MÉTRICAS FINANCIERAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#0A0A0A] border border-white/5 p-10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 text-white/[0.02] rotate-12"><TrendingUp size={180} /></div>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-4">Capital Invertido</p>
                <h3 className="text-5xl font-[1000] tracking-tighter text-white mb-2">{formatMoney(totalSpent)}</h3>
                <p className="text-[9px] text-neutral-600 font-bold uppercase">Facturación histórica total</p>
              </div>

              <div className="bg-[#0A0A0A] border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-between group">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em]">Órdenes Activas</p>
                  <Package className={current.accent} size={28} />
                </div>
                <div>
                  <h3 className="text-7xl font-[1000] tracking-tighter text-white">{activeOrdersCount}</h3>
                  <Link href="/pedidos" className="mt-8 flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 group/link">
                    <span>Logística en Tiempo Real</span>
                    <ArrowUpRight size={18} className="group-hover/link:rotate-45 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* SEGURIDAD B2B */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] overflow-hidden">
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40">
                  <div className="flex items-center gap-4">
                    <ShieldCheck size={24} className={current.accent} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Seguridad de la Cuenta</h3>
                  </div>
               </div>
               <div className="p-10 flex flex-col md:flex-row gap-8 justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-black rounded-2xl border border-white/5 text-neutral-600 shadow-inner"><Clock size={24}/></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Miembro desde</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">{new Date(userStats.createdAt).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-10 py-5 bg-white/5 hover:bg-white hover:text-black text-white rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all border border-white/5">
                      Seguridad
                    </button>
                    <button className="flex-1 md:flex-none px-10 py-5 bg-white/5 hover:bg-white hover:text-black text-white rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all border border-white/5">
                      Soporte Técnico
                    </button>
                  </div>
               </div>
            </div>
            
            {/* 🔥 AQUÍ INYECTAMOS EL COMPONENTE CLIENTE DE ÓRDENES */}
            <OrderHistoryList orders={orders} />

          </div>
        </div>
      </main>
    </div>
  )
}