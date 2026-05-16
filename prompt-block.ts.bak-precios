/**
 * Formatea los resultados del RAG para inyectarlos al system prompt.
 *
 * Diferencia vs catalog-block (Fase 5):
 *  - catalog-block.ts inyecta TODO el catálogo (~700-1000 tokens fijos)
 *  - rag-block.ts inyecta solo los top K relevantes (~150-300 tokens variable)
 *
 * El builder del prompt decide cuál usar según `shouldUseRag()`.
 */
import type { Producto } from "../../types/domain";
import type { SearchResult } from "./searcher";

function productoToLine(result: SearchResult): string {
  const { producto: p, similarity, matchType } = result;
  const unidad =
    p.categoria === "telas"
      ? "kg"
      : p.categoria === "hilos"
        ? "cono"
        : "metro";
  const precios = `$${p.menudeo}/$${p.mayoreo} por ${unidad}`;
  const usos = p.categoriaLibre ? ` | ${p.categoriaLibre}` : "";

  // FASE 12 FIX: incluir colores
  const colorList = (p as any).colores as Array<{ nombre: string }> | undefined;
  let coloresInfo = "";
  if (colorList && colorList.length > 0) {
    coloresInfo = ` | Colores: ${colorList.map((c) => c.nombre).join(", ")}`;
  } else if ((p as any).colorUnico === true) {
    coloresInfo = " | Solo blanco";
  }

  // Specs técnicas
  const detalles: string[] = [];
  if ((p as any).gramaje) detalles.push(`${(p as any).gramaje}g/m²`);
  if ((p as any).ancho) detalles.push(`ancho ${(p as any).ancho}m`);
  const tech = detalles.length > 0 ? ` | ${detalles.join(" ")}` : "";

  // Marcador visible para que GPT vea match exacto vs semántico
  const tag = matchType === "exact" ? "[MATCH EXACTO]" : `[${(similarity * 100).toFixed(0)}%]`;

  return `${tag} ${p.id} | ${p.nombre} | ${p.categoria} | ${precios}${tech}${coloresInfo}${usos}`;
}

/**
 * Construye el bloque RAG para el system prompt.
 *
 * Cuando el RAG devuelve resultados, son los productos más relevantes para
 * la query actual del cliente. El system prompt instruye explícitamente al
 * modelo a usar SOLO estos productos (más una salvaguarda anti-invención).
 */
export function buildRagBlock(results: SearchResult[]): string {
  if (results.length === 0) {
    return [
      "=== PRODUCTOS RELEVANTES PARA ESTA CONSULTA ===",
      "(la búsqueda semántica no encontró productos del catálogo que matchen exactamente esta consulta)",
      "Si el cliente está hablando de telas/hilos/elásticos y aquí no hay sugerencias, probablemente pide algo que NO manejamos.",
      "Responde con honestidad y redirige a nuestras especialidades (telas de punto deportivas).",
      "=== FIN ===",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("=== PRODUCTOS RELEVANTES PARA ESTA CONSULTA ===");
  lines.push(
    "Los siguientes productos del catálogo son los MÁS RELEVANTES para lo que el cliente está pidiendo."
  );
  lines.push(
    "Úsalos como referencia principal. NO mencionas productos que no estén aquí salvo que el cliente pregunte explícitamente por otro."
  );
  lines.push("");

  for (const r of results) {
    lines.push(productoToLine(r));
  }
  lines.push("");
  lines.push("=== FIN ===");
  return lines.join("\n");
}

/**
 * Helper para extraer la query relevante del mensaje del cliente.
 * Por ahora es la misma cosa — más adelante podríamos usar GPT para
 * extraer la entidad del mensaje y solo embed eso.
 */
export function extractQueryFromMessage(message: string): string {
  // FASE 12 FIX: limpiar la query para mejor match con embeddings.
  // Removemos cantidades (kg, metros, números), CPs, y palabras de relleno.
  return message
    .toLowerCase()
    .replace(/\bcp\s*\d{4,5}\b/gi, "")           // "cp 06000" → ""
    .replace(/\b\d+\s*(kg|kilos?|metros?|m)\b/gi, "") // "50 kg" → ""
    .replace(/\b(necesito|quiero|tienes|me|por|al|de|el|la|los|las|en|color|favor|buenos días|buenas tardes|hola)\b/gi, "")
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
