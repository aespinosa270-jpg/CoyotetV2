import { describe, it, expect } from "vitest";
import {
  contarSenalesCalientes,
  contarSenalesFrias,
  contieneSenalCaliente,
  contieneSenalFria,
  detectarIntencionPago,
  esTonoNegativo,
  esTonoPositivo,
  pideTela,
  pideUniforme,
} from "../../domain/sales/signals";

describe("signals — señales calientes", () => {
  it("detecta interés en precio", () => {
    expect(contieneSenalCaliente("¿cuánto cuesta el sportok?")).toBe(true);
    expect(contieneSenalCaliente("dame una cotización")).toBe(true);
    expect(contieneSenalCaliente("cuanto vale el rollo")).toBe(true);
  });

  it("detecta intención de compra (incluye 'me lo llevo' y 'me la llevo')", () => {
    expect(contieneSenalCaliente("quiero 25 kilos")).toBe(true);
    expect(contieneSenalCaliente("me interesa esa tela")).toBe(true);
    expect(contieneSenalCaliente("me llevo el rollo")).toBe(true);
    expect(contieneSenalCaliente("me lo llevo")).toBe(true);
    expect(contieneSenalCaliente("me la llevo")).toBe(true);
  });

  it("detecta preguntas sobre envío", () => {
    expect(contieneSenalCaliente("cuándo llega")).toBe(true);
    expect(contieneSenalCaliente("tiempo de entrega")).toBe(true);
  });

  it("detecta menciones de unidad", () => {
    expect(contieneSenalCaliente("dame 50 metros")).toBe(true);
    expect(contieneSenalCaliente("un rollo completo")).toBe(true);
  });

  it("cuenta múltiples señales en un mensaje", () => {
    const msg = "quiero un rollo, ¿cuánto cuesta y cuándo llega?";
    expect(contarSenalesCalientes(msg)).toBeGreaterThanOrEqual(3);
  });

  it("no falsea positivos en mensajes neutros", () => {
    expect(contieneSenalCaliente("hola")).toBe(false);
    expect(contieneSenalCaliente("buen día")).toBe(false);
  });
});

describe("signals — señales frías", () => {
  it("detecta titubeo (incluye 'solo estoy viendo')", () => {
    expect(contieneSenalFria("solo viendo")).toBe(true);
    expect(contieneSenalFria("solo estoy viendo")).toBe(true);
    expect(contieneSenalFria("nada más pregunto")).toBe(true);
    expect(contieneSenalFria("lo pienso y le aviso")).toBe(true);
  });

  it("detecta objeciones de precio", () => {
    expect(contieneSenalFria("está muy caro")).toBe(true);
    expect(contieneSenalFria("no tengo presupuesto")).toBe(true);
    expect(contieneSenalFria("ahorita no")).toBe(true);
  });

  it("cuenta GRUPOS de objeciones, no frases (1 actitud = 1 grupo)", () => {
    // "muy caro" + "ahorita no" están en mismo grupo (price-objection) → 1
    // "lo pienso" + "después" están en mismo grupo (titubeo) → 1
    // Total: 2 grupos. Es por diseño — semánticamente es UNA actitud por grupo.
    expect(
      contarSenalesFrias("muy caro, ahorita no, lo pienso después")
    ).toBe(2);
  });
});

describe("signals — tono", () => {
  it("detecta tono positivo", () => {
    expect(esTonoPositivo("muchas gracias")).toBe(true);
    expect(esTonoPositivo("perfecto")).toBe(true);
    expect(esTonoPositivo("excelente, vamos")).toBe(true);
    expect(esTonoPositivo("listo para cerrar")).toBe(true);
  });

  it("detecta tono negativo", () => {
    expect(esTonoNegativo("está muy caro")).toBe(true);
    expect(esTonoNegativo("no me convence")).toBe(true);
    expect(esTonoNegativo("tengo otro proveedor")).toBe(true);
  });
});

describe("signals — categorías de producto", () => {
  it("detecta menciones de tela", () => {
    expect(pideTela("necesito sportok")).toBe(true);
    expect(pideTela("kilos de micropique")).toBe(true);
    expect(pideTela("¿tienen kyoto en blanco?")).toBe(true);
    expect(pideTela("una tela como felpa china")).toBe(true);
  });

  it("detecta menciones de uniforme/prenda", () => {
    expect(pideUniforme("para hacer pants")).toBe(true);
    expect(pideUniforme("uniformes deportivos")).toBe(true);
    expect(pideUniforme("sudaderas escolares")).toBe(true);
  });
});

describe("signals — detectarIntencionPago", () => {
  it("detecta intent de tarjeta", () => {
    const r = detectarIntencionPago("mándame el link de pago con tarjeta");
    expect(r.detectado).toBe(true);
    expect(r.metodo).toBe("tarjeta");
    expect(r.esSpei).toBe(false);
  });

  it("detecta intent de OXXO", () => {
    const r = detectarIntencionPago("le entro, lo pago en OXXO");
    expect(r.detectado).toBe(true);
    expect(r.metodo).toBe("oxxo");
  });

  it("default a tarjeta cuando no se especifica método", () => {
    const r = detectarIntencionPago("cerramos, me lo llevo");
    expect(r.detectado).toBe(true);
    expect(r.metodo).toBe("tarjeta");
  });

  it("SPEI marca esSpei=true y detectado=false (flujo distinto)", () => {
    const r = detectarIntencionPago("prefiero hacer transferencia SPEI");
    expect(r.detectado).toBe(false);
    expect(r.esSpei).toBe(true);
    expect(r.metodo).toBeNull();
  });

  it("'cuánto te debo' detecta intent (con 'te' opcional)", () => {
    expect(detectarIntencionPago("¿cuánto te debo?").detectado).toBe(true);
    expect(detectarIntencionPago("¿cuánto debo?").detectado).toBe(true);
  });

  it("'cuánto me cobras' detecta intent", () => {
    expect(detectarIntencionPago("¿cuánto me cobras por el rollo?").detectado).toBe(true);
  });

  it("mensajes sin intent retornan vacío", () => {
    const r = detectarIntencionPago("hola, ¿cómo está?");
    expect(r.detectado).toBe(false);
    expect(r.metodo).toBeNull();
    expect(r.esSpei).toBe(false);
  });
});
