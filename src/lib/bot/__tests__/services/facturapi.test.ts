import { describe, it, expect, vi } from "vitest";
import {
  InvoiceError,
  emitInvoice,
} from "../../services/facturapi/invoice";

// ── Helpers ────────────────────────────────────────────────────────

function makeFetch(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i] ?? responses[responses.length - 1];
    i++;
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as Response;
  });
}

const inputBase = {
  legalName: "MI EMPRESA SA DE CV",
  rfc: "EITA990706HDFSRL01",
  taxSystem: "601",
  zip: "57170",
  taxUse: "G03",
  amountWithTax: 2900,
  paymentForm: "04",
};

// ── Tests ──────────────────────────────────────────────────────────

describe("facturapi/invoice — emitInvoice", () => {
  it("hace los dos round-trips y devuelve los URLs del CFDI", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "cust_abc123" } },
      { ok: true, body: { id: "inv_xyz789" } },
    ]);

    const result = await emitInvoice(inputBase, fetchMock);

    expect(result.customerId).toBe("cust_abc123");
    expect(result.invoiceId).toBe("inv_xyz789");
    expect(result.pdfUrl).toContain("inv_xyz789/pdf");
    expect(result.xmlUrl).toContain("inv_xyz789/xml");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("calcula el precio base como total/1.16 (IVA inverso)", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice({ ...inputBase, amountWithTax: 2320 }, fetchMock);

    const invoiceCall = fetchMock.mock.calls[1];
    const invoicePayload = JSON.parse(invoiceCall[1]!.body as string);
    // 2320 / 1.16 = 2000
    expect(invoicePayload.items[0].product.price).toBeCloseTo(2000, 2);
    expect(invoicePayload.items[0].product.taxes[0].rate).toBe(0.16);
  });

  it("envía los datos correctos para crear el customer SAT", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice(inputBase, fetchMock);

    const customerCall = fetchMock.mock.calls[0];
    expect(customerCall[0]).toContain("/customers");
    const customerPayload = JSON.parse(customerCall[1]!.body as string);
    expect(customerPayload).toEqual({
      legal_name: "MI EMPRESA SA DE CV",
      tax_id: "EITA990706HDFSRL01",
      tax_system: "601",
      zip: "57170",
    });
  });

  it("incluye Authorization Basic en headers de ambas llamadas", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice(inputBase, fetchMock);

    for (const call of fetchMock.mock.calls) {
      const headers = call[1]!.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Basic /);
      expect(headers["Content-Type"]).toBe("application/json");
    }
  });

  it("usa product_key 11162100 (textiles) por default", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice(inputBase, fetchMock);

    const invoicePayload = JSON.parse(
      (fetchMock.mock.calls[1][1]!.body as string)
    );
    expect(invoicePayload.items[0].product.product_key).toBe("11162100");
  });

  it("permite override de productKey y productDescription", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice(
      {
        ...inputBase,
        productKey: "73152106",
        productDescription: "Bordado personalizado",
      },
      fetchMock
    );

    const invoicePayload = JSON.parse(
      (fetchMock.mock.calls[1][1]!.body as string)
    );
    expect(invoicePayload.items[0].product.product_key).toBe("73152106");
    expect(invoicePayload.items[0].product.description).toBe(
      "Bordado personalizado"
    );
  });

  it("InvoiceError stage='customer' si falla crear customer", async () => {
    const fetchMock = makeFetch([
      { ok: false, status: 422, body: { message: "Invalid RFC" } },
    ]);

    try {
      await emitInvoice(inputBase, fetchMock);
      expect.fail("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(InvoiceError);
      expect((err as InvoiceError).stage).toBe("customer");
      expect((err as InvoiceError).httpStatus).toBe(422);
    }
    // No intentó crear factura tras fallar customer
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("InvoiceError stage='invoice' si falla emitir factura", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "cust_ok" } },
      { ok: false, status: 500, body: { message: "SAT down" } },
    ]);

    try {
      await emitInvoice(inputBase, fetchMock);
      expect.fail("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(InvoiceError);
      expect((err as InvoiceError).stage).toBe("invoice");
      expect((err as InvoiceError).httpStatus).toBe(500);
    }
  });

  it("envía use, payment_form y payment_method al emitir", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { id: "c1" } },
      { ok: true, body: { id: "i1" } },
    ]);

    await emitInvoice({ ...inputBase, paymentForm: "01" }, fetchMock);

    const invoicePayload = JSON.parse(
      (fetchMock.mock.calls[1][1]!.body as string)
    );
    expect(invoicePayload.use).toBe("G03");
    expect(invoicePayload.payment_form).toBe("01");
    expect(invoicePayload.payment_method).toBe("PUE");
  });
});
