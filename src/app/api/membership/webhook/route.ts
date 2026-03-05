import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});

// 🔥 Los valores deben coincidir EXACTAMENTE con tu enum de Prisma (Mayúsculas)
const PLAN_TIERS: Record<string, any> = {
  GOLD:  "GOLD",
  BLACK: "BLACK",
  ELITE: "ELITE",
};

export async function POST(req: Request) {
  const body = await req.text();
  
  // 🔥 FIX para Next.js 15+: extraer headers correctamente con await
  const reqHeaders = await headers();
  const signature  = reqHeaders.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET! // 🐺 Tu secreto independiente
    );
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ── Pago exitoso → activar membresía ─────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId       = subscription.metadata.userId;
      const planKey      = subscription.metadata.planKey;
      const tier         = PLAN_TIERS[planKey];

      if (userId && tier) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            membershipTier: tier,
            role:           tier,       // sube el rol
          },
        });
        console.log(`✅ Membresía ${tier} activada para userId: ${userId}`);
      }
    }
  }

  // ── Pago fallido / cancelación → bajar a NONE (No BASE) ────────────
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "invoice.payment_failed"
  ) {
    const obj            = event.data.object as any;
    const subscriptionId = obj.subscription ?? obj.id;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId       = subscription.metadata.userId;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            membershipTier: "NONE", // 🔥 Tu modelo Prisma usa NONE, no BASE
            role:           "USER", // 🔥 Restaura el rol normal
          },
        });
        console.log(`⬇️ Membresía degradada a NONE para userId: ${userId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}