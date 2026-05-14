import { describe, it, expect } from "vitest";
import {
  decidirPropuestaMembresia,
  buildPropuestaPromptBlock,
  getInfoMembresiasCompleta,
  type ContextoMembresiaCliente,
} from "../../intelligence/membership/decider";
import type { MembershipTier } from "@prisma/client";
import type { ObjecionDetectada } from "../../intelligence/objections/types";

// ── Helpers ──────────────────────────────────────────────────────────

const ctxBase = (overrides: Partial<ContextoMembresiaCliente> = {}): ContextoMembresiaCliente => ({
  tierActual: "NONE" as MembershipTier,
  totalCompras: 0,
  vecesPropuesta: 0,
  ...overrides,
});

const objecion = (
  tipo: ObjecionDetectada["tipo"],
  severidad: 1 | 2 | 3 | 4 | 5 = 3
): ObjecionDetectada => ({
  tipo,
  severidad,
  contexto: "test",
});

// ── Tests de decidirPropuestaMembresia ───────────────────────────────

describe("intelligence/membership — decidirPropuestaMembresia", () => {
  it("NO propone si cliente ya es BLACK", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ tierActual: "BLACK" as MembershipTier, totalCompras: 10 }),
      objecion("precio_alto")
    );
    expect(r.deberiaProponer).toBe(false);
    expect(r.yaEsPremium).toBe(true);
  });

  it("NO propone si cliente ya es ELITE", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ tierActual: "ELITE" as MembershipTier, totalCompras: 5 }),
      objecion("precio_alto")
    );
    expect(r.deberiaProponer).toBe(false);
    expect(r.yaEsPremium).toBe(true);
  });

  it("propone si objeta precio con severidad >=2", () => {
    const r = decidirPropuestaMembresia(
      ctxBase(),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(true);
    expect(r.trigger).toBe("objecion_precio");
  });

  it("NO propone si objeta precio con severidad 1 (queja leve)", () => {
    const r = decidirPropuestaMembresia(
      ctxBase(),
      objecion("precio_alto", 1)
    );
    expect(r.deberiaProponer).toBe(false);
  });

  it("propone si tiene 3+ compras sin membresía", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 4 }),
      objecion("ninguna", 1)
    );
    expect(r.deberiaProponer).toBe(true);
    expect(r.trigger).toBe("compras_acumuladas");
  });

  it("NO propone si tiene <3 compras y sin objeción", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 2 }),
      objecion("ninguna", 1)
    );
    expect(r.deberiaProponer).toBe(false);
  });

  it("trigger='ambos' si tiene 3+ compras Y objeta precio", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 5 }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(true);
    expect(r.trigger).toBe("ambos");
  });

  it("sugiere BLACK si cliente tiene 10+ compras", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 15 }),
      objecion("precio_alto")
    );
    expect(r.planSugerido).toBe("BLACK");
  });

  it("sugiere GOLD para clientes con menos de 10 compras", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 4 }),
      objecion("precio_alto")
    );
    expect(r.planSugerido).toBe("GOLD");
  });

  it("respeta veto de marketing vigente", () => {
    const enUnaSemana = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const r = decidirPropuestaMembresia(
      ctxBase({
        totalCompras: 5,
        vetoMarketing: { hasta: enUnaSemana },
      }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(false);
  });

  it("veto expirado se ignora", () => {
    const haceUnaSemana = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const r = decidirPropuestaMembresia(
      ctxBase({
        totalCompras: 5,
        vetoMarketing: { hasta: haceUnaSemana },
      }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(true);
  });

  it("respeta rechazo explícito dentro de 30 días", () => {
    const haceUnaSemana = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const r = decidirPropuestaMembresia(
      ctxBase({
        totalCompras: 5,
        rechazoExplicito: true,
        ultimaPropuesta: haceUnaSemana,
      }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(false);
  });

  it("propone de nuevo si rechazo fue hace 40+ días", () => {
    const hace40dias = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000
    ).toISOString();
    const r = decidirPropuestaMembresia(
      ctxBase({
        totalCompras: 5,
        rechazoExplicito: true,
        ultimaPropuesta: hace40dias,
      }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(true);
  });

  it("cooldown si vecesPropuesta>=3 y reciente", () => {
    const hace7dias = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const r = decidirPropuestaMembresia(
      ctxBase({
        totalCompras: 5,
        vecesPropuesta: 4,
        ultimaPropuesta: hace7dias,
      }),
      objecion("precio_alto", 3)
    );
    expect(r.deberiaProponer).toBe(false);
  });

  it("genera beneficio destacado mencionando puntos", () => {
    const r = decidirPropuestaMembresia(
      ctxBase({ totalCompras: 4 }),
      objecion("precio_alto", 3)
    );
    expect(r.beneficioDestacado).toBeDefined();
    expect(r.beneficioDestacado!.toLowerCase()).toContain("pto");
  });
});

// ── Tests de buildPropuestaPromptBlock ───────────────────────────────

describe("intelligence/membership — buildPropuestaPromptBlock", () => {
  it("retorna string vacío si deberiaProponer=false", () => {
    const block = buildPropuestaPromptBlock(
      {
        deberiaProponer: false,
        trigger: "ninguno",
        planSugerido: "GOLD" as MembershipTier,
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    expect(block).toBe("");
  });

  it("incluye el nombre del plan a proponer", () => {
    const block = buildPropuestaPromptBlock(
      {
        deberiaProponer: true,
        trigger: "objecion_precio",
        planSugerido: "GOLD" as MembershipTier,
        beneficioDestacado: "1 pto por cada $100",
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    expect(block).toContain("Socio Comercial");
    expect(block).toContain("$299/mes");
  });

  it("incluye la URL de inscripción", () => {
    const block = buildPropuestaPromptBlock(
      {
        deberiaProponer: true,
        trigger: "compras_acumuladas",
        planSugerido: "GOLD" as MembershipTier,
        beneficioDestacado: "test",
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    expect(block).toContain("https://www.coyotetextil.com/membresia");
  });

  it("incluye reglas de NO ser agresivo", () => {
    const block = buildPropuestaPromptBlock(
      {
        deberiaProponer: true,
        trigger: "objecion_precio",
        planSugerido: "BLACK" as MembershipTier,
        beneficioDestacado: "x",
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    expect(block.toLowerCase()).toContain("nunca");
    expect(block.toLowerCase()).toContain("agresiva");
  });

  it("varía el contexto según trigger", () => {
    const objecion = buildPropuestaPromptBlock(
      {
        deberiaProponer: true,
        trigger: "objecion_precio",
        planSugerido: "GOLD" as MembershipTier,
        beneficioDestacado: "x",
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    const compras = buildPropuestaPromptBlock(
      {
        deberiaProponer: true,
        trigger: "compras_acumuladas",
        planSugerido: "GOLD" as MembershipTier,
        beneficioDestacado: "x",
        yaEsPremium: false,
      },
      "NONE" as MembershipTier
    );
    expect(objecion).not.toBe(compras);
    expect(objecion.toLowerCase()).toContain("precio");
    expect(compras.toLowerCase()).toContain("cliente frecuente");
  });
});

// ── Tests de getInfoMembresiasCompleta ───────────────────────────────

describe("intelligence/membership — getInfoMembresiasCompleta", () => {
  it("retorna los 4 planes en orden", () => {
    const planes = getInfoMembresiasCompleta();
    expect(planes).toHaveLength(4);
    expect(planes[0].tier).toBe("NONE");
    expect(planes[1].tier).toBe("GOLD");
    expect(planes[2].tier).toBe("BLACK");
    expect(planes[3].tier).toBe("ELITE");
  });

  it("precios coinciden con la fuente de verdad", () => {
    const planes = getInfoMembresiasCompleta();
    expect(planes[0].precioMensual).toBe(0);
    expect(planes[1].precioMensual).toBe(299);
    expect(planes[2].precioMensual).toBe(699);
    expect(planes[3].precioMensual).toBe(1129);
  });

  it("solo incluye beneficios marcados como available=true", () => {
    const planes = getInfoMembresiasCompleta();
    // NONE solo tiene 2 disponibles: points + ai_support
    expect(planes[0].beneficiosIncluidos).toHaveLength(2);
    // ELITE tiene los 8 disponibles
    expect(planes[3].beneficiosIncluidos).toHaveLength(8);
  });

  it("puntos por 100 escalan correctamente", () => {
    const planes = getInfoMembresiasCompleta();
    expect(planes[0].puntosPor100MXN).toBe(0.5);
    expect(planes[1].puntosPor100MXN).toBe(1);
    expect(planes[2].puntosPor100MXN).toBe(2);
    expect(planes[3].puntosPor100MXN).toBe(4);
  });
});

