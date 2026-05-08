/**
 * Emisión de CFDI 4.0 vía Facturapi.
 *
 * Hace dos round-trips:
 *  1. POST /v2/customers — registra al cliente con sus datos fiscales.
 *  2. POST /v2/invoices — emite la factura.
 *
 * Si cualquiera falla, lanza un error tipado. El orquestador puede atrapar
 * `InvoiceError` para mandar un mensaje al cliente como "factura pendiente"
 * sin romper el flujo de confirmación de pago.
 */
import { getLogger } from "../../observability/logger";
import { TAX } from "../../config/constants";
import {
  FACTURAPI_BASE_URL,
  buildFacturapiHeaders,
  type FetchFn,
} from "./client";

const log = getLogger({ module: "facturapi/invoice" });

// ── Tipos ─────────────────────────────────────────────────────────

export interface InvoiceInput {
  /** Razón social del cliente. */
  legalName: string;
  /** RFC. */
  rfc: string;
  /** Régimen fiscal SAT (3 dígitos, ej. "601"). */
  taxSystem: string;
  /** CP fiscal del cliente (5 dígitos). */
  zip: string;
  /** Uso CFDI (ej. "G03" para gastos en general). */
  taxUse: string;
  /** Monto total CON IVA. La función calcula la base como total/1.16. */
  amountWithTax: number;
  /** Forma de pago SAT: "01" efectivo, "03" transferencia, "04" tarjeta. */
  paymentForm: string;
  /** Descripción del producto/servicio que aparece en el CFDI. */
  productDescription?: string;
  /** Clave del producto SAT. Default: "11162100" (textiles). */
  productKey?: string;
}

export interface InvoiceResult {
  /** ID interno de Facturapi para esta factura. */
  invoiceId: string;
  /** ID del customer SAT registrado. */
  customerId: string;
  /** URL pública del PDF. */
  pdfUrl: string;
  /** URL pública del XML. */
  xmlUrl: string;
}

// ── Errores ───────────────────────────────────────────────────────

export class InvoiceError extends Error {
  constructor(
    message: string,
    public readonly stage: "customer" | "invoice",
    public readonly httpStatus?: number,
    public readonly facturapiBody?: unknown
  ) {
    super(message);
    this.name = "InvoiceError";
  }
}

// ── Función principal ─────────────────────────────────────────────

export async function emitInvoice(
  input: InvoiceInput,
  fetchImpl: FetchFn = fetch
): Promise<InvoiceResult> {
  const headers = buildFacturapiHeaders();

  // ── 1. Crear customer SAT ─────────────────────────────────────
  const customerRes = await fetchImpl(`${FACTURAPI_BASE_URL}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      legal_name: input.legalName,
      tax_id: input.rfc,
      tax_system: input.taxSystem,
      zip: input.zip,
    }),
  });

  if (!customerRes.ok) {
    const body = await safeJson(customerRes);
    log.error(
      { status: customerRes.status, body, rfc: input.rfc },
      "Facturapi customer creation failed"
    );
    throw new InvoiceError(
      `Falló crear customer SAT (${customerRes.status})`,
      "customer",
      customerRes.status,
      body
    );
  }

  const customer = (await customerRes.json()) as { id: string };
  const customerId = customer.id;
  log.info({ customerId, rfc: input.rfc }, "Customer SAT registrado");

  // ── 2. Emitir factura ─────────────────────────────────────────
  const basePrice = input.amountWithTax / (1 + TAX.IVA_RATE);
  const invoicePayload = {
    customer: customerId,
    items: [
      {
        product: {
          description:
            input.productDescription ??
            "Telas y avíos de alto rendimiento Coyote Textil",
          product_key: input.productKey ?? "11162100",
          price: basePrice,
          taxes: [{ type: "IVA", rate: TAX.IVA_RATE }],
        },
        quantity: 1,
      },
    ],
    use: input.taxUse,
    payment_form: input.paymentForm,
    payment_method: "PUE",
  };

  const invoiceRes = await fetchImpl(`${FACTURAPI_BASE_URL}/invoices`, {
    method: "POST",
    headers,
    body: JSON.stringify(invoicePayload),
  });

  if (!invoiceRes.ok) {
    const body = await safeJson(invoiceRes);
    log.error(
      { status: invoiceRes.status, body, customerId },
      "Facturapi invoice emission failed"
    );
    throw new InvoiceError(
      `Falló emitir CFDI (${invoiceRes.status})`,
      "invoice",
      invoiceRes.status,
      body
    );
  }

  const invoice = (await invoiceRes.json()) as { id: string };
  const invoiceId = invoice.id;
  const pdfUrl = `${FACTURAPI_BASE_URL}/invoices/${invoiceId}/pdf`;
  const xmlUrl = `${FACTURAPI_BASE_URL}/invoices/${invoiceId}/xml`;

  log.info(
    { invoiceId, customerId, amountWithTax: input.amountWithTax },
    "CFDI 4.0 emitido"
  );

  return { invoiceId, customerId, pdfUrl, xmlUrl };
}

// ── Helpers ───────────────────────────────────────────────────────

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}
