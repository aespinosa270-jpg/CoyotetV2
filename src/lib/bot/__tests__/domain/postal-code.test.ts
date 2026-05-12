import { describe, it, expect } from "vitest";
import {
  extractCps,
  firstCp,
  isValidCp,
} from "../../domain/extractors/postal-code";

describe("postal-code — firstCp (uso típico del orquestador)", () => {
  it("CP suelto al final", () => {
    expect(firstCp("Mi dirección es Reforma 100, 06000")).toBe("06000");
  });

  it("CP con prefijo CP", () => {
    expect(firstCp("CP 03100")).toBe("03100");
    expect(firstCp("c.p. 06000")).toBe("06000");
    expect(firstCp("C.P.06000")).toBe("06000");
  });

  it("CP después de 'código postal'", () => {
    expect(firstCp("mi código postal es 11550")).toBe("11550");
    expect(firstCp("codigo postal: 11550")).toBe("11550");
  });

  it("CP con coma (06,000)", () => {
    expect(firstCp("CP 06,000")).toBe("06000");
    expect(firstCp("06,000 CDMX")).toBe("06000");
  });

  it("CP con leading zero", () => {
    expect(firstCp("01000")).toBe("01000");
    expect(firstCp("CP 01730")).toBe("01730");
  });

  it("ignora 4 dígitos pegados", () => {
    expect(firstCp("son 1234 pesos")).toBeNull();
  });

  it("ignora teléfonos (10 dígitos seguidos)", () => {
    expect(firstCp("mi teléfono es 5555123456")).toBeNull();
  });

  it("ignora números fuera del rango de CP", () => {
    expect(firstCp("00012")).toBeNull(); // < 01000
  });

  it("devuelve null si no hay CP", () => {
    expect(firstCp("hola, ¿cómo está?")).toBeNull();
    expect(firstCp("")).toBeNull();
    expect(firstCp("vivo en Tepito")).toBeNull();
  });

  it("CP en oración mexicana realista", () => {
    expect(firstCp("hola buenas tardes vivo en azcapotzalco 02530")).toBe("02530");
    expect(firstCp("La oficina está en Polanco, CP 11550 entre Masaryk y Horacio")).toBe("11550");
  });
});

describe("postal-code — extractCps (todos los CPs y metadata)", () => {
  it("devuelve array vacío si no hay CPs", () => {
    expect(extractCps("nada por aquí")).toEqual([]);
  });

  it("detecta múltiples CPs y los devuelve en orden de aparición", () => {
    const r = extractCps("envío de 06000 a 11550");
    expect(r).toHaveLength(2);
    expect(r[0].codigo).toBe("06000");
    expect(r[1].codigo).toBe("11550");
  });

  it("dedupe el mismo CP mencionado varias veces", () => {
    const r = extractCps("CP 06000, repito 06000");
    expect(r).toHaveLength(1);
    expect(r[0].codigo).toBe("06000");
  });

  it("marca CP con prefijo como confianza alta", () => {
    const r = extractCps("CP 06000");
    expect(r[0].confidence).toBe("high");
  });

  it("marca CP suelto como confianza media", () => {
    const r = extractCps("vivo en 06000");
    expect(r[0].confidence).toBe("medium");
  });

  it("contexto incluye texto alrededor del match", () => {
    const r = extractCps("La oficina está en Polanco CP 11550 entre Masaryk");
    expect(r[0].context).toContain("Polanco");
    expect(r[0].context).toContain("11550");
  });
});

describe("postal-code — isValidCp", () => {
  it("acepta CPs válidos", () => {
    expect(isValidCp("01000")).toBe(true);
    expect(isValidCp("06000")).toBe(true);
    expect(isValidCp("99999")).toBe(true);
  });

  it("rechaza CPs fuera de rango", () => {
    expect(isValidCp("00500")).toBe(false); // < 01000
    expect(isValidCp("00012")).toBe(false);
  });

  it("rechaza formatos inválidos", () => {
    expect(isValidCp("1234")).toBe(false); // 4 dígitos
    expect(isValidCp("123456")).toBe(false); // 6 dígitos
    expect(isValidCp("06A00")).toBe(false); // letra
    expect(isValidCp("")).toBe(false);
    expect(isValidCp("06,000")).toBe(false); // formato con coma sin normalizar
  });
});

describe("postal-code — casos del bug de producción", () => {
  // Estos son los escenarios típicos donde el bot fallaba en detectar el CP.
  // Si alguno de estos falla, hay que agregar más patrones al extractor.
  it("usuario escribe solo el número", () => {
    expect(firstCp("06000")).toBe("06000");
  });

  it("usuario escribe el CP en la dirección completa", () => {
    expect(
      firstCp("Av Reforma 100, Col Centro, Cuauhtémoc, CDMX 06000")
    ).toBe("06000");
  });

  it("usuario manda 'mi cp es' sin signo de puntuación", () => {
    expect(firstCp("mi cp es 06000")).toBe("06000");
  });

  it("CP de Edomex (rango alto)", () => {
    expect(firstCp("Cuautitlán 54700")).toBe("54700");
  });

  it("CP de Hidalgo", () => {
    expect(firstCp("Pachuca 42090")).toBe("42090");
  });
});
