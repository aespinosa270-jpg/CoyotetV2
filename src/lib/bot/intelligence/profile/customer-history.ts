/**
 * Customer History — obtiene el historial real de pedidos del cliente
 * combinando órdenes del bot + órdenes web legacy.
 *
 * Cache: 5 minutos en Redis para no consultar Prisma cada turno.
 */
import { prisma } from "@/lib/prisma";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "intelligence/customer-history" });

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutos
const CACHE_KEY = (phone: string) => `v2:customer_history:${phone}`;

export interface CustomerHistory {
  esRecurrente: boolean;
  totalOrdenes: number;
  ticketAcumulado: number;
  ticketPromedio: number;
  ultimaOrden: {
    fecha: string;       // ISO
    diasDesde: number;
    items: Array<{ titulo: string; cantidad: number; total: number; color?: string }>;
    total: number;
  } | null;
  productosFavoritos: string[]; // top 3 más comprados
}

const EMPTY: CustomerHistory = {
  esRecurrente: false,
  totalOrdenes: 0,
  ticketAcumulado: 0,
  ticketPromedio: 0,
  ultimaOrden: null,
  productosFavoritos: [],
};

export async function getCustomerHistory(
  phone: string
): Promise<CustomerHistory> {
  if (!phone || phone.startsWith("web:")) return EMPTY;

  const redis = getRedis();
  const cacheKey = CACHE_KEY(phone);

  // 1. Intentar cache Redis
  try {
    const cached = await redis.get<CustomerHistory>(cacheKey);
    if (cached && typeof cached === "object") {
      return cached;
    }
  } catch (err) {
    log.warn({ err, phone }, "Error leyendo cache historial");
  }

  // 2. Consultar Prisma
  try {
    // Variantes del phone: con prefijo 521, 52, sin prefijo
    const phoneClean = phone.replace(/\D/g, "");
    const phoneVariants = [
      phoneClean,
      phoneClean.startsWith("521") ? phoneClean.slice(3) : null,
      phoneClean.startsWith("52") ? phoneClean.slice(2) : null,
      phoneClean.startsWith("521") ? "52" + phoneClean.slice(3) : null,
    ].filter(Boolean) as string[];

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerPhone: { in: phoneVariants } },
          { botPhone: { in: phoneVariants } },
        ],
        status: { in: ["PAID", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          select: {
            title: true,
            quantity: true,
            price: true,
            color: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      await redis.set(cacheKey, EMPTY, { ex: CACHE_TTL_SECONDS });
      return EMPTY;
    }

    // Calcular totales
    const totalOrdenes = orders.length;
    const ticketAcumulado = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const ticketPromedio = ticketAcumulado / totalOrdenes;

    // Última orden
    const last = orders[0];
    const diasDesde = Math.floor(
      (Date.now() - last.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Productos favoritos (agregado por título)
    const productCount: Record<string, number> = {};
    for (const o of orders) {
      for (const it of o.items) {
        productCount[it.title] = (productCount[it.title] || 0) + (it.quantity || 1);
      }
    }
    const productosFavoritos = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([titulo]) => titulo);

    const history: CustomerHistory = {
      esRecurrente: totalOrdenes >= 1,
      totalOrdenes,
      ticketAcumulado,
      ticketPromedio,
      ultimaOrden: {
        fecha: last.createdAt.toISOString(),
        diasDesde,
        items: last.items.map((it) => ({
          titulo: it.title,
          cantidad: it.quantity || 1,
          total: (it.price || 0) * (it.quantity || 1),
          color: (it as any).color || undefined,
        })),
        total: last.total || 0,
      },
      productosFavoritos,
    };

    // 3. Guardar en cache
    await redis.set(cacheKey, history, { ex: CACHE_TTL_SECONDS });

    return history;
  } catch (err) {
    log.error({ err, phone }, "Error obteniendo historial de cliente");
    return EMPTY;
  }
}

/** Limpia el cache del cliente — útil cuando se crea una orden nueva */
export async function invalidateCustomerHistoryCache(phone: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY(phone));
  } catch (err) {
    log.warn({ err, phone }, "Error limpiando cache historial");
  }
}