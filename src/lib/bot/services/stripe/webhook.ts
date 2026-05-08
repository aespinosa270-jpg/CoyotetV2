/**
 * Procesador de webhooks de Stripe.
 *
 * Dos responsabilidades:
 *  1. `verifyWebhook()` â€” verifica la firma y devuelve el evento parseado.
 *     Si la firma es invÃ¡lida â†’ throw WebhookSignatureError.
 *  2. `parseCheckoutCompleted()` â€” extrae los datos relevantes de un evento
 *     `checkout.session.completed` como un objeto tipado, listo para
 *     consumir por el orquestador.
 *
 * El mÃ³dulo NO ejecuta side effects (registrar pedido, mandar mensaje, emitir
 * factura). Eso es responsabilidad del orquestador, que llama estos helpers.
 */
import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";
import type { FacturaInfo } from "./checkout";

const log = getLogger({ module: "stripe/webhook" });

// â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CheckoutCompletedPayload {
  sessionId: string;
  /** TelÃ©fono del cliente, recuperado del metadata. */
  phone: string;
  /** Productos comprados (lista CSV en metadata). */
  productos: string[];
  /** Monto total cobrado en MXN. */
  amountMxn: number;
  /** MÃ©todo principal usado: card | oxxo | bank_transfer. */
  paymentMethod: string;
  /** Datos fiscales si el cliente pidiÃ³ factura. */
  factura?: FacturaInfo;
  /** Evento crudo, por si el handler necesita acceder a algo mÃ¡s. */
  rawSession: Stripe.Checkout.Session;
}

// â”€â”€ Errores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

// â”€â”€ verifyWebhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Valida la firma del webhook contra el secret configurado.
 * Si pasa, devuelve el `Stripe.Event` parseado.
 *
 * IMPORTANTE: el rawBody debe ser el cuerpo de la request EXACTAMENTE como
 * lo recibiÃ³ Next.js (sin parseo JSON intermedio). En Next.js App Router se
 * obtiene con `await req.text()`.
 */
export function verifyWebhook(
  rawBody: string,
  signature: string,
  client: Stripe = getStripeClient()
): Stripe.Event {
  const env = getEnv();
  try {
    return client.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_CHECKOUT_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn({ err: message }, "Webhook signature verification failed");
    throw new WebhookSignatureError(`Stripe webhook signature invÃ¡lida: ${message}`);
  }
}

// â”€â”€ parseCheckoutCompleted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Convierte un `checkout.session.completed` en un payload tipado.
 *
 * Devuelve null si:
 *  - El tipo de evento no es `checkout.session.completed`.
 *  - Falta el metadata.phone (la sesiÃ³n no fue creada por el bot).
 *
 * Esto permite usar la funciÃ³n como filtro: si devuelve null, el orquestador
 * ignora el evento.
 */
export function parseCheckoutCompleted(
  event: Stripe.Event
): CheckoutCompletedPayload | null {
  if (event.type !== "checkout.session.completed") return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};

  const phone = meta.phone;
  if (!phone) {
    log.warn({ sessionId: session.id }, "Checkout completado sin phone en metadata");
    return null;
  }

  const productos = meta.productos
    ? meta.productos.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const amountMxn = (session.amount_total ?? 0) / 100;
  const paymentMethod = session.payment_method_types?.[0] ?? "unknown";

  let factura: FacturaInfo | undefined;
  if (meta.req_invoice === "YES" && meta.rfc && meta.rfc !== "NONE") {
    factura = {
      rfc: meta.rfc,
      razonSocial: meta.razon ?? "",
      cpFiscal: meta.cp ?? "",
      regimen: meta.regimen ?? "",
      uso: meta.uso ?? "",
    };
  }

  log.info(
    {
      sessionId: session.id,
      phone,
      amountMxn,
      paymentMethod,
      conFactura: !!factura,
    },
    "Checkout completado parseado"
  );

  return {
    sessionId: session.id,
    phone,
    productos,
    amountMxn,
    paymentMethod,
    factura,
    rawSession: session,
  };
}

// â”€â”€ Determinar formaPago para Facturapi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Mapea el mÃ©todo de pago de Stripe al cÃ³digo `payment_form` del SAT.
 *
 *   01 = efectivo   (OXXO)
 *   03 = transferencia electrÃ³nica
 *   04 = tarjeta
 */
export function stripeMethodToSatFormaPago(stripeMethod: string): string {
  switch (stripeMethod) {
    case "oxxo":
      return "01";
    case "card":
      return "04";
    case "customer_balance":
    case "bank_transfer":
      return "03";
    default:
      return "04"; // default tarjeta
  }
}
