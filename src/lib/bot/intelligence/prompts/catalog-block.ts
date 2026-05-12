/**
 * Generador del bloque de catálogo para system prompt.
 *
 * El v1 le decía a GPT "no inventes precios" sin darle el catálogo. Resultado:
 * GPT caía a su conocimiento general de telas y alucinaba productos como
 * "popelina de algodón" para paliacates (Coyote Textil no vende popelina).
 *
 * Este helper produce un bloque compacto y estructurado que GPT puede
 * referenciar directamente. Token-efficient: ~700-1000 tokens para el catálogo
 * completo (50+ productos), vs el costo de equivocarse.
 *
 * El formato es deliberadamente plano (sin markdown ni emojis) porque GPT
 * lo procesa más confiable así.
 */
import type { Producto } from "../../types/domain";
import { getCatalog } from "../../repositories/catalog-repo";

/**
 * Convierte un producto a una línea del bloque de catálogo.
 * Formato: "ID | NOMBRE | CATEGORIA | $MENUDEO/$MAYOREO unidad | usos"
 */
function productoToLine(p: Producto): string {
  const unidad =
    p.categoria === "telas"
      ? "kg"
      : p.categoria === "hilos"
        ? "cono"
        : "metro";
  const precios = `$${p.menudeo}/$${p.mayoreo} por ${unidad}`;
  const usos = p.categoriaLibre ? ` | ${p.categoriaLibre}` : "";
  return `${p.id} | ${p.nombre} | ${p.categoria} | ${precios}${usos}`;
}

/**
 * Construye el bloque completo de catálogo para inyectar al system prompt.
 * Llamarlo una sola vez por mensaje (no en loop).
 */
export async function buildCatalogBlock(): Promise<string> {
  const catalog = await getCatalog();
  if (catalog.length === 0) {
    return "CATÁLOGO: (no disponible — alerta a Jack)";
  }

  // Agrupar por categoría para que GPT navegue mejor
  const telas = catalog.filter((p) => p.categoria === "telas");
  const hilos = catalog.filter((p) => p.categoria === "hilos");
  const elasticos = catalog.filter((p) => p.categoria === "elasticos");

  const lines: string[] = [];
  lines.push("=== CATÁLOGO COMPLETO COYOTE TEXTIL ===");
  lines.push("Estos son los ÚNICOS productos que vendes. Todo lo demás NO existe en Coyote Textil.\n");

  if (telas.length > 0) {
    lines.push(`--- TELAS (${telas.length} productos, vendidas por kilo) ---`);
    for (const p of telas) lines.push(productoToLine(p));
    lines.push("");
  }
  if (hilos.length > 0) {
    lines.push(`--- HILOS (${hilos.length} productos, vendidos por cono) ---`);
    for (const p of hilos) lines.push(productoToLine(p));
    lines.push("");
  }
  if (elasticos.length > 0) {
    lines.push(`--- ELÁSTICOS (${elasticos.length} productos, vendidos por metro) ---`);
    for (const p of elasticos) lines.push(productoToLine(p));
    lines.push("");
  }

  lines.push("=== FIN DEL CATÁLOGO ===");
  return lines.join("\n");
}

/**
 * Lista plana de slugs/nombres para validación post-respuesta.
 * Formato: ["alaska", "sportok", "micropique", ...]
 */
export async function getKnownProductSlugs(): Promise<string[]> {
  const catalog = await getCatalog();
  return catalog.map((p) => p.slug);
}

/**
 * Tipos de tela que sabemos que NO vendemos pero GPT podría sugerir.
 * Usado por el validador post-respuesta para detectar hallucinations.
 */
export const TELAS_PROHIBIDAS = [
  "popelina",
  "popelín",
  "lino",
  "seda",
  "satín",
  "satin",
  "raso",
  "muselina",
  "gasa",
  "organza",
  "tul",
  "encaje",
  "denim",
  "mezclilla",
  "gabardina",
  "casimir",
  "pana",
  "terciopelo",
  "chiffon",
  "crepé",
  "crepe",
  "tafetán",
  "tafeta",
  "yute",
  "lana",
  "cachemir",
  "tweed",
  "oxford",
  "bramante",
];
