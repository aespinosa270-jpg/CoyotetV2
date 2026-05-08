/**
 * Cliente Stripe — singleton.
 *
 * Una sola instancia por proceso. La apiVersion se lee de env para que Jack
 * pueda actualizarla sin redeploy si Stripe la rota.
 */
import Stripe from "stripe";
import { getEnv } from "../../config/env";

let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const env = getEnv();
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
  });
  return cached;
}

export function _resetStripeClientForTests() {
  cached = null;
}
