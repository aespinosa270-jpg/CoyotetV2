import type { Redis } from "@upstash/redis";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "guard-dedupe" });

export async function isDuplicateMessage(messageId: string, redis: Redis): Promise<boolean> {
  if (!messageId) return false;
  const key = `processed_msg:${messageId}`;
  try {
    const isProcessed = await redis.get(key);
    if (isProcessed) {
      log.warn({ messageId }, "Mensaje duplicado detectado y bloqueado");
      return true;
    }
    await redis.set(key, "1", { ex: 300 }); // Expira en 5 minutos
    return false;
  } catch (err) {
    log.error({ err }, "Error verificando deduplicación");
    return false;
  }
}
