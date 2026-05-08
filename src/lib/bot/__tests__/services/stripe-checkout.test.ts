import { describe, it, expect } from "vitest";
import {
  CheckoutTimeoutError,
  generateCheckoutSession,
} from "../../services/stripe/checkout";
import { createFakeStripe, fakeSession } from "../helpers/fake-stripe";

describe("stripe/checkout — generateCheckoutSession", () => {
  it("genera una sesión y devuelve url + sessionId", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    const result = await generateCheckoutSession(
      {
        amountMxn: 2900,
        phone: "5215551234567",
        productos: ["alaska 25kg"],
      },
      env.client
    );

    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_abc123");
    expect(result.sessionId).toBe("cs_test_abc123");
  });

  it("convierte el monto MXN a centavos para Stripe", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      {
        amountMxn: 2900.5,
        phone: "5215551234567",
        productos: ["alaska"],
      },
      env.client
    );

    const params = env.sessionsCreate.mock.calls[0][0];
    expect(params.line_items[0].price_data.unit_amount).toBe(290050);
    expect(params.line_items[0].price_data.currency).toBe("mxn");
  });

  it("default acepta tarjeta y OXXO", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      { amountMxn: 100, phone: "521", productos: ["x"] },
      env.client
    );

    expect(env.sessionsCreate.mock.calls[0][0].payment_method_types).toEqual([
      "card",
      "oxxo",
    ]);
  });

  it("permite override de métodos de pago", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      {
        amountMxn: 100,
        phone: "521",
        productos: ["x"],
        paymentMethods: ["card"],
      },
      env.client
    );

    expect(env.sessionsCreate.mock.calls[0][0].payment_method_types).toEqual([
      "card",
    ]);
  });

  it("inyecta phone, productos y req_invoice=NO en metadata cuando no hay factura", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      {
        amountMxn: 1000,
        phone: "5215551234567",
        productos: ["alaska 25kg", "hilo blanco"],
      },
      env.client
    );

    const meta = env.sessionsCreate.mock.calls[0][0].metadata;
    expect(meta.phone).toBe("5215551234567");
    expect(meta.productos).toBe("alaska 25kg,hilo blanco");
    expect(meta.req_invoice).toBe("NO");
    expect(meta.rfc).toBe("NONE");
    expect(meta.razon).toBe("NONE");
  });

  it("inyecta datos fiscales completos cuando hay factura", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      {
        amountMxn: 5000,
        phone: "5215551234567",
        productos: ["sportok 50kg"],
        factura: {
          rfc: "EITA990706HDFSRL01",
          razonSocial: "MI EMPRESA SA DE CV",
          cpFiscal: "57170",
          regimen: "601",
          uso: "G03",
        },
      },
      env.client
    );

    const meta = env.sessionsCreate.mock.calls[0][0].metadata;
    expect(meta.req_invoice).toBe("YES");
    expect(meta.rfc).toBe("EITA990706HDFSRL01");
    expect(meta.razon).toBe("MI EMPRESA SA DE CV");
    expect(meta.cp).toBe("57170");
    expect(meta.regimen).toBe("601");
    expect(meta.uso).toBe("G03");
  });

  it("rechaza monto cero o negativo", async () => {
    const env = createFakeStripe();
    await expect(
      generateCheckoutSession(
        { amountMxn: 0, phone: "521", productos: ["x"] },
        env.client
      )
    ).rejects.toThrow("Monto inválido");
    await expect(
      generateCheckoutSession(
        { amountMxn: -100, phone: "521", productos: ["x"] },
        env.client
      )
    ).rejects.toThrow("Monto inválido");
  });

  it("default success_url apunta al WhatsApp del negocio", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      { amountMxn: 100, phone: "521", productos: ["x"] },
      env.client
    );

    expect(env.sessionsCreate.mock.calls[0][0].success_url).toContain(
      "wa.me"
    );
  });

  it("permite override de success_url", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    await generateCheckoutSession(
      {
        amountMxn: 100,
        phone: "521",
        productos: ["x"],
        successUrl: "https://www.coyotetextil.com/gracias",
      },
      env.client
    );

    expect(env.sessionsCreate.mock.calls[0][0].success_url).toBe(
      "https://www.coyotetextil.com/gracias"
    );
  });

  it("CheckoutTimeoutError si Stripe se tarda más del timeout", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockImplementation(
      () => new Promise(() => {}) // nunca resuelve
    );

    await expect(
      generateCheckoutSession(
        {
          amountMxn: 100,
          phone: "521",
          productos: ["x"],
          timeoutMs: 50,
        },
        env.client
      )
    ).rejects.toBeInstanceOf(CheckoutTimeoutError);
  });

  it("trunca productos largos a 480 chars (límite metadata Stripe)", async () => {
    const env = createFakeStripe();
    env.sessionsCreate.mockResolvedValue(fakeSession());

    const muchos = Array.from({ length: 100 }, (_, i) => `producto-${i}`);
    await generateCheckoutSession(
      { amountMxn: 100, phone: "521", productos: muchos },
      env.client
    );

    const meta = env.sessionsCreate.mock.calls[0][0].metadata;
    expect(meta.productos.length).toBeLessThanOrEqual(480);
  });
});
