import { describe, it, expect } from "vitest";
import {
  decayObjeciones,
  emptyVector,
  topObjeciones,
  trackObjecion,
} from "../../intelligence/objections/tracker";
import type { ClientePerfil } from "../../types/domain";
import type { VectorObjeciones } from "../../intelligence/objections/types";

function perfilBase(
  vectorOverride?: Partial<VectorObjeciones>
): ClientePerfil {
  const vector = { ...emptyVector(), ...(vectorOverride ?? {}) };
  return {
    telefono: "521",
    nombre: "Test",
    correoVerificado: false,
    privacidadRespondida: false,
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
    vectorObjeciones: vector,
    tieneSuscripcion: false,
    membresiaOfrecida: false,
  };
}

describe("objections/tracker — trackObjecion", () => {
  it("registra una objeción con peso según severidad", () => {
    const perfil = perfilBase();
    const r = trackObjecion(perfil, {
      tipo: "precio_alto",
      severidad: 3,
      contexto: "muy caro",
    });
    expect((r.vectorObjeciones as VectorObjeciones).precio_alto).toBe(3);
  });

  it("acumula scores en mensajes sucesivos", () => {
    let p = perfilBase();
    p = trackObjecion(p, { tipo: "precio_alto", severidad: 2, contexto: "" });
    p = trackObjecion(p, { tipo: "precio_alto", severidad: 3, contexto: "" });
    p = trackObjecion(p, { tipo: "precio_alto", severidad: 1, contexto: "" });
    expect((p.vectorObjeciones as VectorObjeciones).precio_alto).toBe(6);
  });

  it("tipo='ninguna' no cambia el perfil", () => {
    const p = perfilBase({ precio_alto: 5 });
    const r = trackObjecion(p, {
      tipo: "ninguna",
      severidad: 1,
      contexto: "",
    });
    expect(r).toBe(p); // misma referencia, no se crea nuevo objeto
  });

  it("clamp a MAX_SCORE=20", () => {
    let p = perfilBase({ precio_alto: 19 });
    p = trackObjecion(p, { tipo: "precio_alto", severidad: 5, contexto: "" });
    expect((p.vectorObjeciones as VectorObjeciones).precio_alto).toBe(20);
  });

  it("actualiza objecionesComunes con las top 3 labels", () => {
    let p = perfilBase();
    p = trackObjecion(p, { tipo: "precio_alto", severidad: 5, contexto: "" });
    p = trackObjecion(p, { tipo: "tiempo_entrega", severidad: 3, contexto: "" });
    p = trackObjecion(p, {
      tipo: "calidad_dudas",
      severidad: 2,
      contexto: "",
    });

    expect(p.objecionesComunes).toEqual([
      "Precio muy alto",
      "Tiempo de entrega",
      "Dudas de calidad",
    ]);
  });

  it("no muta el perfil de entrada", () => {
    const original = perfilBase();
    const snapshot = JSON.stringify(original);
    trackObjecion(original, {
      tipo: "precio_alto",
      severidad: 3,
      contexto: "",
    });
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("funciona si vectorObjeciones aún no existe en el perfil", () => {
    const perfil = perfilBase();
    delete (perfil as any).vectorObjeciones;
    const r = trackObjecion(perfil, {
      tipo: "precio_alto",
      severidad: 2,
      contexto: "",
    });
    expect((r.vectorObjeciones as VectorObjeciones).precio_alto).toBe(2);
  });
});

describe("objections/tracker — decayObjeciones", () => {
  it("multiplica todas las objeciones por 0.7", () => {
    const p = perfilBase({ precio_alto: 10, tiempo_entrega: 5 });
    const r = decayObjeciones(p);
    expect((r.vectorObjeciones as VectorObjeciones).precio_alto).toBe(7);
    expect((r.vectorObjeciones as VectorObjeciones).tiempo_entrega).toBe(3.5);
  });

  it("borra objeciones que caen bajo PRUNE_THRESHOLD (0.5)", () => {
    const p = perfilBase({ precio_alto: 0.6 });
    const r = decayObjeciones(p);
    expect((r.vectorObjeciones as VectorObjeciones).precio_alto).toBe(0);
  });

  it("varias rondas de decay convergen a 0", () => {
    let p = perfilBase({ precio_alto: 10 });
    for (let i = 0; i < 10; i++) p = decayObjeciones(p);
    expect((p.vectorObjeciones as VectorObjeciones).precio_alto).toBe(0);
  });

  it("actualiza objecionesComunes tras decay", () => {
    const p = perfilBase({ precio_alto: 1, tiempo_entrega: 0.4 });
    const r = decayObjeciones(p);
    // precio_alto * 0.7 = 0.7 → queda
    // tiempo_entrega * 0.7 = 0.28 → se borra
    expect(r.objecionesComunes).toEqual(["Precio muy alto"]);
  });
});

describe("objections/tracker — topObjeciones", () => {
  it("devuelve top N ordenadas desc", () => {
    const p = perfilBase({
      precio_alto: 3,
      tiempo_entrega: 10,
      calidad_dudas: 5,
    });
    const top = topObjeciones(p, 2);
    expect(top).toEqual([
      { tipo: "tiempo_entrega", score: 10 },
      { tipo: "calidad_dudas", score: 5 },
    ]);
  });

  it("filtra tipos en score 0", () => {
    const p = perfilBase({ precio_alto: 3, tiempo_entrega: 0 });
    const top = topObjeciones(p);
    expect(top).toHaveLength(1);
    expect(top[0].tipo).toBe("precio_alto");
  });

  it("devuelve [] si el perfil no tiene objeciones", () => {
    const p = perfilBase();
    expect(topObjeciones(p)).toEqual([]);
  });
});
