import { describe, it, expect } from "vitest";
import {
  detectarRespuestaConsentimiento,
  buildConsentMessage,
  buildConsentAcceptedMessage,
  buildConsentRejectedMessage,
  buildConsentAmbiguousMessage,
} from "../../intelligence/consent/detector";

describe("intelligence/consent — detectarRespuestaConsentimiento", () => {
  // ── Aceptaciones ──
  it("detecta 'sí' como aceptación", () => {
    expect(detectarRespuestaConsentimiento("sí")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("si")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("SI")).toBe("acepta");
  });

  it("detecta variantes coloquiales de aceptación", () => {
    expect(detectarRespuestaConsentimiento("claro")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("dale")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("ok")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("está bien")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("autorizo")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("acepto")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("sip")).toBe("acepta");
  });

  it("detecta emojis afirmativos", () => {
    expect(detectarRespuestaConsentimiento("👍")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("✅")).toBe("acepta");
  });

  it("tolera puntuación y espacios", () => {
    expect(detectarRespuestaConsentimiento("¡Sí!")).toBe("acepta");
    expect(detectarRespuestaConsentimiento("   si   ")).toBe("acepta");
  });

  // ── Rechazos ──
  it("detecta 'no' como rechazo", () => {
    expect(detectarRespuestaConsentimiento("no")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("NO")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("no.")).toBe("rechaza");
  });

  it("detecta variantes de rechazo", () => {
    expect(detectarRespuestaConsentimiento("no gracias")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("no me interesa")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("paso")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("mejor no")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("ahorita no")).toBe("rechaza");
  });

  it("detecta expresiones de molestia como rechazo", () => {
    expect(detectarRespuestaConsentimiento("no me mandes")).toBe("rechaza");
    expect(detectarRespuestaConsentimiento("déjame en paz")).toBe("rechaza");
  });

  // ── Ambiguos ──
  it("clasifica respuestas ambiguas como ambiguo", () => {
    expect(detectarRespuestaConsentimiento("¿qué precio tiene la felpa?")).toBe(
      "ambiguo"
    );
    expect(detectarRespuestaConsentimiento("tal vez")).toBe("ambiguo");
    expect(detectarRespuestaConsentimiento("a ver dime más")).toBe("ambiguo");
  });

  it("mensaje muy largo → ambiguo (no es respuesta directa)", () => {
    const largo = "Sí, pero quiero saber primero todos los detalles de los planes, cuánto cuesta cada uno, qué incluyen, etc.";
    expect(detectarRespuestaConsentimiento(largo)).toBe("ambiguo");
  });

  it("texto vacío → ambiguo", () => {
    expect(detectarRespuestaConsentimiento("")).toBe("ambiguo");
    expect(detectarRespuestaConsentimiento("   ")).toBe("ambiguo");
  });

  it("conflicto SÍ+NO → rechaza (más conservador)", () => {
    expect(detectarRespuestaConsentimiento("si, no")).toBe("rechaza");
  });
});

describe("intelligence/consent — builders de mensajes", () => {
  it("buildConsentMessage incluye URLs reales", () => {
    const msg = buildConsentMessage();
    expect(msg).toContain("https://www.coyotetextil.com/privacy");
    expect(msg).toContain("https://www.coyotetextil.com/terms");
  });

  it("buildConsentMessage pide SÍ o NO", () => {
    const msg = buildConsentMessage();
    expect(msg).toContain("SÍ");
    expect(msg).toContain("NO");
  });

  it("buildConsentAcceptedMessage da opción de darse de baja", () => {
    const msg = buildConsentAcceptedMessage();
    expect(msg.toLowerCase()).toContain("baja");
  });

  it("buildConsentRejectedMessage es amable", () => {
    const msg = buildConsentRejectedMessage();
    expect(msg.toLowerCase()).toContain("entendido");
  });

  it("buildConsentAmbiguousMessage vuelve a preguntar", () => {
    const msg = buildConsentAmbiguousMessage();
    expect(msg.toLowerCase()).toContain("no estoy seguro");
    expect(msg).toContain("SÍ");
    expect(msg).toContain("NO");
  });
});
