/**
 * Last-Quote Detector — detecta si el cliente VOLVIÓ a escribir después de
 * tener una conversación reciente SIN cerrar venta.
 *
 * Cómo funciona:
 *  1. Lee historial Redis (getHistorial)
 *  2. Calcula días desde último mensaje del cliente
 *  3. Si pasaron 1-30 días → escanea menciones de productos del catálogo +
 *     cantidades + precios mencionados
 *  4. Verifica que NO haya orden PAID reciente en ese rango
 *  5. Devuelve flag "hayLeadPendiente" + lista de productos cotizados
 *
 * Cache: 5 min en Redis para no escanear historial en cada turno.
 */
import { prisma } from "@/lib/prisma";
import { getHistorial } from "../../repositories/conversation-repo";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";
import { products } from "@/lib/products";

const log = getLogger({ module: "intelligence/last-quote-detector" });

const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_KEY = (phone: string) => `v2:last_quote:${phone}`;

export interface LastQuoteDetection {
  hayLeadPendiente: boolean;
  diasDesdeUltimoContacto: number | null;
  productosCotizados: string[];
  cantidadesMencionadas: string[];
  ultimaCotizacionTotal: number | null;
}

const EMPTY: LastQuoteDetection = {
  hayLeadPendiente: false,
  diasDesdeUltimoContacto: null,
  productosCotizados: [],
  cantidadesMencionadas: [],
  ultimaCotizacionTotal: null,
};

// Construir lista de keywords de productos para regex match
function buildProductKeywords(): Array<{ keyword: string; titulo: string }> {
  const keywords: Array<{ keyword: string; titulo: string }> = [];
  for (const p of products) {
    // Nombre completo
    keywords.push({ keyword: p.title.toLowerCase(), titulo: p.title });
    // Primera palabra (ej. "Felpa Polar" → "felpa")
    const firstWord = p.title.toLowerCase().split(/\s+/)[0];
    if (firstWord.length >= 4 && firstWord !== p.title.toLowerCase()) {
      keywords.push({ keyword: firstWord, titulo: p.title });
    }
  }
  return keywords;
}

const PRODUCT_KEYWORDS = buildProductKeywords();

export async function detectLastQuote(
  phone: string
): Promise<LastQuoteDetection> {
  if (!phone || phone.startsWith("web:")) return EMPTY;

  const redis = getRedis();
  const cacheKey = CACHE_KEY(phone);

  // 1. Cache
  try {
    const cached = await redis.get<LastQuoteDetection>(cacheKey);
    if (cached && typeof cached === "object") return cached;
  } catch {}

  try {
    // 2. Leer historial
    const historial = await getHistorial(phone);
    if (historial.length === 0) {
      await redis.set(cacheKey, EMPTY, { ex: CACHE_TTL_SECONDS });
      return EMPTY;
    }

    // 3. Último mensaje del CLIENTE (no del bot)
    let lastClientMsg: any = null;
    for (let i = historial.length - 1; i >= 0; i--) {
      const m = historial[i] as any;
      if (m.role === "user") {
        lastClientMsg = m;
        break;
      }
    }
    if (!lastClientMsg || !lastClientMsg.timestamp) {
      await redis.set(cacheKey, EMPTY, { ex: CACHE_TTL_SECONDS });
      return EMPTY;
    }

    const lastTs = new Date(lastClientMsg.timestamp).getTime();
    const diasDesde = Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24));

    // 4. Solo activamos si pasaron entre 1 y 30 días (volvió, pero no es ancient history)
    if (diasDesde < 1 || diasDesde > 30) {
      const result = { ...EMPTY, diasDesdeUltimoContacto: diasDesde };
      await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
      return result;
    }

    // 5. Verificar que NO compró en ese rango
    const phoneClean = phone.replace(/\D/g, "");
    const phoneVariants = [
      phoneClean,
      phoneClean.startsWith("521") ? phoneClean.slice(3) : null,
      phoneClean.startsWith("52") ? phoneClean.slice(2) : null,
    ].filter(Boolean) as string[];

    const cutoffDate = new Date(lastTs);
    const recentPaid = await prisma.order.count({
      where: {
        OR: [
          { customerPhone: { in: phoneVariants } },
          { botPhone: { in: phoneVariants } },
        ],
        status: { in: ["PAID", "DELIVERED"] },
        createdAt: { gte: cutoffDate },
      },
    });

    if (recentPaid > 0) {
      // Ya cerró venta — no es lead pendiente
      const result = { ...EMPTY, diasDesdeUltimoContacto: diasDesde };
      await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
      return result;
    }

    // 6. Escanear el HISTORIAL completo (últimos 30 msgs) buscando productos + cantidades + precios
    const recentMsgs = historial.slice(-30);
    const textCombined = recentMsgs
      .map((m: any) => m.content || "")
      .join("\n")
      .toLowerCase();

    // Detectar productos mencionados (deduplicar)
    const productosSet = new Set<string>();
    for (const { keyword, titulo } of PRODUCT_KEYWORDS) {
      // Word boundary para evitar falsos positivos
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(textCombined)) {
        productosSet.add(titulo);
      }
    }
    const productosCotizados = Array.from(productosSet).slice(0, 5);

    // Detectar cantidades (X kg, X metros, X rollos)
    const cantidadesSet = new Set<string>();
    const qtyRegex = /\b(\d+(?:\.\d+)?)\s*(kg|kilos?|metros?|m\b|mts?|rollos?|piezas?|conos?)/gi;
    let m: RegExpExecArray | null;
    while ((m = qtyRegex.exec(textCombined)) !== null) {
      cantidadesSet.add(`${m[1]} ${m[2]}`);
    }
    const cantidadesMencionadas = Array.from(cantidadesSet).slice(0, 5);

    // Detectar precio cotizado (último $X,XXX mencionado)
    let ultimaCotizacionTotal: number | null = null;
    const priceMatches = textCombined.match(/\$\s*(\d{1,3}(?:[,]\d{3})*(?:\.\d+)?)/g);
    if (priceMatches && priceMatches.length > 0) {
      const lastPriceStr = priceMatches[priceMatches.length - 1];
      const num = parseFloat(lastPriceStr.replace(/[\$,\s]/g, ""));
      if (!isNaN(num) && num >= 100) {
        ultimaCotizacionTotal = num;
      }
    }

    // Es lead pendiente solo si menciona al menos 1 producto del catálogo
    const hayLeadPendiente = productosCotizados.length > 0;

    const result: LastQuoteDetection = {
      hayLeadPendiente,
      diasDesdeUltimoContacto: diasDesde,
      productosCotizados,
      cantidadesMencionadas,
      ultimaCotizacionTotal,
    };

    await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
    return result;
  } catch (err) {
    log.error({ err, phone }, "Error detectando last-quote");
    return EMPTY;
  }
}