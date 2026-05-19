/**
 * Resultado estructurado del análisis visual de una imagen.
 * G3-Vision: schema ampliado para no perder info clave.
 */
export interface VisionAnalysisResult {
  /** True si la imagen muestra un producto textil/tela/prenda terminada. */
  esProducto: boolean;
  /** Si esProducto=false, qué se vio en su lugar (ej. "credencial"). */
  razonNoEsProducto?: string;
  /** True si la tela identificada es manejada por Coyote Textil. */
  esManejada?: boolean;
  /** Frase rica para búsqueda semántica. */
  descripcion: string;
  /** Nombre exacto del catálogo Coyote (ej. "Sportok", "Micropique"). */
  tipoTela?: string;
  /** Si NO la manejamos: nombre genérico de la tela vista (ej. "mezclilla"). */
  telaIdentificada?: string;
  /** Colores predominantes detectados. */
  colores: string[];
  /** Atributos distintivos: afelpada, transpirable, etc. */
  atributos: string[];
  /** Usos típicos: playeras, uniformes, etc. */
  usosProbables: string[];
  /** 0-1: qué tan seguro está GPT del análisis. */
  confianza: number;
  /** Explicación de POR QUÉ eligió esa tela (para debugging y prompt al bot). */
  razonamiento?: string;
}

/**
 * Resultado del flujo completo del orquestador para una imagen.
 */
export interface ImageProcessingResult {
  analysis: VisionAnalysisResult;
  /** Texto enriquecido que se inyecta al user message del chat. */
  enrichedUserMessage: string;
  /** Si el análisis vino del cache. */
  fromCache: boolean;
}