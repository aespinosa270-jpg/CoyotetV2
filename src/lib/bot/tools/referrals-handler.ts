/**
 * Handler de tool aplicar_codigo_referido (Programa de Referidos).
 *
 * Cuando GPT detecta que el cliente menciono un codigo, invoca este tool.
 * El handler:
 *  1. Valida el codigo
 *  2. Registra Referral pending (idempotente)
 *  3. Devuelve mensaje legible para que GPT confirme al cliente
 */
import type { BotContext } from "../core/types";
import { registerReferralUsage } from "../services/referrals/service";
import { REFERRALS_CONFIG } from "../services/referrals/config";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "tools/referrals" });

export interface AplicarCodigoArgs {
  codigo: string;
}

export async function ejecutarAplicarCodigoReferido(
  args: AplicarCodigoArgs,
  ctx: BotContext
): Promise<unknown> {
  const phone = ctx.message.from.id;
  const codigo = args.codigo?.trim().toUpperCase();

  if (!codigo) {
    return {
      success: false,
      estado: "El codigo viene vacio. Pide al cliente que lo repita.",
    };
  }

  try {
    const result = await registerReferralUsage({
      code: codigo,
      refereePhone: phone,
      refereeName: ctx.profile.nombre,
    });

    if (!result.ok) {
      log.info({ phone, codigo, error: result.error }, "Codigo de referido invalido");
      return {
        success: false,
        estado: `Codigo "${codigo}" no es valido o no existe. Pide al cliente que lo verifique con quien lo refirio.`,
      };
    }

    if (result.alreadyExists) {
      return {
        success: true,
        estado: `Ya teniamos registrado el codigo ${codigo} para este cliente. El descuento de $${REFERRALS_CONFIG.refereeDiscount} aplica si su orden es de $${REFERRALS_CONFIG.minOrderAmount}+ MXN.`,
        referrerNombre: result.referral.referrer.name,
      };
    }

    log.info(
      { phone, codigo, referrerId: result.referral.referrerId },
      "Codigo de referido aplicado"
    );

    return {
      success: true,
      estado: `Registrado. El cliente recibira $${REFERRALS_CONFIG.refereeDiscount} de descuento en su primera orden (minimo $${REFERRALS_CONFIG.minOrderAmount} MXN). Confirma al cliente: "Listo, te aplicamos el codigo de ${result.referral.referrer.name ?? "tu referente"}. Cuando tu orden sea de $${REFERRALS_CONFIG.minOrderAmount}+ obtienes $${REFERRALS_CONFIG.refereeDiscount} de descuento."`,
      referrerNombre: result.referral.referrer.name,
      descuento: REFERRALS_CONFIG.refereeDiscount,
      minOrden: REFERRALS_CONFIG.minOrderAmount,
    };
  } catch (err) {
    log.error({ err, phone, codigo }, "Error registrando codigo referido");
    return {
      success: false,
      estado: "Error tecnico al registrar el codigo. Pide disculpas al cliente y dile que lo intentara mas tarde.",
    };
  }
}