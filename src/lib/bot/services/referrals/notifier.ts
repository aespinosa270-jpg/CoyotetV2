/**
 * Notificador de eventos del Programa de Referidos.
 *
 * Cuando un Referral pending se convierte (Pedro pagó usando código de Jack),
 * notifica a Jack por WhatsApp avisándole que ganó crédito.
 *
 * Estrategia:
 *  - Mensaje texto libre via sendText
 *  - Si referrer escribió al bot en últimas 24h, llega como mensaje normal
 *  - Si fuera de ventana, Meta probablemente lo rechaza (logueamos warning)
 *  - Marca Referral.notifiedAt para no duplicar
 *
 * NOTA: Para máxima entrega cuando estén fuera de ventana, en el futuro
 * crear plantilla "notificacion_referido" pre-aprobada en Meta y usarla
 * como fallback.
 */
import { prisma } from "@/lib/prisma";
import { sendText } from "../meta/send";
import { recordEvent } from "../../observability/events";
import { getRuntimeConfig } from "../../config/runtime-config";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "referrals-notifier" });

export interface NotifyReferrerParams {
  referralId: string;
  referrerId: string;
  referrerPhone: string | null;
  referrerName: string | null;
  refereeName: string | null;
  creditEarned: number;
  newBalance: number;
}

/**
 * Notifica al referrer que un Referral suyo se convirtio.
 * Si exito, marca Referral.notifiedAt para idempotencia.
 */
export async function notifyReferrerOfConversion(
  params: NotifyReferrerParams
): Promise<{ ok: boolean; reason?: string }> {
  if (!params.referrerPhone) {
    log.warn({ referralId: params.referralId }, "Referrer sin telefono, no se notifica");
    return { ok: false, reason: "no_phone" };
  }

  // Idempotencia: si ya se notifico, no duplicar
  const existing = await prisma.referral.findUnique({
    where: { id: params.referralId },
    select: { notifiedAt: true },
  });

  if (existing?.notifiedAt) {
    return { ok: false, reason: "already_notified" };
  }

  // Construir mensaje con brand voice (firma)
  const runtimeConfig = await getRuntimeConfig().catch(() => null);
  const firma = runtimeConfig?.brandVoice?.signature ?? "Coyote";

  const referrerFirstName = params.referrerName?.split(" ")[0] ?? "amigo";
  const refereeDisplay = params.refereeName ?? "Un cliente";

  const message =
    `🎉 ${referrerFirstName}, ¡${refereeDisplay} acaba de comprar usando tu código!\n\n` +
    `Acabas de ganar $${params.creditEarned} MXN de crédito 💰\n` +
    `Tu saldo actual: $${params.newBalance} MXN\n\n` +
    `Lo puedes usar en tu próxima compra. ¡Sigue compartiendo tu código!\n\n` +
    `— ${firma}`;

  try {
    const sent = await sendText(params.referrerPhone, message);

    if (sent) {
      // Marcar notifiedAt
      await prisma.referral.update({
        where: { id: params.referralId },
        data: { notifiedAt: new Date() },
      });

      // Tracking
      await recordEvent({
        type: "reactivation_sent",
        clientId: params.referrerPhone,
        channel: "whatsapp",
        data: {
          subtype: "referral_conversion_notification",
          referralId: params.referralId,
          creditEarned: params.creditEarned,
        },
      }).catch((err) => log.warn({ err }, "Fallo recordEvent"));

      log.info(
        {
          referralId: params.referralId,
          referrerPhone: params.referrerPhone,
          creditEarned: params.creditEarned,
        },
        "Notificacion de conversion enviada al referrer"
      );

      return { ok: true };
    }

    log.warn(
      { referralId: params.referralId, referrerPhone: params.referrerPhone },
      "sendText devolvio false (posiblemente fuera de ventana 24h)"
    );
    return { ok: false, reason: "send_failed" };
  } catch (err) {
    log.error(
      { err, referralId: params.referralId },
      "Error notificando al referrer"
    );
    return { ok: false, reason: "exception" };
  }
}