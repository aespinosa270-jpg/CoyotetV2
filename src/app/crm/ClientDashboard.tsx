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

// --- TIPOS ESTRICTOS ---
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

export default function ClientDashboard({ customers, globalOrders, employeeName = 'Usuario', employeeRole = 'OPERADOR' }: DashboardProps) {
  const router = useRouter();
  
  // --- ESTADOS DE LA INTERFAZ ---
  const [activeTab, setActiveTab] = useState<'customers' | 'orders' | 'shift'>('customers');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<GlobalOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ==========================================
  // 🔥 MOTOR DEL RELOJ CHECADOR (SHIFT SYSTEM) 🔥
  // ==========================================
  const [workState, setWorkState] = useState<'OFF_DUTY' | 'ON_DUTY' | 'BREAK'>('OFF_DUTY');
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  // Historial de eventos del día
  const [shiftLogs, setShiftLogs] = useState<{id: number, time: string, action: string, type: string}[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (workState === 'ON_DUTY') {
      interval = setInterval(() => setWorkSeconds(s => s + 1), 1000);
    } else if (workState === 'BREAK') {
      interval = setInterval(() => setBreakSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [workState]);

  const formatShiftTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const addShiftLog = (action: string, type: string) => {
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setShiftLogs(prev => [{ id: Date.now(), time, action, type }, ...prev]);
  };

  const handleClockIn = () => {
    setWorkState('ON_DUTY');
    addShiftLog('Inicio de Turno (Clock In)', 'in');
  };

  const handleBreak = () => {
    setWorkState('BREAK');
    addShiftLog('Inicio de Pausa (Comida)', 'break');
  };

  const handleResume = () => {
    setWorkState('ON_DUTY');
    addShiftLog('Fin de Pausa (Retorno)', 'resume');
  };

  const handleClockOut = () => {
    if(confirm('¿Estás seguro de que deseas finalizar tu turno de hoy?')) {
      setWorkState('OFF_DUTY');
      addShiftLog('Fin de Turno (Clock Out)', 'out');
    }
  };

  // ==========================================
  // ESTADOS DEL CHAT DE WHATSAPP
  // ==========================================
  const [chatCustomer, setChatCustomer] = useState<Customer | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hola, necesito actualizar la dirección de entrega de mi pedido.', sender: 'client', time: '10:42 AM' },
    { id: 2, text: '¡Claro que sí! Con gusto le ayudo. ¿Me puede confirmar el código postal nuevo?', sender: 'agent', time: '10:45 AM' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatCustomer]);

  // --- FILTROS ---
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredOrders = globalOrders.filter(o => o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PAID': return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><CheckCircle2 size={10}/> Pagado</span>;
      case 'PENDING': return <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Clock size={10}/> Pendiente</span>;
      case 'PROCESSING': return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Package size={10}/> Empacado</span>;
      case 'SHIPPED': return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Truck size={10}/> En Tránsito</span>;
      default: return <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest w-fit">{status}</span>;
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages([...messages, { id: Date.now(), text: chatMessage, sender: 'agent', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setChatMessage('');
  };

  return (
    <div className="min-h-screen flex bg-[#050505] text-white font-sans selection:bg-[#FDCB02] selection:text-black overflow-hidden relative">
      
      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 hidden lg:flex flex-col relative z-20">
         <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><Users size={18} strokeWidth={2.5} /></div>
          <h1 className="text-xl font-[1000] uppercase tracking-tighter">Coyote <span className="text-[#FDCB02]">CRM</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest px-4 mb-2">Operación Central</p>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'customers' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
            <Users size={16} /> Bóveda
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
            <Package size={16} /> Torre
          </button>

          <div className="pt-6 pb-2">
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest px-4 mb-2">Recursos Humanos</p>
            <button onClick={() => setActiveTab('shift')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'shift' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
              <Timer size={16} /> Jornada
              {/* Mini indicador de estado en el menú */}
              {workState !== 'OFF_DUTY' && (
                <span className={`ml-auto w-2 h-2 rounded-full ${workState === 'ON_DUTY' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></span>
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="px-8 py-5 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-10 flex justify-between items-center">
          <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-white">
            {activeTab === 'customers' && <><Lock size={16} className="text-[#FDCB02]"/> Base Segura</>}
            {activeTab === 'orders' && <><Receipt size={16} className="text-[#FDCB02]"/> Control Logístico</>}
            {activeTab === 'shift' && <><Activity size={16} className="text-[#FDCB02]"/> Control de Asistencia</>}
          </h2>
          
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest hidden sm:inline-block">Agente: {employeeName}</span>
             <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${workState === 'ON_DUTY' ? 'bg-green-500 animate-pulse' : workState === 'BREAK' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-mono font-bold text-white">{formatShiftTime(workSeconds)}</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            
            <AnimatePresence mode="wait">
              {/* ========================================================= */}
              {/* VISTA 1: BÓVEDA (CLIENTES)                                */}
              {/* ========================================================= */}
              {activeTab === 'customers' && (
                <motion.div key="view-customers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative max-w-md mb-8 z-10">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="text" placeholder="Buscar cliente por nombre o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-[#FDCB02] outline-none" />
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                      <tbody className="text-sm divide-y divide-white/5">
                        {filteredCustomers.map((client) => (
                          <tr key={client.id} onClick={() => setSelectedCustomer(client)} className="hover:bg-white/5 cursor-pointer transition-colors group">
                            <td className="p-5">
                              <div className="font-bold text-white mb-1">{client.name}</div>
                              <div className="font-mono text-[10px] text-neutral-500">{client.id}</div>
                            </td>
                            <td className="p-5 font-mono text-xs text-neutral-400">
                              <div>{client.safeEmail}</div>
                              <div>{client.safePhone}</div>
                            </td>
                            <td className="p-5 font-black text-[#FDCB02] text-right font-mono">${client.ltv.toLocaleString()}</td>
                            <td className="p-5 text-center"><ChevronRight size={16} className="mx-auto text-neutral-600 group-hover:text-[#FDCB02] transition-colors"/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ========================================================= */}
              {/* VISTA 2: TORRE (PEDIDOS)                                  */}
              {/* ========================================================= */}
              {activeTab === 'orders' && (
                <motion.div key="view-orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative max-w-md mb-8 z-10">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="text" placeholder="Buscar pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-[#FDCB02] outline-none" />
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/10">
                        <tr>
                          <th className="p-5">Nº Pedido</th>
                          <th className="p-5">Cliente</th>
                          <th className="p-5">Estado</th>
                          <th className="p-5 text-right">Monto</th>
                          <th className="p-5"></th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/5">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-white/5 cursor-pointer transition-colors group">
                            <td className="p-5">
                              <div className="font-bold text-white mb-1 tracking-widest">#{order.orderNumber}</div>
                              <div className="font-mono text-[10px] text-neutral-500">{order.date}</div>
                            </td>
                            <td className="p-5 font-medium text-neutral-300">
                              {order.customerName}
                            </td>
                            <td className="p-5">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="p-5 font-black text-green-400 text-right font-mono">
                              ${order.total.toLocaleString()}
                            </td>
                            <td className="p-5 text-center"><ChevronRight size={16} className="mx-auto text-neutral-600 group-hover:text-[#FDCB02] transition-colors"/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ========================================================= */}
              {/* VISTA 3: JORNADA (RELOJ CHECADOR COMPLETO) 🔥 NUEVO 🔥      */}
              {/* ========================================================= */}
              {activeTab === 'shift' && (
                <motion.div key="view-shift" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full flex flex-col xl:flex-row gap-8">
                  
                  {/* Panel Izquierdo: Controles Activos */}
                  <div className="w-full xl:w-[400px] flex flex-col gap-6">
                    {/* Tarjeta del Reloj Principal */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                      {/* Fondo animado según estado */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${workState === 'ON_DUTY' ? 'bg-green-500' : workState === 'BREAK' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      {workState === 'ON_DUTY' && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>}
                      
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
                        {workState === 'ON_DUTY' ? <span className="text-green-500 flex items-center gap-2"><Activity size={14}/> Turno Activo</span> :
                         workState === 'BREAK' ? <span className="text-yellow-500 flex items-center gap-2"><Coffee size={14}/> En Pausa</span> :
                         <span className="text-red-500 flex items-center gap-2"><LogOut size={14}/> Fuera de Turno</span>}
                      </p>

                      <div className="text-6xl font-mono font-bold text-white tracking-tighter mb-10 tabular-nums text-center">
                        {formatShiftTime(workSeconds)}
                      </div>

                      {/* Botones de Acción Mapeados por Estado */}
                      <div className="w-full space-y-4">
                        {workState === 'OFF_DUTY' ? (
                          <button onClick={handleClockIn} className="w-full bg-green-600 hover:bg-green-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20">
                            <PlayCircle size={20} /> Iniciar Turno (Clock In)
                          </button>
                        ) : (
                          <>
                            {workState === 'ON_DUTY' ? (
                              <button onClick={handleBreak} className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 h-16 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all">
                                <Coffee size={20} /> Tomar Pausa (Comida)
                              </button>
                            ) : (
                              <button onClick={handleResume} className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-500 h-16 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all">
                                <PlayCircle size={20} /> Retomar Turno
                              </button>
                            )}
                            <button onClick={handleClockOut} className="w-full bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 h-16 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all mt-4">
                              <LogOut size={20} /> Finalizar Turno (Clock Out)
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Resumen del Día */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1 flex items-center gap-1"><Timer size={12}/> T. Efectivo</p>
                        <p className="text-xl font-mono text-white">{formatShiftTime(workSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1 flex items-center gap-1"><Coffee size={12}/> T. de Pausa</p>
                        <p className="text-xl font-mono text-neutral-400">{formatShiftTime(breakSeconds)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Panel Derecho: Historial de la Jornada (Timeline) */}
                  <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                       <h3 className="font-bold text-white uppercase tracking-widest text-xs flex items-center gap-2"><History size={16} className="text-[#FDCB02]"/> Bitácora de Movimientos</h3>
                       <span className="text-[10px] text-neutral-500 font-mono">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                      {shiftLogs.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p className="text-sm font-medium uppercase tracking-widest">Sin registros hoy</p>
                            <p className="text-[10px] mt-2">Haz clic en "Iniciar Turno" para comenzar a grabar.</p>
                         </div>
                      ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                          {shiftLogs.map((log, index) => (
                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              {/* Icono central (Punto en la línea del tiempo) */}
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0a0a] bg-[#121212] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${
                                log.type === 'in' || log.type === 'resume' ? 'text-green-500' :
                                log.type === 'break' ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {log.type === 'in' || log.type === 'resume' ? <PlayCircle size={16} /> :
                                 log.type === 'break' ? <Coffee size={16} /> : <LogOut size={16} />}
                              </div>
                              
                              {/* Tarjeta del evento */}
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-white/20 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-bold text-white text-sm">{log.action}</h4>
                                  <span className="text-[10px] font-mono text-neutral-400">{log.time}</span>
                                </div>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Sistema validado</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        {/* ================= SLIDE-OVER: DETALLE DEL CLIENTE ================= */}
        <AnimatePresence>
          {selectedCustomer && activeTab === 'customers' && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCustomer(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} className="absolute top-0 right-0 bottom-0 w-full max-w-[480px] bg-[#050505] border-l border-white/10 z-50 flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-[#0a0a0a] flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-[1000] text-white tracking-tighter uppercase mb-2 leading-none">{selectedCustomer.name}</h2>
                    <span className="font-mono text-[10px] text-[#FDCB02] bg-[#FDCB02]/10 px-2 py-1 rounded uppercase font-bold border border-[#FDCB02]/20">Ref: {selectedCustomer.id}</span>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-white/5 hover:bg-red-500 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <button 
                    onClick={() => setChatCustomer(selectedCustomer)}
                    className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black h-16 rounded-2xl font-[1000] uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
                  >
                    <MessageCircle size={20} className="fill-black" /> Abrir Consola WhatsApp
                  </button>
                  
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-4 flex items-center gap-2"><Lock size={12} className="text-green-500"/> Contacto Protegido</h3>
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/5 space-y-5">
                      <div><p className="text-[9px] uppercase font-black text-neutral-600 mb-1.5">Email Registrado</p><p className="font-mono text-sm text-neutral-300 bg-black px-3 py-2 rounded-lg">{selectedCustomer.safeEmail}</p></div>
                      <div><p className="text-[9px] uppercase font-black text-neutral-600 mb-1.5">Teléfono Principal</p><p className="font-mono text-sm text-neutral-300 bg-black px-3 py-2 rounded-lg">{selectedCustomer.safePhone}</p></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ================= SLIDE-OVER: DETALLE DEL PEDIDO ================= */}
        <AnimatePresence>
          {selectedOrder && activeTab === 'orders' && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} className="absolute top-0 right-0 bottom-0 w-full max-w-[480px] bg-[#050505] border-l border-white/10 z-50 flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-[#0a0a0a] flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">Guía Operativa</p>
                    <h2 className="text-3xl font-[1000] text-white tracking-tighter uppercase leading-none">#{selectedOrder.orderNumber}</h2>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/5 hover:bg-red-500 rounded-full transition-colors"><X size={18} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Estado</p>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Total M.N.</p>
                      <p className="text-lg font-black text-green-400 font-mono">${selectedOrder.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-4 flex items-center gap-2"><User size={12}/> Info de Entrega</h3>
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/5 space-y-4">
                      <p className="font-bold text-white">{selectedOrder.customerName}</p>
                      <div className="flex items-start gap-3 text-neutral-400 text-sm">
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        <p>{selectedOrder.address}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                     <h3 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-4 flex items-center gap-2"><Package size={12}/> Manifiesto de Carga</h3>
                     <div className="space-y-2">
                       {selectedOrder.items.map(item => (
                         <div key={item.id} className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl flex justify-between items-center">
                           <div>
                             <p className="font-bold text-sm text-white">{item.title}</p>
                             <p className="text-[10px] text-neutral-500 font-mono uppercase mt-1">Color: {item.color}</p>
                           </div>
                           <div className="text-right">
                             <p className="font-black text-[#FDCB02]">{item.quantity} <span className="text-[10px] text-neutral-500 uppercase">{item.unit}</span></p>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ================= BANDEJA DE CHAT (WHATSAPP BUSINESS) ================= */}
        <AnimatePresence>
          {chatCustomer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChatCustomer(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md z-[60]" />
              <motion.div 
                initial={{ y: '100%', opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: '100%', opacity: 0, scale: 0.95 }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                className="absolute bottom-6 right-6 lg:right-1/2 lg:translate-x-1/2 w-[400px] lg:w-[480px] h-[650px] bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] z-[70] flex flex-col overflow-hidden"
              >
                <div className="bg-[#121212] border-b border-white/5 p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="relative">
                       <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10"><User size={20} className="text-neutral-400"/></div>
                       <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-[#121212] rounded-full"></div>
                     </div>
                     <div>
                       <h3 className="font-bold text-white text-sm truncate w-48">{chatCustomer.name}</h3>
                       <p className="text-[10px] text-[#25D366] font-medium flex items-center gap-1">
                          <Lock size={8}/> API Secure Line
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button className="p-2 text-neutral-400 hover:text-white transition-colors"><MoreVertical size={18}/></button>
                     <button onClick={() => setChatCustomer(null)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-full text-neutral-400 transition-colors"><X size={18}/></button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#050505] custom-scrollbar" style={{ backgroundImage: 'radial-gradient(#25D36610 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <div className="flex justify-center mb-6">
                     <span className="bg-[#1a1a1a] text-[#FDCB02] px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 shadow-md flex items-center gap-2">
                        <Lock size={10} /> Canal cifrado B2B
                     </span>
                  </div>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-md relative group ${
                        msg.sender === 'agent' ? 'bg-[#056145] text-white rounded-br-sm' : 'bg-neutral-800 text-white rounded-bl-sm border border-white/5'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <div className={`flex items-center gap-1 justify-end mt-1 ${msg.sender === 'agent' ? 'text-green-200' : 'text-neutral-400'}`}>
                          <span className="text-[9px] font-medium">{msg.time}</span>
                          {msg.sender === 'agent' && <CheckCheck size={12} className="text-[#34B7F1]" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-[#121212] p-4 border-t border-white/5">
                  <div className="flex items-end gap-3 bg-black rounded-[1.5rem] border border-white/10 p-2 focus-within:border-[#25D366]/50 transition-colors">
                     <button className="p-2.5 text-neutral-400 hover:text-white transition-colors"><Paperclip size={20} /></button>
                     <textarea 
                       value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                       placeholder="Mensaje a WhatsApp..." className="flex-1 bg-transparent text-white text-sm py-3 outline-none resize-none max-h-32 min-h-[44px] custom-scrollbar placeholder:text-neutral-600" rows={1}
                     />
                     <button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="p-3 bg-[#25D366] hover:bg-[#1DA851] disabled:bg-neutral-800 disabled:text-neutral-600 text-black rounded-full transition-all shadow-lg shadow-green-500/10 mb-0.5">
                       <Send size={18} className="ml-0.5" />
                     </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 🔥 EL CONMUTADOR TELEFÓNICO (Mantiene estado independiente) 🔥 */}
        <Softphone />

      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #25D366; }
      `}</style>
    </div>
  );
}