/**
 * Generador de Stripe Checkout Sessions.
 *
 * Función pura desde el punto de vista del bot: recibe lo que necesita cobrar,
 * devuelve un URL que el cliente abre para pagar. El webhook separado se
 * encarga de procesar el resultado.
 *
 * Toda la metadata de la cotización (RFC, dirección, productos) se inyecta
 * en el `metadata` de Stripe para que el webhook pueda re-armar el contexto
 * sin necesidad de Redis.
 */
import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";
import { RESILIENCE } from "../../config/constants";

const log = getLogger({ module: "stripe/checkout" });

// ── Tipos públicos ────────────────────────────────────────────────

export interface FacturaInfo {
  rfc: string;
  razonSocial: string;
  cpFiscal: string;
  /** Régimen fiscal del cliente. Ej: "601" (General de Ley Personas Morales). */
  regimen: string;
  /** Uso CFDI. Ej: "G03" (Gastos en general). */
  uso: string;
}

export interface CheckoutInput {
  /** Monto en MXN (con IVA si lleva factura). */
  amountMxn: number;
  /** Teléfono del cliente, va al metadata para tracking en el webhook. */
  phone: string;
  /** Lista descriptiva de productos. Va al metadata. */
  productos: string[];
  /** Si lleva factura, los datos fiscales (también van al metadata). */
  factura?: FacturaInfo;
  /** Métodos de pago aceptados. Default: card + oxxo. */
  paymentMethods?: Array<"card" | "oxxo">;
  /** URL a la que se redirige tras pagar. Default: deeplink a WhatsApp del negocio. */
  successUrl?: string;
  /** Timeout per-call. Default: RESILIENCE.STRIPE_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Nombre del producto en Stripe. Default: "Pedido Coyote Textil". */
  productName?: string;
}

export interface CheckoutResult {
  /** URL del Checkout. Esto es lo que se le manda al cliente. */
  url: string;
  /** ID de la session. Útil para correlacionar con el webhook después. */
  sessionId: string;
}

// ── Errores ───────────────────────────────────────────────────────

export class CheckoutTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutTimeoutError";
  }
}

// ── Función principal ─────────────────────────────────────────────

export async function generateCheckoutSession(
  input: CheckoutInput,
  client: Stripe = getStripeClient()
): Promise<CheckoutResult> {
  const env = getEnv();
  const timeoutMs = input.timeoutMs ?? RESILIENCE.STRIPE_TIMEOUT_MS;

  if (input.amountMxn <= 0) {
    throw new Error(`Monto inválido para checkout: ${input.amountMxn}`);
  }

  const amountInCents = Math.round(input.amountMxn * 100);
  const paymentMethods = input.paymentMethods ?? ["card", "oxxo"];
  const productName = input.productName ?? "Pedido Coyote Textil";
  const successUrl = input.successUrl ?? `https://wa.me/${env.BUSINESS_PHONE_E164}`;

  const metadata = buildMetadata(input);

  const params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: paymentMethods,
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: { name: productName },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    metadata,
  };

  const session = await raceWithTimeout(
    client.checkout.sessions.create(params),
    timeoutMs,
    `Stripe checkout took longer than ${timeoutMs}ms`
  );

  if (!session.url) {
    log.error({ sessionId: session.id }, "Stripe sesión sin URL");
    throw new Error("Stripe Checkout Session creada pero sin URL");
  }

  log.info(
    {
      sessionId: session.id,
      amountMxn: input.amountMxn,
      phone: input.phone,
      conFactura: !!input.factura,
    },
    "Stripe Checkout Session creada"
  );

  return { url: session.url, sessionId: session.id };
}

// ── Helpers ───────────────────────────────────────────────────────

function buildMetadata(input: CheckoutInput): Record<string, string> {
  const meta: Record<string, string> = {
    phone: input.phone,
    productos: input.productos.join(",").slice(0, 480), // Stripe metadata limit 500 chars
    req_invoice: input.factura ? "YES" : "NO",
  };

  if (input.factura) {
    meta.rfc = input.factura.rfc;
    meta.razon = input.factura.razonSocial;
    meta.cp = input.factura.cpFiscal;
    meta.regimen = input.factura.regimen;
    meta.uso = input.factura.uso;
  } else {
    // Marcadores para el webhook (mismo schema con/sin factura)
    meta.rfc = "NONE";
    meta.razon = "NONE";
    meta.cp = "NONE";
    meta.regimen = "NONE";
    meta.uso = "NONE";
  }

  return meta;
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new CheckoutTimeoutError(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
