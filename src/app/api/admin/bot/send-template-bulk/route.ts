/**
 * POST /api/admin/bot/send-template-bulk
 *
 * Envio masivo de la plantilla de bienvenida a conversaciones SIN RESPONDER:
 * clientes cuyo ULTIMO mensaje es de ellos (escribieron y nadie contesto)
 * y que NO hayan recibido la bienvenida antes (marca bienvenidaEnviadaAt).
 *
 * Procesa por LOTES con cursor de SCAN para no exceder timeouts de Vercel.
 * El front llama repetidamente hasta done=true.
 *
 * Body: { mode: "dry" | "send", cursor?: "0", templateName?, language? }
 * Respuesta: { done, cursor, batch, candidates, sent, failed, language, errors }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { sendTemplate } from "@/lib/bot/services/meta/template";
import { getRedis } from "@/lib/bot/repositories/redis";
import { getLogger } from "@/lib/bot/observability/logger";

export const maxDuration = 60;

const log = getLogger({ module: "api/admin/bot/send-template-bulk" });

const BATCH = 60;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const mode = body.mode === "send" ? "send" : "dry";
  const cursor = String(body.cursor ?? "0");
  const templateName = String(body.templateName ?? "el_coyote");
  let language = String(body.language ?? "en");

  const redis = getRedis();
  const [nextCursor, keys] = await redis.scan(cursor, {
    match: "v2:cliente:*",
    count: BATCH,
  });

  let candidates = 0;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const key of keys as string[]) {
    try {
      const telefono = String(key).replace("v2:cliente:", "");
      const perfil = await redis.get<any>(key);
      if (!perfil) continue;
      // Anti-duplicado: ya se le mando la bienvenida antes
      if (perfil.bienvenidaEnviadaAt) continue;

      // Ultimo mensaje del historial: debe ser DEL CLIENTE (sin responder)
      const hist = await redis.lrange(`v2:historial:${telefono}`, -1, -1);
      if (!hist || hist.length === 0) continue; // sin mensajes = contacto frio, fuera
      let ultimo: any = hist[0];
      if (typeof ultimo === "string") {
        try {
          ultimo = JSON.parse(ultimo);
        } catch {
          continue;
        }
      }
      if (ultimo?.role !== "user") continue; // ya respondido (humano o bot)

      candidates++;

      if (mode === "send") {
        let r = await sendTemplate({ to: telefono, templateName, language });
        // Retry automatico de codigo de idioma (en vs en_US vs es)
        if (
          !r.ok &&
          (r.errorCode === 132001 || /translation|language/i.test(r.error ?? ""))
        ) {
          const altLang = language === "en" ? "en_US" : "en";
          const r2 = await sendTemplate({ to: telefono, templateName, language: altLang });
          if (r2.ok) {
            language = altLang; // fijar para el resto del lote
            r = r2;
          }
        }
        if (r.ok) {
          sent++;
          await redis.set(key, {
            ...perfil,
            bienvenidaEnviadaAt: new Date().toISOString(),
          });
        } else {
          failed++;
          if (errors.length < 5) errors.push(`${telefono}: ${r.error}`);
        }
        // Throttle suave para no saturar Meta
        await new Promise((res) => setTimeout(res, 120));
      }
    } catch (err) {
      log.warn({ err, key }, "Error procesando cliente en bulk");
    }
  }

  const done = String(nextCursor) === "0";
  log.info({ mode, cursor, done, batch: keys.length, candidates, sent, failed }, "Bulk template lote");

  return NextResponse.json({
    done,
    cursor: String(nextCursor),
    batch: keys.length,
    candidates,
    sent,
    failed,
    language,
    errors,
  });
}
