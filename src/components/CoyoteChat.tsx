'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { Send, X, MessageSquare, Sparkles, User, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoyoteCotizadorWhatsApp() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: 'assistant',
      content:
        '🐺 ¡Hola! Soy El Coyote de Infraestructura Nacional.\n\nPara cotizar nuestras telas, escribe aquí lo que necesitas (tipo de tela, metros, color, uso, etc.) y presiona Enviar.\n\nTu consulta se abrirá directamente en WhatsApp al +52 55 3131 4617 para que nuestro equipo te atienda al instante.',
    },
  ]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isOpen]);

  const sendToWhatsApp = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();

    // Agregamos el mensaje del usuario al chat (para que vea lo que envió)
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Construimos el texto para WhatsApp
    const waText = `Hola equipo de Infraestructura Nacional!\n\nSoy un usuario de la web.\nQuiero cotizar telas:\n\n${userMessage}\n\n¡Gracias!`.replace(/\n/g, '%0A');

    // Abrimos WhatsApp en una nueva pestaña
    window.open(`https://wa.me/525531314617?text=${waText}`, '_blank');

    // Mensaje de confirmación en el chat
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '✅ ¡Listo! Tu cotización se abrió en WhatsApp.\nTe responderán lo más pronto posible. Puedes cerrar esta ventana o seguir escribiendo si necesitas ajustar algo antes de volver a enviar.',
      },
    ]);

    // Limpiamos el input
    setInput('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendToWhatsApp();
  };

  // Ocultar en rutas de flotilla
  if (pathname?.startsWith('/flotilla')) return null;

  return (
    <>
      {/* --- TRIGGER BUTTON (PULSING) --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Cotizador por WhatsApp"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300">
            {isOpen ? (
              <X className="w-8 h-8 text-white" />
            ) : (
              <MessageSquare className="w-8 h-8 text-white" />
            )}
          </div>

          {/* Anillos de pulsación */}
          {!isOpen && (
            <>
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40"></div>
              <div className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-30"></div>
            </>
          )}
        </div>
      </button>

      {/* --- CHAT WINDOW --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border border-green-200"
            style={{ height: 'min(70vh, 520px)' }}
          >
            {/* --- HEADER PREMIUM --- */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                  🐺
                </div>
                <div>
                  <h3 className="font-bold text-lg">El Coyote</h3>
                  <p className="text-xs opacity-90">Cotizador por WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 hover:rotate-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* --- BODY CHAT --- */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto bg-neutral-50 space-y-4"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-white shadow-sm rounded-bl-none border'
                    }`}
                  >
                    {/* Nombre pequeño */}
                    <span className="text-xs opacity-70 block mb-1">
                      {msg.role === 'user' ? 'Tú' : 'Coyote'}
                    </span>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* --- INPUT AREA --- */}
            <div className="border-t bg-white p-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe tu cotización aquí..."
                  className="flex-1 bg-neutral-100 px-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                >
                  <ArrowUp size={20} />
                </button>
              </form>
              <p className="text-xs text-center text-neutral-500 mt-2">
                Powered by Coyote • WhatsApp: +52 55 3131 4617
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}