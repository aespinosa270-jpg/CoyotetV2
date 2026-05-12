/**
 * Tracker de objeciones — funciones puras.
 *
 * Mantiene `perfil.vectorObjeciones` (mapa tipo → score) actualizado:
 *  - Una nueva objeción detectada SUMA al score de su tipo
 *  - Cuando el cliente cambia a tono positivo, el vector DECAE
 *  - El score se usa después por el selector de táctica para decidir
 *    si insistir en "manejo_objecion" para este cliente
 *
 * Cero I/O. El orquestador hace: extract → track → save.
 */
import type { ClientePerfil } from "../../types/domain";
import {
  OBJECION_LABELS,
  type ObjecionDetectada,
  type TipoObjecion,
  type VectorObjeciones,
  TIPOS_OBJECION,
} from "./types";

/** Peso por severidad: severidad 1 → +1 punto, severidad 5 → +5 puntos. */
const WEIGHT_BY_SEVERIDAD: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

/** Decay aplicado a TODAS las objeciones cuando el cliente está positivo. */
const POSITIVE_DECAY = 0.7;

/** Score máximo por tipo. Más allá no escala — el bot ya entendió. */
const MAX_SCORE = 20;

/** Si una objeción cae bajo este score, se borra del vector. */
const PRUNE_THRESHOLD = 0.5;

// ── Vector vacío ──────────────────────────────────────────────────

export function emptyVector(): VectorObjeciones {
  const v: Partial<VectorObjeciones> = {};
  for (const t of TIPOS_OBJECION) v[t] = 0;
  return v as VectorObjeciones;
}

// ── Aplicar nueva objeción ────────────────────────────────────────

/**
 * Registra una objeción nueva en el vector y devuelve un nuevo perfil.
 * Función PURA: no muta el perfil de entrada.
 */
export function trackObjecion(
  perfil: ClientePerfil,
  obj: ObjecionDetectada
): ClientePerfil {
  // Si el extractor dijo "ninguna", no movemos nada.
  if (obj.tipo === "ninguna") return perfil;

  const vectorActual: VectorObjeciones =
    (perfil.vectorObjeciones as VectorObjeciones) ?? emptyVector();

  const weight = WEIGHT_BY_SEVERIDAD[obj.severidad] ?? 1;
  const previo = vectorActual[obj.tipo] ?? 0;
  const nuevoScore = Math.min(MAX_SCORE, previo + weight);

  const vectorNuevo: VectorObjeciones = {
    ...vectorActual,
    [obj.tipo]: nuevoScore,
  };

  const objecionesComunes = topObjecionesLabels(vectorNuevo, 3);

  return {
    ...perfil,
    vectorObjeciones: vectorNuevo,
    objecionesComunes,
  };
}

// ── Decay cuando el cliente está positivo ─────────────────────────

/**
 * Aplica decay a todas las objeciones del vector. Llamar cuando se detecta
 * que el cliente cambió a tono positivo (esTonoPositivo del módulo signals).
 *
 * Las objeciones que caen bajo PRUNE_THRESHOLD se quitan del vector.
 */
export function decayObjeciones(perfil: ClientePerfil): ClientePerfil {
  const vectorActual: VectorObjeciones =
    (perfil.vectorObjeciones as VectorObjeciones) ?? emptyVector();

  const vectorNuevo: VectorObjeciones = emptyVector();
  for (const tipo of TIPOS_OBJECION) {
    const decayed = (vectorActual[tipo] ?? 0) * POSITIVE_DECAY;
    vectorNuevo[tipo] = decayed >= PRUNE_THRESHOLD ? round2(decayed) : 0;
  }

  const objecionesComunes = topObjecionesLabels(vectorNuevo, 3);

  return {
    ...perfil,
    vectorObjeciones: vectorNuevo,
    objecionesComunes,
  };
}

// ── Lectura para el selector de táctica y prompts ────────────────

/**
 * Devuelve los top N tipos de objeción con mayor score, ordenados desc.
 * Filtra los que están en 0.
 */
export function topObjeciones(
  perfil: ClientePerfil,
  n: number = 3
): Array<{ tipo: TipoObjecion; score: number }> {
  const vector: VectorObjeciones =
    (perfil.vectorObjeciones as VectorObjeciones) ?? emptyVector();

  return Object.entries(vector)
    .filter(([_tipo, score]) => score > 0)
    .map(([tipo, score]) => ({ tipo: tipo as TipoObjecion, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Etiquetas humanas para inyectar al system prompt y mostrar en admin.
 * Ejemplo de salida: ["Precio muy alto", "Tiempo de entrega"]
 */
export function topObjecionesLabels(
  vector: VectorObjeciones,
  n: number = 3
): string[] {
  return Object.entries(vector)
    .filter(([_tipo, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([tipo]) => OBJECION_LABELS[tipo as TipoObjecion]);
}

// ── Helpers ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
