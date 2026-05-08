/**
 * Adapter del catálogo.
 *
 * Lee la fuente de verdad de Coyote Textil (`src/lib/products.ts`,
 * `src/lib/hilos.ts`, `src/lib/elasticos.ts`) y la traduce al modelo tipado
 * del bot.
 *
 * Decisiones:
 *  - "Kilo" y "Kg" se tratan idénticos (inconsistencia menor en el fuente).
 *  - "Hilos" y "Elásticos"/"Elasticos" se matchean case-insensitive y sin acentos.
 *  - `singleColor: true` o `colors === undefined` → `colorUnico: true`.
 *  - `kgPorRollo` por defecto = 25, excepto los que tienen `unidadesPorRollo`
 *    explícito (Flanel = 27, etc.).
 *  - Productos con `unit` desconocido se omiten silenciosamente y se loguean.
 */

import { products as sourceTelas } from "@/lib/products";
import { hilos as sourceHilos } from "@/lib/hilos";
import { elasticos as sourceElasticos } from "@/lib/elasticos";
import type { Product, ProductColor } from "@/lib/products";
import type {
  Producto,
  ProductoColor,
  TelaPorKilo,
  TelaPorMetro,
  Hilo,
  Elastico,
} from "../../types/domain";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "catalog/source-adapter" });

// ── Utilidades ─────────────────────────────────────────────────────

/** "Micro piqué" → "micro-pique". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "145" → 145; "40/2" → undefined; "N/A" → undefined. */
function parseGramaje(g: string | undefined): number | undefined {
  if (!g) return undefined;
  const num = parseInt(g, 10);
  return Number.isFinite(num) && /^\d+/.test(g.trim()) ? num : undefined;
}

/** "1.60m" → 1.6; "6.5 cm" → 0.065; "50 cm" → 0.5. */
function parseAncho(a: string | undefined): number | undefined {
  if (!a) return undefined;
  const match = a.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const val = parseFloat(match[1]);
  if (!Number.isFinite(val)) return undefined;
  if (/cm/i.test(a)) return val / 100;
  return val;
}

function adaptColor(c: ProductColor): ProductoColor {
  return {
    nombre: c.name,
    hex: c.hex,
    imagen: c.image,
  };
}

function adaptColors(colors: ProductColor[] | undefined): ProductoColor[] {
  return (colors ?? []).map(adaptColor);
}

/** Normaliza la categoría libre del fuente. */
function normalizeCategoria(cat: string): string {
  return cat
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ── Discriminadores de tipo ────────────────────────────────────────

function esHilo(src: Product): boolean {
  return normalizeCategoria(src.category) === "hilos";
}

function esElastico(src: Product): boolean {
  return normalizeCategoria(src.category) === "elasticos";
}

function esTelaPorMetro(src: Product): boolean {
  // Telas que se venden por metro lineal (Diablo, Lycra Metálica).
  return src.unit.toLowerCase() === "metro";
}

function esTelaPorKilo(src: Product): boolean {
  const u = src.unit.toLowerCase();
  return u === "kilo" || u === "kg";
}

// ── Adapter principal ──────────────────────────────────────────────

/**
 * Convierte un producto del fuente al tipo del bot.
 * Devuelve `null` si la unidad o categoría no se reconocen — el caller decide
 * qué hacer con eso.
 */
export function adaptarProducto(src: Product): Producto | null {
  const slug = slugify(src.title);
  const baseShared = {
    id: src.id,
    nombre: src.title,
    slug,
    info: src.description,
    menudeo: src.prices.menudeo,
    mayoreo: src.prices.mayoreo,
    categoriaLibre: src.category,
    origen: src.origin,
    thumbnail: src.thumbnail,
  };

  // Hilos
  if (esHilo(src)) {
    const hilo: Hilo = {
      ...baseShared,
      categoria: "hilos",
      unidad:
        src.unit.toLowerCase() === "pieza" ? "pieza/cono" : "pieza/cono",
      piezasPorCaja: src.unidadesPorRollo,
      // En src/lib/hilos.ts, `rendimiento` representa metros por cono (5000)
      metrosPorCono: src.rendimiento,
      colores: adaptColors(src.colors),
    };
    return hilo;
  }

  // Elásticos
  if (esElastico(src)) {
    let unidad: "metro" | "pieza (50cm)" | "cono" = "metro";
    if (src.unit === "Pieza" && /jareta/i.test(src.id)) {
      unidad = "cono";
    } else if (src.unit === "Pieza") {
      unidad = "pieza (50cm)";
    } else if (src.unit === "Metro") {
      unidad = "metro";
    }
    const elastico: Elastico = {
      ...baseShared,
      categoria: "elasticos",
      unidad,
      metrosPorRollo:
        unidad === "metro" ? src.unidadesPorRollo : undefined,
      colores: adaptColors(src.colors),
    };
    return elastico;
  }

  // Telas por metro (Diablo, Lycra Metálica)
  if (esTelaPorMetro(src)) {
    const tela: TelaPorMetro = {
      ...baseShared,
      categoria: "telasMetro",
      metrosPorRollo: src.unidadesPorRollo ?? 50,
      gramaje: parseGramaje(src.gramaje),
      ancho: parseAncho(src.ancho),
      colores: adaptColors(src.colors),
      colorUnico: src.singleColor === true || !src.colors,
    };
    return tela;
  }

  // Telas por kilo (todo lo demás con unit "Kilo" o "Kg")
  if (esTelaPorKilo(src)) {
    const tela: TelaPorKilo = {
      ...baseShared,
      categoria: "telas",
      rendimientoMxKg: src.rendimiento,
      gramaje: parseGramaje(src.gramaje),
      ancho: parseAncho(src.ancho),
      kgPorRollo: src.unidadesPorRollo ?? 25,
      colores: adaptColors(src.colors),
      colorUnico: src.singleColor === true || !src.colors,
    };
    return tela;
  }

  log.warn(
    { id: src.id, unit: src.unit, category: src.category },
    "Producto con unidad/categoría desconocida — omitido"
  );
  return null;
}

/**
 * Carga el catálogo completo desde los archivos fuente y devuelve el array
 * tipado. Esta es la función que va a usar el `catalog-repo` antes de aplicar
 * los overlays de Redis.
 */
export function loadCatalogFromSource(): Producto[] {
  const all: (Producto | null)[] = [
    ...sourceTelas.map(adaptarProducto),
    ...sourceHilos.map(adaptarProducto),
    ...sourceElasticos.map(adaptarProducto),
  ];
  const valid = all.filter((p): p is Producto => p !== null);
  log.debug(
    { total: all.length, valid: valid.length },
    "Catálogo cargado desde fuente"
  );
  return valid;
}

/** Útil para testing: agrupa el catálogo por categoría. */
export function groupByCategoria(productos: Producto[]) {
  return {
    telas: productos.filter((p): p is TelaPorKilo => p.categoria === "telas"),
    telasMetro: productos.filter(
      (p): p is TelaPorMetro => p.categoria === "telasMetro"
    ),
    hilos: productos.filter((p): p is Hilo => p.categoria === "hilos"),
    elasticos: productos.filter(
      (p): p is Elastico => p.categoria === "elasticos"
    ),
  };
}