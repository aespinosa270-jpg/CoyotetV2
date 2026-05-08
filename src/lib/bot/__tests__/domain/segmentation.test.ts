import { describe, it, expect } from "vitest";
import {
  calcularSegmento,
  segmentoToEmoji,
  segmentoToLabel,
} from "../../domain/profile/segmentation";
import type { ClientePerfil } from "../../types/domain";

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

describe("segmentation — calcularSegmento", () => {
  it("prospecto: sin compras y contacto reciente", () => {
    expect(calcularSegmento(perfilBase())).toBe("prospecto");
  });

  it("nuevo: 1 compra", () => {
    expect(calcularSegmento(perfilBase({ totalCompras: 1 }))).toBe("nuevo");
  });

  it("recurrente: 2 compras", () => {
    expect(calcularSegmento(perfilBase({ totalCompras: 2 }))).toBe(
      "recurrente"
    );
  });

  it("recurrente: 4 compras", () => {
    expect(calcularSegmento(perfilBase({ totalCompras: 4 }))).toBe(
      "recurrente"
    );
  });

  it("vip: 5 compras", () => {
    expect(calcularSegmento(perfilBase({ totalCompras: 5 }))).toBe("vip");
  });

  it("vip: 10 compras", () => {
    expect(calcularSegmento(perfilBase({ totalCompras: 10 }))).toBe("vip");
  });

  it("vip por monto acumulado >= $10,000 con pocas compras", () => {
    expect(
      calcularSegmento(perfilBase({ totalCompras: 2, montoAcumulado: 12000 }))
    ).toBe("vip");
  });

  it("inactivo: sin compras y 91 días sin contacto", () => {
    const hace91dias = new Date(Date.now() - 91 * 86_400_000).toISOString();
    expect(
      calcularSegmento(perfilBase({ ultimoContacto: hace91dias }))
    ).toBe("inactivo");
  });

  it("prospecto si hace 89 días (justo dentro del límite)", () => {
    const hace89dias = new Date(Date.now() - 89 * 86_400_000).toISOString();
    expect(
      calcularSegmento(perfilBase({ ultimoContacto: hace89dias }))
    ).toBe("prospecto");
  });

  it("VIP gana sobre inactivo (clientes VIP con 5+ compras nunca son inactivos)", () => {
    const hace200dias = new Date(Date.now() - 200 * 86_400_000).toISOString();
    expect(
      calcularSegmento(
        perfilBase({ totalCompras: 6, ultimoContacto: hace200dias })
      )
    ).toBe("vip");
  });

  it("fecha inválida no rompe (devuelve prospecto)", () => {
    expect(
      calcularSegmento(perfilBase({ ultimoContacto: "no-es-fecha" }))
    ).toBe("prospecto");
  });
});

describe("segmentation — helpers de display", () => {
  it("segmentoToEmoji devuelve emoji por segmento", () => {
    expect(segmentoToEmoji("vip")).toBe("👑");
    expect(segmentoToEmoji("nuevo")).toBe("🆕");
    expect(segmentoToEmoji("inactivo")).toBe("💤");
  });

  it("segmentoToLabel devuelve string en español", () => {
    expect(segmentoToLabel("vip")).toBe("Cliente VIP");
    expect(segmentoToLabel("recurrente")).toBe("Cliente recurrente");
    expect(segmentoToLabel("prospecto")).toBe("Prospecto");
  });
});
