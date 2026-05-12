import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSystemPrompt } from "../../intelligence/prompts/builder";
import * as catalogBlock from "../../intelligence/prompts/catalog-block";
import * as memoryRepo from "../../repositories/memory-repo";
import * as conversationRepo from "../../repositories/conversation-repo";
import type { ClientePerfil } from "../../types/domain";

vi.mock("../../intelligence/prompts/catalog-block");
vi.mock("../../repositories/memory-repo");
vi.mock("../../repositories/conversation-repo", () => ({
  getResumen: vi.fn(),
}));

function perfilBase(overrides: Partial<ClientePerfil> = {}): ClientePerfil {
  return {
    telefono: "5215551234567",
    nombre: "Juan",
    correoVerificado: false,
    privacidadRespondida: true,
    terminosAceptados: false,
    genero: "unknown",
    primerContacto: new Date().toISOString(),
    ultimoContacto: new Date().toISOString(),
    totalCompras: 3,
    montoAcumulado: 4500,
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
    segmento: "recurrente",
    etapaAbandono: null,
    intentosDePago: 0,
    recordatoriosPendientes: [],
    temperaturaCompra: 50,
    nivelConfianza: 60,
    tacticaActual: "valor_rendimiento",
    propensionCross: { hilos: 20, elasticos: 10, volumenExtra: 15 },
    objecionesComunes: [],
    vectorObjeciones: {},
    tieneSuscripcion: false,
    membresiaOfrecida: false,
    ...overrides,
  };
}

describe("intelligence/prompts/builder (Fase 5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(catalogBlock.buildCatalogBlock).mockResolvedValue(
      "=== CATÁLOGO ===\nAlaska | telas | $200/kg\n=== FIN ==="
    );
    vi.mocked(memoryRepo.getMemoria).mockResolvedValue({
      hechos: [],
      ultimaActualizacion: new Date().toISOString(),
    });
    vi.mocked(conversationRepo.getResumen).mockResolvedValue(null);
  });

  it("admin bypass devuelve prompt corto sin tocar Redis ni catálogo", async () => {
    const r = await buildSystemPrompt(perfilBase(), true);
    expect(r).toContain("HABLAS CON TU CREADOR");
    expect(memoryRepo.getMemoria).not.toHaveBeenCalled();
    expect(conversationRepo.getResumen).not.toHaveBeenCalled();
  });

  it("incluye el catálogo y reglas anti-invención", async () => {
    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("CATÁLOGO");
    expect(r).toContain("Alaska");
    expect(r).toContain("REGLAS ANTI-INVENCIÓN");
    expect(r).toContain("popelina");
  });

  it("incluye contexto del cliente", async () => {
    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("Juan");
    expect(r).toContain("Compras previas: 3");
    expect(r).toContain("recurrente");
  });

  it("NO incluye bloque de memoria si está vacía", async () => {
    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).not.toContain("LO QUE SABES DEL CLIENTE");
  });

  it("incluye memoria episódica cuando hay hechos confiables", async () => {
    vi.mocked(memoryRepo.getMemoria).mockResolvedValueOnce({
      hechos: [
        {
          hecho: "Tiene fábrica en Iztapalapa",
          categoria: "negocio",
          confianza: 0.9,
          timestamp: new Date().toISOString(),
        },
      ],
      ultimaActualizacion: new Date().toISOString(),
    });

    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("LO QUE SABES DEL CLIENTE");
    expect(r).toContain("Tiene fábrica en Iztapalapa");
  });

  it("NO incluye objeciones si vectorObjeciones está vacío", async () => {
    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).not.toContain("OBJECIONES DETECTADAS");
  });

  it("incluye objeciones con sus pesos cuando hay vectorObjeciones poblado", async () => {
    const perfil = perfilBase({
      vectorObjeciones: { precio_alto: 8, tiempo_entrega: 3 } as any,
    });
    const r = await buildSystemPrompt(perfil, false);

    expect(r).toContain("OBJECIONES DETECTADAS");
    expect(r).toContain("Precio muy alto");
    expect(r).toContain("8.0");
    expect(r).toContain("Tiempo de entrega");
  });

  it("incluye resumen semántico cuando existe", async () => {
    vi.mocked(conversationRepo.getResumen).mockResolvedValueOnce(
      "Cliente pidió Sportok 25kg, cotización $4800, pendiente método de pago"
    );

    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("RESUMEN DE LA CONVERSACIÓN");
    expect(r).toContain("Sportok 25kg");
  });

  it("si memoria-repo falla, el prompt se construye sin memoria (no rompe)", async () => {
    vi.mocked(memoryRepo.getMemoria).mockRejectedValueOnce(
      new Error("redis down")
    );

    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("Juan"); // contexto del cliente sí está
    expect(r).not.toContain("LO QUE SABES DEL CLIENTE"); // memoria omitida
  });

  it("si conversation-repo (resumen) falla, el prompt se construye sin resumen", async () => {
    vi.mocked(conversationRepo.getResumen).mockRejectedValueOnce(
      new Error("redis down")
    );

    const r = await buildSystemPrompt(perfilBase(), false);
    expect(r).toContain("CATÁLOGO");
    expect(r).not.toContain("RESUMEN DE LA CONVERSACIÓN");
  });
});
