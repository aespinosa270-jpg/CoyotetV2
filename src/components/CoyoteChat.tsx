'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Sparkles, User, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoyoteChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: '🐺 ¡Qué tal! Soy El Coyote. ¿En qué te puedo asesorar hoy sobre nuestras telas?' }
  ]);

  // Auto-scroll inteligente
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: [...messages, { role: 'user', content: userMsg }] 
        })
      });

      const data = await res.json();
      
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans selection:bg-[#FDCB02] selection:text-black">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="w-[90vw] sm:w-[380px] h-[600px] max-h-[80vh] bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 mb-6 flex flex-col overflow-hidden origin-bottom-right"
          >
            
            {/* --- HEADER PREMIUM --- */}
            <div className="relative bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-[#FDCB02] rounded-full flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/20 border-2 border-black">🐺</div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1a1a1a] rounded-full animate-pulse"></span>
                </div>
                <div>
                  <h3 className="text-white font-[900] uppercase text-sm tracking-wider flex items-center gap-2">
                    El Coyote <Sparkles size={12} className="text-[#FDCB02]" />
                  </h3>
                  <p className="text-neutral-400 text-[11px] font-medium tracking-wide">
                    Infraestructura Nacional
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 hover:rotate-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* --- BODY CHAT --- */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-gray-50 to-white scrollbar-thin scrollbar-thumb-gray-200">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] relative group ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                    
                    {/* Nombre pequeño */}
                    <span className="text-[10px] text-neutral-400 font-bold uppercase mb-1 px-1 tracking-wider">
                      {msg.role === 'user' ? 'Tú' : 'Coyote'}
                    </span>

                    <div className={`p-4 rounded-2xl text-[13px] sm:text-sm font-medium leading-relaxed shadow-sm transition-all duration-300 hover:shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-black text-white rounded-br-sm' 
                        : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator (Animación de 3 puntos) */}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-neutral-100 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#FDCB02] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#FDCB02] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#FDCB02] rounded-full animate-bounce"></span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* --- INPUT AREA (MODERNA) --- */}
            <div className="p-4 bg-white border-t border-neutral-100">
              <form 
                onSubmit={sendMessage} 
                className="relative group bg-neutral-50 rounded-[1.5rem] border border-neutral-200 focus-within:border-[#FDCB02] focus-within:shadow-[0_0_0_4px_rgba(253,203,2,0.1)] transition-all duration-300 flex items-center p-1.5"
              >
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe aquí..." 
                  className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-black placeholder:text-neutral-400 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    input.trim() 
                      ? 'bg-[#FDCB02] text-black hover:scale-110 hover:shadow-lg' 
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp size={18} strokeWidth={3} />
                </button>
              </form>
              <div className="text-center mt-2">
                <p className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest">Powered by Coyote AI</p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TRIGGER BUTTON (PULSING) --- */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-[3px] border-white ${isOpen ? 'bg-black rotate-180' : 'bg-[#FDCB02]'}`}>
          {isOpen ? (
            <X size={28} className="text-white" />
          ) : (
            <MessageSquare size={28} className="text-black fill-black" />
          )}
        </div>
        
        {/* Anillos de pulsación */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#FDCB02] opacity-20 animate-ping duration-1000"></span>
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}