import React from "react";
import ZadarmaWidget from "@/components/ui/ZadarmaWidget";

export default function CRMRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 🏢 FONDO BLANCO/GRIS CLARO, TEXTO NEGRO, SELECCIÓN AMARILLA
    <div className="bg-[#F8F9FA] min-h-screen text-black font-sans selection:bg-[#FDCB02] selection:text-black">
      
      {/* Todo el contenido (Admin o Agentes) se carga aquí adentro */}
      {children}
      
      {/* Teléfono WebRTC Global e inamovible */}
      <ZadarmaWidget />
      
    </div>
  );
}