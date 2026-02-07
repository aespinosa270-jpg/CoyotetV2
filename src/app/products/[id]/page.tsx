'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShoppingCart, ChevronLeft, Layers, Minus, Plus, 
  Shield, Zap, Package, Scissors,
  Star, Share2, Heart, Truck, LayoutGrid, Globe, ArrowRight, Check
} from 'lucide-react';
import { useCart } from '@/lib/context/cart-context';
import { useB2BPrice } from '@/hooks/use-b2b-price';
import { products } from '@/lib/products';

// Constantes
const ROLL_WEIGHT_KG = 25;

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  
  // Estados
  const [quantity, setQuantity] = useState(1);
  const [buyingMode, setBuyingMode] = useState<'kilo' | 'rollo'>('kilo');
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // 1. Obtener Producto de forma segura
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const product = products.find(p => p.id === productId);

  // 2. Productos Relacionados
  const relatedProducts = useMemo(() => {
    return products.filter(p => p.id !== productId).slice(0, 4);
  }, [productId]);

  // Manejo de "Producto no encontrado"
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Producto no encontrado</h2>
        <Link href="/" className="text-[#FDCB02] hover:underline font-medium">
            Volver al catálogo
        </Link>
      </div>
    );
  }

  // Lógica de Precios
  const basePriceToUse = buyingMode === 'rollo' ? product.prices.mayoreo : product.prices.menudeo;
  const { price: finalPrice, label, discount, role } = useB2BPrice(basePriceToUse);
  
  // Cálculo de Totales
  const totalWeight = buyingMode === 'rollo' ? quantity * ROLL_WEIGHT_KG : quantity;
  const totalPrice = finalPrice * totalWeight;
  const savingsAmount = (product.prices.menudeo - finalPrice) * totalWeight;

  // Galería (Simulada con la misma imagen si no hay más)
  const galleryImages = [product.thumbnail, product.thumbnail, product.thumbnail];

  // --- FUNCIÓN AGREGAR AL CARRITO ---
  const handleAddToCart = () => {
    // Generamos un ID único para distinguir Kilos de Rollos en el carrito
    const cartVariantId = `${product.id}-${buyingMode}`;

    addItem({
      id: cartVariantId,      // ID único para el carrito (ej. prod_123-rollo)
      productId: product.id,  // ID real del producto
      title: product.title,
      price: finalPrice,
      image: product.thumbnail,
      quantity: totalWeight,
      unit: buyingMode === 'rollo' ? 'Kg (Rollo)' : 'Kg',
      meta: {
        mode: buyingMode,
        packages: quantity
      }
    });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">
      
      {/* --- BREADCRUMBS --- */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] mb-6 relative z-10">
         <div className="text-[11px] font-medium text-neutral-500 flex items-center gap-2 uppercase tracking-wide border-b border-neutral-200 pb-4">
            <Link href="/" className="hover:text-[#FDCB02] transition-colors flex items-center gap-1">
                <LayoutGrid size={12}/> Catálogo
            </Link> 
            <ChevronLeft size={10} className="rotate-180"/> 
            <span className="hover:text-black transition-colors cursor-pointer">Telas Deportivas</span>
            <ChevronLeft size={10} className="rotate-180"/>
            <span className="text-black font-bold truncate max-w-[150px] md:max-w-none">{product.title}</span>
         </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">
          
          {/* --- COLUMNA IZQUIERDA: GALERÍA --- */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 h-fit sticky top-28">
             {/* Miniaturas */}
             <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible py-2 lg:py-0 scrollbar-hide px-1">
                {galleryImages.map((img, idx) => (
                   <button 
                      key={idx} 
                      onClick={() => setSelectedImageIndex(idx)}
                      onMouseEnter={() => setSelectedImageIndex(idx)}
                      className={`min-w-[70px] w-[70px] h-[70px] border relative group cursor-pointer rounded-md overflow-hidden transition-all duration-200 ${
                        selectedImageIndex === idx 
                            ? 'border-[#FDCB02] ring-2 ring-[#FDCB02] ring-offset-1' 
                            : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                   >
                      <Image src={img} alt={`Vista ${idx}`} fill className="object-cover"/>
                   </button>
                ))}
             </div>
             
             {/* Imagen Principal */}
             <div className="flex-1 relative aspect-square lg:aspect-[4/3] bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden group shadow-sm">
                <Image 
                   src={galleryImages[selectedImageIndex]} 
                   alt={product.title} 
                   fill 
                   className="object-cover transition-transform duration-700 group-hover:scale-105"
                   priority
                />
                
                {/* Botones Flotantes */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-neutral-600 hover:text-[#FDCB02] hover:scale-105 transition-all">
                        <Share2 size={16} />
                    </button>
                    <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-neutral-600 hover:text-red-500 hover:scale-105 transition-all">
                        <Heart size={16} />
                    </button>
                </div>

                {product.hasRollo && (
                    <div className="absolute bottom-4 left-4 z-10">
                        <span className="bg-[#FDCB02] text-black px-3 py-1 text-[10px] font-bold uppercase rounded-full shadow-lg flex items-center gap-1">
                            <Package size={12} /> Venta por Rollo
                        </span>
                    </div>
                )}
             </div>
          </div>

          {/* --- COLUMNA DERECHA: INFO DE COMPRA --- */}
          <div className="lg:col-span-5 flex flex-col">
            
            {/* Header */}
            <div className="border-b border-neutral-200 pb-6 mb-6">
               <h1 className="text-3xl lg:text-4xl font-[900] uppercase text-black mb-2 tracking-tight leading-tight">
                  {product.title}
               </h1>
               
               <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                     <div className="flex text-[#FDCB02]">
                        {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                     </div>
                     <span className="text-xs font-medium text-neutral-600 hover:underline cursor-pointer ml-1">
                        4.9 (128)
                     </span>
                  </div>
                  <div className="w-px h-3 bg-neutral-300"></div>
                  <span className="text-xs font-mono text-neutral-500">SKU: {product.id.replace('prod_', '').toUpperCase()}</span>
                  <div className="w-px h-3 bg-neutral-300"></div>
                  {product.origin === 'MX' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase"><Globe size={12}/> México</span>
                  ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-neutral-500 uppercase"><Globe size={12}/> Importado</span>
                  )}
               </div>

               {/* Tarjeta de Precio */}
               <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-lg relative transition-all">
                  <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
                                Precio {role === 'silver' ? 'Público' : role}
                            </span>
                            {discount > 0 && (
                                <span className="text-xs text-neutral-400 line-through">
                                    ${(buyingMode === 'rollo' ? product.prices.mayoreo : product.prices.menudeo).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl lg:text-5xl font-[900] text-black tracking-tight">
                                ${finalPrice.toLocaleString()}
                            </span>
                            <span className="text-xs text-neutral-500 font-bold uppercase mb-1">MXN / {buyingMode === 'rollo' ? 'Kg' : 'Kg'}</span>
                        </div>
                    </div>

                    {/* Ahorro (Si aplica por membresía, no por volumen genérico) */}
                    <div className="text-right">
                        {savingsAmount > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <span className="block text-[10px] text-green-600 font-bold uppercase mb-0.5">Ahorras</span>
                                <span className="text-xl font-bold text-green-600">-${savingsAmount.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                  </div>
               </div>
            </div>

            {/* Selector de Presentación */}
            <div className="mb-6">
               <label className="text-xs font-bold uppercase text-neutral-500 mb-2 flex items-center gap-2">
                   <Layers size={14}/> Selecciona la presentación
               </label>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                     onClick={() => { setBuyingMode('kilo'); setQuantity(1); }}
                     className={`relative p-3 flex flex-col items-center justify-center gap-1 border rounded-lg transition-all duration-200 ${buyingMode === 'kilo' ? 'bg-white border-[#FDCB02] text-black ring-1 ring-[#FDCB02] shadow-sm' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                  >
                     {buyingMode === 'kilo' && <div className="absolute top-2 right-2 text-[#FDCB02]"><Check size={14} strokeWidth={3}/></div>}
                     <Scissors size={18} />
                     <span className="text-xs font-bold">Por Corte (Kg)</span>
                  </button>
                  <button 
                     onClick={() => { setBuyingMode('rollo'); setQuantity(1); }}
                     className={`relative p-3 flex flex-col items-center justify-center gap-1 border rounded-lg transition-all duration-200 ${buyingMode === 'rollo' ? 'bg-[#FDCB02]/10 border-[#FDCB02] text-black ring-1 ring-[#FDCB02] shadow-sm' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                     disabled={!product.hasRollo}
                  >
                     {buyingMode === 'rollo' && <div className="absolute top-2 right-2 text-[#FDCB02]"><Check size={14} strokeWidth={3}/></div>}
                     <Package size={18} />
                     <span className="text-xs font-bold">Por Rollo (~25kg)</span>
                  </button>
               </div>
            </div>

            {/* Cantidad y Acciones */}
            <div className="space-y-4 mb-8">
                {/* Control de Cantidad */}
                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-1.5 rounded-lg">
                    <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                        className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-white hover:shadow-sm rounded-md transition-all"
                    >
                        <Minus size={18}/>
                    </button>
                    <div className="flex flex-col items-center">
                        <input 
                            type="number" 
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-transparent text-center font-bold text-xl text-black focus:outline-none"
                        />
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                            {buyingMode === 'rollo' ? 'Rollos' : 'Kilos'}
                        </span>
                    </div>
                    <button 
                        onClick={() => setQuantity(q => q + 1)} 
                        className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-white hover:shadow-sm rounded-md transition-all"
                    >
                        <Plus size={18}/>
                    </button>
                </div>

                {/* Barra de Estado */}
                <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-medium text-neutral-500">
                        Peso Total: <strong className="text-black">{totalWeight} kg</strong>
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                        Estado: <strong className="text-green-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"/> Disponible</strong>
                    </span>
                </div>

                {/* Botón Agregar al Carrito */}
                <button 
                    onClick={handleAddToCart}
                    className="group w-full bg-[#FDCB02] hover:bg-[#e5b800] text-black py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
                    <ShoppingCart size={20} strokeWidth={2.5} className="relative z-10"/>
                    <div className="flex flex-col items-start leading-none relative z-10">
                        <span className="font-[900] text-sm uppercase">Agregar al Carrito</span>
                        <span className="font-medium text-xs opacity-80 mt-0.5">Total: ${totalPrice.toLocaleString()} MXN</span>
                    </div>
                    <ArrowRight size={18} className="ml-auto opacity-60 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>
            </div>

            {/* Garantías */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-neutral-200">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-full text-[#FDCB02]">
                     <Truck size={18}/>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-black uppercase leading-none mb-1">Envío Estándar</p>
                     <p className="text-[10px] text-neutral-500 leading-none">Tarifa calculada al pagar</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-full text-[#FDCB02]">
                     <Shield size={18}/>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-black uppercase leading-none mb-1">Garantía Total</p>
                     <p className="text-[10px] text-neutral-500 leading-none">Compra protegida</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* --- TABS DE INFORMACIÓN --- */}
        <div className="mt-20 pt-10 border-t border-neutral-200">
           {/* Navegación de Pestañas */}
           <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto scrollbar-hide gap-8">
              {['details', 'specs', 'reviews'].map((tab) => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-xs font-bold uppercase tracking-wide transition-all relative whitespace-nowrap ${
                        activeTab === tab ? 'text-black' : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                 >
                    {tab === 'details' && 'Descripción'}
                    {tab === 'specs' && 'Especificaciones'}
                    {tab === 'reviews' && 'Opiniones de Clientes'}
                    {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FDCB02] rounded-t-full"/>
                    )}
                 </button>
              ))}
           </div>

           {/* Contenido de Pestañas */}
           <div className="min-h-[300px]">
              
              {/* PESTAÑA DETALLES */}
              {activeTab === 'details' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-300">
                    <div className="space-y-4">
                       <h3 className="text-xl font-bold text-black">Detalles del Producto</h3>
                       <p className="text-neutral-600 leading-relaxed text-sm">
                           {product.description}
                       </p>
                       <p className="text-neutral-600 leading-relaxed text-sm">
                          Esta tela está diseñada para durar. Su tejido especial permite una excelente transpiración, ideal para uniformes deportivos escolares y profesionales. Los colores se mantienen vivos lavada tras lavada.
                       </p>
                       <div className="flex flex-wrap gap-4 mt-6">
                           <div className="flex items-center gap-3 bg-neutral-50 px-4 py-3 rounded border border-neutral-100">
                               <Zap className="text-[#FDCB02]" size={20}/>
                               <div>
                                   <h4 className="font-bold text-black text-xs uppercase">Secado Rápido</h4>
                                   <p className="text-[10px] text-neutral-500">Tecnología Dry-Fit</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-3 bg-neutral-50 px-4 py-3 rounded border border-neutral-100">
                               <Shield className="text-[#FDCB02]" size={20}/>
                               <div>
                                   <h4 className="font-bold text-black text-xs uppercase">Alta Resistencia</h4>
                                   <p className="text-[10px] text-neutral-500">No hace pilling</p>
                               </div>
                           </div>
                       </div>
                    </div>
                    <div className="relative h-64 lg:h-auto bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
                        <Image src={product.thumbnail} alt="Textura Zoom" fill className="object-cover hover:scale-105 transition-transform duration-700"/>
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-[10px] font-bold uppercase shadow-sm">
                            Detalle de Textura
                        </div>
                    </div>
                 </div>
              )}

              {/* PESTAÑA ESPECIFICACIONES */}
              {activeTab === 'specs' && (
                 <div className="animate-in fade-in duration-300 max-w-3xl">
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                       <table className="w-full text-left">
                          <tbody className="divide-y divide-neutral-200">
                             {[
                                ['Composición', product.composicion],
                                ['Gramaje (Peso)', `${product.gramaje} g/m²`],
                                ['Ancho', product.ancho],
                                ['Rendimiento', `${product.rendimiento} m/kg`],
                                ['Origen', product.origin === 'MX' ? 'Nacional' : 'Importado'],
                             ].map(([key, val], i) => (
                                <tr key={i} className="group hover:bg-neutral-50 transition-colors">
                                   <td className="py-4 px-6 font-medium text-neutral-500 text-xs w-1/3 bg-neutral-50/50 group-hover:bg-neutral-100/50 transition-colors">{key}</td>
                                   <td className="py-4 px-6 font-bold text-black text-sm">{val}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {/* PESTAÑA OPINIONES */}
              {activeTab === 'reviews' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                    {/* Resumen */}
                    <div className="col-span-1 bg-neutral-50 p-6 rounded-lg border border-neutral-200 h-fit sticky top-28">
                       <div className="text-5xl font-black text-black mb-1">4.9</div>
                       <div className="flex mb-4 text-[#FDCB02]">
                          {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor"/>)}
                       </div>
                       <p className="text-xs text-neutral-500 font-medium">Basado en 128 compras verificadas.</p>
                       <button className="w-full mt-6 bg-white border border-neutral-300 text-black py-2 rounded text-xs font-bold uppercase hover:bg-neutral-100 transition-colors">
                           Escribir Opinión
                       </button>
                    </div>

                    {/* Lista */}
                    <div className="col-span-2 space-y-4">
                       {[1,2,3].map((r) => (
                          <div key={r} className="bg-white p-6 border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#FDCB02] rounded-full flex items-center justify-center font-bold text-xs text-black">
                                        CM
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-black uppercase">Cliente verificado</p>
                                        <p className="text-[10px] text-green-600 flex items-center gap-1"><Check size={10}/> Compra Verificada</p>
                                    </div>
                                </div>
                                <div className="flex text-[#FDCB02]">
                                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor"/>)}
                                </div>
                             </div>
                             <p className="text-neutral-700 text-sm leading-relaxed">
                                "Muy buena calidad de tela. El color es firme y no destiñe. El pedido llegó antes de lo esperado a Guadalajara. Definitivamente volveré a pedir para la próxima temporada."
                             </p>
                             <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-4">
                                <span className="text-[10px] text-neutral-400">Hace 2 días</span>
                                <button className="text-[10px] text-neutral-500 font-bold hover:text-black">¿Es útil?</button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* --- PRODUCTOS RELACIONADOS --- */}
        <div className="mt-20 pt-10 border-t border-neutral-200 mb-20">
           <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black uppercase text-black">
                  También te puede interesar
               </h3>
               <Link href="/" className="text-xs font-bold text-[#FDCB02] hover:text-[#e5b800] uppercase flex items-center gap-1">
                   Ver todo <ArrowRight size={14}/>
               </Link>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relProduct) => (
                 <Link href={`/products/${relProduct.id}`} key={relProduct.id} className="group block bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-[4/5] relative overflow-hidden bg-neutral-100">
                       <Image src={relProduct.thumbnail} alt={relProduct.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700"/>
                       <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[9px] font-bold uppercase">
                            {relProduct.gramaje}g
                       </div>
                    </div>
                    <div className="p-4">
                       <h4 className="text-black font-bold text-sm uppercase leading-tight mb-2 group-hover:text-[#FDCB02] transition-colors line-clamp-2 min-h-[2.5em]">
                           {relProduct.title}
                       </h4>
                       <div className="flex justify-between items-end pt-2 border-t border-neutral-100">
                          <span className="text-neutral-500 text-[10px] font-medium">Menudeo</span>
                          <span className="text-black font-bold text-sm">${relProduct.prices.menudeo}</span>
                       </div>
                    </div>
                 </Link>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}