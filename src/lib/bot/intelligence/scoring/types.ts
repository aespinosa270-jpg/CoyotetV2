/**
 * Tipos del módulo de lead scoring.
 *
 * El score se calcula en cada turno del bot y se persiste en el perfil.
 * Categorías mutuamente excluyentes (un cliente es UNA cosa a la vez).
 */

export type LeadCategory =
  | "hot"        // Intención fuerte de compra inmediata
  | "vip"        // Alto volumen (maquila, empresa, 300+ kg)
  | "premium"    // Compra previa, buen ticket, busca calidad
  | "precio"     // Sensible al precio, regatea
  | "casual"    // Está cotizando, sin intención fuerte
  | "frio"       // Sin actividad reciente (30+ días)
  | "curioso";   // Pregunta pero no compromete

export const LEAD_LABELS: Record<LeadCategory, string> = {
  hot: "🔥 Hot",
  vip: "💎 VIP",
  premium: "💰 Premium",
  precio: "💸 Precio",
  casual: "🤷 Casual",
  frio: "❄️ Frío",
  curioso: "👀 Curioso",
};

export const LEAD_COLORS: Record<LeadCategory, string> = {
  hot: "bg-red-100 text-red-800 border-red-300",
  vip: "bg-purple-100 text-purple-800 border-purple-300",
  premium: "bg-amber-100 text-amber-800 border-amber-300",
  precio: "bg-blue-100 text-blue-800 border-blue-300",
  casual: "bg-slate-100 text-slate-700 border-slate-300",
  frio: "bg-cyan-100 text-cyan-800 border-cyan-300",
  curioso: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export const LEAD_PRIORITY: Record<LeadCategory, number> = {
  hot: 100,
  vip: 95,
  premium: 80,
  precio: 60,
  casual: 40,
  curioso: 30,
  frio: 10,
};

export type TipoNegocio =
  | "maquila"
  | "taller"
  | "revendedor"
  | "empresa"
  | "uniformes"
  | "consumidor"
  | "desconocido";

export interface LeadScoreResult {
  categoria: LeadCategory;
  score: number; // 0-100
  razones: string[]; // por qué se asignó esa categoría
}

export interface EnrichmentResult {
  patches: Partial<{
    tipoNegocio: TipoNegocio;
    volumenTipicoKg: number;
    coloresFavoritos: string[];
    presupuestoAprox: number;
  }>;
  detected: string[]; // qué señales se detectaron
}