/**
 * Servicio de Programa de Referidos.
 *
 * Logica:
 *  - generateReferralCode: crea codigo unico para un User
 *  - findPendingReferralByPhone: busca si un lead ya tiene codigo pending
 *  - registerReferralUsage: crea Referral pending cuando bot detecta codigo
 *  - convertReferral: al pagar la orden, marca converted + suma credito al referrer
 *  - applyCredit: descuenta credito del referrer en su proxima orden
 */
import { prisma } from "@/lib/prisma";
import { REFERRALS_CONFIG } from "./config";

/**
 * Genera un codigo de referido unico para un User.
 * Formato: "COYOTE-{firstName3}{suffix}"
 * Ej: "COYOTE-JAC4F2A"
 *
 * Idempotente: si el user ya tiene codigo, devuelve el existente.
 */
export async function generateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, referralCode: true },
  });

  if (!user) throw new Error(`User ${userId} no existe`);
  if (user.referralCode) return user.referralCode;

  // Generar parte alfabetica del nombre
  const namePart = (user.name ?? "USR")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 3)
    .padEnd(3, "X");

  // Suffix aleatorio para evitar colisiones
  let attempts = 0;
  while (attempts < 10) {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${REFERRALS_CONFIG.codePrefix}-${namePart}${suffix}`;

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    }
    attempts++;
  }

  throw new Error("No se pudo generar codigo unico despues de 10 intentos");
}

/**
 * Busca Referral pendiente por telefono del referido.
 * Util para validar si un lead ya tiene codigo aplicado.
 */
export async function findPendingReferralByPhone(phone: string) {
  return prisma.referral.findFirst({
    where: {
      refereePhone: phone,
      status: "pending",
    },
    include: {
      referrer: { select: { id: true, name: true, phone: true, referralCode: true } },
    },
  });
}

/**
 * Valida un codigo de referido. Devuelve el referrer si es valido.
 * Si el codigo no existe o es del mismo usuario, devuelve null.
 */
export async function validateReferralCode(code: string, refereePhone?: string) {
  const normalized = code.trim().toUpperCase();

  const referrer = await prisma.user.findUnique({
    where: { referralCode: normalized },
    select: { id: true, name: true, phone: true, referralCode: true },
  });

  if (!referrer) return null;

  // No puede recomendarse a si mismo
  if (refereePhone && referrer.phone === refereePhone) return null;

  return referrer;
}

/**
 * Registra el uso de un codigo de referido (cuando bot lo detecta en mensaje).
 * Status: pending (espera a que pague la 1ra orden ≥ minOrderAmount).
 *
 * Si ya existe pending para este phone, lo devuelve sin duplicar.
 */
export async function registerReferralUsage(params: {
  code: string;
  refereePhone: string;
  refereeName?: string;
}) {
  const normalized = params.code.trim().toUpperCase();

  // Validar codigo
  const referrer = await validateReferralCode(normalized, params.refereePhone);
  if (!referrer) {
    return { ok: false as const, error: "codigo_invalido" };
  }

  // No duplicar si ya tiene pending
  const existing = await findPendingReferralByPhone(params.refereePhone);
  if (existing) {
    return { ok: true as const, referral: existing, alreadyExists: true };
  }

  const referral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereePhone: params.refereePhone,
      refereeName: params.refereeName,
      codeUsed: normalized,
      status: "pending",
    },
    include: {
      referrer: { select: { id: true, name: true, phone: true } },
    },
  });

  return { ok: true as const, referral, alreadyExists: false };
}

/**
 * Convierte un Referral pendiente cuando se paga la 1ra orden.
 * - Marca status = converted
 * - Aplica creditEarned al referrer
 * - Devuelve la info para que el caller pueda notificar
 *
 * Idempotente: si ya esta converted, no duplica.
 */
export async function convertReferral(params: {
  orderId: string;
  orderTotal: number;
  refereePhone: string;
  refereeUserId?: string;
}) {
  if (params.orderTotal < REFERRALS_CONFIG.minOrderAmount) {
    return { ok: false as const, reason: "monto_minimo_no_alcanzado" };
  }

  const pending = await findPendingReferralByPhone(params.refereePhone);
  if (!pending) return { ok: false as const, reason: "no_pending_referral" };

  // Idempotencia
  if (pending.status !== "pending") {
    return { ok: false as const, reason: "ya_convertido" };
  }

  // Transaccion atomica: marcar converted + sumar credito + link Order
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.referral.update({
      where: { id: pending.id },
      data: {
        status: "converted",
        orderId: params.orderId,
        orderTotal: params.orderTotal,
        creditEarned: REFERRALS_CONFIG.referrerReward,
        convertedAt: new Date(),
        refereeId: params.refereeUserId,
      },
    });

    const referrerUpdated = await tx.user.update({
      where: { id: pending.referrerId },
      data: { referralCredit: { increment: REFERRALS_CONFIG.referrerReward } },
      select: { id: true, name: true, phone: true, referralCredit: true },
    });

    // Tambien linkear la Order
    await tx.order.update({
      where: { id: params.orderId },
      data: { referralId: updated.id },
    });

    return { referral: updated, referrer: referrerUpdated };
  });

  return { ok: true as const, ...result };
}

/**
 * Aplica credito acumulado del referrer en su proxima orden.
 * Descuenta del User.referralCredit y registra el monto aplicado en Order.creditApplied.
 */
export async function applyReferralCredit(params: {
  userId: string;
  orderId: string;
  maxAmount: number; // hasta cuanto se puede aplicar (ej: subtotal)
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { referralCredit: true },
  });

  if (!user || user.referralCredit <= 0) {
    return { ok: false as const, applied: 0 };
  }

  const toApply = Math.min(user.referralCredit, params.maxAmount);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: params.userId },
      data: { referralCredit: { decrement: toApply } },
    });
    await tx.order.update({
      where: { id: params.orderId },
      data: { creditApplied: toApply },
    });
  });

  return { ok: true as const, applied: toApply };
}

/**
 * Extrae un codigo de referido del mensaje del cliente.
 * Detecta patrones: "COYOTE-XXX", "código COYOTE-XXX", "vengo de parte COYOTE-XXX".
 */
export function extractReferralCode(message: string): string | null {
  const m = message.match(/COYOTE[-\s]?[A-Z0-9]{5,10}/i);
  if (!m) return null;
  // Normalizar
  return m[0].toUpperCase().replace(/\s+/g, "-").replace(/--/g, "-");
}