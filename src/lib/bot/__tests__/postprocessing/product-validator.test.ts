import { describe, it, expect } from "vitest";
import {
  buildCorrectiveMessage,
  validateBotResponse,
} from "../../postprocessing/product-validator";

describe("postprocessing/product-validator — casos limpios", () => {
  it("respuesta sin telas prohibidas pasa", () => {
    const r = validateBotResponse(
      "Le recomiendo nuestro Sportok 280gr, ideal para uniformes deportivos."
    );
    expect(r.ok).toBe(true);
    expect(r.prohibidasMencionadas).toEqual([]);
  });

  it("respuesta vacía pasa", () => {
    expect(validateBotResponse("").ok).toBe(true);
    expect(validateBotResponse("   ").ok).toBe(true);
  });

  it("mencionar productos del catálogo está bien", () => {
    const texto =
      "Manejamos Alaska, Micropique, Felpa Polar, Sportok, Athlos, Brock y Apolo.";
    expect(validateBotResponse(texto).ok).toBe(true);
  });
});

describe("postprocessing/product-validator — casos del bug de producción", () => {
  it("detecta popelina (el caso real de paliacates)", () => {
    const r = validateBotResponse(
      "Para paliacates le recomiendo popelina de algodón, es la mejor opción."
    );
    expect(r.ok).toBe(false);
    expect(r.prohibidasMencionadas).toContain("popelina");
  });

  it("detecta lino", () => {
    const r = validateBotResponse(
      "Tenemos lino 100% natural en varios colores."
    );
    expect(r.ok).toBe(false);
    expect(r.prohibidasMencionadas).toContain("lino");
  });

  it("detecta mezclilla / denim", () => {
    expect(validateBotResponse("le ofrezco denim crudo").ok).toBe(false);
    expect(validateBotResponse("la mezclilla pesada").ok).toBe(false);
  });

  it("detecta múltiples telas prohibidas en una respuesta", () => {
    const r = validateBotResponse(
      "Manejamos popelina, lino, gabardina y casimir."
    );
    expect(r.ok).toBe(false);
    expect(r.prohibidasMencionadas).toEqual(
      expect.arrayContaining(["popelina", "lino", "gabardina", "casimir"])
    );
  });

  it("detecta variantes con tildes (popelín)", () => {
    expect(
      validateBotResponse("le recomiendo popelín de algodón").ok
    ).toBe(false);
  });

  it("dedupe: misma tela mencionada varias veces cuenta una sola", () => {
    const r = validateBotResponse(
      "popelina blanca, popelina negra, popelina rayada"
    );
    expect(r.prohibidasMencionadas).toEqual(["popelina"]);
  });
});

describe("postprocessing/product-validator — false positives", () => {
  it("no falsea con palabras parecidas", () => {
    // "lino" debe estar con word boundary; no matchea "molino" o "linotipia"
    expect(validateBotResponse("el molino de viento").ok).toBe(true);
    expect(validateBotResponse("máquina de linotipia").ok).toBe(true);
  });

  it("'lana' no matchea 'plana'", () => {
    expect(validateBotResponse("una superficie plana").ok).toBe(true);
  });

  it("'pana' no matchea 'campana'", () => {
    expect(validateBotResponse("la campana sonó").ok).toBe(true);
  });
});

describe("postprocessing/product-validator — buildCorrectiveMessage", () => {
  it("genera mensaje claro con la tela detectada", () => {
    const validation = validateBotResponse(
      "Le recomiendo popelina para sus paliacates"
    );
    const corrective = buildCorrectiveMessage(validation);
    expect(corrective).toContain("popelina");
    expect(corrective).toContain("Coyote Textil NO vende");
    expect(corrective).toContain("Reescribe");
  });

  it("incluye sugerencias de productos válidos en el mensaje correctivo", () => {
    const validation = validateBotResponse("le ofrezco lino");
    const corrective = buildCorrectiveMessage(validation);
    expect(corrective).toMatch(/Sportok|Micropique|Felpa|Alaska|Kyoto/);
  });
});
