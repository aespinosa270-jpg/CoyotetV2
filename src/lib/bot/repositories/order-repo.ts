/**
 * Repository de pedidos.
 *
 * Pedidos cerrados (con pago confirmado), append-only por cliente. Los
 * incrementos al perfil del cliente (totalCompras, montoAcumulado) los
 * hace `client-repo.registrarPedido()` — este repo solo guarda el log.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { getLogger } from "../observability/logger";
import type { PedidoRegistro } from "../types/domain";

const log = getLogger({ module: "order-repo" });

export async function getPedidos(
  phone: string,
  redis: Redis = getRedis()
): Promise<PedidoRegistro[]> {
  try {
    const data = await redis.get<PedidoRegistro[]>(keys.pedidos(phone));
    return data ?? [];
  } catch (err) {
    log.error({ err, phone }, "Error leyendo pedidos");
    return [];
  }
}

export async function appendPedido(
  phone: string,
  pedido: PedidoRegistro,
  redis: Redis = getRedis()
): Promise<PedidoRegistro[]> {
  const current = await getPedidos(phone, redis);
  const updated = [...current, pedido];
  await redis.set(keys.pedidos(phone), updated);
  return updated;
}

export async function getUltimoPedido(
  phone: string,
  redis: Redis = getRedis()
): Promise<PedidoRegistro | null> {
  const all = await getPedidos(phone, redis);
  return all.length === 0 ? null : all[all.length - 1];
}

export async function totalGastado(
  phone: string,
  redis: Redis = getRedis()
): Promise<number> {
  const all = await getPedidos(phone, redis);
  return all.reduce((acc, p) => acc + p.monto, 0);
}
