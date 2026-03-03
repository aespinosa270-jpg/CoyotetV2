import React from "react";
import ZadarmaWidget from "@/components/ui/ZadarmaWidget";

export default function CRMRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black">
      {/* Todo el contenido (Admin o Agentes) se carga aquí adentro */}
      {children}
      
      {/* Teléfono WebRTC Global e inamovible */}
      <ZadarmaWidget />
    </div>
  );
}