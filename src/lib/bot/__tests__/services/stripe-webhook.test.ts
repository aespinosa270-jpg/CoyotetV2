import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import {
  WebhookSignatureError,
  parseCheckoutCompleted,
  stripeMethodToSatFormaPago,
  verifyWebhook,
} from "../../services/stripe/webhook";
import {
  createFakeStripe,
  fakeCheckoutCompletedEvent,
  signTestPayload,
} from "../helpers/fake-stripe";

const TEST_SECRET = "whsec_test1234567890";

describe("stripe/webhook — verifyWebhook", () => {
  it("acepta firma válida y devuelve el evento", () => {
    const env = createFakeStripe();
    const expectedEvent = fakeCheckoutCompletedEvent({ phone: "521" });
    env.webhooksConstructEvent.mockReturnValue(expectedEvent);

    const result = verifyWebhook("rawBody", "sig_t=12345,v1=abc", env.client);
    expect(result).toBe(expectedEvent);
    expect(env.webhooksConstructEvent).toHaveBeenCalledWith(
      "rawBody",
      "sig_t=12345,v1=abc",
      TEST_SECRET
    );
  });

  it("lanza WebhookSignatureError si la firma falla", () => {
    const env = createFakeStripe();
    env.webhooksConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });

    expect(() => verifyWebhook("body", "sig", env.client)).toThrow(
      WebhookSignatureError
    );
  });

  it("verificación end-to-end con firma real del SDK", () => {
    // Usamos el SDK real — sin fake — con el secret de test
    const realClient = new Stripe("sk_test_dummy", {
      apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
    });

    const payload = JSON.stringify({
      id: "evt_test_real",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_real", metadata: { phone: "521" } } },
    });
    const signature = signTestPayload(payload, TEST_SECRET);

    const event = verifyWebhook(payload, signature, realClient);
    expect(event.type).toBe("checkout.session.completed");
    expect(event.id).toBe("evt_test_real");
  });

  it("firma incorrecta es rechazada", () => {
    const realClient = new Stripe("sk_test_dummy", {
      apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
    });
    const payload = JSON.stringify({ test: true });
    const wrongSignature = "t=123,v1=ffff";

    expect(() => verifyWebhook(payload, wrongSignature, realClient)).toThrow(
      WebhookSignatureError
    );
  });
});

describe("stripe/webhook — parseCheckoutCompleted", () => {
  it("retorna null si el evento no es checkout.session.completed", () => {
    const otroEvento = {
      type: "payment_intent.succeeded",
      data: { object: {} },
    } as unknown as Stripe.Event;
    expect(parseCheckoutCompleted(otroEvento)).toBeNull();
  });

  it("retorna null si falta phone en metadata (sesión no del bot)", () => {
    const event = fakeCheckoutCompletedEvent({});
    expect(parseCheckoutCompleted(event)).toBeNull();
  });

  it("extrae datos básicos sin factura", () => {
    const event = fakeCheckoutCompletedEvent(
      {
        phone: "5215551234567",
        productos: "alaska 25kg,hilo blanco",
        req_invoice: "NO",
        rfc: "NONE",
        razon: "NONE",
        cp: "NONE",
        regimen: "NONE",
        uso: "NONE",
      },
      { amount_total: 290000, payment_method_types: ["card"] }
    );

    const r = parseCheckoutCompleted(event);
    expect(r).not.toBeNull();
    expect(r!.phone).toBe("5215551234567");
    expect(r!.productos).toEqual(["alaska 25kg", "hilo blanco"]);
    expect(r!.amountMxn).toBe(2900);
    expect(r!.paymentMethod).toBe("card");
    expect(r!.factura).toBeUndefined();
    expect(r!.sessionId).toBe("cs_test_abc123");
  });

  it("extrae datos fiscales cuando req_invoice=YES", () => {
    const event = fakeCheckoutCompletedEvent({
      phone: "5215551234567",
      productos: "sportok 50kg",
      req_invoice: "YES",
      rfc: "EITA990706HDFSRL01",
      razon: "MI EMPRESA SA DE CV",
      cp: "57170",
      regimen: "601",
      uso: "G03",
    });

    const r = parseCheckoutCompleted(event);
    expect(r!.factura).toEqual({
      rfc: "EITA990706HDFSRL01",
      razonSocial: "MI EMPRESA SA DE CV",
      cpFiscal: "57170",
      regimen: "601",
      uso: "G03",
    });
  });

  it("metadata.req_invoice=YES con rfc=NONE NO genera factura", () => {
    const event = fakeCheckoutCompletedEvent({
      phone: "521",
      productos: "x",
      req_invoice: "YES",
      rfc: "NONE",
    });

    const r = parseCheckoutCompleted(event);
    expect(r!.factura).toBeUndefined();
  });

  it("amount_total ausente cae a 0 sin romper", () => {
    const event = fakeCheckoutCompletedEvent(
      { phone: "521" },
      { amount_total: null }
    );
    const r = parseCheckoutCompleted(event);
    expect(r!.amountMxn).toBe(0);
  });
});

describe("stripe/webhook — stripeMethodToSatFormaPago", () => {
  it("OXXO → 01", () => {
    expect(stripeMethodToSatFormaPago("oxxo")).toBe("01");
  });
  it("card → 04", () => {
    expect(stripeMethodToSatFormaPago("card")).toBe("04");
  });
  it("bank_transfer → 03", () => {
    expect(stripeMethodToSatFormaPago("bank_transfer")).toBe("03");
  });
  it("unknown → 04 default tarjeta", () => {
    expect(stripeMethodToSatFormaPago("crypto_unicornio")).toBe("04");
  });
});
