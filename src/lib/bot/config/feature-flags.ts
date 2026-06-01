import { getRedis } from "../repositories/redis";
const KILL_SWITCH_KEY = "v2:kill_switch";
const MODO_MANUAL_KEY = "v2:modo_manual";
export function shouldUseBotV2(_p: string): boolean {
  return true;
}
export async function shouldUseBotV2Async(_p: string): Promise<boolean> {
  try {
    const r = getRedis();
    const k = await r.get(KILL_SWITCH_KEY);
    if (k === "1" || k === 1) return false;
  } catch {}
  return true;
}
export async function killBotV2(): Promise<void> {
  await getRedis().set(KILL_SWITCH_KEY, "1");
}
export async function reviveBotV2(): Promise<void> {
  await getRedis().del(KILL_SWITCH_KEY);
}
export async function getKillSwitchStatus(): Promise<{ killed: boolean; v2Active: boolean }> {
  try {
    const v = await getRedis().get(KILL_SWITCH_KEY);
    const killed = v === "1" || v === 1;
    return { killed, v2Active: !killed };
  } catch {
    return { killed: false, v2Active: true };
  }
}

// ============================================================
// MODO MANUAL — apagado total de respuestas automaticas.
// Cuando esta activo, el webhook GUARDA el mensaje entrante en
// el historial (para que el asesor lo vea en el inbox) pero NO
// dispara ninguna respuesta automatica (ni V2 ni V1).
// El asesor responde manualmente desde el inbox.
// ============================================================
export async function isModoManual(): Promise<boolean> {
  try {
    const v = await getRedis().get(MODO_MANUAL_KEY);
    return v === "1" || v === 1;
  } catch {
    return false; // fail-safe: si Redis falla, NO bloquea el bot
  }
}
export async function activarModoManual(): Promise<void> {
  await getRedis().set(MODO_MANUAL_KEY, "1");
}
export async function desactivarModoManual(): Promise<void> {
  await getRedis().del(MODO_MANUAL_KEY);
}
export async function getModoManualStatus(): Promise<{ manual: boolean }> {
  return { manual: await isModoManual() };
}
