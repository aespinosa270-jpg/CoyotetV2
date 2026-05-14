/**
 * Configuración del bot v2.
 *
 * Permite cambiar (sin redeploy):
 *  - BOT_V2_ENABLED (toggle global)
 *  - BOT_V2_PERCENTAGE (slider 0-100)
 *  - BOT_V2_PHONES (lista de números VIP que SIEMPRE usan v2)
 *  - Instrucciones extra que se inyectan al system prompt
 *
 * Estos valores viven en v2:config en Redis. El runtime los lee y usa como
 * overlay sobre las env vars.
 */
import { getRedis } from "@/lib/bot/repositories/redis";
import { BotConfigForm } from "../_components/BotConfigForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BotConfig {
  enabled?: boolean;
  percentage?: number;
  phones?: string[];
  extraInstructions?: string;
  tone?: string;
  updatedAt?: string;
}

export default async function ConfigPage() {
  const redis = getRedis();
  const config = (await redis.get<BotConfig>("v2:config")) ?? {};

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Configuración del Bot
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cambios aquí afectan al bot en producción inmediatamente, sin redeploy.
        </p>
      </header>

      <BotConfigForm initial={config} />

      {config.updatedAt && (
        <p className="text-xs text-slate-400">
          Última actualización: {new Date(config.updatedAt).toLocaleString("es-MX")}
        </p>
      )}
    </div>
  );
}
