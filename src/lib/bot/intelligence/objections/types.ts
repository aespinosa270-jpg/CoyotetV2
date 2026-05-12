/**
 * Tipos del módulo de objeciones.
 *
 * El enum `TIPOS_OBJECION` es cerrado a propósito: cuando GPT extrae una
 * objeción, debe clasificarla en una de estas categorías. Esto permite
 * acumular scores comparables a través del tiempo ("este cliente tiene
 * 3 puntos de objeción_precio en el último mes").
 */

export const TIPOS_OBJECION = [
  "precio_alto",
  "tiempo_entrega",
  "calidad_dudas",
  "metodo_pago",
  "competencia",
  "pedido_minimo",
  "factura_complicada",
  "logistica_envio",
  "stock_disponibilidad",
  "cierre_postergado",
  "ninguna",
] as const;

export type TipoObjecion = (typeof TIPOS_OBJECION)[number];

/** Severidad 1=pasajera, 5=bloqueante para la venta. */
export type SeveridadObjecion = 1 | 2 | 3 | 4 | 5;

export interface ObjecionDetectada {
  tipo: TipoObjecion;
  severidad: SeveridadObjecion;
  /** La frase específica del cliente que reveló la objeción. */
  contexto: string;
}

/**
 * Mapa de tipo → peso acumulado.
 * Vive en `perfil.vectorObjeciones`. Las objeciones que se repiten suben de score,
 * las que se resuelven (cliente cambia tono a positivo) bajan con tiempo.
 */
export type VectorObjeciones = Record<TipoObjecion, number>;

/** Etiquetas humanas para mostrar en el admin dashboard. */
export const OBJECION_LABELS: Record<TipoObjecion, string> = {
  precio_alto: "Precio muy alto",
  tiempo_entrega: "Tiempo de entrega",
  calidad_dudas: "Dudas de calidad",
  metodo_pago: "Método de pago",
  competencia: "Competencia ofrece menos",
  pedido_minimo: "Pedido mínimo",
  factura_complicada: "Trámite de factura",
  logistica_envio: "Logística de envío",
  stock_disponibilidad: "Disponibilidad de stock",
  cierre_postergado: "Posterga decisión",
  ninguna: "Sin objeción",
};
