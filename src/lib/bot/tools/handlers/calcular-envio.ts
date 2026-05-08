import type { BotContext } from "../../core/types";
import { calcularEnvioReal } from "../../domain/shipping/calculator";
import * as clientRepo from "../../repositories/client-repo";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-calcular-envio" });

export async function calcularEnvioHandler(args: any, context: BotContext) {
  log.info({ args }, "Calculando envío vía Tool");
  try {
    const { cp, productos, subtotal, requiere_factura } = args;
    
    // Llamada a tu dominio puro (Fase 1A)
    const resultado = calcularEnvioReal(productos, cp, subtotal, requiere_factura);
    
    // Guardamos la cotización en el perfil del cliente
    context.profile.ultimaCotizacionObj = {
      productos: JSON.stringify(productos),
      kg: productos.reduce((acc: number, p: any) => acc + p.kg, 0),
      subtotal,
      subtotalConEnvio: resultado.total,
      subtotalConEnvioConIva: resultado.base + resultado.iva,
      cp,
      direccion: context.profile.direccionEnvio || "",
      conFactura: requiere_factura,
      fecha: new Date().toISOString()
    };
    
    context.profile.ultimaCotizacion = `Cotización a CP ${cp}: $${resultado.total.toFixed(2)} MXN`;
    await clientRepo.save(context.profile, context.redis);

    return { 
      success: true, 
      desglose_interno: resultado.desglose, 
      total_a_cobrar: resultado.total,
      instruccion_para_ia: "Muestra el total al cliente y pregúntale si requiere factura o si procedemos al cobro."
    };
  } catch (error: any) {
    log.error({ err: error }, "Error en cálculo de envío");
    return { success: false, error: "CP inválido o problema calculando la ruta." };
  }
}
