// src/app/crm/ClientDashboard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Lock, ShieldCheck,
  Package, MapPin, Mail, Phone, Truck, X, MessageCircle,
  ChevronRight, Activity, Clock, CheckCircle2, Receipt, Map, QrCode, Factory, Loader2,
  Send, Paperclip, CheckCheck, MoreVertical, User,
  Timer, Coffee, PlayCircle, LogOut, Calendar, History, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Softphone from './Softphone';
// --- TIPOS ---
type OrderItem = { id: string; title: string; quantity: number; unit: string; color: string };
type Order = { id: string; orderNumber: string; total: number; status: string; date: string };
type GlobalOrder = Order & {
  customerId: string; customerName: string; logisticsType: string;
  address: string; email: string; phone: string; vehiclesNeeded: number; items: OrderItem[]
};
type Customer = {
  id: string; name: string; safeEmail: string; safePhone: string; safeAddress: string;
  ltv: number; membership: string; optedIn: boolean; orders: Order[];
};
interface DashboardProps {
  customers: Customer[];
  globalOrders: GlobalOrder[];
  employeeName?: string;
  employeeRole?: string;
}

// ─── STATUS BADGE ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PAID:       { label: 'Pagado',      cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' },
    PENDING:    { label: 'Pendiente',   cls: 'text-amber-400  border-amber-400/30  bg-amber-400/5'  },
    PROCESSING: { label: 'Empacado',    cls: 'text-sky-400    border-sky-400/30    bg-sky-400/5'    },
    SHIPPED:    { label: 'En Tránsito', cls: 'text-violet-400 border-violet-400/30 bg-violet-400/5' },
  };
  const cfg = map[status] ?? { label: status, cls: 'text-neutral-400 border-neutral-600 bg-neutral-900' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-black uppercase tracking-[0.18em] rounded-sm ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  );
}

// ─── NAV ITEM ──────────────────────────────────────────────────────
function NavItem({
  icon: Icon, label, badge, active, onClick,
}: { icon: any; label: string; badge?: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-150 ${
        active ? 'text-[#FDCB02]' : 'text-neutral-600 hover:text-neutral-300'
      }`}
    >
      {/* Active bar */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FDCB02] transition-all duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} />
      <Icon size={15} strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
      {badge && <span className="ml-auto">{badge}</span>}
    </button>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────
export default function ClientDashboard({
  customers, globalOrders, employeeName = 'Usuario', employeeRole = 'OPERADOR'
}: DashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'customers' | 'orders' | 'shift'>('customers');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<GlobalOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── SHIFT SYSTEM ─────────────────────────────────────────────────
  const [workState, setWorkState] = useState<'OFF_DUTY' | 'ON_DUTY' | 'BREAK'>('OFF_DUTY');
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [shiftLogs, setShiftLogs] = useState<{ id: number; time: string; action: string; type: string }[]>([]);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (workState === 'ON_DUTY')  t = setInterval(() => setWorkSeconds(s => s + 1), 1000);
    if (workState === 'BREAK')    t = setInterval(() => setBreakSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [workState]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${ss}`;
  };

  const log = (action: string, type: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setShiftLogs(p => [{ id: Date.now(), time, action, type }, ...p]);
  };

  const handleClockIn = () => { setWorkState('ON_DUTY'); log('Inicio de Turno', 'in'); };
  const handleBreak   = () => { setWorkState('BREAK');   log('Inicio de Pausa', 'break'); };
  const handleResume  = () => { setWorkState('ON_DUTY'); log('Fin de Pausa · Retorno', 'resume'); };
  const handleClockOut = () => {
    if (confirm('¿Finalizar turno?')) { setWorkState('OFF_DUTY'); log('Fin de Turno', 'out'); }
  };

  // ── CHAT ─────────────────────────────────────────────────────────
  const [chatCustomer, setChatCustomer] = useState<Customer | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hola, necesito actualizar la dirección de entrega de mi pedido.', sender: 'client', time: '10:42' },
    { id: 2, text: '¡Claro! Con gusto le ayudo. ¿Me puede confirmar el código postal nuevo?', sender: 'agent', time: '10:45' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatCustomer]);

  const sendMsg = () => {
    if (!chatMessage.trim()) return;
    setMessages(p => [...p, { id: Date.now(), text: chatMessage, sender: 'agent', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMessage('');
  };

  // ── FILTERS ──────────────────────────────────────────────────────
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOrders = globalOrders.filter(o =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── SHIFT STATE COLORS ───────────────────────────────────────────
  const shiftColor = workState === 'ON_DUTY' ? '#22c55e' : workState === 'BREAK' ? '#f59e0b' : '#ef4444';
  const shiftLabel = workState === 'ON_DUTY' ? 'ACTIVO' : workState === 'BREAK' ? 'PAUSA' : 'FUERA';

  return (
    <div className="crm-root min-h-screen flex bg-[#040404] text-white overflow-hidden relative">

      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="w-60 bg-[#070707] border-r border-white/[0.06] hidden lg:flex flex-col relative z-20 shrink-0">
        {/* Corner geometry */}
        <div className="absolute top-0 right-0 w-16 h-16 border-b border-l border-[#FDCB02]/10 pointer-events-none" />

        {/* Brand */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 bg-[#FDCB02] rounded-sm flex items-center justify-center">
              <span className="text-black font-black text-[8px]">CY</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FDCB02]">Coyote</span>
          </div>
          <h1 className="text-2xl font-[900] uppercase tracking-[-0.04em] text-white leading-none">
            CRM<span className="text-neutral-700">.</span>
          </h1>
          <p className="text-[8px] font-bold text-neutral-600 tracking-[0.3em] uppercase mt-1">Sistema Operativo</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6">
          <p className="px-6 text-[8px] font-black text-neutral-700 tracking-[0.3em] uppercase mb-3">Central</p>
          <NavItem icon={Users}   label="Bóveda"  active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <NavItem icon={Package} label="Torre"   active={activeTab === 'orders'}   onClick={() => setActiveTab('orders')} />

          <p className="px-6 text-[8px] font-black text-neutral-700 tracking-[0.3em] uppercase mt-8 mb-3">Recursos</p>
          <NavItem
            icon={Timer}
            label="Jornada"
            active={activeTab === 'shift'}
            onClick={() => setActiveTab('shift')}
            badge={workState !== 'OFF_DUTY' && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: shiftColor }} />
            )}
          />
        </nav>

        {/* Employee card */}
        <div className="m-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#FDCB02]/10 border border-[#FDCB02]/20 flex items-center justify-center">
              <User size={14} className="text-[#FDCB02]" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-none">{employeeName}</p>
              <p className="text-[8px] font-black text-neutral-600 tracking-widest uppercase mt-0.5">{employeeRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="shrink-0 h-14 px-8 border-b border-white/[0.06] flex items-center justify-between bg-[#040404]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-[#FDCB02] rounded-full" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
              {activeTab === 'customers' && 'Base Segura'}
              {activeTab === 'orders'    && 'Control Logístico'}
              {activeTab === 'shift'     && 'Control de Asistencia'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] hidden sm:block">
              {employeeName}
            </span>
            {/* Live clock chip */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: shiftColor }} />
              <span className="font-mono text-[11px] font-bold text-white tabular-nums">{fmt(workSeconds)}</span>
              <span className="text-[8px] font-black tracking-widest uppercase ml-0.5" style={{ color: shiftColor }}>{shiftLabel}</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-8 crm-scroll">
          <AnimatePresence mode="wait">

            {/* ── VISTA: BÓVEDA ─────────────────────────────────── */}
            {activeTab === 'customers' && (
              <motion.div key="v-customers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar cliente por nombre o ID…" />

                <div className="border border-white/[0.08] rounded-lg overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_1.4fr_auto_auto] bg-white/[0.03] border-b border-white/[0.06] px-6 py-3">
                    {['Cliente / Referencia', 'Contacto', 'LTV', ''].map((h, i) => (
                      <span key={i} className={`text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600 ${i > 1 ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>

                  {filteredCustomers.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => setSelectedCustomer(c)}
                      className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer group transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#FDCB02] transition-colors">{c.name}</p>
                        <p className="font-mono text-[9px] text-neutral-600 mt-0.5">{c.id}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] text-neutral-400">{c.safeEmail}</p>
                        <p className="font-mono text-[11px] text-neutral-600 mt-0.5">{c.safePhone}</p>
                      </div>
                      <p className="font-mono font-black text-[#FDCB02] text-sm text-right">${c.ltv.toLocaleString()}</p>
                      <ChevronRight size={14} className="ml-4 text-neutral-700 group-hover:text-[#FDCB02] transition-colors" />
                    </motion.div>
                  ))}
                </div>

                <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest mt-4">{filteredCustomers.length} registros · Acceso autorizado</p>
              </motion.div>
            )}

            {/* ── VISTA: TORRE ──────────────────────────────────── */}
            {activeTab === 'orders' && (
              <motion.div key="v-orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar pedido o cliente…" />

                <div className="border border-white/[0.08] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] bg-white/[0.03] border-b border-white/[0.06] px-6 py-3 gap-4">
                    {['Nº Pedido', 'Cliente', 'Estado', 'Monto', ''].map((h, i) => (
                      <span key={i} className={`text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600 ${i >= 2 ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>

                  {filteredOrders.map((o, idx) => (
                    <motion.div
                      key={o.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => setSelectedOrder(o)}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer group transition-colors"
                    >
                      <div>
                        <p className="font-mono font-black text-white text-[11px] tracking-wider group-hover:text-[#FDCB02] transition-colors">#{o.orderNumber}</p>
                        <p className="font-mono text-[8px] text-neutral-600 mt-0.5">{o.date}</p>
                      </div>
                      <p className="text-sm text-neutral-300 font-medium truncate">{o.customerName}</p>
                      <StatusBadge status={o.status} />
                      <p className="font-mono font-black text-emerald-400 text-sm text-right">${o.total.toLocaleString()}</p>
                      <ChevronRight size={14} className="text-neutral-700 group-hover:text-[#FDCB02] transition-colors" />
                    </motion.div>
                  ))}
                </div>

                <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest mt-4">{filteredOrders.length} pedidos en sistema</p>
              </motion.div>
            )}

            {/* ── VISTA: JORNADA ────────────────────────────────── */}
            {activeTab === 'shift' && (
              <motion.div key="v-shift" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex flex-col xl:flex-row gap-6 h-full">

                  {/* Left: Clock + Controls */}
                  <div className="w-full xl:w-96 flex flex-col gap-4">

                    {/* Giant Clock */}
                    <div className="relative bg-[#070707] border border-white/[0.08] rounded-lg p-10 flex flex-col items-center overflow-hidden">
                      {/* Grid texture */}
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                      {/* Top accent */}
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: shiftColor }} />
                      {/* Glow */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-10" style={{ background: shiftColor }} />

                      <div className="relative flex items-center gap-2 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: shiftColor }} />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: shiftColor }}>
                          {workState === 'ON_DUTY' ? 'Turno Activo' : workState === 'BREAK' ? 'En Pausa' : 'Fuera de Turno'}
                        </span>
                      </div>

                      {/* Time display */}
                      <div className="relative font-mono text-[64px] font-black text-white tabular-nums leading-none tracking-[-0.04em] mb-3">
                        {fmt(workSeconds)}
                      </div>
                      <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] mb-10">tiempo efectivo</p>

                      {/* Action buttons */}
                      <div className="relative w-full space-y-3">
                        {workState === 'OFF_DUTY' && (
                          <ShiftBtn onClick={handleClockIn} color="#22c55e" icon={<PlayCircle size={17} />} label="Iniciar Turno" sub="Clock In" />
                        )}
                        {workState === 'ON_DUTY' && <>
                          <ShiftBtn onClick={handleBreak} color="#f59e0b" icon={<Coffee size={17} />} label="Tomar Pausa" sub="Comida / Descanso" ghost />
                          <ShiftBtn onClick={handleClockOut} color="#ef4444" icon={<LogOut size={17} />} label="Finalizar Turno" sub="Clock Out" ghost />
                        </>}
                        {workState === 'BREAK' && <>
                          <ShiftBtn onClick={handleResume} color="#22c55e" icon={<PlayCircle size={17} />} label="Retomar Turno" sub="Volver al trabajo" />
                          <ShiftBtn onClick={handleClockOut} color="#ef4444" icon={<LogOut size={17} />} label="Finalizar Turno" sub="Clock Out" ghost />
                        </>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard icon={<Timer size={14} />} label="Efectivo" value={fmt(workSeconds)} />
                      <StatCard icon={<Coffee size={14} />} label="Pausas" value={fmt(breakSeconds)} dim />
                    </div>
                  </div>

                  {/* Right: Timeline */}
                  <div className="flex-1 bg-[#070707] border border-white/[0.08] rounded-lg flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History size={14} className="text-[#FDCB02]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Bitácora</h3>
                      </div>
                      <span className="font-mono text-[9px] text-neutral-600">
                        {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto crm-scroll">
                      {shiftLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-700">
                          <div className="w-12 h-12 border border-white/[0.06] rounded-sm flex items-center justify-center mb-4">
                            <Calendar size={22} className="opacity-40" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Sin registros</p>
                          <p className="text-[9px] mt-1 text-neutral-700">Inicia turno para grabar actividad</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {shiftLogs.map((l, i) => {
                            const c = l.type === 'out' ? '#ef4444' : l.type === 'break' ? '#f59e0b' : '#22c55e';
                            const Icon = l.type === 'out' ? LogOut : l.type === 'break' ? Coffee : PlayCircle;
                            return (
                              <motion.div
                                key={l.id}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg"
                              >
                                <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border" style={{ borderColor: `${c}30`, background: `${c}08`, color: c }}>
                                  <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-white">{l.action}</p>
                                  <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest mt-0.5">Sistema validado · {l.time}</p>
                                </div>
                                <div className="w-px h-6 rounded-full shrink-0" style={{ background: `${c}40` }} />
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── SLIDE-OVER: CLIENTE ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedCustomer && activeTab === 'customers' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCustomer(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 300 }} className="absolute top-0 right-0 bottom-0 w-full max-w-[460px] bg-[#060606] border-l border-white/[0.08] z-50 flex flex-col">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FDCB02]" />

              <div className="p-8 border-b border-white/[0.06] flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black text-[#FDCB02] tracking-[0.3em] uppercase mb-2">Expediente de Cliente</p>
                  <h2 className="text-2xl font-[900] text-white tracking-tight leading-none uppercase">{selectedCustomer.name}</h2>
                  <p className="font-mono text-[9px] text-neutral-600 mt-2">{selectedCustomer.id}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 border border-white/[0.08] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 crm-scroll">
                {/* WhatsApp button */}
                <button
                  onClick={() => setChatCustomer(selectedCustomer)}
                  className="w-full h-14 bg-[#1DA851] hover:bg-[#25D366] text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-900/20"
                >
                  <MessageCircle size={18} className="fill-black" />
                  Consola WhatsApp
                </button>

                {/* Contact section */}
                <div>
                  <SectionLabel icon={<Lock size={10} className="text-emerald-500" />} label="Contacto Protegido" />
                  <div className="space-y-2 mt-3">
                    <DataRow label="Email" value={selectedCustomer.safeEmail} mono />
                    <DataRow label="Teléfono" value={selectedCustomer.safePhone} mono />
                    <DataRow label="LTV" value={`$${selectedCustomer.ltv.toLocaleString()} MXN`} highlight />
                  </div>
                </div>

                {/* Orders */}
                {selectedCustomer.orders?.length > 0 && (
                  <div>
                    <SectionLabel icon={<Package size={10} />} label="Historial de Pedidos" />
                    <div className="space-y-2 mt-3">
                      {selectedCustomer.orders.map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-md">
                          <div>
                            <p className="font-mono text-[10px] font-bold text-white">#{o.orderNumber}</p>
                            <p className="text-[8px] text-neutral-600 font-mono mt-0.5">{o.date}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={o.status} />
                            <p className="font-mono font-black text-[11px] text-emerald-400">${o.total.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── SLIDE-OVER: PEDIDO ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && activeTab === 'orders' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 300 }} className="absolute top-0 right-0 bottom-0 w-full max-w-[460px] bg-[#060606] border-l border-white/[0.08] z-50 flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FDCB02]" />

              <div className="p-8 border-b border-white/[0.06] flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black text-[#FDCB02] tracking-[0.3em] uppercase mb-2">Guía Operativa</p>
                  <h2 className="text-2xl font-[900] text-white tracking-tight uppercase font-mono">#{selectedOrder.orderNumber}</h2>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 border border-white/[0.08] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 crm-scroll">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-md">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600 mb-2">Estado</p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-md">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600 mb-2">Total M.N.</p>
                    <p className="font-mono font-black text-emerald-400 text-lg">${selectedOrder.total.toLocaleString()}</p>
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <SectionLabel icon={<MapPin size={10} />} label="Datos de Entrega" />
                  <div className="space-y-2 mt-3">
                    <DataRow label="Cliente" value={selectedOrder.customerName} />
                    <DataRow label="Dirección" value={selectedOrder.address} mono />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <SectionLabel icon={<Package size={10} />} label="Manifiesto de Carga" />
                  <div className="space-y-2 mt-3">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-md">
                        <div>
                          <p className="text-[11px] font-bold text-white">{item.title}</p>
                          <p className="font-mono text-[8px] text-neutral-600 uppercase mt-0.5">Color: {item.color}</p>
                        </div>
                        <p className="font-mono font-black text-[#FDCB02] text-sm">
                          {item.quantity} <span className="text-[9px] text-neutral-600 uppercase">{item.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── CHAT: WHATSAPP ──────────────────────────────────────── */}
      <AnimatePresence>
        {chatCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChatCustomer(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md z-[60]" />
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute bottom-6 right-6 lg:right-1/2 lg:translate-x-1/2 w-[400px] lg:w-[460px] h-[640px] bg-[#050505] border border-white/[0.1] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] z-[70] flex flex-col overflow-hidden"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#25D366]" />

              {/* Chat header */}
              <div className="bg-[#0a0a0a] border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 bg-white/[0.05] border border-white/[0.08] rounded-full flex items-center justify-center">
                      <User size={16} className="text-neutral-400" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#25D366] border-2 border-[#0a0a0a] rounded-full" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white leading-none">{chatCustomer.name}</p>
                    <p className="text-[8px] font-bold text-[#25D366] mt-0.5 flex items-center gap-1">
                      <Lock size={7} /> API Secure Line
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-neutral-600 hover:text-white transition-colors rounded-md hover:bg-white/[0.05]"><MoreVertical size={16} /></button>
                  <button onClick={() => setChatCustomer(null)} className="p-2 text-neutral-600 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10"><X size={16} /></button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-5 space-y-4 crm-scroll"
                style={{ background: 'radial-gradient(circle at 50% 50%, #0a120a 0%, #040404 100%)' }}
              >
                <div className="flex justify-center">
                  <span className="bg-black/60 text-neutral-600 border border-white/[0.06] px-4 py-1.5 rounded-sm text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Lock size={8} /> Canal cifrado · B2B
                  </span>
                </div>

                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-lg relative ${
                      msg.sender === 'agent'
                        ? 'bg-[#0b4a32] border border-[#25D366]/20 rounded-br-sm'
                        : 'bg-[#111] border border-white/[0.08] rounded-bl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed text-white/90">{msg.text}</p>
                      <div className="flex items-center gap-1 justify-end mt-1.5">
                        <span className="text-[8px] font-mono text-white/30">{msg.time}</span>
                        {msg.sender === 'agent' && <CheckCheck size={11} className="text-[#34B7F1]" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="bg-[#0a0a0a] border-t border-white/[0.06] p-3">
                <div className="flex items-end gap-2 bg-black border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-[#25D366]/40 transition-colors">
                  <button className="p-2 text-neutral-600 hover:text-neutral-300 transition-colors"><Paperclip size={18} /></button>
                  <textarea
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Mensaje…"
                    className="flex-1 bg-transparent text-white text-sm py-2 outline-none resize-none max-h-28 min-h-[38px] crm-scroll placeholder:text-neutral-700"
                    rows={1}
                  />
                  <button
                    onClick={sendMsg}
                    disabled={!chatMessage.trim()}
                    className="p-2.5 bg-[#25D366] hover:bg-[#1DA851] disabled:bg-white/[0.05] disabled:text-neutral-700 text-black rounded-lg transition-all mb-0.5"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Softphone */}
      <Softphone />

      <style jsx global>{`
        .crm-root { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; }
        .crm-scroll::-webkit-scrollbar { width: 3px; }
        .crm-scroll::-webkit-scrollbar-track { background: transparent; }
        .crm-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .crm-scroll::-webkit-scrollbar-thumb:hover { background: #FDCB02; }
      `}</style>
    </div>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm mb-6">
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-[#FDCB02]/40 focus:bg-white/[0.04] outline-none transition-all font-mono"
      />
    </div>
  );
}

function StatCard({ icon, label, value, dim }: { icon: React.ReactNode; label: string; value: string; dim?: boolean }) {
  return (
    <div className="bg-[#070707] border border-white/[0.06] rounded-lg p-5">
      <p className={`text-[8px] font-black uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5 ${dim ? 'text-neutral-600' : 'text-neutral-500'}`}>
        {icon}{label}
      </p>
      <p className={`font-mono text-lg font-black tabular-nums ${dim ? 'text-neutral-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ShiftBtn({ onClick, color, icon, label, sub, ghost }: { onClick: () => void; color: string; icon: React.ReactNode; label: string; sub: string; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border"
      style={ghost
        ? { background: `${color}08`, borderColor: `${color}25`, color }
        : { background: color, borderColor: color, color: '#000' }}
    >
      {icon}
      <div className="text-left">
        <span className="block">{label}</span>
        <span className={`block text-[7px] tracking-wider font-bold opacity-60 normal-case`}>{sub}</span>
      </div>
    </button>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-600">{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600">{label}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
}

function DataRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-md">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-600 shrink-0">{label}</span>
      <span className={`text-[11px] ${mono ? 'font-mono' : 'font-semibold'} ${highlight ? 'text-[#FDCB02] font-black' : 'text-neutral-300'} text-right`}>{value}</span>
    </div>
  );
}