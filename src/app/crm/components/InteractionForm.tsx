'use client';

import React, { useState } from 'react';

// Le pasamos el ID del cliente al que le estamos registrando la llamada
export default function InteractionForm({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      userId: clientId,
      type: formData.get('type'),
      pipelineStatus: formData.get('pipelineStatus'),
      summary: formData.get('summary'),
      nextFollowUp: formData.get('nextFollowUp'),
    };

    try {
      const res = await fetch('/api/crm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSuccess(true);
        e.currentTarget.reset(); // Limpiamos el formulario
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-zinc-800 p-5 rounded-lg text-white">
      <h3 className="text-yellow-500 font-bold mb-4 uppercase tracking-wider">
        🎙️ Registrar Actividad
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Tipo de Contacto */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Medio de Contacto</label>
            <select name="type" required className="w-full bg-black border border-zinc-700 rounded p-2 text-sm focus:border-yellow-500 outline-none">
              <option value="LLAMADA">📞 Llamada</option>
              <option value="WHATSAPP">💬 WhatsApp</option>
              <option value="CORREO">✉️ Correo</option>
              <option value="PRESENCIAL">🤝 Presencial</option>
            </select>
          </div>

          {/* Estatus del Embudo (Ventas) */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Estatus de Venta</label>
            <select name="pipelineStatus" required className="w-full bg-black border border-zinc-700 rounded p-2 text-sm focus:border-yellow-500 outline-none">
              <option value="PROSPECTO">🎯 Prospecto</option>
              <option value="COTIZANDO">📝 Cotizando</option>
              <option value="NEGOCIACION">⚖️ Negociación</option>
              <option value="CERRADO_GANADO">💰 Cerrado / Ganado</option>
              <option value="CERRADO_PERDIDO">❌ Cerrado / Perdido</option>
            </select>
          </div>
        </div>

        {/* Resumen de la llamada */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Resumen / Notas</label>
          <textarea 
            name="summary" 
            required 
            rows={3} 
            placeholder="Ej: Le interesan 5 rollos de Polar. Quedé de confirmarle existencias..."
            className="w-full bg-black border border-zinc-700 rounded p-2 text-sm focus:border-yellow-500 outline-none resize-none"
          ></textarea>
        </div>

        {/* Próximo seguimiento */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Siguiente Seguimiento (Opcional)</label>
          <input 
            type="datetime-local" 
            name="nextFollowUp" 
            className="w-full bg-black border border-zinc-700 rounded p-2 text-sm focus:border-yellow-500 outline-none"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Registro'}
        </button>

        {success && (
          <p className="text-green-500 text-xs text-center mt-2">✅ ¡Actividad registrada en la bóveda!</p>
        )}
      </form>
    </div>
  );
}