/**
 * Determina si "ahora mismo" es hora silenciosa (NO mandar follow-ups).
 *
 * Reglas:
 *  - Horario hábil: lunes a sábado de 10:00 a 19:00 CDMX (UTC-6)
 *  - Fuera de eso: NO molestar
 *
 * NOTA: Vercel cron corre en UTC. La función calcula la hora CDMX
 * sumando -6h al UTC actual.
 */

export function isQuietHour(now: Date = new Date()): boolean {
  // Hora en CDMX (UTC-6)
  const cdmxOffsetMs = -6 * 60 * 60 * 1000;
  const cdmxTime = new Date(now.getTime() + cdmxOffsetMs);
  const hour = cdmxTime.getUTCHours();
  const day = cdmxTime.getUTCDay(); // 0=domingo, 6=sábado

  // Domingo siempre silencio
  if (day === 0) return true;

  // Lunes-sábado: solo 10am-7pm (10 <= h < 19)
  if (hour < 10 || hour >= 19) return true;

  return false;
}