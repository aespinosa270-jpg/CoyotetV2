/**
 * Memoria episódica del cliente.
 *
 * Diferencia con el resumen semántico:
 *  - Resumen semántico: snapshot de la conversación actual ("estaban negociando 50kg")
 *  - Memoria episódica: hechos del NEGOCIO del cliente que persisten entre
 *    conversaciones distintas ("trabaja con uniformes escolares en Tepito")
 *
 * El bot inyecta los hechos relevantes al system prompt para dar continuidad
 * cuando el cliente vuelve días o semanas después.
 */

export type CategoriaHecho =
  | "negocio" // tipo de negocio: "tiene tienda en Tepito", "fábrica de uniformes escolares"
  | "preferencia" // gustos: "siempre pide colores oscuros", "prefiere Micropique sobre Sportok"
  | "presupuesto" // capacidad: "presupuesto mensual $50k", "compra al menudeo no mayoreo"
  | "logistica" // entrega: "recibe en bodega Iztapalapa", "solo entregas en horario nocturno"
  | "frecuencia" // patrón: "compra cada 30 días", "temporada alta en agosto"
  | "contacto" // otro contacto: "Juan es el encargado de compras"
  | "objecion_cronica"; // objeción persistente: "siempre se queja del tiempo"

export interface HechoEpisodico {
  /** Texto del hecho en una frase corta. */
  hecho: string;
  categoria: CategoriaHecho;
  /** Cuándo se aprendió. */
  timestamp: string;
  /** 0-1: qué tan confiable es el hecho. */
  confianza: number;
  /** Frase del cliente o evento que lo evidenció. */
  evidencia?: string;
}

export interface MemoriaEpisodica {
  hechos: HechoEpisodico[];
  ultimaActualizacion: string;
}

export const CATEGORIAS_HECHO: CategoriaHecho[] = [
  "negocio",
  "preferencia",
  "presupuesto",
  "logistica",
  "frecuencia",
  "contacto",
  "objecion_cronica",
];

/** Máximo de hechos por cliente para no inflar el system prompt. */
export const MAX_HECHOS = 25;
