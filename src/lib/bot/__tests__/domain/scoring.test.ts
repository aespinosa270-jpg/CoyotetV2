import { describe, it, expect } from "vitest";
import {
  actualizarConfianza,
  actualizarPropensionCross,
  actualizarTemperatura,
  calcularDeltaTemperatura,
  calcularDiasEntreCompras,
  calcularPatronCompra,
  predecirSiguientePedido,
} from "../../domain/profile/scoring";
import type {
  ClientePerfil,
  MensajeHistorial,
  PropensionCross,
} from "../../types/domain";

// ── Helpers ─────────────────────────────────────────────────────────

function perfilBase(overrides: Partial<ClientePerfil> = {}): ClientePerfil {
  return {
    telefono: "5215551234567",
    nombre: "Test",
    correoVerificado: false,
    privacidadRespondida: true,
    terminosAceptados: false,
    genero: "unknown",
    primerContacto: new Date().toISOString(),
    ultimoContacto: new Date().toISOString(),
    totalCompras: 0,
    montoAcumulado: 0,
    productosComprados: [],
    productosFavoritos: [],
    categoriasPedidas: [],
    direccionEnvio: "",
    cpFiscal: "",
    metodoPagoFavorito: "",
    requiereFrecuenteFactura: false,
    sensibilidadPrecio: "media",
    preferencias: [],
    interesesDeclarados: [],
    notas: "",
    segmento: "prospecto",
    etapaAbandono: null,
    intentosDePago: 0,
    recordatoriosPendientes: [],
    temperaturaCompra: 30,
    nivelConfianza: 40,
    tacticaActual: "social_proof",
    propensionCross: { hilos: 20, elasticos: 10, volumenExtra: 15 },
    objecionesComunes: [],
    vectorObjeciones: {},
    tieneSuscripcion: false,
    membresiaOfrecida: false,
    ...overrides,
  };
}

function userMsg(content: string): MensajeHistorial {
  return { role: "user", content, timestamp: new Date().toISOString() };
}

function botMsg(content: string): MensajeHistorial {
  return { role: "assistant", content, timestamp: new Date().toISOString() };
}

// ── Temperatura ─────────────────────────────────────────────────────

describe("scoring — calcularDeltaTemperatura", () => {
  it("una señal caliente suma 15", () => {
    const delta = calcularDeltaTemperatura(perfilBase(), "¿cuánto cuesta?");
    expect(delta).toBe(15);
  });

  it("una señal fría resta 20", () => {
    const delta = calcularDeltaTemperatura(perfilBase(), "está muy caro");
    expect(delta).toBe(-20);
  });

  it("cliente con cotización previa: +10 bonus", () => {
    const delta = calcularDeltaTemperatura(
      perfilBase({ ultimaCotizacion: "alaska 25kg | $4800" }),
      "hola"
    );
    expect(delta).toBe(10);
  });

  it("cliente con dirección: +8 bonus", () => {
    const delta = calcularDeltaTemperatura(
      perfilBase({ direccionEnvio: "Reforma 100" }),
      "hola"
    );
    expect(delta).toBe(8);
  });

  it("cliente abandonó pago: -10", () => {
    const delta = calcularDeltaTemperatura(
      perfilBase({ etapaAbandono: "pago" }),
      "hola"
    );
    expect(delta).toBe(-10);
  });

  it("combina señales y bonus", () => {
    const delta = calcularDeltaTemperatura(
      perfilBase({
        direccionEnvio: "Reforma",
        ultimaCotizacion: "x",
      }),
      "quiero pagar con tarjeta"
    );
    // 2 señales calientes (quiero, tarjeta) + cotizacion + dir
    // 2 × 15 + 10 + 8 = 48
    expect(delta).toBe(48);
  });
});

describe("scoring — actualizarTemperatura", () => {
  it("aplica delta suavizado al 30%", () => {
    expect(actualizarTemperatura(50, 30)).toBe(59); // 50 + 30*0.3 = 59
    expect(actualizarTemperatura(50, -20)).toBe(44); // 50 + (-20*0.3) = 44
  });

  it("clamp al rango [0, 100]", () => {
    expect(actualizarTemperatura(95, 100)).toBe(100);
    expect(actualizarTemperatura(5, -100)).toBe(0);
  });

  it("una racha de mensajes fríos baja temperatura progresivamente", () => {
    let temp = 70;
    for (let i = 0; i < 5; i++) {
      temp = actualizarTemperatura(temp, -20); // -6 por iteración
    }
    expect(temp).toBeLessThan(50);
    expect(temp).toBeGreaterThan(30); // pero no en 0
  });
});

// ── Confianza ───────────────────────────────────────────────────────

describe("scoring — actualizarConfianza", () => {
  it("solo cuenta mensajes del usuario, no del bot", () => {
    const historial = [
      userMsg("perfecto"),
      botMsg("perfecto su pedido está listo"),
      botMsg("excelente decisión"),
    ];
    // Solo 1 mensaje positivo del user (botMsg no cuenta)
    expect(actualizarConfianza(40, historial)).toBe(45);
  });

  it("positivos suman 5, negativos restan 8", () => {
    const historial = [
      userMsg("gracias"), // +5
      userMsg("excelente"), // +5
      userMsg("muy caro"), // -8
    ];
    expect(actualizarConfianza(40, historial)).toBe(40 + 10 - 8);
  });

  it("clamp al rango [0, 100]", () => {
    const sololNeg: MensajeHistorial[] = Array.from(
      { length: 20 },
      () => userMsg("muy caro")
    );
    expect(actualizarConfianza(40, sololNeg)).toBe(0);

    const soloPos: MensajeHistorial[] = Array.from(
      { length: 30 },
      () => userMsg("perfecto")
    );
    expect(actualizarConfianza(40, soloPos)).toBe(100);
  });
});

// ── Propensión cross ────────────────────────────────────────────────

describe("scoring — actualizarPropensionCross", () => {
  const base: PropensionCross = { hilos: 20, elasticos: 10, volumenExtra: 15 };

  it("pedir tela sube propensión de hilos", () => {
    const r = actualizarPropensionCross(base, "necesito sportok");
    expect(r.hilos).toBe(45);
    expect(r.elasticos).toBe(10);
  });

  it("pedir uniforme sube propensión de elásticos", () => {
    const r = actualizarPropensionCross(base, "para uniformes deportivos");
    expect(r.elasticos).toBe(40);
  });

  it("pedir ambas cosas sube ambas", () => {
    const r = actualizarPropensionCross(
      base,
      "tela para uniformes deportivos"
    );
    expect(r.hilos).toBe(45);
    expect(r.elasticos).toBe(40);
  });

  it("clamp a 90 max", () => {
    const cerca = { hilos: 80, elasticos: 75, volumenExtra: 15 };
    const r = actualizarPropensionCross(cerca, "quiero sportok para pants");
    expect(r.hilos).toBe(90);
    expect(r.elasticos).toBe(90);
  });

  it("no muta el objeto de entrada", () => {
    const original = { ...base };
    actualizarPropensionCross(base, "tela");
    expect(base).toEqual(original);
  });
});

// ── Días entre compras ─────────────────────────────────────────────

describe("scoring — calcularDiasEntreCompras", () => {
  it("undefined si no tiene 2+ compras", () => {
    expect(calcularDiasEntreCompras(perfilBase({ totalCompras: 0 }))).toBeUndefined();
    expect(calcularDiasEntreCompras(perfilBase({ totalCompras: 1 }))).toBeUndefined();
  });

  it("calcula días promedio entre compras", () => {
    const inicio = "2025-01-01T00:00:00Z";
    const fin = "2025-04-01T00:00:00Z"; // 90 días después
    const perfil = perfilBase({
      totalCompras: 4,
      primerContacto: inicio,
      ultimaFechaCompra: fin,
    });
    // 90 días / (4 - 1) = 30 días
    expect(calcularDiasEntreCompras(perfil)).toBe(30);
  });

  it("undefined si fechas inválidas", () => {
    const perfil = perfilBase({
      totalCompras: 3,
      primerContacto: "no-es-fecha",
      ultimaFechaCompra: "tampoco",
    });
    expect(calcularDiasEntreCompras(perfil)).toBeUndefined();
  });

  it("undefined si fin <= inicio", () => {
    const perfil = perfilBase({
      totalCompras: 3,
      primerContacto: "2025-04-01T00:00:00Z",
      ultimaFechaCompra: "2025-01-01T00:00:00Z",
    });
    expect(calcularDiasEntreCompras(perfil)).toBeUndefined();
  });
});

// ── Patrón de compra ───────────────────────────────────────────────

describe("scoring — calcularPatronCompra", () => {
  it("genera descripción humana cuando hay datos", () => {
    const perfil = perfilBase({
      totalCompras: 4,
      primerContacto: "2025-01-01T00:00:00Z",
      ultimaFechaCompra: "2025-04-01T00:00:00Z",
      productosFavoritos: ["Sportok", "Micropique"],
      ticketPromedio: 1500,
    });
    const r = calcularPatronCompra(perfil);
    expect(r).toContain("30 días");
    expect(r).toContain("Sportok + Micropique");
    expect(r).toContain("$1500");
  });

  it("undefined sin compras suficientes", () => {
    expect(calcularPatronCompra(perfilBase())).toBeUndefined();
  });

  it("usa 'varios' cuando no hay favoritos", () => {
    const perfil = perfilBase({
      totalCompras: 2,
      primerContacto: "2025-01-01T00:00:00Z",
      ultimaFechaCompra: "2025-02-01T00:00:00Z",
      productosFavoritos: [],
    });
    expect(calcularPatronCompra(perfil)).toContain("varios");
  });
});

// ── Predicción siguiente pedido ────────────────────────────────────

describe("scoring — predecirSiguientePedido", () => {
  it("undefined si no tiene favoritos", () => {
    const perfil = perfilBase({
      productosFavoritos: [],
      ultimaFechaCompra: "2025-01-01T00:00:00Z",
    });
    expect(predecirSiguientePedido(perfil)).toBeUndefined();
  });

  it("undefined si está dentro del 80% del ciclo", () => {
    const haceUnaSemana = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const perfil = perfilBase({
      productosFavoritos: ["Sportok"],
      ultimaFechaCompra: haceUnaSemana,
      diasEntreCompras: 30,
    });
    // 7 días no es ≥ 24 (30 × 0.8)
    expect(predecirSiguientePedido(perfil)).toBeUndefined();
  });

  it("predice cuando llega al 80% del ciclo", () => {
    const hace25Dias = new Date(Date.now() - 25 * 86_400_000).toISOString();
    const perfil = perfilBase({
      productosFavoritos: ["Sportok"],
      ultimaFechaCompra: hace25Dias,
      diasEntreCompras: 30,
    });
    const r = predecirSiguientePedido(perfil);
    expect(r).toContain("Sportok");
    expect(r).toContain("30 días");
  });

  it("usa ciclo default de 30 si no está calculado", () => {
    const hace30Dias = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const perfil = perfilBase({
      productosFavoritos: ["Micropique"],
      ultimaFechaCompra: hace30Dias,
      diasEntreCompras: undefined,
    });
    expect(predecirSiguientePedido(perfil)).toContain("Micropique");
  });
});
