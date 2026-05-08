import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createFakeRedis } from "../helpers/fake-redis";
import * as catalog from "../../repositories/catalog-repo";
import { keys } from "../../repositories/keys";
import type { TelaPorKilo } from "../../types/domain";

describe("catalog-repo — lectura del source con overlays", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    catalog._resetSourceCacheForTests();
    env = createFakeRedis();
  });

  // 👇 Aquí está la magia para evitar los "state leaks" sin romper el mock
  afterEach(async () => {
    await env.redis.del(keys.catalogOverlay());
  });

  // ── Lectura básica del source ────────────────────────────────

  it("getCatalog devuelve más de 40 productos del source", async () => {
    const all = await catalog.getCatalog(env.redis);
    expect(all.length).toBeGreaterThan(40);
  });

  it("hay telas, hilos y elásticos en el catálogo", async () => {
    const all = await catalog.getCatalog(env.redis);
    const telas = all.filter((p) => p.categoria === "telas");
    const hilos = all.filter((p) => p.categoria === "hilos");
    const elasticos = all.filter((p) => p.categoria === "elasticos");
    expect(telas.length).toBeGreaterThan(20);
    expect(hilos.length).toBeGreaterThan(0);
    expect(elasticos.length).toBeGreaterThan(10);
  });

  it("findById encuentra productos del source", async () => {
    const p = await catalog.findById("prod_alaska", env.redis);
    expect(p).not.toBeNull();
    expect(p!.nombre).toBe("Alaska");
  });

  it("findBySlug encuentra por slug normalizado", async () => {
    const p = await catalog.findBySlug("micropique", env.redis);
    expect(p).not.toBeNull();
  });

  it("findByCategoria filtra correctamente", async () => {
    const elasticos = await catalog.findByCategoria("elasticos", env.redis);
    expect(elasticos.every((p) => p.categoria === "elasticos")).toBe(true);
    expect(elasticos.length).toBeGreaterThan(5);
  });

  it("search hace match por nombre", async () => {
    const results = await catalog.search("alaska", env.redis);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.id === "prod_alaska")).toBe(true);
  });

  it("search hace match por categoría libre", async () => {
    const results = await catalog.search("invernal", env.redis);
    expect(results.length).toBeGreaterThan(0);
  });

  it("search vacía devuelve []", async () => {
    expect(await catalog.search("", env.redis)).toEqual([]);
    expect(await catalog.search("   ", env.redis)).toEqual([]);
  });

  // ── Overlay: precios ─────────────────────────────────────────

  it("setPriceOverride cambia el precio sin tocar el source", async () => {
    const before = await catalog.findById("prod_alaska", env.redis);
    expect(before!.menudeo).toBeGreaterThan(0);

    await catalog.setPriceOverride(
      "prod_alaska",
      { menudeo: 999 },
      "Jack",
      env.redis
    );

    const after = await catalog.findById("prod_alaska", env.redis);
    expect(after!.menudeo).toBe(999);
    // El mayoreo NO se tocó
    expect(after!.mayoreo).toBe(before!.mayoreo);
  });

  it("clearPriceOverride restaura el precio del source", async () => {
    const original = await catalog.findById("prod_alaska", env.redis);
    await catalog.setPriceOverride(
      "prod_alaska",
      { menudeo: 999, mayoreo: 888 },
      "Jack",
      env.redis
    );
    await catalog.clearPriceOverride("prod_alaska", env.redis);
    const restored = await catalog.findById("prod_alaska", env.redis);
    expect(restored!.menudeo).toBe(original!.menudeo);
    expect(restored!.mayoreo).toBe(original!.mayoreo);
  });

  // ── Overlay: ocultar / mostrar ───────────────────────────────

  it("hideProduct lo quita del catálogo visible", async () => {
    const before = await catalog.findById("prod_alaska", env.redis);
    expect(before).not.toBeNull();

    await catalog.hideProduct("prod_alaska", "Jack", env.redis);

    const after = await catalog.findById("prod_alaska", env.redis);
    expect(after).toBeNull();
  });

  it("unhideProduct lo regresa al catálogo", async () => {
    await catalog.hideProduct("prod_alaska", "Jack", env.redis);
    await catalog.unhideProduct("prod_alaska", env.redis);
    const restored = await catalog.findById("prod_alaska", env.redis);
    expect(restored).not.toBeNull();
  });

  // ── Overlay: productos custom ────────────────────────────────

  it("addCustomProduct agrega un producto que no está en el source", async () => {
    const customProduct: TelaPorKilo = {
      id: "custom_test_001",
      nombre: "Tela de Prueba",
      slug: "tela-prueba",
      info: "tela inventada por Jack",
      menudeo: 200,
      mayoreo: 180,
      categoria: "telas",
      rendimientoMxKg: 4.0,
      kgPorRollo: 25,
      colores: [],
      colorUnico: true,
    };
    await catalog.addCustomProduct(customProduct, "Jack", env.redis);
    const found = await catalog.findById("custom_test_001", env.redis);
    expect(found).not.toBeNull();
    expect(found!.nombre).toBe("Tela de Prueba");
  });

  it("addCustomProduct con id existente lo reemplaza", async () => {
    const v1: TelaPorKilo = {
      id: "custom_test_002",
      nombre: "v1",
      slug: "v1",
      info: "",
      menudeo: 100,
      mayoreo: 95,
      categoria: "telas",
      rendimientoMxKg: 4.0,
      kgPorRollo: 25,
      colores: [],
      colorUnico: true,
    };
    const v2: TelaPorKilo = { ...v1, nombre: "v2", menudeo: 150 };
    await catalog.addCustomProduct(v1, "Jack", env.redis);
    await catalog.addCustomProduct(v2, "Jack", env.redis);
    const found = await catalog.findById("custom_test_002", env.redis);
    expect(found!.nombre).toBe("v2");
    expect(found!.menudeo).toBe(150);

    const all = await catalog.getCatalog(env.redis);
    expect(all.filter((p) => p.id === "custom_test_002")).toHaveLength(1);
  });

  it("removeCustomProduct lo elimina", async () => {
    const customProduct: TelaPorKilo = {
      id: "custom_test_003",
      nombre: "Borrar",
      slug: "borrar",
      info: "",
      menudeo: 100,
      mayoreo: 95,
      categoria: "telas",
      rendimientoMxKg: 4.0,
      kgPorRollo: 25,
      colores: [],
      colorUnico: true,
    };
    await catalog.addCustomProduct(customProduct, "Jack", env.redis);
    await catalog.removeCustomProduct("custom_test_003", env.redis);
    const found = await catalog.findById("custom_test_003", env.redis);
    expect(found).toBeNull();
  });

  // ── Combinación: source + overlay ────────────────────────────

  it("override de precio Y producto custom coexisten", async () => {
    await catalog.setPriceOverride(
      "prod_alaska",
      { menudeo: 999 },
      "Jack",
      env.redis
    );
    const custom: TelaPorKilo = {
      id: "custom_test_004",
      nombre: "Custom",
      slug: "custom",
      info: "",
      menudeo: 50,
      mayoreo: 45,
      categoria: "telas",
      rendimientoMxKg: 4.0,
      kgPorRollo: 25,
      colores: [],
      colorUnico: true,
    };
    await catalog.addCustomProduct(custom, "Jack", env.redis);

    const alaska = await catalog.findById("prod_alaska", env.redis);
    const customFound = await catalog.findById("custom_test_004", env.redis);
    expect(alaska!.menudeo).toBe(999);
    expect(customFound).not.toBeNull();
  });
});