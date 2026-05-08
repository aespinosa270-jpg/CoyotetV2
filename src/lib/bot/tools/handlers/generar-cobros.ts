import type { BotContext } from "../../core/types";
import { generateCheckoutSession } from "../../services/stripe/checkout";
import * as clientRepo from "../../repositories/client-repo";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-generar-cobro" });

export async function generarCobroStripeHandler(args: any, context: BotContext) {
  log.info({ args }, "Generando link de Stripe vía Tool");
  try {
    const phone = context.message.phone || context.message.senderId;
    
    // Llamada a tu servicio externo de pagos (Fase 2B)
    const url = await generateCheckoutSession({
      amountMxn: args.monto,
      phone: phone,
      reqInvoice: args.con_factura ? "YES" : "NO",
      rfc: args.rfc || "NONE",
      razon: args.razon_social || "NONE",
      cp: args.cp_fiscal || "NONE",
      regimen: args.regimen_fiscal || "NONE",
      uso: args.uso_cfdi || "NONE",
      productos: context.profile.ultimaCotizacionObj?.productos || "Pedido Coyote Textil"
    });

    context.profile.etapaAbandono = "pago";
    await clientRepo.save(context.profile, context.redis);

    return { 
      success: true, 
      url_pago: url,
      instruccion_para_ia: "Entregale el link de pago al cliente y recuérdale que su transacción está protegida por Stripe."
    };
  } catch (error: any) {
    log.error({ err: error }, "Error en Stripe");
    return { success: false, error: "Stripe rechazó la creación de la sesión." };
  }
}

export async function generarCobroSpeiHandler(args: any, context: BotContext) {
  log.info({ args }, "Generando datos SPEI vía Tool");
  const phone = context.message.phone || context.message.senderId;
  const referencia = `CT${phone.slice(-6)}${Date.now().toString().slice(-4)}`;
  
  context.profile.etapaAbandono = "pago";
  await clientRepo.save(context.profile, context.redis);

  return {
    success: true,
    banco: "BBVA",
    clabe: "012180015657512129",
    beneficiario: "Jack Rizk Cabrera",
    referencia,
    monto_exacto: args.monto,
    instruccion_para_ia: "Muestra estos datos bancarios al cliente de forma clara y pídele el comprobante al finalizar."
  };
}
