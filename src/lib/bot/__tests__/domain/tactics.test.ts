import { describe, it, expect } from "vitest";
import {
  seleccionarTactica,
  tacticaToLabel,
} from "../../domain/sales/tactics";
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

describe("tactics — seleccionarTactica", () => {
  // ── Temperatura ────────────────────────────────────────────────

  it("temperatura ≥70 → cierre_directo", () => {
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 70 }))
    ).toBe("cierre_directo");
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 90 }))
    ).toBe("cierre_directo");
  });

  it("temperatura 50-69 → urgencia_escasez", () => {
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 50 }))
    ).toBe("urgencia_escasez");
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 65 }))
    ).toBe("urgencia_escasez");
  });

  // ── Objeciones ─────────────────────────────────────────────────

  it("2+ objeciones → manejo_objecion (cuando temp es baja)", () => {
    expect(
      seleccionarTactica(
        perfilBase({
          temperaturaCompra: 30,
          objecionesComunes: ["precio", "tiempo"],
        })
      )
    ).toBe("manejo_objecion");
  });

  it("1 objeción NO activa manejo_objecion", () => {
    const t = seleccionarTactica(
      perfilBase({
        temperaturaCompra: 30,
        totalCompras: 0,
        objecionesComunes: ["precio"],
      })
    );
    expect(t).not.toBe("manejo_objecion");
  });

  it("temperatura caliente gana sobre objeciones (cierre primero)", () => {
    expect(
      seleccionarTactica(
        perfilBase({
          temperaturaCompra: 80,
          objecionesComunes: ["precio", "tiempo", "color"],
        })
      )
    ).toBe("cierre_directo");
  });

  // ── Total de compras ───────────────────────────────────────────

  it("0 compras + temp baja + sin objeciones → social_proof", () => {
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 30, totalCompras: 0 }))
    ).toBe("social_proof");
  });

  it("3+ compras → fidelizacion_vip", () => {
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 30, totalCompras: 3 }))
    ).toBe("fidelizacion_vip");
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 30, totalCompras: 8 }))
    ).toBe("fidelizacion_vip");
  });

  it("1-2 compras → valor_rendimiento (default)", () => {
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 30, totalCompras: 1 }))
    ).toBe("valor_rendimiento");
    expect(
      seleccionarTactica(perfilBase({ temperaturaCompra: 30, totalCompras: 2 }))
    ).toBe("valor_rendimiento");
  });

  // ── Casos combinados realistas ─────────────────────────────────

  it("VIP con baja temperatura → fidelizacion_vip", () => {
    expect(
      seleccionarTactica(
        perfilBase({ temperaturaCompra: 30, totalCompras: 6 })
      )
    ).toBe("fidelizacion_vip");
  });

  it("VIP con alta temperatura → cierre_directo (cierre gana)", () => {
    expect(
      seleccionarTactica(
        perfilBase({ temperaturaCompra: 80, totalCompras: 6 })
      )
    ).toBe("cierre_directo");
  });

  it("Cliente nuevo con muchas objeciones → manejo_objecion", () => {
    expect(
      seleccionarTactica(
        perfilBase({
          temperaturaCompra: 30,
          totalCompras: 0,
          objecionesComunes: ["precio", "tiempo"],
        })
      )
    ).toBe("manejo_objecion");
  });
});

describe("tactics — tacticaToLabel", () => {
  it("devuelve string legible", () => {
    expect(tacticaToLabel("cierre_directo")).toBe("Cierre directo");
    expect(tacticaToLabel("fidelizacion_vip")).toBe("Fidelización VIP");
    expect(tacticaToLabel("social_proof")).toBe("Prueba social");
  });
});
