'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShoppingCart, ChevronLeft, Activity, Layers, Check, Minus, Plus, 
  Shield, Zap, AlertCircle, FileText, Ruler, Scale, Package, Scissors,
  Star, Share2, Heart, MessageSquare, Truck, ArrowRight
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
  const [selectedImage, setSelectedImage] = useState(0); // Para la galería

  // 1. Obtener Producto
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const product = products.find(p => p.id === productId);

  // 2. Productos Relacionados (Simulación: Excluir el actual y tomar 4 random)
  const relatedProducts = useMemo(() => {
    return products.filter(p => p.id !== productId).slice(0, 4);
  }, [productId]);

  if (!product) return null; // O tu componente de error 404

  // Lógica de Precios
  const basePriceToUse = buyingMode === 'rollo' ? product.prices.mayoreo : product.prices.menudeo;
  const { price: finalPrice, label, discount, role } = useB2BPrice(basePriceToUse);
  const totalWeight = buyingMode === 'rollo' ? quantity * ROLL_WEIGHT_KG : quantity;
  const totalPrice = finalPrice * totalWeight;

  // Simulación de galería (Como solo tenemos 1 foto, la repetimos para el efecto visual)
  const galleryImages = [
    product.thumbnail,
    product.thumbnail, // Aquí iría la vista trasera
    product.thumbnail, // Aquí iría el zoom a la textura
  ];

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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#050505] text-black dark:text-white font-sans pt-24 pb-20">
      
      {/* Breadcrumbs estilo Amazon */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] mb-6">
         <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2 uppercase tracking-widest">
            <Link href="/" className="hover:text-[#FDCB02]">Catálogo</Link> 
            <ChevronLeft size={10} className="rotate-180"/> 
            <span>Textiles Deportivos</span>
            <ChevronLeft size={10} className="rotate-180"/>
            <span className="text-neutral-300 font-bold">{product.title}</span>
         </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* --- COLUMNA 1: GALERÍA (Amazon Style - Sticky) --- */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 h-fit sticky top-24">
             {/* Thumbnails Verticales */}
             <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible">
                {galleryImages.map((img, idx) => (
                   <div 
                      key={idx} 
                      onMouseEnter={() => setSelectedImage(idx)}
                      className={`min-w-[60px] w-[60px] h-[60px] lg:w-[70px] lg:h-[70px] border rounded-sm overflow-hidden cursor-pointer transition-all ${selectedImage === idx ? 'border-[#FDCB02] ring-1 ring-[#FDCB02]' : 'border-neutral-800 hover:border-neutral-500'}`}
                   >
                      <Image src={img} alt="Thumb" width={70} height={70} className="object-cover w-full h-full"/>
                   </div>
                ))}
             </div>
             
             {/* Imagen Principal Grande */}
             <div className="flex-1 relative aspect-square bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/10 rounded-sm overflow-hidden group">
                <Image 
                   src={galleryImages[selectedImage]} 
                   alt={product.title} 
                   fill 
                   className="object-cover"
                   priority
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                   <button className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-[#FDCB02] hover:text-black transition-colors">
                      <Share2 size={18} />
                   </button>
                   <button className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-red-500 hover:text-white transition-colors">
                      <Heart size={18} />
                   </button>
                </div>
                {product.hasRollo && (
                   <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-l-2 border-[#FDCB02]">
                      Disponible en Rollo
                   </div>
                )}
             </div>
          </div>

          {/* --- COLUMNA 2: BUY BOX & INFO (La "Ficha") --- */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Header del Producto */}
            <div className="border-b border-neutral-800 pb-6">
               <div className="flex justify-between items-start mb-2">
                  <h1 className="text-3xl lg:text-4xl font-[900] uppercase italic leading-none text-neutral-900 dark:text-white">
                     {product.title}
                  </h1>
               </div>
               
               {/* Ratings */}
               <div className="flex items-center gap-4 mb-4">
                  <div className="flex text-[#FDCB02]">
                     {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <span className="text-xs text-neutral-500 hover:text-[#FDCB02] cursor-pointer hover:underline">
                     4.9 (128 Reseñas Verificadas)
                  </span>
                  <span className="text-neutral-700">|</span>
                  <span className="text-xs font-mono text-neutral-400">SKU: {product.id.replace('prod_', '').toUpperCase()}</span>
               </div>

               {/* Precio */}
               <div className="bg-neutral-100 dark:bg-[#111] p-4 rounded-sm border border-neutral-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-bold text-red-500 uppercase">Oferta {role === 'silver' ? 'Pública' : role}</span>
                     {buyingMode === 'rollo' && <span className="bg-[#FDCB02] text-black text-[9px] font-bold px-1.5 rounded">MAYOREO</span>}
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-[900] dark:text-white text-neutral-900">
                        ${finalPrice.toLocaleString()}
                     </span>
                     <span className="text-sm text-neutral-500 font-medium">MXN / Kilo</span>
                  </div>
                  {discount > 0 && (
                     <p className="text-xs text-neutral-500 mt-1 line-through">
                        Precio de Lista: ${buyingMode === 'rollo' ? product.prices.mayoreo.toLocaleString() : product.prices.menudeo.toLocaleString()}
                     </p>
                  )}
               </div>
            </div>

            {/* Selector Industrial de Modalidad */}
            <div>
               <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Modalidad de Suministro</label>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                     onClick={() => { setBuyingMode('kilo'); setQuantity(1); }}
                     className={`p-3 border rounded-sm flex flex-col items-center justify-center gap-1 transition-all ${buyingMode === 'kilo' ? 'border-[#FDCB02] bg-[#FDCB02]/10 text-[#FDCB02]' : 'border-neutral-800 hover:border-neutral-600'}`}
                  >
                     <Scissors size={20} />
                     <span className="text-[10px] font-bold uppercase">Corte (Kilo)</span>
                  </button>
                  <button 
                     onClick={() => { setBuyingMode('rollo'); setQuantity(1); }}
                     className={`p-3 border rounded-sm flex flex-col items-center justify-center gap-1 transition-all ${buyingMode === 'rollo' ? 'border-[#FDCB02] bg-[#FDCB02]/10 text-[#FDCB02]' : 'border-neutral-800 hover:border-neutral-600'}`}
                     disabled={!product.hasRollo}
                  >
                     <Package size={20} />
                     <span className="text-[10px] font-bold uppercase">Rollo Cerrado</span>
                  </button>
               </div>
            </div>

            {/* Selector Cantidad */}
            <div className="flex items-center gap-4">
               <div className="flex items-center border border-neutral-700 rounded-sm bg-black">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:text-[#FDCB02]"><Minus size={16}/></button>
                  <input 
                     type="number" 
                     value={quantity} 
                     onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                     className="w-12 bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                  <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:text-[#FDCB02]"><Plus size={16}/></button>
               </div>
               <div className="text-xs text-neutral-500">
                  <p>Total Estimado: <strong className="text-white">{totalWeight} Kg</strong></p>
                  {buyingMode === 'rollo' && <p className="text-[10px] opacity-70">~{ROLL_WEIGHT_KG}kg por rollo</p>}
               </div>
            </div>

            {/* Botones de Acción (Stack Vertical) */}
            <div className="flex flex-col gap-3 mt-2">
               <button 
                  onClick={handleAddToCart}
                  className="w-full bg-[#FDCB02] hover:bg-white text-black font-[900] uppercase tracking-widest py-4 text-sm rounded-sm transition-colors shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
               >
                  <ShoppingCart size={18} strokeWidth={2.5}/>
                  Agregar al Pedido
               </button>
               <button className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-colors">
                  Comprar Ahora (Fast Checkout)
               </button>
            </div>

            {/* Garantías Microcopy */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
               <div className="flex items-start gap-2">
                  <Truck size={16} className="text-[#FDCB02] mt-0.5"/>
                  <div>
                     <p className="text-[10px] font-bold uppercase text-white">Envío Nacional</p>
                     <p className="text-[9px] text-neutral-500">Gratis arriba de 100kg</p>
                  </div>
               </div>
               <div className="flex items-start gap-2">
                  <Shield size={16} className="text-[#FDCB02] mt-0.5"/>
                  <div>
                     <p className="text-[10px] font-bold uppercase text-white">Garantía Coyote</p>
                     <p className="text-[9px] text-neutral-500">Devolución en 30 días</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* --- SECCIÓN INFERIOR: PESTAÑAS DETALLADAS --- */}
        <div className="mt-20 border-t border-neutral-800 pt-10">
           {/* Navegación de Pestañas */}
           <div className="flex gap-8 border-b border-neutral-800 mb-8 overflow-x-auto">
              {['details', 'specs', 'reviews'].map((tab) => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-xs font-[900] uppercase tracking-widest transition-colors relative ${activeTab === tab ? 'text-[#FDCB02]' : 'text-neutral-500 hover:text-white'}`}
                 >
                    {tab === 'details' && 'Descripción Detallada'}
                    {tab === 'specs' && 'Ficha Técnica'}
                    {tab === 'reviews' && 'Opiniones (128)'}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FDCB02]"/>}
                 </button>
              ))}
           </div>

           {/* Contenido de Pestañas */}
           <div className="min-h-[300px]">
              {activeTab === 'details' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
                    <div className="prose prose-invert max-w-none">
                       <h3 className="text-xl font-bold text-white mb-4">Sobre {product.title}</h3>
                       <p className="text-neutral-400 leading-relaxed text-sm mb-4">{product.description}</p>
                       <p className="text-neutral-400 leading-relaxed text-sm">
                          Diseñado para el alto rendimiento, este textil cuenta con tecnología de dispersión de humedad y resistencia a la abrasión. Ideal para la confección de uniformes tácticos, deportivos y de uso rudo. Su estructura garantiza una solidez de color superior al lavado industrial.
                       </p>
                       <ul className="list-disc pl-5 mt-4 text-neutral-400 text-sm space-y-2">
                          <li>Resistencia al pilling grado 4.</li>
                          <li>Factor de protección UV 30+.</li>
                          <li>Secado rápido (Dry-Fit Tech).</li>
                       </ul>
                    </div>
                    <div className="bg-[#111] p-8 rounded-sm border border-white/5 flex flex-col justify-center items-center text-center">
                       <Zap size={48} className="text-[#FDCB02] mb-4"/>
                       <h4 className="text-lg font-bold text-white mb-2">Tecnología Dry-Core™</h4>
                       <p className="text-neutral-500 text-xs max-w-xs">
                          Microfibras avanzadas que expulsan el sudor hacia la capa exterior del tejido, manteniendo al usuario seco y ligero.
                       </p>
                    </div>
                 </div>
              )}

              {activeTab === 'specs' && (
                 <div className="bg-[#111] rounded-sm border border-white/5 overflow-hidden max-w-3xl animate-in fade-in">
                    <table className="w-full text-sm text-left">
                       <tbody className="divide-y divide-white/5">
                          {[
                             ['Composición', product.composicion],
                             ['Gramaje', `${product.gramaje} g/m²`],
                             ['Ancho', product.ancho],
                             ['Rendimiento', `${product.rendimiento} m/kg`],
                             ['Origen', product.origin === 'MX' ? 'Hecho en México' : 'Importado'],
                             ['Certificación', 'ISO-9001 / OEKO-TEX Standard 100']
                          ].map(([key, val], i) => (
                             <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 font-mono uppercase text-neutral-500 text-xs">{key}</td>
                                <td className="py-4 px-6 font-bold text-white">{val}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}

              {activeTab === 'reviews' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
                    <div className="col-span-1 bg-[#111] p-6 rounded-sm border border-white/5 h-fit">
                       <div className="text-5xl font-[900] text-white mb-2">4.9</div>
                       <div className="flex text-[#FDCB02] mb-4">
                          <Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/>
                       </div>
                       <p className="text-neutral-500 text-xs mb-6">Basado en 128 compras verificadas de mayoristas.</p>
                       <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                             <span className="text-neutral-400 w-8">5★</span>
                             <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden"><div className="w-[90%] h-full bg-[#FDCB02]"/></div>
                             <span className="text-neutral-400 w-8 text-right">92%</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                             <span className="text-neutral-400 w-8">4★</span>
                             <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden"><div className="w-[8%] h-full bg-[#FDCB02]"/></div>
                             <span className="text-neutral-400 w-8 text-right">6%</span>
                          </div>
                       </div>
                    </div>
                    <div className="col-span-2 space-y-6">
                       {[1,2].map((r) => (
                          <div key={r} className="border-b border-white/5 pb-6">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-400">CM</div>
                                <span className="text-sm font-bold text-white">Confecciones México S.A.</span>
                                <span className="text-[10px] text-green-500 bg-green-900/20 px-2 py-0.5 rounded ml-2">COMPRA VERIFICADA</span>
                             </div>
                             <div className="flex text-[#FDCB02] mb-2"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
                             <p className="text-neutral-300 text-sm leading-relaxed">
                                "Excelente calidad de la tela. El gramaje es exacto y la caída es perfecta para camisetas deportivas premium. El envío a Guadalajara llegó en 24 horas."
                             </p>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* --- PRODUCTOS RELACIONADOS (Cross-Selling) --- */}
        <div className="mt-24 border-t border-neutral-800 pt-12 mb-12">
           <h3 className="text-2xl font-[900] uppercase italic text-white mb-8">
              Frecuentemente comprados juntos
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relProduct) => (
                 <Link href={`/products/${relProduct.id}`} key={relProduct.id} className="group block bg-[#111] border border-white/5 hover:border-[#FDCB02] rounded-sm overflow-hidden transition-all">
                    <div className="aspect-[4/5] relative">
                       <Image src={relProduct.thumbnail} alt={relProduct.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                    </div>
                    <div className="p-4">
                       <h4 className="text-white font-bold text-xs uppercase line-clamp-1 mb-1 group-hover:text-[#FDCB02] transition-colors">{relProduct.title}</h4>
                       <p className="text-neutral-500 text-[10px] font-mono mb-3">{relProduct.gramaje} g/m² • {relProduct.ancho}</p>
                       <div className="flex justify-between items-center">
                          <span className="text-white font-bold text-sm">${relProduct.prices.menudeo}</span>
                          <span className="p-1.5 bg-white text-black rounded-full hover:bg-[#FDCB02] transition-colors">
                             <ShoppingCart size={14}/>
                          </span>
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