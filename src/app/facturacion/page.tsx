import BillingForm from "@/components/billing/billing-form"
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react"

// SEO y Metadata para la página
export const metadata = {
  title: 'Facturación 4.0 | COYOTE TEXTIL',
  description: 'Portal de solicitud de comprobantes fiscales CFDI 4.0 para socios de Coyote Textil.',
}

export default function FacturacionPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#FDCB02] selection:text-black py-12 lg:py-20 relative overflow-hidden">
      
      {/* Fondo con textura sutil o gradiente para profundidad */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FDCB02]/5 blur-[150px] pointer-events-none" />

      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 relative z-10">
        
        {/* ENCABEZADO AGRESIVO */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-[#FDCB02] animate-pulse" />
            <span className="text-[10px] font-black text-[#FDCB02] uppercase tracking-[0.3em]">Módulo Fiscal Activo</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-[1000] uppercase italic tracking-tighter leading-none mb-6">
            PORTAL DE <br className="hidden lg:block"/> FACTURACIÓN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDCB02] to-yellow-600">4.0</span>
          </h1>
          <p className="text-neutral-400 text-sm font-bold tracking-widest uppercase leading-relaxed max-w-2xl">
            Sistema de emisión de comprobantes fiscales. Por disposición oficial del SAT, los datos deben coincidir exactamente con tu Constancia de Situación Fiscal actualizada.
          </p>
        </div>

        {/* REGLAS DE OPERACIÓN (Grid de advertencias) */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          
          <div className="bg-[#111] border border-white/10 p-5 flex flex-col gap-3 hover:border-[#FDCB02]/50 transition-colors">
            <ShieldCheck size={24} className="text-[#FDCB02]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Validación Estricta</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">Sin régimen de capital (Ej. SA DE CV). Todo en mayúsculas.</p>
          </div>
          
          <div className="bg-[#111] border border-white/10 p-5 flex flex-col gap-3 hover:border-[#FDCB02]/50 transition-colors">
            <Clock size={24} className="text-[#FDCB02]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">SLA de Entrega</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">Procesamiento manual. Timbrado y envío en un máximo de 24 horas.</p>
          </div>
          
          <div className="bg-[#111] border border-white/10 p-5 flex flex-col gap-3 hover:border-[#FDCB02]/50 transition-colors">
            <AlertTriangle size={24} className="text-[#FDCB02]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Cierre de Mes</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">Solo facturamos compras del mes en curso. Cierre fiscal el día 30/31.</p>
          </div>

        </div>

        {/* COMPONENTE DEL FORMULARIO (Client Component) */}
        {/* Asegúrate de que la ruta de importación coincida con donde guardaste el formulario */}
        <BillingForm />

      </div>
    </main>
  )
}