import { AlertTriangle, ShieldCheck, Zap, Smartphone, FileCheck, Ban } from "lucide-react"

// SEO y Metadata para la página
export const metadata = {
  title: 'Facturación 4.0 | COYOTE TEXTIL',
  description: 'Políticas y proceso de emisión de comprobantes fiscales CFDI 4.0 automatizados para socios de Coyote Textil.',
}

export default function FacturacionPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#FDCB02] selection:text-black py-12 lg:py-20 relative overflow-hidden">
      
      {/* Fondo con textura sutil o gradiente para profundidad */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FDCB02]/5 blur-[150px] pointer-events-none" />

      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 relative z-10">
        
        {/* ENCABEZADO AGRESIVO */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-[#FDCB02] animate-pulse" />
            <span className="text-[10px] font-black text-[#FDCB02] uppercase tracking-[0.3em]">Protocolo Fiscal 4.0</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-[1000] uppercase italic tracking-tighter leading-none mb-6">
            POLÍTICA DE <br className="hidden lg:block"/> FACTURACIÓN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDCB02] to-yellow-600">AUTOMATIZADA</span>
          </h1>
          <p className="text-neutral-400 text-sm font-bold tracking-widest uppercase leading-relaxed max-w-2xl">
            En Coyote Textil operamos bajo un ecosistema 100% digital. La emisión de comprobantes fiscales (CFDI 4.0) está estrictamente condicionada a la liquidación total de la orden.
          </p>
        </div>

        {/* REGLAS DE OPERACIÓN (Grid de advertencias) */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          
          <div className="bg-[#111] border border-[#FDCB02]/20 p-6 flex flex-col gap-3">
            <Ban size={28} className="text-[#FDCB02]" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Sin Pago No Hay CFDI</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">
              Por cumplimiento legal, las facturas se timbran exclusivamente al confirmar el ingreso en firme a través de OpenPay (Tarjeta, SPEI o Efectivo).
            </p>
          </div>
          
          <div className="bg-[#111] border border-white/10 p-6 flex flex-col gap-3">
            <Zap size={28} className="text-[#FDCB02]" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Timbrado en Tiempo Real</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">
              Cero esperas. Nuestro sistema se conecta directo al SAT milisegundos después de tu pago para generar tus archivos PDF y XML al instante.
            </p>
          </div>
          
          <div className="bg-[#111] border border-white/10 p-6 flex flex-col gap-3">
            <ShieldCheck size={28} className="text-[#FDCB02]" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Validación SAT Estricta</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">
              Tus datos deben coincidir 100% con tu Constancia de Situación Fiscal. Letras mayúsculas, sin régimen de capital (Ej. SA DE CV) y CP exacto.
            </p>
          </div>

        </div>

        {/* CÓMO FUNCIONA EL PROCESO */}
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 p-8 lg:p-12">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">¿Cómo recibir tu factura?</h2>
            <div className="w-16 h-1 bg-[#FDCB02] mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Línea conectora visual (solo desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-white/10 -translate-y-1/2 z-0" />

            {/* Paso 1 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#FDCB02]/30 flex items-center justify-center text-[#FDCB02]">
                <span className="font-black text-xl italic">01</span>
              </div>
              <div>
                <h4 className="font-black uppercase tracking-widest text-sm mb-1">Solicítala al Asesor</h4>
                <p className="text-xs text-neutral-400 font-medium">
                  Al iniciar tu pedido por WhatsApp o Web, indícale al bot o asesor que requerirás factura y proporciona tus datos.
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#FDCB02]/30 flex items-center justify-center text-[#FDCB02]">
                <span className="font-black text-xl italic">02</span>
              </div>
              <div>
                <h4 className="font-black uppercase tracking-widest text-sm mb-1">Liquida tu Orden</h4>
                <p className="text-xs text-neutral-400 font-medium">
                  Realiza el pago a través del link seguro, CLABE SPEI o referencia de tienda. El sistema detectará el ingreso.
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#FDCB02] text-black flex items-center justify-center shadow-[0_0_30px_rgba(253,203,2,0.2)]">
                <Smartphone size={28} />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-widest text-[#FDCB02] text-sm mb-1">Recibe por WhatsApp</h4>
                <p className="text-xs text-neutral-400 font-medium">
                  En cuanto el pago se refleje, el Bot te enviará automáticamente tus archivos fiscales directo a tu chat.
                </p>
              </div>
            </div>

          </div>

          {/* Warning Box Final */}
          <div className="mt-12 bg-red-950/20 border border-red-500/20 p-5 rounded-sm flex gap-4 items-start">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div>
              <h5 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-1">Aviso Importante de Cierre Fiscal</h5>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Solo facturamos compras correspondientes al mes en curso. Si tu pago se refleja el día 1 del mes siguiente, la factura saldrá con fecha del nuevo mes. Asegúrate de proporcionar los datos correctamente, no hay refacturaciones por errores del cliente.
              </p>
            </div>
          </div>

        </div>

      </div>
    </main>
  )
}