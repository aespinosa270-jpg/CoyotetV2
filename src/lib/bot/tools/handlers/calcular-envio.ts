import type { BotContext } from "../../core/types";
import { calcularEnvio } from "../../domain/shipping/calculator";
import { firstCp } from "../../domain/extractors/postal-code";
import { resolverZona } from "../../domain/shipping/zones";
import * as clientRepo from "../../repositories/client-repo";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-calcular-envio" });

export async function calcularEnvioHandler(args: any, context: BotContext) {
  log.info({ args }, "Calculando envío vía Tool");
  try {
    const { cp: cpDeGPT, productos, subtotal, requiere_factura } = args;

    // ⚠️ ANTI-ALUCINACIÓN: validar que el CP que GPT pasó coincida con el del mensaje real.
    // Si GPT inventó un CP (o tomó uno viejo del historial), usamos el que tipeó el cliente AHORA.
    const cpDelMensajeActual = firstCp(context.message?.text ?? "");
    const cpDelPerfil = (context.profile as any).codigoPostalEnvio ?? null;

    // Prioridad: 1) CP del mensaje actual  2) CP del perfil  3) CP de GPT (último recurso)
    const cp = cpDelMensajeActual ?? cpDelPerfil ?? cpDeGPT;

    if (cpDeGPT && cp !== cpDeGPT) {
      log.warn(
        { cpDeGPT, cpDelMensajeActual, cpDelPerfil, cpUsado: cp },
        "⚠️ ANTI-ALUCINACION: GPT paso CP distinto al del cliente. Override aplicado."
      );
    }

    if (!cp || !/^\d{5}$/.test(cp)) {
      log.error({ cpDeGPT, cpDelMensajeActual }, "No hay CP válido ni de GPT ni del cliente");
      return {
        success: false,
        error: "Necesito un código postal de 5 dígitos. ¿Me lo confirmas?",
      };
    }

    // 1. Resolver zona primero para decidir flujo
    const zona = resolverZona(cp);
    let skydropxData: { amount: number; carrier: string; days: number } | null = null;

    // 2. Si es SKYDROPX, cotizar con API real
    if (zona.tipo === "SKYDROPX") {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.coyotetextil.com";
        const cartItems = productos.map((p: any) => ({
          quantity: p.kg,
          unit: "kg",
          meta: { mode: p.esRollo ? "rollo" : "kg" }
        }));

        const res = await fetch(`${baseUrl}/api/shipping/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zip_to: cp,
            state_to: "",
            city_to: "",
            neighborhood_to: "",
            cartItems
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.bestQuote) {
            skydropxData = {
              amount: data.bestQuote.amount,
              carrier: data.bestQuote.carrier,
              days: data.bestQuote.days || 3
            };
            log.info({ skydropxData }, "Skydropx cotizó");
          }
        } else {
          log.warn({ status: res.status }, "Skydropx API no respondió OK");
        }
      } catch (err) {
        log.error({ err }, "Error cotizando Skydropx, usando fallback");
      }
    }

    // 3. Calcular base con dominio puro
    const resultado = calcularEnvio({ productos, cp, subtotal, requiereFactura: requiere_factura });

    // 4. Si tenemos Skydropx real, sobreescribir el traslado
    let resultadoFinal = resultado;
    if (skydropxData) {
      const trasladoReal = skydropxData.amount;
      const colocacion = resultado.tarifaColocacion ?? 0;
      const baseReal = subtotal + resultado.flete + trasladoReal + resultado.tarifaServicio + colocacion;
      // IVA: SOLO sobre el subtotal de productos.
      const ivaReal = requiere_factura ? subtotal * 0.16 : 0;
      const totalReal = baseReal + ivaReal;

      resultadoFinal = {
        ...resultado,
        traslado: Math.round(trasladoReal * 100) / 100,
        base: Math.round(baseReal * 100) / 100,
        iva: Math.round(ivaReal * 100) / 100,
        total: Math.round(totalReal * 100) / 100,
        desglose: [
          `📦 *Desglose de su cotización*`,
          `• Subtotal productos: $${subtotal.toFixed(2)} MXN`,
          `• Flete (manejo de bultos): $${resultado.flete.toFixed(2)}`,
          `• Traslado vía ${skydropxData.carrier} (${skydropxData.days} días hábiles): $${trasladoReal.toFixed(2)}`,
          ...(resultado.tarifaServicio > 0
            ? [`• Tarifa de servicio: $${resultado.tarifaServicio.toFixed(2)}`]
            : []),
          ...(colocacion > 0
            ? [`• Tarifa de colocacion (rollo): $${colocacion.toFixed(2)}`]
            : []),
          `• Base: $${baseReal.toFixed(2)}`,
          requiere_factura ? `• IVA 16%: $${ivaReal.toFixed(2)}` : null,
          `• *TOTAL: $${totalReal.toFixed(2)} MXN*`
        ].filter(Boolean).join("\n")
      };
    }

    // 5. Guardar cotización
    context.profile.ultimaCotizacionObj = {
      productos: JSON.stringify(productos),
      kg: productos.reduce((acc: number, p: any) => acc + p.kg, 0),
      subtotal,
      subtotalConEnvio: resultadoFinal.total,
      subtotalConEnvioConIva: resultadoFinal.base + resultadoFinal.iva,
      cp,
      direccion: context.profile.direccionEnvio || "",
      conFactura: requiere_factura,
      fecha: new Date().toISOString()
    };

    context.profile.ultimaCotizacion = `Cotización a CP ${cp}: $${resultadoFinal.total.toFixed(2)} MXN`;
    // Guardar el CP validado en el perfil para futuras referencias
    (context.profile as any).codigoPostalEnvio = cp;
    await clientRepo.save(context.profile, context.redis);

    // 6. Instrucción mejorada para que el bot mencione el carrier
    let instruccion = "Muestra el total al cliente y pregúntale si requiere factura o si procedemos al cobro.";
    if (skydropxData) {
      instruccion = `IMPORTANTE: El envío va con ${skydropxData.carrier} en ${skydropxData.days} días hábiles. Menciona claramente al cliente quién entregará y en cuántos días. Después pregunta si procedemos al cobro.`;
    } else if (zona.tipo === "COYOTE") {
      instruccion = `IMPORTANTE: El envío va con NUESTRA FLOTILLA COYOTE (entrega directa a ${zona.etiqueta}). Menciona que es entrega de nuestra propia flotilla. Después pregunta si procedemos al cobro.`;
    }

    return {
      success: true,
      desglose_interno: resultadoFinal.desglose,
      total_a_cobrar: resultadoFinal.total,
      tipo_envio: zona.tipo,
      zona: zona.etiqueta,
      carrier: skydropxData?.carrier || "Flotilla Coyote",
      dias_estimados: skydropxData?.days || (zona.tipo === "COYOTE" ? 2 : 3),
      instruccion_para_ia: instruccion
    };
  } catch (error: any) {
    log.error({ err: error }, "Error en cálculo de envío");
    return { success: false, error: "CP inválido o problema calculando la ruta." };
  }
}
