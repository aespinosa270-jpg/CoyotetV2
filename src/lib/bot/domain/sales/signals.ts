/**
 * Catálogo central de señales de intent.
 *
 * TODAS las regex que detectan intención del cliente viven aquí. Si alguna
 * tarea de domain/intelligence necesita matchear texto del usuario, importa
 * de este archivo. NUNCA escribas regex inline en otro lado.
 *
 * Ventajas:
 *  - Auditar las reglas → un solo archivo.
 *  - Tunear umbrales en un commit aislado.
 *  - En Fase 6 (RAG) podemos reemplazar varias por embeddings sin tocar los
 *    consumidores.
 *
 * Diseño de los patrones: están agrupados por intención semántica (no por
 * frase). Un cliente que dice "muy caro, ahorita no" expresa UNA actitud
 * (price objection), aunque use dos frases. Por eso `contarSenalesFrias`
 * cuenta grupos que disparan, no frases sueltas.
 */

// ── Patrones individuales ──────────────────────────────────────────

/** Frases que sugieren que el cliente está cerca de comprar. */
const HOT_PATTERNS = [
  /cu[áa]nto\s+cuesta|precio|cu[áa]nto\s+vale|cotiz|presupuesto/i,
  /quiero|necesito|me\s+interesa|me\s+(la\s+|lo\s+)?llevo|pedido/i,
  /cu[áa]ndo\s+llega|tiempo\s+de\s+entrega|env[íi]o|flete/i,
  /pago|tarjeta|oxxo|spei|transferencia|dep[óo]sito|deposito/i,
  /disponible|tienen\s+en\s+stock|hay\s+en/i,
  /metro|kilo|rollo|pieza|cono|caja/i,
];

/** Frases de objeción o desinterés. */
const COLD_PATTERNS = [
  /solo\s+(estoy\s+)?viendo|nada\s+m[áa]s|solo\s+pregunto|para\s+saber/i,
  /muy\s+caro|no\s+tengo|sin\s+dinero|ahorita\s+no/i,
  /lo\s+pienso|despu[ée]s|ma[ñn]ana|luego/i,
];

/** Tono positivo en mensajes del usuario (sube confianza). */
const TRUST_POSITIVE = /gracias|perfecto|excelente|muy\s+bien|de\s+acuerdo|listo/i;

/** Tono negativo (baja confianza). */
const TRUST_NEGATIVE = /caro|no\s+me\s+convence|lo\s+pienso|otro\s+proveedor|m[áa]s\s+barato/i;

/** El cliente menciona telas → propenso a también necesitar hilo. */
const PIDE_TELA =
  /tela|piqu[ée]|panal|torneo|kyoto|athlos|brock|apolo|horous|micro|sportok|felpa|flanel|polar/i;

/** El cliente menciona uniformes/prendas → propenso a necesitar elásticos. */
const PIDE_UNIFORME = /uniforme|deportiv|pants|short|pantal[óo]n|sudadera/i;

/** Frases que indican intención de pagar/cerrar la compra. */
const PAYMENT_INTENT = [
  /\b(pago|pagar|pa[gq]ue|quiero\s+pagar|c[óo]mo\s+pago|link\s+de\s+pago|m[áa]ndame\s+el\s+link|manda\s+el\s+link|m[áa]ndame\s+el\s+cobro)\b/i,
  /\b(le\s+entro|cerramos|lo\s+quiero|me\s+lo\s+llevo|me\s+la\s+llevo|ap[áa]rtame|apartame)\b/i,
  /\b(cu[áa]nto)\s+(me\s+cobras|es|total|(?:te\s+)?debo|pago)\b/i,
];

/** Métodos de pago específicos. */
const METHOD_CARD = /tarjeta|visa|mastercard|cr[ée]dito|d[ée]bito|card/i;
const METHOD_OXXO = /oxxo|efectivo/i;
const METHOD_SPEI = /spei|transferencia|dep[óo]sito|deposito|clabe/i;

// ── API pública ────────────────────────────────────────────────────

export const SIGNALS = {
  HOT_PATTERNS,
  COLD_PATTERNS,
  TRUST_POSITIVE,
  TRUST_NEGATIVE,
  PIDE_TELA,
  PIDE_UNIFORME,
  PAYMENT_INTENT,
  METHOD_CARD,
  METHOD_OXXO,
  METHOD_SPEI,
} as const;

// ── Helpers de detección ───────────────────────────────────────────

/** Cuenta cuántos GRUPOS de señales calientes están presentes (1 grupo = 1 categoría). */
export function contarSenalesCalientes(message: string): number {
  return HOT_PATTERNS.filter((r) => r.test(message)).length;
}

/** Cuenta cuántos GRUPOS de señales frías están presentes (1 grupo = 1 actitud). */
export function contarSenalesFrias(message: string): number {
  return COLD_PATTERNS.filter((r) => r.test(message)).length;
}

export function contieneSenalCaliente(message: string): boolean {
  return HOT_PATTERNS.some((r) => r.test(message));
}

export function contieneSenalFria(message: string): boolean {
  return COLD_PATTERNS.some((r) => r.test(message));
}

export function esTonoPositivo(message: string): boolean {
  return TRUST_POSITIVE.test(message);
}

export function esTonoNegativo(message: string): boolean {
  return TRUST_NEGATIVE.test(message);
}

export function pideTela(message: string): boolean {
  return PIDE_TELA.test(message);
}

export function pideUniforme(message: string): boolean {
  return PIDE_UNIFORME.test(message);
}

// ── Detección de intención de pago ─────────────────────────────────

export interface IntencionPago {
  /** True si el cliente quiere generar un link de pago vía Stripe. */
  detectado: boolean;
  /** Método específico inferido. SPEI no genera link Stripe. */
  metodo: "tarjeta" | "oxxo" | null;
  /** True si específicamente mencionó SPEI/transferencia. */
  esSpei: boolean;
}

/**
 * Detecta intención de pago en un mensaje.
 *
 * SPEI se detecta aparte porque NO va por Stripe Checkout — va por
 * mostrar las cuentas CLABE. Por eso `detectado` es false cuando es SPEI:
 * el orquestador debe leer `esSpei` para decidir el flujo correcto.
 */
export function detectarIntencionPago(message: string): IntencionPago {
  const esSpei = METHOD_SPEI.test(message);
  const tieneIntent = PAYMENT_INTENT.some((r) => r.test(message));

  if (esSpei) {
    return { detectado: false, metodo: null, esSpei: true };
  }

  if (!tieneIntent) {
    return { detectado: false, metodo: null, esSpei: false };
  }

  const tarjeta = METHOD_CARD.test(message);
  const oxxo = METHOD_OXXO.test(message);
  // Default a tarjeta si hay intent pero no se especificó método
  const metodo: "tarjeta" | "oxxo" = tarjeta ? "tarjeta" : oxxo ? "oxxo" : "tarjeta";
  return { detectado: true, metodo, esSpei: false };
}
