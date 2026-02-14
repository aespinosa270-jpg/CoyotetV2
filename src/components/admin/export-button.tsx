'use client'

import { LayoutDashboard } from "lucide-react"
import { useState } from "react"

export default function ExportButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/export')
      
      if (!response.ok) throw new Error("Error en la descarga")
      
      // Convertimos la respuesta a un Blob (archivo binario)
      const blob = await response.blob()
      
      // Creamos un enlace invisible para forzar la descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Coyote_Textil_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Fallo al descargar:", error)
      alert("Hubo un error al generar el reporte.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleExport}
      disabled={loading}
      className="h-14 px-8 bg-white text-black hover:bg-[#FDCB02] hover:scale-105 rounded-xl flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(253,203,2,0.4)] disabled:opacity-50"
    >
      <LayoutDashboard size={18} /> {loading ? "Extrayendo..." : "Extraer Reporte"}
    </button>
  )
}