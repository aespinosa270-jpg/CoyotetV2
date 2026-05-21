/**
 * Cron WEEKLY LEARNING — corre cada viernes 18:00 CDMX (00:00 UTC sábado)
 *
 * Analiza la semana operativa del bot y genera reglas nuevas via GPT-4o.
 * Las reglas se inyectan automáticamente al system prompt desde ese momento.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "../_lib/guard";
import { runWeeklyLearningJob } from "@/lib/bot/intelligence/learning/weekly-analyzer";
import { sendText } from "@/lib/bot/services/meta/send";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/cron/weekly-learning" });
const ADMIN_PHONE = "5215627301525";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.coyotetextil.com";

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  try {
    const result = await runWeeklyLearningJob();

    // Notificar al admin via WhatsApp
    if (result.ok) {
      const mensaje = `🧠 *APRENDIZAJE SEMANAL COYOTE BOT*

✨ Reglas nuevas agregadas: *${result.reglasAgregadas}*

📊 Resumen del analista:
${result.resumen || "(sin resumen)"}

🔍 Ver detalles y editar reglas:
${BASE_URL}/crm/admin/bot/aprendizaje`;

      await sendText(ADMIN_PHONE, mensaje);
    } else {
      await sendText(
        ADMIN_PHONE,
        `⚠️ Aprendizaje semanal falló: ${result.error || "error desconocido"}`
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Error en weekly-learning endpoint");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}