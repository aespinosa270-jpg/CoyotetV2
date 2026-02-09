'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { products } from '@/lib/products'; // Usamos tus productos reales
import { 
  Ship, Container, Plus, Trash2, Send, 
  Package, AlertTriangle, CheckCircle2, Factory, Scale 
} from 'lucide-react';

// --- CONFIGURACIÓN LÓGICA DEL CONTENEDOR ---
const CONTAINER_CAPACITY_KG = 22000; // Capacidad aprox de un 40ft High Cube con tela
const COMPANY_PHONE = "5215555421527"; // Tu número (formato internacional sin +)

interface ContainerItem {
  productId: string;
  title: string;
  category: string;
  kg: number;
}

export default function ContenedorPage() {
  // Estados del Formulario de Contacto
  const [clientData, setClientData] = useState({
    name: '',
    company: '',
    phone: '',
    city: ''
  });

  // Estados de la Carga
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputKg, setInputKg] = useState<number | ''>('');
  const [items, setItems] = useState<ContainerItem[]>([]);

  // Cálculos en tiempo real
  const totalKg = useMemo(() => items.reduce((acc, item) => acc + item.kg, 0), [items]);
  const fillPercentage = Math.min((totalKg / CONTAINER_CAPACITY_KG) * 100, 100);
  const containersNeeded = Math.ceil(totalKg / CONTAINER_CAPACITY_KG) || 1;

  // --- HANDLERS ---

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !inputKg || Number(inputKg) <= 0) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: ContainerItem = {
      productId: product.id,
      title: product.title,
      category: product.category,
      kg: Number(inputKg)
    };

    setItems([...items, newItem]);
    setInputKg(''); // Resetear input
    setSelectedProductId(''); // Resetear select
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSendWhatsApp = () => {
    if (items.length === 0) {
      alert("El contenedor está vacío. Agrega productos primero.");
      return;
    }
    if (!clientData.name || !clientData.phone) {
      alert("Por favor completa tus datos de contacto.");
      return;
    }

    // Construcción del Mensaje
    let message = `*SOLICITUD DE CONTENEDOR - COYOTE TEXTIL* 🚢\n\n`;
    message += `👤 *Cliente:* ${clientData.name}\n`;
    message += `🏢 *Empresa:* ${clientData.company || 'N/A'}\n`;
    message += `📍 *Destino:* ${clientData.city}\n`;
    message += `📱 *Tel:* ${clientData.phone}\n\n`;
    message += `-----------------------------------\n`;
    message += `*DETALLE DE CARGA:*\n`;
    
    items.forEach(item => {
      message += `🔹 ${item.title} (${item.category}): *${item.kg.toLocaleString()} kg*\n`;
    });

    message += `-----------------------------------\n`;
    message += `📦 *TOTAL PESO:* ${totalKg.toLocaleString()} kg\n`;
    message += `🏗 *ESTIMADO:* ${containersNeeded} Contenedor(es) de 40ft\n\n`;
    message += `Solicito cotización formal y tiempos de entrega.`;

    // Codificar y abrir WhatsApp
    const url = `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pb-20">
      
      {/* HEADER INDUSTRIAL */}
      <div className="bg-neutral-50 border-b border-neutral-200 py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-[#FDCB02] text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                    Logística Global
                </span>
                <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-green-600"/> Sistema Activo
                </span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black">
              Programar Contenedor
            </h1>
            <p className="text-neutral-500 mt-2 max-w-xl">
              Calculadora logística para pedidos de alto volumen. Configura tu carga y envía la orden de compra directamente a planta.
            </p>
          </div>
          <Ship size={64} className="text-neutral-200" strokeWidth={1} />
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* 1. Datos del Cliente */}
            <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold uppercase flex items-center gap-2 mb-6 border-b border-neutral-100 pb-2">
                    <Factory size={18} className="text-[#FDCB02]" /> Datos de Consignatario
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Nombre Completo</label>
                        <input 
                            type="text" 
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors font-medium"
                            placeholder="Ej. Juan Pérez"
                            value={clientData.name}
                            onChange={(e) => setClientData({...clientData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Empresa</label>
                        <input 
                            type="text" 
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors font-medium"
                            placeholder="Ej. Textiles de México S.A."
                            value={clientData.company}
                            onChange={(e) => setClientData({...clientData, company: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Teléfono / WhatsApp</label>
                        <input 
                            type="tel" 
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors font-medium"
                            placeholder="Ej. 55 1234 5678"
                            value={clientData.phone}
                            onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Ciudad / Estado Destino</label>
                        <input 
                            type="text" 
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors font-medium"
                            placeholder="Ej. Guadalajara, Jalisco"
                            value={clientData.city}
                            onChange={(e) => setClientData({...clientData, city: e.target.value})}
                        />
                    </div>
                </div>
            </section>

            {/* 2. Agregar Productos */}
            <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#FDCB02] opacity-5 rounded-bl-full pointer-events-none"/>
                
                <h3 className="text-lg font-bold uppercase flex items-center gap-2 mb-6 border-b border-neutral-100 pb-2">
                    <Package size={18} className="text-[#FDCB02]" /> Configurar Carga
                </h3>

                <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Seleccionar Tela</label>
                        <div className="relative">
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none appearance-none font-medium text-neutral-700"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                                <option value="">-- Seleccionar del Inventario --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} - {p.category}
                                    </option>
                                ))}
                            </select>
                            {/* Flecha custom */}
                            <div className="absolute right-3 top-3.5 pointer-events-none text-neutral-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-40">
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">Peso (Kg)</label>
                        <input 
                            type="number" 
                            min="100"
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm focus:border-[#FDCB02] outline-none font-medium"
                            placeholder="0"
                            value={inputKg}
                            onChange={(e) => setInputKg(Number(e.target.value))}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={!selectedProductId || !inputKg}
                        className="w-full md:w-auto bg-black text-white px-6 py-3 rounded font-bold uppercase text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Plus size={16}/> Agregar
                    </button>
                </form>

                {/* Lista de Items Agregados */}
                {items.length > 0 && (
                    <div className="mt-8 border border-neutral-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3 text-right">Peso</th>
                                    <th className="px-4 py-3 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {items.map((item, index) => (
                                    <tr key={index} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-black">{item.title}</td>
                                        <td className="px-4 py-3 text-neutral-500">{item.category}</td>
                                        <td className="px-4 py-3 text-right font-mono font-medium">{item.kg.toLocaleString()} kg</td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-neutral-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
          </div>

          {/* COLUMNA DERECHA: VISUALIZADOR (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-6">
                
                {/* Visualizador de Contenedor */}
                <div className="bg-[#0a0a0a] text-white p-8 rounded-xl shadow-2xl relative overflow-hidden">
                    {/* Ruido de fondo */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h4 className="text-[#FDCB02] font-black uppercase tracking-widest text-xs mb-1">Capacidad Logística</h4>
                                <h2 className="text-2xl font-bold uppercase">Contenedor 40ft HQ</h2>
                            </div>
                            <Container size={32} className="text-neutral-500"/>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="mb-2 flex justify-between text-xs font-bold uppercase text-neutral-400">
                            <span>Ocupación</span>
                            <span>{fillPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-6 border border-white/5">
                            <div 
                                className={`h-full transition-all duration-500 ${fillPercentage > 100 ? 'bg-red-500' : 'bg-[#FDCB02]'}`}
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            ></div>
                        </div>

                        {/* Estadísticas */}
                        <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                            <div>
                                <p className="text-[10px] uppercase text-neutral-500 font-bold mb-1">Peso Total</p>
                                <p className="text-xl font-mono font-bold">{totalKg.toLocaleString()} <span className="text-xs text-neutral-500">kg</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-neutral-500 font-bold mb-1">Unidades Requeridas</p>
                                <p className="text-xl font-mono font-bold text-[#FDCB02]">{containersNeeded}</p>
                            </div>
                        </div>

                        {/* Alerta de Sobrepeso */}
                        {fillPercentage > 100 && (
                            <div className="mt-6 bg-red-500/20 border border-red-500/50 p-3 rounded flex items-start gap-3">
                                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-200 font-medium leading-relaxed">
                                    La carga excede la capacidad estándar de un contenedor (22 Tons). Se calcularán unidades adicionales automáticamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botón de Acción */}
                <button 
                    onClick={handleSendWhatsApp}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group"
                >
                    <Send size={20} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    <div className="text-left leading-none">
                        <span className="block text-[10px] font-bold uppercase opacity-80 mb-0.5">Finalizar Solicitud</span>
                        <span className="block text-lg font-bold uppercase">Cotizar vía WhatsApp</span>
                    </div>
                </button>

                <p className="text-center text-xs text-neutral-400 uppercase font-medium">
                    <Scale size={12} className="inline mb-0.5 mr-1"/>
                    Pesos calculados basados en densidad promedio.
                </p>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}