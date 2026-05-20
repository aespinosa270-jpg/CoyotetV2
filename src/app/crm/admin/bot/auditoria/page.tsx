/**
 * Página: Auditoría / Logs del Bot.
 *
 * Muestra los últimos eventos críticos del bot (errores, escalaciones,
 * cobros, mensajes, vision, objeciones, etc.) en tiempo real con
 * auto-refresh cada 15s.
 */
import AuditClient from "./_components/AuditClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Observabilidad
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          AUDITORÍA <span className="text-[#FDCB02]">📋</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Últimos eventos del bot en tiempo real. Útil para debug rápido cuando algo falla.
        </p>
      </header>

      <AuditClient />
    </div>
  );
}