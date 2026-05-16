import type { BotContext } from "../../core/types";
import { generateCheckoutSession } from "../../services/stripe/checkout";
import * as clientRepo from "../../repositories/client-repo";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-generar-cobro" });

/**
 * Calcula el monto final garantizando IVA correcto cuando se requiere factura.
 *
 * Si con_factura=true:
 *   - Si monto_incluye_iva=true → el monto ya viene con IVA, no agregar
 *   - Si monto_incluye_iva=false (o no especificado) → agregar 16% al monto
 *
 * Si con_factura=false:
 *   - El monto se pasa tal cual (sin IVA)
 *
 * Esta garantía es CRÍTICA: el SAT factura sobre el monto cobrado.
 * Si cobramos menos, la factura sale con base mal calculada.
 */
function calcularMontoFinalConIva(args: any, context: BotContext): number {
  const montoBase = Number(args.monto);
  if (!args.con_factura) {
    return montoBase;
  }

  // Si el bot indicó explícitamente que el monto YA tiene IVA, respetarlo
  if (args.monto_incluye_iva === true) {
    log.info({ montoBase, msg: "Monto ya incluye IVA según el bot" });
    return montoBase;
  }

  // CASO PROBLEMÁTICO: con_factura=true pero NO sabemos si el monto incluye IVA.
  // Estrategia: si tenemos cotización previa en el perfil y coincide con el monto,
  // usar el total CON IVA de la cotización. Si no, agregar 16% al monto recibido.
  const cotizacion = context.profile.ultimaCotizacionObj;
  if (cotizacion) {
    const totalSinIva = Number(cotizacion.subtotalConEnvio) || 0;
    const totalConIva = Number(cotizacion.subtotalConEnvioConIva) || 0;

    // El monto recibido coincide con el total SIN IVA → usar el CON IVA
    if (Math.abs(montoBase - totalSinIva) < 1) {
      log.info({ montoBase, totalConIva, msg: "Monto coincide con cotización sin IVA, usando con IVA" });
      return totalConIva;
    }

    // El monto recibido ya coincide con el total CON IVA → respetarlo
    if (Math.abs(montoBase - totalConIva) < 1) {
      log.info({ montoBase, msg: "Monto ya coincide con cotización con IVA" });
      return montoBase;
    }
  }

  // Fallback: agregar IVA al monto recibido
  const montoConIva = Math.round(montoBase * 1.16 * 100) / 100;
  log.warn({ montoBase, montoConIva, msg: "No se encontró cotización, agregando 16% IVA al monto" });
  return montoConIva;
}

export async function generarCobroStripeHandler(args: any, context: BotContext) {
  log.info({ args }, "Generando link de Stripe vía Tool");
  try {
    const phone = context.message.from.id;

    // FASE 12 FIX: garantizar IVA correcto cuando se pide factura
    const montoFinal = calcularMontoFinalConIva(args, context);

    log.info({
      montoOriginal: args.monto,
      montoFinal,
      con_factura: args.con_factura,
      diferenciaIva: montoFinal - Number(args.monto)
    }, "Monto final calculado para Stripe");

    // 1. Construir input
    const inputData: any = {
      amountMxn: montoFinal,
      phone: phone,
      productos: (Array.isArray(context.profile.ultimaCotizacionObj?.productos)
        ? context.profile.ultimaCotizacionObj?.productos
        : [context.profile.ultimaCotizacionObj?.productos || "Pedido Coyote Textil"]) as string[]
    };

    // 2. Si requiere factura, anidamos datos fiscales
    if (args.con_factura) {
      inputData.factura = {
        rfc: args.rfc || "NONE",
        razonSocial: args.razon_social || "NONE",
        cpFiscal: args.cp_fiscal || "NONE",
        regimen: args.regimen_fiscal || "NONE",
        uso: args.uso_cfdi || "NONE",
      };
    }

    // 3. Llamada a Stripe
    const url = await generateCheckoutSession(inputData);

    context.profile.etapaAbandono = "pago";
    await clientRepo.save(context.profile, context.redis);

    const mensajeIva = args.con_factura
      ? ` (incluye IVA 16%)`
      : "";

    return {
      success: true,
      url_pago: url,
      monto_cobrado: montoFinal,
      instruccion_para_ia: `Entrega el link de pago al cliente. El monto a cobrar es $${montoFinal.toFixed(2)} MXN${mensajeIva}. Recuérdale que su transacción está protegida por Stripe.`
    };
  } catch (error: any) {
    log.error({ err: error }, "Error en Stripe");
    return { success: false, error: "Stripe rechazó la creación de la sesión." };
  }
}

export async function generarCobroSpeiHandler(args: any, context: BotContext) {
  log.info({ args }, "Generando datos SPEI vía Tool");
  const phone = context.message.from.id;
  const referencia = `CT${phone.slice(-6)}${Date.now().toString().slice(-4)}`;

  // FASE 12 FIX: mismo cálculo de IVA para SPEI
  const montoFinal = calcularMontoFinalConIva(args, context);

  log.info({
    montoOriginal: args.monto,
    montoFinal,
    con_factura: args.con_factura
  }, "Monto final SPEI");

  context.profile.etapaAbandono = "pago";
  await clientRepo.save(context.profile, context.redis);

  const mensajeIva = args.con_factura ? " (incluye IVA 16%)" : "";

  return {
    success: true,
    banco: "BBVA",
    clabe: "012180015657512129",
    beneficiario: "Jack Rizk Cabrera",
    referencia,
    monto_exacto: montoFinal,
    instruccion_para_ia: `Muestra estos datos bancarios al cliente de forma clara. El monto exacto a transferir es $${montoFinal.toFixed(2)} MXN${mensajeIva}. Pídele el comprobante al finalizar.`
  };
}
