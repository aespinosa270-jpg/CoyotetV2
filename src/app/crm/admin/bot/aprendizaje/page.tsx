/**
 * Página: Aprendizaje semanal del bot.
 *
 * Muestra:
 *  - Reglas aprendidas (toggle activa/inactiva, borrar)
 *  - Historial de análisis semanales
 *  - Botón para correr análisis manual (sin esperar viernes)
 */
import LearningClient from "./_components/LearningClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AprendizajePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Auto-mejora
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          APRENDIZAJE <span className="text-[#FDCB02]">🧠</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Reglas que el bot ha aprendido del análisis automatizado semanal (viernes 18:00 CDMX).
          Las reglas activas se inyectan al system prompt en CADA conversación.
        </p>
      </header>
      <LearningClient />
    </div>
  );
}