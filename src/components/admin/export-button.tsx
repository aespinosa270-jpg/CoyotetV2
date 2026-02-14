"use client"

import { useState } from "react"
import { Loader2, FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
const formatNumber = (num: number) => 
  new Intl.NumberFormat('es-MX').format(num)

export default function ExportButton({ data }: { data?: any }) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = async () => {
    if (!data || !data.recentOrders) {
      alert("Error: No hay datos comerciales para exportar. Verifica que la página Admin esté pasando los datos.");
      return;
    }
    
    setIsExporting(true)
    
    try {
      const doc = new jsPDF()

      // HEADER: MEMBRETADO COYOTE B2B
      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, 210, 45, 'F') 
      
      doc.setFillColor(253, 203, 2)
      doc.rect(0, 45, 210, 2, 'F') 

      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bolditalic")
      doc.setFontSize(32)
      doc.text("COYOTE.", 15, 30)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(253, 203, 2)
      doc.text("REPORTE OPERATIVO B2B", 195, 22, { align: "right" })
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(200, 200, 200)
      const ceoName = data.ceoName || "CEO"
      doc.text(`CONFIDENCIAL - AUTORIZACIÓN: ${ceoName.toUpperCase()}`, 195, 30, { align: "right" })
      doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`, 195, 36, { align: "right" })

      // SECCIÓN 1: RESUMEN EJECUTIVO
      let startY = 65

      doc.setTextColor(10, 10, 10)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("RESUMEN EJECUTIVO MACRO", 15, startY)

      startY += 10
      doc.setFillColor(245, 245, 245)
      doc.rect(15, startY, 85, 25, 'F') 
      doc.rect(110, startY, 85, 25, 'F') 

      doc.setFontSize(9)
      doc.setTextColor(40, 40, 40)
      doc.text("LIQUIDEZ / CAPITAL GENERADO", 20, startY + 8)
      doc.setFontSize(18)
      doc.setTextColor(10, 10, 10)
      doc.text(formatMoney(data.globalRevenue || 0), 20, startY + 18)

      doc.setFontSize(9)
      doc.setTextColor(40, 40, 40)
      doc.text("NODOS B2B ACTIVOS (USUARIOS)", 115, startY + 8)
      doc.setFontSize(18)
      doc.setTextColor(10, 10, 10)
      doc.text(formatNumber(data.totalUsers || 0), 115, startY + 18)

      // SECCIÓN 2: PIPELINE LOGÍSTICO
      startY += 40
      doc.setFontSize(16)
      doc.text("ESTADO DEL PIPELINE LOGÍSTICO", 15, startY)
      
      startY += 10
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)
      
      doc.text(`Órdenes Totales Registradas: ${formatNumber(data.totalOrders || 0)}`, 15, startY)
      doc.text(`Promedio de Transacción (AOV): ${formatMoney(data.averageOrderValue || 0)}`, 15, startY + 7)
      
      doc.text(`En Cola (Pendientes): ${formatNumber(data.pendingCount || 0)}`, 110, startY)
      doc.text(`Procesando / En Tránsito: ${formatNumber(data.processingCount || 0)}`, 110, startY + 7)
      doc.text(`Operaciones Finalizadas: ${formatNumber(data.completedCount || 0)}`, 110, startY + 14)

      // SECCIÓN 3: TABLA AUTOGENERADA (Bypass de TS con as any)
      startY += 30
      doc.setFontSize(16)
      doc.setTextColor(10, 10, 10)
      doc.text("LEDGER FINANCIERO (Últimas Operaciones)", 15, startY)

      const tableData = data.recentOrders.map((o: any) => [
        String(o.id || "").substring(0,8).toUpperCase(),
        o.customer || "Socio B2B",
        o.date || "N/A",
        o.status || "N/A",
        formatMoney(o.total || 0)
      ])

      // Usamos as any para que TypeScript no pelee con las propiedades internas del plugin
      ;(autoTable as any)(doc, {
        startY: startY + 8,
        head: [['HASH (ID)', 'SOCIO B2B', 'FECHA', 'ESTADO', 'VOLUMEN']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [10, 10, 10],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left'
        },
        bodyStyles: {
          textColor: [40, 40, 40],
          fontSize: 9,
          lineColor: [220, 220, 220],
          lineWidth: { bottom: 0.1 }
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          4: { halign: 'right', fontStyle: 'bold' } 
        },
        margin: { left: 15, right: 15 }
      })

      // FOOTER CONFIDENCIAL
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont("helvetica", "italic")
      doc.text("Coyote Textil - Reporte Autogenerado por Consola CEO. Documento de carácter estrictamente confidencial.", 105, 285, { align: "center" })

      // DESCARGA FÍSICA
      doc.save(`Coyote_Reporte_Maestro_${new Date().toISOString().split('T')[0]}.pdf`)

    } catch (error) {
      console.error("Error crítico generando PDF:", error)
      alert("Error al generar el documento. Revisa la consola.")
    } finally {
      setIsExporting(false) 
    }
  }

  return (
    <button 
      onClick={handleExportPDF}
      disabled={isExporting}
      className="h-14 px-6 md:px-8 bg-[#FDCB02] hover:bg-white text-black rounded-xl flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(253,203,2,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      {isExporting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Generando...</span>
        </>
      ) : (
        <>
          <FileText size={18} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          <span>Extraer Reporte PDF</span>
        </>
      )}
    </button>
  )
}