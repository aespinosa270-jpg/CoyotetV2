"use client"

import { MessageCircle } from "lucide-react"

export default function WhatsAppButton() {
  // Número de contacto directo actualizado
  const phoneNumber = "525573799162" 
  const message = "Hola Coyote Textil, me interesa solicitar una cotización por rollo. ¿Me podrían apoyar?"
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[60] bg-[#FDCB02] text-black p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(253,203,2,0.5)] hover:scale-110 hover:bg-black hover:text-[#FDCB02] transition-all duration-300 group"
      aria-label="Contactar por WhatsApp"
    >
      <div className="flex items-center gap-3">
        {/* Texto que aparece solo al hacer hover */}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
          Ventas Mayoreo
        </span>
        <MessageCircle className="w-6 h-6 fill-current" />
      </div>
    </a>
  )
}