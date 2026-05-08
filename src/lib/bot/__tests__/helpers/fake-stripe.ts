/**
 * Fake del SDK Stripe para tests.
 *
 * Implementa solo lo que `checkout.ts` y `webhook.ts` consumen:
 *  - `checkout.sessions.create()`
 *  - `webhooks.constructEvent()`
 *
 * Para webhook firmado, exponemos el helper REAL del SDK (`Stripe.webhooks`)
 * que sabe generar firmas de prueba — eso nos permite testear el flujo
 * completo de verificación.
 */
import Stripe from "stripe";
import { vi } from "vitest";

export interface FakeStripeBundle {
  client: Stripe;
  sessionsCreate: ReturnType<typeof vi.fn>;
  webhooksConstructEvent: ReturnType<typeof vi.fn>;
}

export function createFakeStripe(): FakeStripeBundle {
  const sessionsCreate = vi.fn();
  const webhooksConstructEvent = vi.fn();

  const client = {
    checkout: { sessions: { create: sessionsCreate } },
    webhooks: { constructEvent: webhooksConstructEvent },
  } as unknown as Stripe;

  return { client, sessionsCreate, webhooksConstructEvent };
}

/** Construye un Checkout Session response con la mínima información usada por nuestros tests. */
export function fakeSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test_abc123",
    object: "checkout.session",
    url: "https://checkout.stripe.com/pay/cs_test_abc123",
    amount_total: 290000,
    currency: "mxn",
    payment_method_types: ["card", "oxxo"],
    metadata: {},
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

/** Construye un Stripe.Event de tipo checkout.session.completed para tests de parser. */
export function fakeCheckoutCompletedEvent(
  metadata: Record<string, string>,
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    api_version: "2024-11-20.acacia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: fakeSession({ metadata, ...overrides }),
    },
  } as unknown as Stripe.Event;
}

/**
 * Genera una firma válida REAL de Stripe sobre un payload arbitrario.
 * Usa el helper oficial del SDK, que es lo que verifica `webhooks.constructEvent`.
 */
export function signTestPayload(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000)
): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp,
  });
}
