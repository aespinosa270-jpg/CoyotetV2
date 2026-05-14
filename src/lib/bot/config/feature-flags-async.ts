import { getRedis } from "../repositories/redis";

const KILL_SWITCH_KEY = "v2:kill_switch";

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
