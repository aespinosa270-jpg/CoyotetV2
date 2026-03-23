'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { Send, X, MessageSquare, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoyoteChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: 'assistant',
      content: '🐺 ¡Hola! Soy El Coyote de Coyote Textil • Infraestructura Nacional 🇲🇽\n\nVISTIENDO LA FUERZA DE MÉXICO 🔥\n\nControl absoluto del suministro • Sin rivales • Sin excusas.\n\nTe ayudo con cualquier tela: Alaska, Pixel, Andromeda, Licras, Felpa, Oxford, etc.\n\nDime qué necesitas (metros, kilos, uso, sublimación, toldos, uniformes…) y cuando quieras cotización real con el equipo humano, solo presiona el botón verde. ¿En qué te sirvo hoy?',
    },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 🔥 DETECTOR INTELIGENTE BASADO EN coyotetextil.com
  const detectarIntencion = (texto: string): { nivel: number; recomendacion: string } => {
    const t = texto.toLowerCase();
    let puntos = 0;
    let reco = '';

    const productosReales = ['alaska', 'pixel', 'andromeda', 'apolo', 'ares', 'licra', 'felpa', 'sublimar', 'piqué', 'oxford', 'rollo', 'kilo', 'gsm', 'uv', 'toldo', 'uniforme'];

    if (productosReales.some(p => t.includes(p))) puntos += 45;
    if (t.includes('cotizar') || t.includes('precio') || t.includes('cuánto') || t.includes('presupuesto')) puntos += 40;
    if (t.match(/\d+/)) puntos += 25; // menciona cantidades
    if (t.includes('por favor') || t.includes('urgente') || t.includes('muestra')) puntos += 20;

    if (t.includes('alaska') || t.includes('pixel')) reco = 'Pixel o Alaska son ideales para sublimación de alta definición (140-150 GSM).';
    else if (t.includes('licra')) reco = 'Recomiendo Licra Playera o Mercury para playeras deportivas.';
    else if (t.includes('felpa')) reco = 'Felpa China o Spun 280 GSM para línea invernal.';
    else reco = 'Tengo stock inmediato de +40 telas premium ISO-9001 con envío 24/7 a todo México.';

    return { nivel: Math.min(100, puntos), recomendacion: reco };
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const { nivel, recomendacion } = detectarIntencion(userMsg);

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          // Le damos contexto real del sitio al OpenAI (puedes reforzar esto en tu /api/chat también)
          extraContext: 'Eres El Coyote de coyotetextil.com. Productos reales: Alaska $170/kg, Pixel $150/kg, Licras 180 GSM, Felpa 280 GSM. Siempre menciona VISTIENDO LA FUERZA DE MÉXICO y oferta de envío nacional + ISO-9001.'
        })
      });

      const data = await res.json();
      let reply = data.content || '¡Entendido! ¿Quieres que te recomiende la tela perfecta según coyotetextil.com?';

      // Inteligencia local: insertar recomendación real
      if (nivel >= 60) {
        reply = `🐺 Basado en coyotetextil.com → ${recomendacion}\n\n${reply}`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Banner inteligente automático
      if (nivel >= 65) setShowBanner(true);
      if (nivel >= 88) setTimeout(enviarTodoAWhatsApp, 1200); // escalada casi automática cuando es muy claro

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Estoy aquí 24/7 con todo el catálogo real de coyotetextil.com. ¿Quieres que pase tu solicitud directo al equipo humano?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const enviarTodoAWhatsApp = () => {
    let contextoReal = `🔥 COTIZACIÓN DESDE coyotetextil.com CHAT\n🐺 Hablando con El Coyote\n📍 VISTIENDO LA FUERZA DE MÉXICO • ISO-9001 • Envío nacional\n\n`;

    messages.forEach(m => {
      contextoReal += m.role === 'user' ? `👤 Cliente: ${m.content}\n` : `🐺 Coyote: ${m.content}\n`;
    });

    contextoReal += `\n🎯 Por favor genera cotización oficial con precios por kilo/rollo + stock + tiempo de entrega + opción contenedor.\n¡Gracias equipo! 🙏`;

    const waLink = `https://wa.me/525531314617?text=${encodeURIComponent(contextoReal)}`;
    window.open(waLink, '_blank');

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '✅ ¡Enviado! El equipo humano de Coyote Textil (CDMX) ya recibió toda la conversación con contexto real del sitio. Te responden rápido (normalmente <5 min).\n¿Quieres seguir asesorándote aquí mientras llega la cotización?'
    }]);

    setShowBanner(false);
  };

  const sugerenciaRapida = (texto: string) => {
    setInput(texto);
    setTimeout(() => sendMessage(), 100);
  };

  if (pathname?.startsWith("/flotilla")) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all">
          {isOpen ? <X className="w-8 h-8 text-white" /> : <MessageSquare className="w-8 h-8 text-white" />}
          <div className="absolute -top-1 -right-1 bg-green-400 text-[10px] px-1.5 rounded-full">🐺</div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 right-6 w-96 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-orange-300"
            style={{ height: '560px' }}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🐺</div>
                <div>
                  <h3 className="font-bold">El Coyote • Coyote Textil</h3>
                  <p className="text-xs opacity-90">VISTIENDO LA FUERZA DE MÉXICO • Stock real</p>
                </div>
              </div>
              <button onClick={enviarTodoAWhatsApp} className="bg-white text-orange-700 px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
                📲 Cotizar con equipo
              </button>
              <button onClick={() => setIsOpen(false)} className="text-xl">✕</button>
            </div>

            {/* BODY */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white border'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && <div className="text-orange-500">🐺 consultando catálogo real de coyotetextil.com...</div>}

              <AnimatePresence>
                {showBanner && (
                  <motion.div className="bg-green-600 text-white p-3 rounded-2xl text-sm flex justify-between items-center">
                    🔥 Detecté intención alta de compra (basado en coyotetextil.com)
                    <button onClick={enviarTodoAWhatsApp} className="bg-white text-green-700 px-4 py-1 rounded-full text-xs font-bold">ENVIAR TODO AHORA</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SUGERENCIAS RÁPIDAS INTELIGENTES */}
            <div className="p-3 border-t bg-white flex flex-wrap gap-2">
              {[
                "Cotizar Alaska 1 rollo",
                "Pixel para sublimación",
                "Licra Playera 25kg",
                "Felpa invernal",
                "Muestrario gratis",
                "Precio contenedor"
              ].map((s, i) => (
                <button key={i} onClick={() => sugerenciaRapida(s)} className="text-xs bg-zinc-100 hover:bg-orange-100 px-3 py-1 rounded-full border">
                  {s}
                </button>
              ))}
            </div>

            {/* INPUT */}
            <div className="p-3 border-t bg-white">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ej: 120 metros de Pixel negra impermeable + precio urgente"
                  className="flex-1 px-4 py-3 bg-zinc-100 rounded-full text-sm focus:ring-orange-500"
                />
                <button type="submit" className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center">
                  <ArrowUp size={24} />
                </button>
              </form>

              <button
                onClick={enviarTodoAWhatsApp}
                className="mt-3 w-full bg-green-600 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                📲 Enviar conversación completa al equipo humano (+52 55 3131 4617)
              </button>

              <p className="text-[10px] text-center mt-2 text-zinc-500">
                🧠 Basado 100% en coyotetextil.com • OpenAI + inteligencia local de stock real • Puedes seguir platicando después de enviar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}