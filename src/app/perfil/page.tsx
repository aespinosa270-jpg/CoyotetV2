import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { 
  ChevronLeft, LayoutDashboard, TrendingUp, Package, 
  ShieldCheck, KeyRound, User, Crown, Star, 
  ArrowUpRight, Clock, Activity, Zap
} from "lucide-react"

// Formateador financiero de alta precisión
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

export default async function PerfilPage() {
  // 1. AUTENTICACIÓN A NIVEL DE SERVIDOR
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  // 2. EXTRACCIÓN DE DATOS REALES (POSTGRESQL)
  const userStats = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      orders: { 
        select: { total: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!userStats) {
    redirect("/login")
  }

  // 3. MOTOR FINANCIERO Y LOGÍSTICO
  const orders = userStats.orders || []
  
  const totalSpent = orders
    .filter(o => o.status === 'COMPLETED' || o.status === 'PAID' || o.status === 'DELIVERED')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  const activeOrdersCount = orders
    .filter(o => o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'SHIPPED')
    .length

  const lastOrderDate = orders.length > 0 ? new Date(orders[0].createdAt).toLocaleDateString('es-MX') : 'Sin registro'

  // 4. ALGORITMO DE JERARQUÍA B2B (CON PRIVILEGIO DE ADMIN)
  let nextTierGoal = 10000000 // Meta Silver -> Gold: 10M
  let currentTierName = "Silver"
  let nextTierName = "Gold"
  
  // OVERRIDE: El rol en la base de datos es la máxima autoridad
  const isDbBlack = userStats.role === 'black'
  const isDbGold = userStats.role === 'gold'

  if (totalSpent >= 50000000 || isDbBlack) {
    nextTierGoal = totalSpent > 50000000 ? totalSpent : 50000000 
    currentTierName = "Black"
    nextTierName = "MAX"
  } else if (totalSpent >= 10000000 || isDbGold) {
    nextTierGoal = 50000000 
    currentTierName = "Gold"
    nextTierName = "Black"
  }

  // 5. RENDERIZADO DINÁMICO DE ESTILOS (UI MATERIAL B2B)
  let tierStyle = {
    label: "Socio Silver",
    sub: "Público General",
    gradient: "from-neutral-300 via-neutral-100 to-neutral-400",
    text: "text-black",
    badge: "bg-black text-white",
    border: "border-neutral-200/20",
    icon: <ShieldCheck className="text-black" size={24} />,
    glow: "shadow-[0_0_30px_rgba(255,255,255,0.1)]"
  }

  if (currentTierName === "Black") {
    tierStyle = {
      label: "Socio Black",
      sub: "Distribuidor Master",
      gradient: "from-[#1a1a1a] via-[#0a0a0a] to-black",
      text: "text-white",
      badge: "bg-white text-black",
      border: "border-white/10",
      icon: <Crown className="text-white" size={24} />,
      glow: "shadow-[0_0_40px_rgba(255,255,255,0.05)]"
    }
  } else if (currentTierName === "Gold") {
    tierStyle = {
      label: "Socio Gold",
      sub: "Cliente VIP",
      gradient: "from-[#FDCB02] via-[#ffda44] to-[#B89600]",
      text: "text-black",
      badge: "bg-black text-[#FDCB02]",
      border: "border-[#FDCB02]/30",
      icon: <Star className="text-black" size={24} />,
      glow: "shadow-[0_0_40px_rgba(253,203,2,0.15)]"
    }
  }

  const progressPercentage = currentTierName === "Black" 
    ? 100 
    : Math.min(100, (totalSpent / nextTierGoal) * 100)

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#FDCB02] selection:text-black font-sans">
      {/* BACKGROUND TEXTURE: Malla Industrial Premium */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_top,white,transparent_80%)] opacity-15 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
        
        {/* TOP NAV: Elegante y Funcional */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-white/5 pb-8">
          <div>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FDCB02] transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-6"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Portal Principal
            </Link>
            <h1 className="text-6xl md:text-7xl font-[1000] uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500">
              Mi Cuenta<span className="text-[#FDCB02]">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
             {isDbBlack && (
               <Link href="/admin" className="h-14 px-8 bg-white text-black hover:bg-[#FDCB02] rounded-xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(253,203,2,0.3)] group">
                  <LayoutDashboard size={18} className="group-hover:scale-110 transition-transform" />
                  Consola Admin
               </Link>
             )}
          </div>
        </div>

        {/* GRID PRINCIPAL B2B */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* COLUMNA IZQ: ID CARD METÁLICA (Span 4) */}
          <div className="xl:col-span-4">
            <div className={`relative w-full rounded-3xl overflow-hidden bg-[#0A0A0A] border ${tierStyle.border} ${tierStyle.glow} transition-all duration-500 hover:-translate-y-1 group`}>
              
              {/* Header de la Tarjeta */}
              <div className={`h-32 bg-gradient-to-br ${tierStyle.gradient} p-8 flex justify-between items-start relative overflow-hidden`}>
                <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay"></div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl ${tierStyle.badge} z-10 backdrop-blur-md`}>
                  Tier {currentTierName}
                </div>
                <div className="z-10 bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  {tierStyle.icon}
                </div>
              </div>

              {/* Cuerpo de la Tarjeta */}
              <div className="px-8 pb-8 relative">
                {/* Avatar Hexagonal / Redondeado */}
                <div className="w-24 h-24 bg-[#050505] border-4 border-[#0A0A0A] rounded-2xl absolute -top-12 left-8 flex items-center justify-center overflow-hidden shadow-2xl ring-1 ring-white/10">
                  {userStats.image ? (
                    <img src={userStats.image} alt={userStats.name || "Perfil"} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-neutral-600" size={40} />
                  )}
                </div>

                <div className="pt-16">
                  <h2 className="text-3xl font-[1000] text-white uppercase tracking-tighter leading-none mb-2">
                    {userStats.name || "Socio B2B"}
                  </h2>
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <KeyRound size={10} /> {userStats.email}
                  </p>
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Estado de Cuenta</span>
                    <span className="text-xs font-black text-green-500 uppercase flex items-center gap-1"><Activity size={12}/> Activo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Rol del Sistema</span>
                    <span className="text-xs font-black text-white uppercase">{tierStyle.sub}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Último Movimiento</span>
                    <span className="text-xs font-black text-white uppercase">{lastOrderDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DER: PANEL DE RENDIMIENTO FINANCIERO (Span 8) */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* TITULO DE SECCIÓN */}
            <div className="flex items-center gap-3 px-2">
              <Zap size={20} className="text-[#FDCB02]" />
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Rendimiento Comercial</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TARJETA DE MILLONES (Volumen) */}
              <div className="bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors shadow-2xl">
                <div className="absolute -top-10 -right-10 text-white/5 group-hover:text-[#FDCB02]/10 transition-colors duration-500 rotate-12">
                  <TrendingUp size={160} strokeWidth={1} />
                </div>
                
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mb-4">Capital Invertido</p>
                <h3 className="text-5xl lg:text-6xl font-[1000] tracking-tighter text-white mb-2 relative z-10">
                  {formatMoney(totalSpent)}
                </h3>
                
                {/* BARRA DE PROGRESO HIGH-END */}
                <div className="mt-12 relative z-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                    <span className="text-white">Nivel actual: {currentTierName}</span>
                    <span className="text-neutral-500">{currentTierName === "Black" ? "Tope Alcanzado" : `Meta: ${formatMoney(nextTierGoal)}`}</span>
                  </div>
                  <div className="h-3 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FDCB02] via-[#ffea8a] to-[#FDCB02] transition-all duration-1000 ease-out relative" 
                      style={{ width: `${progressPercentage}%` }}
                    >
                      {/* Efecto de luz viajando en la barra */}
                      {totalSpent > 0 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[50px] animate-[shimmer_2s_infinite]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TARJETA DE LOGÍSTICA B2B */}
              <div className="bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em]">En Tránsito</p>
                    <div className="p-3 bg-black border border-white/5 rounded-xl text-[#FDCB02] shadow-inner">
                      <Package size={24} />
                    </div>
                  </div>
                  <h3 className="text-6xl font-[1000] text-white tracking-tighter">
                    {activeOrdersCount}
                    <span className="text-lg text-neutral-600 font-bold tracking-widest ml-2 uppercase">Órdenes</span>
                  </h3>
                </div>
                
                <Link href="/pedidos" className="mt-8 flex items-center justify-between w-full p-4 bg-black border border-white/5 hover:border-[#FDCB02]/50 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all group/btn">
                  <span>Centro de Logística</span>
                  <ArrowUpRight size={16} className="text-[#FDCB02] group-hover/btn:rotate-45 transition-transform" />
                </Link>
              </div>
            </div>

            {/* SEGURIDAD B2B COMPLEJA */}
            <div className="mt-8 bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
               <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-black/50">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-neutral-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Centro de Seguridad B2B</h3>
                  </div>
               </div>
               
               <div className="p-6 md:p-8 space-y-2">
                  
                  {/* Item: Credenciales */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] rounded-2xl transition-colors border border-transparent hover:border-white/5">
                     <div className="flex items-center gap-5">
                        <div className="p-3 bg-black border border-white/5 rounded-xl text-neutral-500 shadow-inner">
                          <KeyRound size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Cifrado de Acceso</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} /> Cuenta generada: {new Date(userStats.createdAt).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                     </div>
                     <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5">
                       Actualizar
                     </button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] rounded-2xl transition-colors border border-transparent hover:border-white/5">
                     <div className="flex items-center gap-5">
                        <div className="p-3 bg-black border border-white/5 rounded-xl text-neutral-500 shadow-inner">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">MFA / 2-Factor</p>
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Sistema Vulnerable
                          </p>
                        </div>
                     </div>
                     <button className="px-6 py-3 bg-[#FDCB02] hover:bg-[#ffda44] text-black shadow-[0_0_15px_rgba(253,203,2,0.2)] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                       Vincular App
                     </button>
                  </div>

               </div>
            </div>

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(1000%); }
        }
      `}} />
    </div>
  )
}