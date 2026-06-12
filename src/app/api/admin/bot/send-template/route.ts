/**
 * POST /api/admin/bot/send-template
 *
 * Permite al admin enviar una plantilla aprobada a un cliente específico.
 * Útil para casos puntuales sin esperar al cron de reactivación.
 *
 * Body:
 *   {
 *     telefono: "5215551234567",
 *     templateName: "bienvenida"  (default)
 *   }
 *
 * Solo accesible para admins (requireAdmin guard).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { sendTemplate, TEMPLATES } from "@/lib/bot/services/meta/template";
import { getRedis } from "@/lib/bot/repositories/redis";
import { recordEvent } from "@/lib/bot/observability/events";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/send-template" });

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const telefono = String(body.telefono ?? "").trim();
  const templateName = String(body.templateName ?? TEMPLATES.BIENVENIDA.name);

  if (!telefono || !/^\d{10,15}$/.test(telefono)) {
    return NextResponse.json(
      { error: "Teléfono inválido (debe ser E.164 sin +)" },
      { status: 400 }
    );
  }

  // Validar que la plantilla está en nuestra lista conocida
  const templateConfig = Object.values(TEMPLATES).find(
    (t) => t.name === templateName
  );
  if (!templateConfig) {
    return NextResponse.json(
      {
        error: `Plantilla "${templateName}" no está registrada en TEMPLATES`,
        plantillas_validas: Object.values(TEMPLATES).map((t) => t.name),
      },
      { status: 400 }
    );
  }

  // Enviar
  const result = await sendTemplate({
    to: telefono,
    templateName,
    language: templateConfig.language,
    headerImageUrl: (templateConfig as any).headerImageUrl,
  });

  // Audit log
  await recordEvent({
    type: result.ok ? "reactivation_sent" : "error",
    clientId: telefono,
    channel: "whatsapp",
    data: {
      modo: "envio_manual_admin",
      template: templateName,
      messageId: result.messageId,
      error: result.error,
      errorCode: result.errorCode,
    },
  });

  // Si exitoso, actualizar lastSent en perfil del cliente
  if (result.ok) {
    try {
      const redis = getRedis();
      const key = `v2:cliente:${telefono}`;
      const perfil = await redis.get<any>(key);
      if (perfil) {
        await redis.set(key, {
          ...perfil,
          ultimaReactivacion: new Date().toISOString(),
        });
      }
    } catch (err) {
      log.warn({ err, telefono }, "No se pudo actualizar lastSent en perfil");
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
