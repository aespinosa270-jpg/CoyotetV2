/**
 * Resultado estructurado del análisis visual de una imagen.
 */
export interface VisionAnalysisResult {
  /** True si la imagen muestra un producto textil/tela/prenda. */
  esProducto: boolean;
  /** Si esProducto=false, qué se vio en su lugar (ej. "credencial"). */
  razonNoEsProducto?: string;
  /** Frase rica para búsqueda semántica. */
  descripcion: string;
  /** Nombre genérico de la tela (no comercial). */
  tipoTela?: string;
  /** Colores predominantes detectados. */
  colores: string[];
  /** Atributos distintivos: afelpada, transpirable, etc. */
  atributos: string[];
  /** Usos típicos: playeras, uniformes, etc. */
  usosProbables: string[];
  /** 0-1: qué tan seguro está GPT del análisis. */
  confianza: number;
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
