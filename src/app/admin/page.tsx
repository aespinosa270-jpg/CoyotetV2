import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { 
  ChevronLeft, LayoutDashboard, TrendingUp, Users, 
  PackageSearch, Activity, DollarSign, ArrowUpRight, 
  ShieldAlert, Zap, BarChart3, Clock, Box
} from "lucide-react"

// Importación del botón inteligente de extracción
import ExportButton from "@/components/admin/export-button"

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
const formatNumber = (num: number) => 
  new Intl.NumberFormat('es-MX').format(num)

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || (session.user as any).role !== "black") {
    redirect("/perfil")
  }

  const [totalUsers, allOrders] = await Promise.all([
    prisma.user.count(),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, role: true } }
      }
    })
  ])

  const paidOrders = allOrders.filter(o => ['COMPLETED', 'PAID', 'DELIVERED'].includes(o.status))
  const globalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const averageOrderValue = paidOrders.length > 0 ? globalRevenue / paidOrders.length : 0

  const pendingCount = allOrders.filter(o => o.status === 'PENDING').length
  const processingCount = allOrders.filter(o => o.status === 'PROCESSING' || o.status === 'SHIPPED').length
  const completedCount = paidOrders.length

  const recentOrders = allOrders.slice(0, 7)

  // PREPARACIÓN DE DATOS PARA EL REPORTE PDF
  const reportData = {
    ceoName: session.user.name || "CEO",
    totalUsers,
    globalRevenue,
    averageOrderValue,
    totalOrders: allOrders.length,
    pendingCount,
    processingCount,
    completedCount,
    recentOrders: recentOrders.map(o => ({
      id: String(o.id),
      customer: o.user?.name || "Socio B2B",
      email: o.user?.email || "N/A",
      date: new Date(o.createdAt).toLocaleDateString('es-MX'),
      status: o.status,
      total: o.total || 0
    }))
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#FDCB02] selection:text-black font-sans pb-20">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_top,white,transparent_80%)] opacity-20 pointer-events-none" />
      <div className="fixed top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FDCB02]/50 to-transparent shadow-[0_0_30px_rgba(253,203,2,0.5)]" />
      
      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-10 lg:py-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12 border-b border-white/[0.05] pb-10 relative">
          <div className="absolute bottom-0 left-0 w-32 h-px bg-gradient-to-r from-[#FDCB02] to-transparent" />
          
          <div>
            <Link href="/perfil" className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FDCB02] transition-colors text-[10px] font-black uppercase tracking-[0.3em] mb-6 group">
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Regresar al Perfil
            </Link>
            <h1 className="text-6xl md:text-8xl font-[1000] uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-600">
              ¡Hola {session.user.name?.split(' ')[0] || 'Jack'}!<span className="text-[#FDCB02]">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
             {/* AQUÍ SE PASAN LOS DATOS PARA EVITAR EL ERROR */}
             <ExportButton data={reportData} />
          </div>
        </header>

        {/* BENTO GRID SUPERIOR: MÉTRICAS MACRO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/[0.05] p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group hover:border-white/10 transition-all duration-500">
            <div className="absolute -bottom-20 -right-20 text-white/[0.02] group-hover:text-[#FDCB02]/5 transition-colors duration-700 rotate-12 pointer-events-none">
              <DollarSign size={400} strokeWidth={0.5} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-[10px] text-[#FDCB02] font-black uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                  <Activity size={14} className="animate-pulse" /> Liquidez en Tiempo Real
                </p>
                <h2 className="text-6xl md:text-9xl font-[1000] tracking-[calc(-0.05em)] text-white mb-4">
                  {formatMoney(globalRevenue)}
                </h2>
              </div>
              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
                <div>
                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.3em] mb-2 font-mono">Promedio de Transacción (AOV)</p>
                  <p className="text-3xl font-[1000] text-white tracking-tighter">{formatMoney(averageOrderValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.3em] mb-2 font-mono">Volumen Operativo</p>
                  <p className="text-3xl font-[1000] text-white tracking-tighter">{formatNumber(paidOrders.length)} <span className="text-sm text-neutral-700 uppercase">Facturadas</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#0A0A0A] border border-white/[0.05] p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-all duration-500">
            <div className="mb-10">
              <p className="text-[10px] text-white font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                <Box size={14} className="text-[#FDCB02]" /> Pipeline Logístico
              </p>
              <h3 className="text-5xl font-[1000] tracking-tighter text-white">
                {formatNumber(allOrders.length)}
                <span className="block text-sm text-neutral-600 font-black tracking-[0.2em] uppercase mt-2 text-right">Órdenes Totales</span>
              </h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "En Cola", count: pendingCount, color: "bg-[#FDCB02]" },
                { label: "En Proceso", count: processingCount, color: "bg-blue-500" },
                { label: "Entregadas", count: completedCount, color: "bg-green-500" }
              ].map((stat, i) => (
                <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between group/stat hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${stat.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">{stat.label}</span>
                  </div>
                  <span className="text-2xl font-[1000] text-white">{formatNumber(stat.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABLA DE OPERACIONES RECIENTES */}
        <div className="bg-[#050505] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 md:p-10 border-b border-white/5 flex flex-wrap gap-6 items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#FDCB02]/10 rounded-2xl border border-[#FDCB02]/20">
                <BarChart3 size={24} className="text-[#FDCB02]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Ledger Financiero Maestro</h3>
                <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1 italic">Auditoría en vivo de la red Coyote</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-black border-b border-white/10">
                  <th className="p-8 text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em]">Hash de Transacción</th>
                  <th className="p-8 text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em]">Entidad B2B / Socio</th>
                  <th className="p-8 text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em]">Marca de Tiempo</th>
                  <th className="p-8 text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em]">Estado</th>
                  <th className="p-8 text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em] text-right text-[#FDCB02]">Volumen Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {recentOrders.map((order) => {
                  const customerName = order.user?.name || "Socio B2B";
                  const customerEmail = order.user?.email || "N/A";
                  
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8 text-[11px] font-mono text-neutral-600 group-hover:text-white transition-colors tracking-tighter">
                        {String(order.id).substring(0,8).toUpperCase()}
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center text-xs font-black text-neutral-400 group-hover:text-white transition-colors">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">{customerName}</p>
                            <p className="text-[9px] text-neutral-600 font-mono mt-1 italic">{customerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-400 font-mono tracking-tighter">
                            {new Date(order.createdAt).toLocaleDateString('es-MX')}
                          </span>
                          <span className="text-[9px] text-neutral-700 font-mono flex items-center gap-2 uppercase tracking-widest font-black">
                            <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString('es-MX')}
                          </span>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md border ${
                          ['COMPLETED', 'PAID', 'DELIVERED'].includes(order.status) 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-[#FDCB02]/10 text-[#FDCB02] border-[#FDCB02]/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <span className="text-lg font-[1000] tracking-tight text-white bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/[0.05] group-hover:border-[#FDCB02]/40 transition-all">
                          {formatMoney(order.total || 0)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}