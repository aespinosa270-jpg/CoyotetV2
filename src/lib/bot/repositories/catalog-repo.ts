/**
 * Repository del catálogo.
 *
 * Combina dos fuentes:
 *  1. Estática: src/lib/{products,hilos,elasticos}.ts vía source-adapter.
 *     Es el catálogo "oficial". Cargado una vez en memoria por proceso.
 *  2. Dinámica: CatalogOverlay en Redis. Aquí viven los cambios que Jack
 *     hace por WhatsApp (precios, productos custom, productos ocultos).
 *
 * El método público `getCatalog()` aplica el overlay sobre el source y
 * devuelve un array final tipado.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { getLogger } from "../observability/logger";
import {
  loadCatalogFromSource,
  slugify,
} from "../domain/catalog/source-adapter";
import type {
  CatalogOverlay,
  CategoriaProducto,
  PrecioProducto,
  Producto,
} from "../types/domain";

const log = getLogger({ module: "catalog-repo" });

// ── Cache del source ───────────────────────────────────────────────

let sourceCache: Producto[] | null = null;

function getSource(): Producto[] {
  if (!sourceCache) sourceCache = loadCatalogFromSource();
  return sourceCache;
}

/** Solo para tests: limpia el cache para forzar recarga del source. */
export function _resetSourceCacheForTests() {
  sourceCache = null;
}

// ── Overlay en Redis (CORREGIDO: Evita fugas de estado en memoria) ─

function getEmptyOverlay(): CatalogOverlay {
  return {
    priceOverrides: {},
    hiddenProductIds: [],
    customProducts: [],
    lastUpdated: new Date(0).toISOString(),
    lastUpdatedBy: "init",
  };
}

async function getOverlay(redis: Redis): Promise<CatalogOverlay> {
  try {
    const data = await redis.get<CatalogOverlay>(keys.catalogOverlay());
    if (!data) return getEmptyOverlay();
    return {
      priceOverrides: data.priceOverrides ?? {},
      hiddenProductIds: data.hiddenProductIds ?? [],
      customProducts: data.customProducts ?? [],
      lastUpdated: data.lastUpdated ?? new Date(0).toISOString(),
      lastUpdatedBy: data.lastUpdatedBy ?? "unknown",
    };
  } catch (err) {
    log.error({ err }, "Error leyendo overlay; usando vacío");
    return getEmptyOverlay();
  }
}

async function saveOverlay(
  redis: Redis,
  overlay: CatalogOverlay
): Promise<void> {
  overlay.lastUpdated = new Date().toISOString();
  await redis.set(keys.catalogOverlay(), overlay);
}

// ── Aplicación del overlay sobre el source ─────────────────────────

function applyOverlay(
  source: Producto[],
  overlay: CatalogOverlay
): Producto[] {
  const hidden = new Set(overlay.hiddenProductIds);
  const visible = source.filter((p) => !hidden.has(p.id));

  const withPriceOverrides = visible.map((p) => {
    const override = overlay.priceOverrides[p.id];
    if (!override) return p;
    return {
      ...p,
      menudeo: override.menudeo ?? p.menudeo,
      mayoreo: override.mayoreo ?? p.mayoreo,
    };
  });

  const customNoDuplicates = overlay.customProducts.filter(
    (custom) => !withPriceOverrides.some((p) => p.id === custom.id)
  );

  return [...withPriceOverrides, ...customNoDuplicates];
}

// ── API pública: lectura ───────────────────────────────────────────

export async function getCatalog(
  redis: Redis = getRedis()
): Promise<Producto[]> {
  const source = getSource();
  const overlay = await getOverlay(redis);
  return applyOverlay(source, overlay);
}

export async function findById(
  id: string,
  redis: Redis = getRedis()
): Promise<Producto | null> {
  const all = await getCatalog(redis);
  return all.find((p) => p.id === id) ?? null;
}

export async function findBySlug(
  slug: string,
  redis: Redis = getRedis()
): Promise<Producto | null> {
  // Normalización agresiva: quita tildes, guiones, espacios y símbolos
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const target = normalize(slug);
  const all = await getCatalog(redis);

  return (
    all.find(
      (p) => normalize(p.slug) === target || normalize(p.nombre) === target
    ) ?? null
  );
}

export async function findByCategoria(
  categoria: CategoriaProducto,
  redis: Redis = getRedis()
): Promise<Producto[]> {
  const all = await getCatalog(redis);
  return all.filter((p) => p.categoria === categoria);
}

/**
 * Búsqueda libre: matchea contra nombre, slug, info y categoría libre.
 * Es básica (substring case-insensitive). En la Fase 6 vamos a reemplazar
 * esto con embeddings de pgvector para búsqueda semántica real.
 */
export async function search(
  query: string,
  redis: Redis = getRedis()
): Promise<Producto[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const slugQ = slugify(query);
  const all = await getCatalog(redis);

  return all.filter((p) => {
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.slug.includes(slugQ) ||
      p.info.toLowerCase().includes(q) ||
      (p.categoriaLibre?.toLowerCase().includes(q) ?? false)
    );
  });
}

// ── API pública: mutaciones (admin / Jack) ─────────────────────────

export async function setPriceOverride(
  productId: string,
  prices: Partial<PrecioProducto>,
  updatedBy: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  overlay.priceOverrides[productId] = {
    ...overlay.priceOverrides[productId],
    ...prices,
  };
  overlay.lastUpdatedBy = updatedBy;
  await saveOverlay(redis, overlay);
  log.info({ productId, prices, updatedBy }, "Precio actualizado vía overlay");
}

export async function clearPriceOverride(
  productId: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  delete overlay.priceOverrides[productId];
  await saveOverlay(redis, overlay);
}

export async function hideProduct(
  productId: string,
  updatedBy: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  if (!overlay.hiddenProductIds.includes(productId)) {
    overlay.hiddenProductIds.push(productId);
  }
  overlay.lastUpdatedBy = updatedBy;
  await saveOverlay(redis, overlay);
}

export async function unhideProduct(
  productId: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  overlay.hiddenProductIds = overlay.hiddenProductIds.filter(
    (id) => id !== productId
  );
  await saveOverlay(redis, overlay);
}

export async function addCustomProduct(
  producto: Producto,
  updatedBy: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  // Si ya existe (mismo id) lo reemplaza
  overlay.customProducts = overlay.customProducts.filter(
    (p) => p.id !== producto.id
  );
  overlay.customProducts.push(producto);
  overlay.lastUpdatedBy = updatedBy;
  await saveOverlay(redis, overlay);
  log.info(
    { id: producto.id, nombre: producto.nombre, updatedBy },
    "Producto custom agregado"
  );
}

export async function removeCustomProduct(
  productId: string,
  redis: Redis = getRedis()
): Promise<void> {
  const overlay = await getOverlay(redis);
  overlay.customProducts = overlay.customProducts.filter(
    (p) => p.id !== productId
  );
  await saveOverlay(redis, overlay);
}

export async function getRawOverlay(
  redis: Redis = getRedis()
): Promise<CatalogOverlay> {
  return getOverlay(redis);
}