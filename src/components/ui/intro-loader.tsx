"use client"

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function IntroLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // 1. Detectar si estamos en el Home
    const isHome = pathname === "/";
    
    // 2. LÓGICA MODIFICADA:
    // Ya no verificamos sessionStorage. 
    // Si NO es el home, lo ocultamos y liberamos scroll.
    if (!isHome) {
      setIsVisible(false);
      document.body.style.overflow = "auto";
      return;
    }

    // 3. SI ES HOME:
    // Forzamos la visibilidad (por si vienes de otra página) y bloqueamos scroll.
    setIsVisible(true);
    document.body.style.overflow = "hidden";

    // 4. SEGURIDAD: Timeout de 6 segundos por si el video falla
    const safetyTimer = setTimeout(() => {
      handleVideoComplete();
    }, 6000); // Le di un segundo extra por si acaso

    return () => clearTimeout(safetyTimer);
  }, [pathname]);

  const handleVideoComplete = () => {
    // Ocultamos el loader
    setIsVisible(false);
    // Reactivamos el scroll
    document.body.style.overflow = "auto";
    // ELIMINADO: Ya no guardamos nada en sessionStorage
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Fondo negro de seguridad */}
          <div className="absolute inset-0 bg-black -z-10" />

          <video
            src="/i-coyote.mp4" 
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleVideoComplete}
            onError={(e) => {
                console.error("Error al cargar el video intro", e);
                handleVideoComplete(); 
            }}
          />
          
          {/* Botón para saltar intro */}
          <button 
            onClick={handleVideoComplete}
            className="absolute bottom-12 right-8 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] border border-white/10 hover:border-white px-5 py-2 rounded-full transition-all z-50 backdrop-blur-sm"
          >
            Saltar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}