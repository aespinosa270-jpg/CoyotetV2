import { describe, it, expect } from "vitest";
import { actualizarPerfilConMensaje } from "../../domain/profile/updater";
import type {
  ClientePerfil,
  MensajeHistorial,
} from "../../types/domain";

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

describe("updater — pipeline integral", () => {
  it("no muta el perfil de entrada (función pura)", () => {
    const perfil = perfilBase();
    const snapshot = JSON.parse(JSON.stringify(perfil));
    actualizarPerfilConMensaje(perfil, {
      mensaje: "quiero comprar",
      historial: [],
    });
    expect(perfil).toEqual(snapshot);
  });

  it("escenario: cliente nuevo pregunta precio → temperatura sube, táctica social_proof o valor", () => {
    const perfil = perfilBase({ totalCompras: 0, temperaturaCompra: 30 });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "¿cuánto cuesta el sportok?",
      historial: [userMsg("¿cuánto cuesta el sportok?")],
    });
    expect(r.temperaturaCompra).toBeGreaterThan(perfil.temperaturaCompra);
    // Cliente nuevo, temp aún tibia, sin objeciones → social_proof
    expect(r.tacticaActual).toBe("social_proof");
  });

  it("escenario: cliente caliente pide pago → cierre_directo", () => {
    const perfil = perfilBase({
      temperaturaCompra: 65, // delta de mensaje lo va a empujar a >70
      direccionEnvio: "Reforma 100",
      ultimaCotizacion: "alaska 25kg",
    });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "quiero pagar con tarjeta el rollo",
      historial: [],
    });
    expect(r.temperaturaCompra).toBeGreaterThanOrEqual(70);
    expect(r.tacticaActual).toBe("cierre_directo");
  });

  it("escenario: cliente VIP recurrente → fidelizacion_vip cuando baja temperatura", () => {
    const perfil = perfilBase({
      totalCompras: 6,
      temperaturaCompra: 30,
      productosFavoritos: ["Sportok"],
    });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "buen día",
      historial: [],
    });
    expect(r.segmento).toBe("vip");
    expect(r.tacticaActual).toBe("fidelizacion_vip");
  });

  it("escenario: cliente con objeciones → manejo_objecion", () => {
    const perfil = perfilBase({
      temperaturaCompra: 30,
      totalCompras: 1,
      objecionesComunes: ["precio", "tiempo"],
    });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "lo pienso después",
      historial: [],
    });
    expect(r.tacticaActual).toBe("manejo_objecion");
    // El mensaje frío baja temperatura
    expect(r.temperaturaCompra).toBeLessThan(perfil.temperaturaCompra);
  });

  it("escenario: cliente menciona telas → propensión a hilos sube", () => {
    const perfil = perfilBase();
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "necesito tela sportok",
      historial: [],
    });
    expect(r.propensionCross.hilos).toBeGreaterThan(
      perfil.propensionCross.hilos
    );
  });

  it("escenario: cliente con historial positivo → confianza sube", () => {
    const perfil = perfilBase({ nivelConfianza: 40 });
    const historial = [
      userMsg("perfecto"),
      userMsg("excelente"),
      userMsg("muchas gracias"),
    ];
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "gracias",
      historial,
    });
    expect(r.nivelConfianza).toBeGreaterThan(perfil.nivelConfianza);
  });

  it("escenario: VIP con compras suficientes calcula patrón de compra", () => {
    const perfil = perfilBase({
      totalCompras: 4,
      primerContacto: "2025-01-01T00:00:00Z",
      ultimaFechaCompra: "2025-04-01T00:00:00Z",
      productosFavoritos: ["Sportok"],
      ticketPromedio: 1500,
    });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "hola",
      historial: [],
    });
    expect(r.patronCompra).toBeDefined();
    expect(r.patronCompra).toContain("Sportok");
    expect(r.diasEntreCompras).toBe(30);
  });

  it("escenario: cliente cerca de ciclo → predicción de siguiente pedido", () => {
    const hace25Dias = new Date(Date.now() - 25 * 86_400_000).toISOString();
    const perfil = perfilBase({
      totalCompras: 3,
      ultimaFechaCompra: hace25Dias,
      diasEntreCompras: 30,
      productosFavoritos: ["Sportok"],
    });
    const r = actualizarPerfilConMensaje(perfil, {
      mensaje: "hola",
      historial: [],
    });
    expect(r.prediccionSiguientePedido).toBeDefined();
    expect(r.prediccionSiguientePedido).toContain("Sportok");
  });

  it("escenario: tres mensajes calientes seguidos suben la temperatura progresivamente", () => {
    let perfil = perfilBase({ temperaturaCompra: 30 });
    const mensajes = [
      "¿cuánto cuesta?",
      "quiero un rollo",
      "cuándo llega",
    ];
    const tempsObservadas: number[] = [perfil.temperaturaCompra];
    for (const m of mensajes) {
      perfil = actualizarPerfilConMensaje(perfil, {
        mensaje: m,
        historial: [],
      });
      tempsObservadas.push(perfil.temperaturaCompra);
    }
    // Cada paso sube respecto al anterior
    for (let i = 1; i < tempsObservadas.length; i++) {
      expect(tempsObservadas[i]).toBeGreaterThan(tempsObservadas[i - 1]);
    }
  });

  it("temperatura permanece dentro de [0, 100] aún en escenarios extremos", () => {
    let perfil = perfilBase({ temperaturaCompra: 95 });
    for (let i = 0; i < 20; i++) {
      perfil = actualizarPerfilConMensaje(perfil, {
        mensaje: "quiero comprar pagar tarjeta link cotización rollo",
        historial: [],
      });
    }
    expect(perfil.temperaturaCompra).toBeLessThanOrEqual(100);
    expect(perfil.temperaturaCompra).toBeGreaterThanOrEqual(0);
  });
});
