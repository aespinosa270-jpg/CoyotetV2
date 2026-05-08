import { getEnv } from "./env";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "feature-flags" });

export function shouldUseBotV2(phoneNumber: string): boolean {
  const env = getEnv();
  
  // 1. Switch global: Si está encendido para todos, pasa directo.
  if (env.BOT_V2_ENABLED) return true;
  
  // 2. Lista blanca de teléfonos: (Testing seguro con tu número)
  const allowedPhones = env.BOT_V2_PHONES || [];
  if (allowedPhones.includes(phoneNumber)) {
    log.info({ phone: phoneNumber }, "Ruteando a V2 por lista blanca (BOT_V2_PHONES)");
    return true;
  }
  
  // 3. Rollout porcentual: (Ej. mandar el 10% del tráfico al nuevo bot)
  if (env.BOT_V2_PERCENTAGE > 0) {
    // Hash determinista simple usando el número para que el mismo usuario siempre caiga en la misma versión
    const hash = phoneNumber.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const inRollout = (hash % 100) < env.BOT_V2_PERCENTAGE;
    if (inRollout) {
      log.info({ phone: phoneNumber, percentage: env.BOT_V2_PERCENTAGE }, "Ruteando a V2 por rollout porcentual");
      return true;
    }
  }
  
  return false;
}
