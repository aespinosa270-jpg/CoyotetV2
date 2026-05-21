/**
 * Trust Score Calculator
 *
 * Mantiene el score de confianza por cliente (0-100).
 * Score base: 70 (neutral). Sube con interacciones positivas, baja con quejas/ghosting.
 *
 * Filosofía:
 *   - Trust no es loyalty. Trust es "este cliente se comporta bien Y nosotros le cumplimos".
 *   - Sirve para priorizar: clientes con trust alto = VIP merecedor de prioridad y atención.
 *   - Clientes con trust bajo = revisar antes de aceptar pedidos grandes.
 *
 * Eventos y su delta:
 *   - +5  order_delivered_on_time   (entrega cumplida en/antes del lead time)
 *   - +3  aftercare_positive        (respondió bien al check de D+7)
 *   - +2  repeat_purchase           (compra recurrente)
 *   - +1  on_time_payment           (paga a tiempo SPEI/transferencia)
 *   - -3  aftercare_complaint       (cliente reportó problema)
 *   - -5  cancelled_order           (cancela después de confirmar)
 *   - -5  failed_delivery           (no recibió o devolvió por error suyo)
 *   - -10 fraud_attempt             (intento de fraude detectado)
 *   - -2  ghosting_high_priority    (no responde a aftercare 2+ veces)
 */
import { prisma } from "@/lib/prisma";

export const TRUST_DELTAS = {
  order_delivered_on_time: 5,
  aftercare_positive: 3,
  repeat_purchase: 2,
  on_time_payment: 1,
  aftercare_complaint: -3,
  cancelled_order: -5,
  failed_delivery: -5,
  fraud_attempt: -10,
  ghosting_high_priority: -2,
} as const;

export type TrustEventType = keyof typeof TRUST_DELTAS;

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Aplica un delta al trust score de un User.
 * Crea AftercareEvent + actualiza User atómicamente.
 */
export async function applyTrustDelta(params: {
  userId: string;
  eventType: TrustEventType;
  orderId?: string;
  contactId?: string;
  notas?: string;
  responseText?: string;
}): Promise<{ newScore: number; oldScore: number; delta: number }> {
  const delta = TRUST_DELTAS[params.eventType];

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: { trustScore: true, trustEvents: true },
    });

    if (!user) {
      throw new Error(`User ${params.userId} no existe`);
    }

    const oldScore = user.trustScore;
    const newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, oldScore + delta));

    // Crear AftercareEvent
    await tx.aftercareEvent.create({
      data: {
        userId: params.userId,
        orderId: params.orderId ?? null,
        contactId: params.contactId ?? null,
        type: params.eventType,
        channel: "auto",
        trustDelta: delta,
        outcome:
          params.eventType.includes("positive") || params.eventType.includes("delivered") || params.eventType === "repeat_purchase"
            ? "positive_response"
            : params.eventType.includes("complaint") || params.eventType.includes("fraud")
            ? "complaint"
            : "no_response",
        responseText: params.responseText ?? null,
        notas: params.notas ?? null,
      },
    });

    // Actualizar User
    await tx.user.update({
      where: { id: params.userId },
      data: {
        trustScore: newScore,
        trustEvents: user.trustEvents + 1,
      },
    });

    return { newScore, oldScore, delta };
  });
}

/**
 * Helpers de lectura
 */
export function getTrustLevel(score: number): "fan" | "trusted" | "neutral" | "watch" | "risk" {
  if (score >= 90) return "fan";
  if (score >= 75) return "trusted";
  if (score >= 50) return "neutral";
  if (score >= 30) return "watch";
  return "risk";
}

export function getTrustLabel(score: number): string {
  const level = getTrustLevel(score);
  return {
    fan: "🌟 Fan",
    trusted: "✅ Confiable",
    neutral: "• Neutral",
    watch: "⚠ Vigilar",
    risk: "🚫 Riesgo",
  }[level];
}

export function getTrustColor(score: number): string {
  const level = getTrustLevel(score);
  return {
    fan: "bg-emerald-100 text-emerald-800",
    trusted: "bg-blue-100 text-blue-800",
    neutral: "bg-neutral-100 text-neutral-700",
    watch: "bg-amber-100 text-amber-800",
    risk: "bg-red-100 text-red-800",
  }[level];
}