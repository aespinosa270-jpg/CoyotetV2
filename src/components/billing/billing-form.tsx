"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { CheckCircle2, Send, FileText, AlertCircle } from "lucide-react"

type FacturacionData = {
  razonSocial: string;
  rfc: string;
  cp: string;
  regimen: string;
  pedido: string;
  email: string;
}

export default function BillingForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const { register, handleSubmit, formState: { errors } } = useForm<FacturacionData>()

  const onSubmit = async (data: FacturacionData) => {
    setStatus('sending')
    
    // Forzamos mayúsculas antes de mandar al backend (Requisito estricto SAT 4.0)
    const payload = {
      ...data,
      razonSocial: data.razonSocial.toUpperCase().trim(),
      rfc: data.rfc.toUpperCase().trim(),
      pedido: data.pedido.toUpperCase().trim(),
    }

    try {
      const response = await fetch('/api/facturacion/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error("Error al enviar la solicitud:", error)
      setStatus('error')
    }
  }

  // --- RENDER DE ÉXITO ---
  if (status === 'success') {
    return (
      <div className="bg-[#050505] border-2 border-[#FDCB02] p-12 max-w-3xl mx-auto text-center animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(253,203,2,0.15)] relative overflow-hidden">
        <div className="flex justify-center mb-6 relative z-10">
          <div className="bg-[#FDCB02] p-4 rounded-sm">
            <CheckCircle2 size={48} className="text-black" strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-4xl font-[1000] text-white italic uppercase mb-4 tracking-tighter relative z-10">
          SOLICITUD RECIBIDA
        </h2>
        <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs leading-relaxed mb-8 relative z-10">
          Tu información fiscal ha sido ingresada a nuestra cola de procesamiento. <br/> 
          <span className="text-white block mt-2 text-sm border-l-2 border-[#FDCB02] pl-3 inline-block">Recibirás el CFDI 4.0 y XML en tu correo en un lapso máximo de 24 horas.</span>
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="border border-white/20 text-white px-8 py-4 text-[11px] font-[1000] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all relative z-10"
        >
          VOLVER AL TABLERO
        </button>
      </div>
    )
  }

  // --- RENDER DEL FORMULARIO ---
  return (
    <div className="bg-[#050505] border border-white/10 p-6 lg:p-10 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
      <div className="absolute top-[-5%] right-[-5%] p-4 opacity-5 pointer-events-none">
        <FileText size={200} className="text-white" />
      </div>

      <header className="mb-10 border-b border-white/10 pb-6">
        <h2 className="text-2xl lg:text-3xl font-[1000] text-[#FDCB02] italic uppercase tracking-tighter">
          CAPTURA DE DATOS FISCALES
        </h2>
        <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
          Ingresa la información idéntica a tu Constancia de Situación Fiscal
        </p>
      </header>
      
      {status === 'error' && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 flex items-center gap-3 text-red-500 text-[11px] font-bold uppercase tracking-widest">
          <AlertCircle size={16} /> Error de conexión. Intenta enviar de nuevo o contacta a soporte.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 relative z-10">
        
        <div className="col-span-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            Razón Social <span className="text-red-500">*</span>
          </label>
          <input 
            {...register("razonSocial", { required: true })} 
            className={`w-full bg-[#111] border ${errors.razonSocial ? 'border-red-500' : 'border-white/10'} p-4 text-white font-bold uppercase focus:border-[#FDCB02] outline-none transition-all`} 
            placeholder="EJ: COYOTE TEXTIL (SIN SA DE CV)" 
          />
          {errors.razonSocial && <span className="text-red-500 text-[9px] font-bold uppercase mt-1 block">Requerido</span>}
        </div>

        <div>
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            RFC <span className="text-red-500">*</span>
          </label>
          <input 
            {...register("rfc", { required: true, pattern: /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/i })} 
            className={`w-full bg-[#111] border ${errors.rfc ? 'border-red-500' : 'border-white/10'} p-4 text-white font-bold uppercase focus:border-[#FDCB02] outline-none transition-all`} 
            placeholder="XAXX010101000" 
          />
          {errors.rfc && <span className="text-red-500 text-[9px] font-bold uppercase mt-1 block">Formato de RFC inválido</span>}
        </div>

        <div>
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            C.P. Fiscal <span className="text-red-500">*</span>
          </label>
          <input 
            {...register("cp", { required: true, minLength: 5, maxLength: 5, pattern: /^[0-9]+$/ })} 
            className={`w-full bg-[#111] border ${errors.cp ? 'border-red-500' : 'border-white/10'} p-4 text-white font-bold uppercase focus:border-[#FDCB02] outline-none transition-all`} 
            placeholder="06000" 
            maxLength={5}
          />
          {errors.cp && <span className="text-red-500 text-[9px] font-bold uppercase mt-1 block">Debe ser de 5 dígitos</span>}
        </div>

        <div className="col-span-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            Régimen Fiscal <span className="text-red-500">*</span>
          </label>
          <select 
            {...register("regimen", { required: true })} 
            className="w-full bg-[#111] border border-white/10 p-4 text-white font-bold uppercase focus:border-[#FDCB02] outline-none appearance-none cursor-pointer"
          >
            <option value="601">601 - General de Ley Personas Morales</option>
            <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
            <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
            <option value="606">606 - Arrendamiento</option>
            <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
            <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            Nº de Pedido <span className="text-red-500">*</span>
          </label>
          <input 
            {...register("pedido", { required: true })} 
            className={`w-full bg-[#111] border ${errors.pedido ? 'border-red-500' : 'border-white/10'} p-4 text-[#FDCB02] font-black uppercase focus:border-[#FDCB02] outline-none transition-all`} 
            placeholder="COY-XXXX" 
          />
        </div>

        <div className="col-span-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
            Correo para Envío <span className="text-red-500">*</span>
          </label>
          <input 
            type="email"
            {...register("email", { required: true, pattern: /^\S+@\S+$/i })} 
            className={`w-full bg-[#111] border ${errors.email ? 'border-red-500' : 'border-white/10'} p-4 text-white font-bold uppercase focus:border-[#FDCB02] outline-none transition-all`} 
            placeholder="ADMIN@EMPRESA.COM" 
          />
        </div>

        <button 
          disabled={status === 'sending'}
          type="submit"
          className="col-span-2 mt-4 bg-[#FDCB02] text-black font-[1000] py-5 uppercase tracking-[0.3em] hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? 'PROCESANDO DATOS...' : <>CONFIRMAR SOLICITUD <Send size={18} strokeWidth={3}/></>}
        </button>
      </form>
    </div>
  )
}