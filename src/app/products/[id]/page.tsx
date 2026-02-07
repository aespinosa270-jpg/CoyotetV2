'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShoppingCart, ChevronLeft, Layers, Minus, Plus, 
  Shield, Zap, Scale, Package, Scissors,
  Star, Share2, Heart, Truck, LayoutGrid, Globe, ArrowRight
} from 'lucide-react';
import { useCart } from '@/lib/context/cart-context';
import { useB2BPrice } from '@/hooks/use-b2b-price';
import { products } from '@/lib/products';

// Peso estándar estimado
const ROLL_WEIGHT_KG = 25;

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  
  // Estados
  const [quantity, setQuantity] = useState(1);
  const [buyingMode, setBuyingMode] = useState<'kilo' | 'rollo'>('kilo');
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [selectedImage, setSelectedImage] = useState(0);

  // 1. Obtener Producto
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const product = products.find(p => p.id === productId);

  // 2. Productos Relacionados
  const relatedProducts = useMemo(() => {
    return products.filter(p => p.id !== productId).slice(0, 4);
  }, [productId]);

  if (!product) return null;

  // Lógica de Precios
  const basePriceToUse = buyingMode === 'rollo' ? product.prices.mayoreo : product.prices.menudeo;
  const { price: finalPrice, label, discount, role } = useB2BPrice(basePriceToUse);
  
  // Cálculo de totales
  const totalWeight = buyingMode === 'rollo' ? quantity * ROLL_WEIGHT_KG : quantity;
  const totalPrice = finalPrice * totalWeight;
  const savingsAmount = (product.prices.menudeo - finalPrice) * totalWeight;

  // Simulación de galería
  const galleryImages = [product.thumbnail, product.thumbnail, product.thumbnail];

  const handleAddToCart = () => {
    addItem({
      // @ts-ignore
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: product.thumbnail,
      quantity: totalWeight,
      unit: buyingMode === 'rollo' ? 'Kg (Rollo)' : 'Kg'
    });
  };

  return (
    // CAMBIO: Fondo blanco y texto oscuro para contraste profesional
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">
      
      {/* Navegación Superior */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] mb-6 relative z-10">
         <div className="text-[11px] font-medium text-neutral-500 flex items-center gap-2 uppercase tracking-wide border-b border-neutral-200 pb-4">
            <Link href="/" className="hover:text-[#FDCB02] transition-colors flex items-center gap-1">
                <LayoutGrid size={12}/> Catálogo
            </Link> 
            <ChevronLeft size={10} className="rotate-180"/> 
            <span className="hover:text-black transition-colors cursor-pointer">Telas Deportivas</span>
            <ChevronLeft size={10} className="rotate-180"/>
            <span className="text-black font-bold">{product.title}</span>
         </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">
          
          {/* --- COLUMNA IZQUIERDA: GALERÍA --- */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 h-fit sticky top-28">
             {/* Miniaturas */}
             <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible py-2 lg:py-0 scrollbar-hide">
                {galleryImages.map((img, idx) => (
                   <div 
                      key={idx} 
                      onMouseEnter={() => setSelectedImage(idx)}
                      className={`min-w-[70px] w-[70px] h-[70px] border relative group cursor-pointer rounded-md overflow-hidden transition-all duration-200 ${selectedImage === idx ? 'border-[#FDCB02] ring-1 ring-[#FDCB02]' : 'border-neutral-200 hover:border-neutral-400'}`}
                   >
                      <Image src={img} alt="Vista Previa" fill className="object-cover"/>
                   </div>
                ))}
             </div>
             
             {/* Imagen Principal */}
             <div className="flex-1 relative aspect-square lg:aspect-[4/3] bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden group">
                <Image 
                   src={galleryImages[selectedImage]} 
                   alt={product.title} 
                   fill 
                   className="object-cover transition-transform duration-700 group-hover:scale-105"
                   priority
                />
                
                {/* Botones Flotantes */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-neutral-600 hover:text-[#FDCB02] hover:scale-105 transition-all">
                        <Share2 size={16} />
                    </button>
                    <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-neutral-600 hover:text-red-500 hover:scale-105 transition-all">
                        <Heart size={16} />
                    </button>
                </div>

                {product.hasRollo && (
                    <div className="absolute bottom-4 left-4">
                        <span className="bg-[#FDCB02] text-black px-3 py-1 text-[10px] font-bold uppercase rounded-full shadow-sm">
                            Venta por Rollo Disponible
                        </span>
                    </div>
                )}
             </div>
          </div>

          {/* --- COLUMNA DERECHA: INFORMACIÓN DE COMPRA --- */}
          <div className="lg:col-span-5 flex flex-col">
            
            {/* Encabezado */}
            <div className="border-b border-neutral-200 pb-6 mb-6">
               <h1 className="text-3xl lg:text-4xl font-[900] uppercase text-black mb-2 tracking-tight">
                  {product.title}
               </h1>
               
               <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                     <div className="flex text-[#FDCB02]">
                        {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                     </div>
                     <span className="text-xs font-medium text-neutral-600 hover:underline cursor-pointer ml-1">
                        4.9 (128 Opiniones)
                     </span>
                  </div>
                  <div className="w-px h-3 bg-neutral-300"></div>
                  <span className="text-xs font-mono text-neutral-500">SKU: {product.id.replace('prod_', '').toUpperCase()}</span>
                  <div className="w-px h-3 bg-neutral-300"></div>
                  {product.origin === 'MX' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase"><Globe size={12}/> Hecho en México</span>
                  ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-neutral-500 uppercase"><Globe size={12}/> Importado</span>
                  )}
               </div>

               {/* Precio */}
               <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-lg relative">
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
                            <span className="text-xs text-neutral-500 font-bold uppercase mb-1">MXN / Kilo</span>
                        </div>
                    </div>

                    {/* Ahorro */}
                    <div className="text-right">
                        {savingsAmount > 0 && (
                            <div>
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
               <label className="text-xs font-bold uppercase text-neutral-500 mb-2 block flex items-center gap-2">
                   <Layers size={14}/> Selecciona la presentación
               </label>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                     onClick={() => { setBuyingMode('kilo'); setQuantity(1); }}
                     className={`relative p-3 flex flex-col items-center justify-center gap-1 border rounded-lg transition-all duration-200 ${buyingMode === 'kilo' ? 'bg-white border-[#FDCB02] text-black ring-1 ring-[#FDCB02]' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                  >
                     <Scissors size={18} />
                     <span className="text-xs font-bold">Por Kilo (Corte)</span>
                  </button>
                  <button 
                     onClick={() => { setBuyingMode('rollo'); setQuantity(1); }}
                     className={`relative p-3 flex flex-col items-center justify-center gap-1 border rounded-lg transition-all duration-200 ${buyingMode === 'rollo' ? 'bg-[#FDCB02]/10 border-[#FDCB02] text-black ring-1 ring-[#FDCB02]' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                     disabled={!product.hasRollo}
                  >
                     <Package size={18} />
                     <span className="text-xs font-bold">Por Rollo Completo</span>
                  </button>
               </div>
            </div>

            {/* Cantidad y Botón */}
            <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-1 rounded-lg">
                    <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                        className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-white rounded-md transition-colors"
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
                        <span className="text-[9px] font-bold text-neutral-400 uppercase">
                            {buyingMode === 'rollo' ? 'Rollos' : 'Kilos'}
                        </span>
                    </div>
                    <button 
                        onClick={() => setQuantity(q => q + 1)} 
                        className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-white rounded-md transition-colors"
                    >
                        <Plus size={18}/>
                    </button>
                </div>

                <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-medium text-neutral-500">
                        Peso Total: <strong className="text-black">{totalWeight} kg</strong>
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500">
                        Estado: <strong className="text-green-600">Disponible</strong>
                    </span>
                </div>

                <button 
                    onClick={handleAddToCart}
                    className="group w-full bg-[#FDCB02] hover:bg-[#e5b800] text-black py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                >
                    <ShoppingCart size={20} strokeWidth={2.5} />
                    <div className="flex flex-col items-start leading-none">
                        <span className="font-[900] text-sm uppercase">Agregar al Carrito</span>
                        <span className="font-medium text-xs opacity-80 mt-0.5">Total: ${totalPrice.toLocaleString()} MXN</span>
                    </div>
                    <ArrowRight size={18} className="ml-auto opacity-60 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Garantías */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-neutral-200">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-full text-[#FDCB02]">
                     <Truck size={18}/>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-black uppercase leading-none mb-1">Envíos a todo México</p>
                     <p className="text-[10px] text-neutral-500 leading-none">Seguro de envío incluido</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-full text-[#FDCB02]">
                     <Shield size={18}/>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-black uppercase leading-none mb-1">Calidad Garantizada</p>
                     <p className="text-[10px] text-neutral-500 leading-none">Cambios y devoluciones</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* --- PESTAÑAS DE INFORMACIÓN --- */}
        <div className="mt-20 pt-10 border-t border-neutral-200">
           {/* Menú */}
           <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto scrollbar-hide gap-8">
              {['details', 'specs', 'reviews'].map((tab) => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-xs font-bold uppercase tracking-wide transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-black' : 'text-neutral-400 hover:text-neutral-600'}`}
                 >
                    {tab === 'details' && 'Descripción'}
                    {tab === 'specs' && 'Especificaciones'}
                    {tab === 'reviews' && 'Opiniones de Clientes'}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FDCB02] rounded-t-full"/>}
                 </button>
              ))}
           </div>

           {/* Contenido */}
           <div className="min-h-[300px]">
              {activeTab === 'details' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in">
                    <div className="space-y-4">
                       <h3 className="text-xl font-bold text-black">Detalles del Producto</h3>
                       <p className="text-neutral-600 leading-relaxed text-sm">
                           {product.description}
                       </p>
                       <p className="text-neutral-600 leading-relaxed text-sm">
                          Esta tela está diseñada para durar. Su tejido especial permite una excelente transpiración, ideal para uniformes deportivos escolares y profesionales. Los colores se mantienen vivos lavada tras lavada.
                       </p>
                       <div className="flex gap-4 mt-4">
                           <div className="bg-neutral-50 px-4 py-3 rounded border border-neutral-100">
                               <Zap className="text-[#FDCB02] mb-1" size={18}/>
                               <h4 className="font-bold text-black text-xs uppercase">Secado Rápido</h4>
                           </div>
                           <div className="bg-neutral-50 px-4 py-3 rounded border border-neutral-100">
                               <Shield className="text-[#FDCB02] mb-1" size={18}/>
                               <h4 className="font-bold text-black text-xs uppercase">Alta Resistencia</h4>
                           </div>
                       </div>
                    </div>
                    <div className="relative h-64 lg:h-auto bg-neutral-100 rounded-lg overflow-hidden">
                        <Image src={product.thumbnail} alt="Textura Zoom" fill className="object-cover"/>
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-[10px] font-bold uppercase shadow-sm">
                            Detalle de Textura
                        </div>
                    </div>
                 </div>
              )}

              {activeTab === 'specs' && (
                 <div className="animate-in fade-in max-w-3xl">
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
                                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                                   <td className="py-4 px-6 font-medium text-neutral-500 text-xs w-1/3 bg-neutral-50/50">{key}</td>
                                   <td className="py-4 px-6 font-bold text-black text-sm">{val}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {activeTab === 'reviews' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                    <div className="col-span-1 bg-neutral-50 p-6 rounded-lg border border-neutral-200 h-fit">
                       <div className="text-5xl font-black text-black mb-1">4.9</div>
                       <div className="flex mb-4 text-[#FDCB02]">
                          {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor"/>)}
                       </div>
                       <p className="text-xs text-neutral-500">Basado en compras reales.</p>
                    </div>
                    <div className="col-span-2 space-y-4">
                       {[1,2].map((r) => (
                          <div key={r} className="bg-white p-5 border border-neutral-200 rounded-lg shadow-sm">
                             <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-xs text-neutral-600">CM</div>
                                    <div>
                                        <p className="text-xs font-bold text-black">Confecciones México</p>
                                        <p className="text-[10px] text-green-600">Compra Verificada</p>
                                    </div>
                                </div>
                                <div className="flex text-[#FDCB02]">
                                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor"/>)}
                                </div>
                             </div>
                             <p className="text-neutral-600 text-sm">
                                "Muy buena calidad de tela. El color es firme y no destiñe. El pedido llegó antes de lo esperado a Guadalajara."
                             </p>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* --- PRODUCTOS RELACIONADOS --- */}
        <div className="mt-20 pt-10 border-t border-neutral-200 mb-20">
           <h3 className="text-2xl font-black uppercase text-black mb-8">
              También te puede interesar
           </h3>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relProduct) => (
                 <Link href={`/products/${relProduct.id}`} key={relProduct.id} className="group block bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="aspect-[4/5] relative overflow-hidden bg-neutral-100">
                       <Image src={relProduct.thumbnail} alt={relProduct.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                    </div>
                    <div className="p-4">
                       <h4 className="text-black font-bold text-sm uppercase leading-tight mb-2 group-hover:text-[#FDCB02] transition-colors">
                           {relProduct.title}
                       </h4>
                       <div className="flex justify-between items-end pt-2">
                          <span className="text-neutral-500 text-[10px]">{relProduct.gramaje} g/m²</span>
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