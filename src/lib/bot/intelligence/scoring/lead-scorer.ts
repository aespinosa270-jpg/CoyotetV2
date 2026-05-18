/**
 * Calculadora de lead score.
 *
 * Examina el último mensaje del cliente + estado histórico del perfil
 * y produce una categoría + score 0-100.
 *
 * Reglas de precedencia (un solo veredicto):
 *  1. Si detecta intención FUERTE de cierre → hot
 *  2. Si detecta señales VIP (volumen / maquila / empresa) → vip
 *  3. Si totalCompras >= 2 y montoAcumulado alto → premium
 *  4. Si detecta sensibilidad a precio → precio
 *  5. Si inactivo 30+ días → frio
 *  6. Si pregunta info sin compromiso → curioso
 *  7. Default → casual
 */
import type { ClientePerfil } from "../../types/domain";
import type { LeadCategory, LeadScoreResult } from "./types";

// ─── Keywords ──────────────────────────────────────────────────────────────

const HOT_PATTERNS: RegExp[] = [
  /\b(d[oó]nde\s+pago|m[aá]ndame?\s+(el\s+)?link|p[aá]same?\s+(el\s+)?link)\b/i,
  /\b(me\s+(lo|los?)\s+llevo|s[ií]\s+(dale|me\s+interesa)|s[ií]\s+m[aá]ndame|ok\s+dale)\b/i,
  /\b(mu[eé]strame?\s+c[oó]mo\s+(le\s+hago|pagar?)|c[oó]mo\s+le\s+hago)\b/i,
  /\b(cu[aá]nto\s+tarda|cu[aá]ndo\s+llega|fecha\s+de\s+entrega)\b/i,
  /\b(c[uú]enta|datos\s+(de|para)\s+(pago|transferencia)|spei)\b/i,
];

const VIP_PATTERNS: RegExp[] = [
  /\b(maquila|taller|f[aá]brica|f[aá]bric[oa])\b/i,
  /\b(producci[oó]n\s+(semanal|mensual|constante)|siempre\s+necesito)\b/i,
  /\b(uniformes?\s+(para\s+)?(empresa|escuela|equipo|deportivos?))\b/i,
  /\b(revendedor|mayorista|distribuidor)\b/i,
  /\b(empresa|negocio|tienda)\b/i,
];

const PRECIO_PATTERNS: RegExp[] = [
  /\b(muy\s+caro|est[aá]\s+caro|carito)\b/i,
  /\b(m[aá]s\s+barato|m[aá]s\s+econ[oó]mico|alguna?\s+oferta|descuento)\b/i,
  /\b(encontr[eé]\s+(m[aá]s\s+barato|otro\s+precio)|otra\s+marca\s+cuesta)\b/i,
  /\b(presupuesto\s+(ajustad|limitad|corto)|no\s+me\s+alcanza)\b/i,
];

const CURIOSO_PATTERNS: RegExp[] = [
  /\b(solo\s+(estoy\s+)?(cotizand|preguntand|viendo)|nada?\s+m[aá]s\s+pregunto)\b/i,
  /\b(quiz[aá]s?\s+(despu[eé]s|m[aá]s\s+adelante)|para\s+despu[eé]s)\b/i,
  /\b(d[eé]jame?\s+(pensarlo|verlo|consultarlo))\b/i,
];

// Volumen alto (300+ kg explicito)
const HIGH_VOLUME_PATTERN = /\b(\d{3,})\s*(kg|kilos?)\b/i;
const HIGH_VOLUME_THRESHOLD = 200; // 200+ kg ya es vip

// ─── Detectores ────────────────────────────────────────────────────────────

function detectHot(text: string): { match: boolean; reason?: string } {
  for (const p of HOT_PATTERNS) {
    const m = p.exec(text);
    if (m) return { match: true, reason: `Intención cierre: "${m[0]}"` };
  }
  return { match: false };
}

function detectVip(text: string): { match: boolean; reason?: string } {
  // Volumen explícito alto
  const volMatch = HIGH_VOLUME_PATTERN.exec(text);
  if (volMatch) {
    const kg = parseInt(volMatch[1], 10);
    if (kg >= HIGH_VOLUME_THRESHOLD) {
      return { match: true, reason: `Volumen ${kg} kg mencionado` };
    }
  }

  // Keywords VIP
  for (const p of VIP_PATTERNS) {
    const m = p.exec(text);
    if (m) return { match: true, reason: `Negocio: "${m[0]}"` };
  }
  return { match: false };
}

function detectPrecio(text: string): { match: boolean; reason?: string } {
  for (const p of PRECIO_PATTERNS) {
    const m = p.exec(text);
    if (m) return { match: true, reason: `Objeción precio: "${m[0]}"` };
  }
  return { match: false };
}

function detectCurioso(text: string): { match: boolean; reason?: string } {
  for (const p of CURIOSO_PATTERNS) {
    const m = p.exec(text);
    if (m) return { match: true, reason: `Sin compromiso: "${m[0]}"` };
  }
  return { match: false };
}

function isFrio(perfil: ClientePerfil): { match: boolean; reason?: string } {
  if (!perfil.ultimoContacto) return { match: false };
  const ultimoMs = new Date(perfil.ultimoContacto).getTime();
  const diasInactivo = (Date.now() - ultimoMs) / (1000 * 60 * 60 * 24);
  if (diasInactivo >= 30) {
    return {
      match: true,
      reason: `Inactivo ${Math.round(diasInactivo)} días`,
    };
  }
  return { match: false };
}

function isPremium(perfil: ClientePerfil): { match: boolean; reason?: string } {
  const totalCompras = perfil.totalCompras ?? 0;
  const monto = perfil.montoAcumulado ?? 0;
  if (totalCompras >= 2 && monto >= 5000) {
    return {
      match: true,
      reason: `${totalCompras} compras · $${monto.toLocaleString("es-MX")} acumulado`,
    };
  }
  return { match: false };
}

// ─── Scorer maestro ────────────────────────────────────────────────────────

export function scoreLead(
  perfil: ClientePerfil,
  userText: string
): LeadScoreResult {
  const razones: string[] = [];

  // 1. Hot (cierre inminente) — prioridad máxima
  const hot = detectHot(userText);
  if (hot.match) {
    razones.push(hot.reason!);
    return { categoria: "hot", score: 95, razones };
  }

  // 2. VIP (volumen/empresa)
  const vip = detectVip(userText);
  if (vip.match) {
    razones.push(vip.reason!);
    // Si además tiene historial → score más alto
    const totalCompras = perfil.totalCompras ?? 0;
    const score = totalCompras >= 1 ? 95 : 85;
    return { categoria: "vip", score, razones };
  }

  // 3. Premium (cliente con historial bueno)
  const premium = isPremium(perfil);
  if (premium.match) {
    razones.push(premium.reason!);
    return { categoria: "premium", score: 75, razones };
  }

  // 4. Sensible a precio
  const precio = detectPrecio(userText);
  if (precio.match) {
    razones.push(precio.reason!);
    return { categoria: "precio", score: 55, razones };
  }

  // 5. Curioso (sin compromiso)
  const curioso = detectCurioso(userText);
  if (curioso.match) {
    razones.push(curioso.reason!);
    return { categoria: "curioso", score: 30, razones };
  }

  // 6. Frío (inactivo)
  const frio = isFrio(perfil);
  if (frio.match) {
    razones.push(frio.reason!);
    return { categoria: "frio", score: 15, razones };
  }

  // 7. Default: casual
  razones.push("Sin señales fuertes detectadas");
  return { categoria: "casual", score: 40, razones };
}

/**
 * Devuelve instrucciones tácticas en string para inyectar al system prompt.
 * El bot adapta su comportamiento según la categoría.
 */
export function buildTacticBlock(result: LeadScoreResult): string {
  const tacticas: Record<LeadCategory, string> = {
    hot: `🔥 LEAD HOT — Cliente listo para cerrar. NO sigas perfilando. Pide únicamente lo que falte (nombre/email/CP) y genera el cobro YA. Mensaje corto y directo.`,

    vip: `💎 LEAD VIP — Cliente de alto valor (maquila/empresa/volumen). Tono profesional y directo. Enfatiza: precio mayoreo, continuidad de stock, atención prioritaria. Ofrece membresía si aplica. Pide nombre+email+empresa antes de cotizar formalmente.`,

    premium: `💰 LEAD PREMIUM — Cliente con historial bueno. Tono cálido pero profesional. Enfatiza calidad, exclusividad. Menciona telas premium del catálogo (Alaska, Apolo, Kyoto). Recuerda compras previas si es relevante.`,

    precio: `💸 LEAD SENSIBLE A PRECIO — Cliente regatea o objeta el costo. Reconoce su preocupación SIN bajar precio inmediatamente. Menciona: precio mayoreo por volumen, opciones más económicas del catálogo, valor por kilo/rendimiento. NO suenes desesperado.`,

    casual: `🤷 LEAD CASUAL — Cliente preguntando sin intención clara. Pregunta uso final, perfila gentilmente. Recomienda 2-3 productos relevantes. NO presiones.`,

    curioso: `👀 LEAD CURIOSO — Cliente sin compromiso, "solo cotizando". Educa suavemente, manda info útil. NO insistas en cerrar. Deja la puerta abierta: "cuando lo necesite aquí estamos 👌".`,

    frio: `❄️ LEAD FRÍO — Cliente inactivo. Reactivación cálida: pregunta cómo va su negocio, menciona si hay novedades relevantes. NO empieces con venta directa, primero recupera la relación.`,
  };

  return `\n\nLEAD SCORE: ${result.categoria.toUpperCase()} (${result.score}/100)
Razones: ${result.razones.join(" · ")}
Táctica recomendada: ${tacticas[result.categoria]}`;
}