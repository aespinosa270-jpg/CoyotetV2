"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, Building2, Crown, Target, TrendingUp, Calendar, ShoppingBag, Award } from "lucide-react";
import Link from "next/link";

interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  status: string;
  agentName: string;
  productName: string;
  date: string;
}

interface ClientProfile {
  id: string;
  hashId: string;
  name: string;
  email: string;
  phone: string;
  rfc: string;
  ltv: number;
  points: number;
  membershipTier: string;
  createdAt: string;
  deals: Deal[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export default function ClienteDetalleClient({ client }: { client: ClientProfile }) {
  const wonDeals = client.deals.filter(d => d.status === "CERRADO_GANADO");
  const ticketPromedio = wonDeals.length > 0 ? client.ltv / wonDeals.length : 0;

  const getTierColor = (tier: string) => {
    if (tier === 'ELITE' || tier === 'PLATINUM') return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    if (tier === 'GOLD') return "text-[#FDCB02] bg-[#FDCB02]/10 border-[#FDCB02]/20";
    if (tier === 'BLACK') return "text-white bg-zinc-800 border-zinc-700";
    return "text-zinc-400 bg-zinc-800/50 border-white/5";
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-y-auto font-sans animate-in fade-in duration-500 custom-scrollbar pb-12">
      
      {/* ─── NAV DE REGRESO ─── */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center px-8 bg-black sticky top-0 z-50">
        <Link href="/crm/admin/clientes" className="flex items-center gap-2 text-zinc-500 hover:text-[#FDCB02] transition-colors text-xs font-black uppercase tracking-widest">
          <ArrowLeft size={14} /> Volver al Directorio
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto w-full p-8 space-y-8 mt-4">
        
        {/* ─── HEADER DEL PERFIL ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          {/* Fondo decorativo */}
          <Crown className="absolute -right-10 -bottom-10 w-64 h-64 text-white/[0.02] rotate-12" />
          
          <div className="flex items-center gap-6 z-10">
            <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-4xl font-black text-[#FDCB02] italic shadow-inner">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{client.name}</h1>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getTierColor(client.membershipTier)}`}>
                  {client.membershipTier === 'NONE' ? 'ESTÁNDAR' : client.membershipTier}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono flex items-center gap-2 mt-2">
                <span className="text-[#FDCB02]">ID: {client.hashId}</span>
                <span className="text-zinc-700">|</span>
                Cliente desde {client.createdAt}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 z-10">
            <span className="flex items-center gap-2 text-xs font-mono text-zinc-400"><Mail size={12}/> {client.email}</span>
            <span className="flex items-center gap-2 text-xs font-mono text-zinc-400"><Phone size={12}/> {client.phone}</span>
            <span className="flex items-center gap-2 text-xs font-mono text-zinc-400"><Building2 size={12}/> RFC: {client.rfc}</span>
          </div>
        </div>

        {/* ─── KPIs FINANCIEROS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><TrendingUp size={12}/> Lifetime Value</p>
            <p className="text-3xl font-mono font-bold text-emerald-500">{fmt(client.ltv)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><Target size={12}/> Ticket Promedio</p>
            <p className="text-3xl font-mono font-bold text-white">{fmt(ticketPromedio)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><ShoppingBag size={12}/> Compras Exitosas</p>
            <p className="text-3xl font-mono font-bold text-sky-400">{wonDeals.length} <span className="text-xs text-zinc-600 font-sans">de {client.deals.length}</span></p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><Award size={12}/> Puntos Lealtad</p>
            <p className="text-3xl font-mono font-bold text-[#FDCB02]">{client.points}</p>
          </div>
        </div>

        {/* ─── HISTORIAL DE PEDIDOS ─── */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <Calendar size={14} className="text-[#FDCB02]" /> Historial de Cotizaciones y Pedidos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-black border-b border-white/5 bg-zinc-900/20">
                  <th className="px-8 py-5">Fecha</th>
                  <th className="px-8 py-5">Concepto / Producto</th>
                  <th className="px-8 py-5">Atendido por</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {client.deals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-zinc-600 font-mono text-sm">
                      Este cliente aún no tiene historial de movimientos.
                    </td>
                  </tr>
                ) : (
                  client.deals.map((deal, idx) => (
                    <motion.tr 
                      key={deal.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-8 py-5 text-xs font-mono text-zinc-400">{deal.date}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-white uppercase">{deal.title}</p>
                        <p className="text-[10px] text-zinc-600 tracking-tight">{deal.productName}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-white/5 uppercase font-bold tracking-widest">
                          {deal.agentName}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm border ${
                          deal.status === 'CERRADO_GANADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          deal.status === 'CERRADO_PERDIDO' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}>
                          {deal.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-mono font-bold text-zinc-200">
                        {fmt(deal.value)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      
      {/* Mismo Scrollbar CSS que tu layout principal */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}