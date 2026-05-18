/**
 * Enriquecedor automático del perfil del cliente.
 *
 * En cada turno, extrae datos del mensaje del cliente y propone
 * actualizaciones al perfil (que el orchestrator aplicará vía client-repo.update).
 *
 * Detectores actuales:
 *  - tipoNegocio: maquila/taller/revendedor/empresa/uniformes/consumidor
 *  - volumenTipicoKg: rolling average si menciona cantidades
 *  - coloresFavoritos: colores que pide repetidamente
 *  - presupuestoAprox: rango de monto mencionado
 */
import type { ClientePerfil } from "../../types/domain";
import type { EnrichmentResult, TipoNegocio } from "./types";

// ─── Tipo de negocio ───────────────────────────────────────────────────────

const NEGOCIO_PATTERNS: Array<{ pattern: RegExp; tipo: TipoNegocio }> = [
  { pattern: /\b(maquila|maquilad|maquileros?)\b/i, tipo: "maquila" },
  { pattern: /\b(taller(es)?|fabric[oa]?\s+ropa|hago\s+playeras?)\b/i, tipo: "taller" },
  { pattern: /\b(revendedor|distribuidor|mayorista|venta\s+al\s+por\s+mayor)\b/i, tipo: "revendedor" },
  { pattern: /\b(empresa|negocio|compa[ñn][ií]a|corporativ)\b/i, tipo: "empresa" },
  { pattern: /\b(uniformes?\s+(escolares?|deportivos?|para\s+empresa))\b/i, tipo: "uniformes" },
];

function detectTipoNegocio(text: string): TipoNegocio | null {
  for (const { pattern, tipo } of NEGOCIO_PATTERNS) {
    if (pattern.test(text)) return tipo;
  }
  return null;
}

// ─── Volumen ───────────────────────────────────────────────────────────────

const KG_PATTERN = /\b(\d{1,4})\s*(kg|kilos?)\b/i;

function detectVolumen(text: string): number | null {
  const m = KG_PATTERN.exec(text);
  if (!m) return null;
  const kg = parseInt(m[1], 10);
  if (kg < 5 || kg > 10000) return null; // filtro de valores absurdos
  return kg;
}

/**
 * Rolling average simple: nuevo = (anterior * 0.7) + (nuevo * 0.3)
 * O si no hay anterior, retorna el nuevo.
 */
function updateRollingAverage(prev: number | undefined, nuevo: number): number {
  if (!prev || prev === 0) return nuevo;
  return Math.round(prev * 0.7 + nuevo * 0.3);
}

// ─── Colores ───────────────────────────────────────────────────────────────

const COLOR_KEYWORDS = [
  "negro", "blanco", "marino", "rey", "azul rey", "rojo", "rojo quemado",
  "verde botella", "verde militar", "verde bandera", "verde menta",
  "naranja", "naranja neon", "rosa", "rosa pastel", "rosa neon", "fiusha",
  "amarillo", "mostaza", "canario", "amarillo neon",
  "gris", "gris baby", "perla", "oxford", "caqui", "beige", "cafe",
  "morado", "uva", "violeta", "bugambilia", "lila",
  "turquesa", "aqua", "cielo", "francia",
  "vino", "petroleo", "jade",
];

function detectColores(text: string): string[] {
  const normalized = text.toLowerCase();
  const found = new Set<string>();
  for (const color of COLOR_KEYWORDS) {
    // Word boundary: el color es palabra completa
    const pattern = new RegExp(`\\b${color}\\b`, "i");
    if (pattern.test(normalized)) {
      found.add(color);
    }
  }
  return Array.from(found);
}

// ─── Presupuesto ───────────────────────────────────────────────────────────

const PRESUPUESTO_PATTERNS = [
  /\bpresupuesto\s+(?:de\s+)?\$?\s*(\d{1,3}(?:[,.]?\d{3})*)/i,
  /\btengo\s+\$?\s*(\d{1,3}(?:[,.]?\d{3})*)\s+(?:para|pesos)/i,
];

function detectPresupuesto(text: string): number | null {
  for (const p of PRESUPUESTO_PATTERNS) {
    const m = p.exec(text);
    if (m) {
      const raw = m[1].replace(/[,.]/g, "");
      const num = parseInt(raw, 10);
      if (num >= 500 && num <= 1000000) return num;
    }
  }
  return null;
}

// ─── Enriquecedor maestro ──────────────────────────────────────────────────

export function enrichProfile(
  perfil: ClientePerfil,
  userText: string
): EnrichmentResult {
  const patches: EnrichmentResult["patches"] = {};
  const detected: string[] = [];

  // Tipo de negocio (solo si no estaba seteado o estaba "desconocido")
  const currentTipoNegocio = (perfil as any).tipoNegocio as TipoNegocio | undefined;
  if (!currentTipoNegocio || currentTipoNegocio === "desconocido") {
    const tipo = detectTipoNegocio(userText);
    if (tipo) {
      patches.tipoNegocio = tipo;
      detected.push(`tipoNegocio=${tipo}`);
    }
  }

  // Volumen típico (rolling average)
  const volumen = detectVolumen(userText);
  if (volumen) {
    const prevVol = (perfil as any).volumenTipicoKg as number | undefined;
    const nuevoVol = updateRollingAverage(prevVol, volumen);
    if (nuevoVol !== prevVol) {
      patches.volumenTipicoKg = nuevoVol;
      detected.push(`volumen=${volumen}kg (avg=${nuevoVol})`);
    }
  }

  // Colores favoritos (agregar a la lista, sin duplicar)
  const colores = detectColores(userText);
  if (colores.length > 0) {
    const prevColores = ((perfil as any).coloresFavoritos as string[]) ?? [];
    const merged = Array.from(new Set([...prevColores, ...colores])).slice(0, 10);
    if (merged.length > prevColores.length) {
      patches.coloresFavoritos = merged;
      detected.push(`colores+=${colores.join(",")}`);
    }
  }

  // Presupuesto
  const presupuesto = detectPresupuesto(userText);
  if (presupuesto) {
    patches.presupuestoAprox = presupuesto;
    detected.push(`presupuesto=$${presupuesto}`);
  }

  return { patches, detected };
}