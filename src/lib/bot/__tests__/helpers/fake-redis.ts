/**
 * Fake Redis en memoria para tests.
 *
 * Implementa el subconjunto de la API de @upstash/redis que usan los
 * repositories. NO es un mock: realmente almacena valores y respeta TTLs.
 * Esto significa que los tests verifican comportamiento real de los repos,
 * no solo que llamen a los métodos esperados.
 *
 * Uso típico:
 *
 *   const redis = new FakeRedis() as unknown as Redis;
 *   await clientRepo.save(perfil, redis);
 *   const recuperado = await clientRepo.findByPhone("5215...", redis);
 */
import type { Redis } from "@upstash/redis";

interface Entry {
  value: unknown;
  /** Timestamp en ms cuando expira. undefined = nunca. */
  expiresAt?: number;
}

/** Para sorted sets: score → member. */
interface SortedSetEntry {
  score: number;
  member: string;
}

export class FakeRedis {
  private store = new Map<string, Entry>();
  private sortedSets = new Map<string, SortedSetEntry[]>();
  private sortedSetsTTL = new Map<string, number>(); // key → expiresAt ms

  /** Limpia todo. Útil entre tests. */
  flush(): void {
    this.store.clear();
    this.sortedSets.clear();
    this.sortedSetsTTL.clear();
  }

  /** Para inspección en tests. */
  size(): number {
    this.cleanExpired();
    return this.store.size + this.sortedSets.size;
  }

  /** Lista todas las keys vivas. Útil para debugging de tests. */
  keys(): string[] {
    this.cleanExpired();
    return [
      ...Array.from(this.store.keys()),
      ...Array.from(this.sortedSets.keys()),
    ];
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
    for (const [key, expiresAt] of this.sortedSetsTTL.entries()) {
      if (expiresAt <= now) {
        this.sortedSets.delete(key);
        this.sortedSetsTTL.delete(key);
      }
    }
  }

  private isExpired(entry: Entry): boolean {
    return !!entry.expiresAt && entry.expiresAt <= Date.now();
  }

  // ── Strings ──────────────────────────────────────────────────────

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number; px?: number }
  ): Promise<"OK"> {
    let expiresAt: number | undefined;
    if (options?.ex) expiresAt = Date.now() + options.ex * 1000;
    else if (options?.px) expiresAt = Date.now() + options.px;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
      if (this.sortedSets.delete(k)) {
        this.sortedSetsTTL.delete(k);
        count++;
      }
    }
    return count;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      const entry = this.store.get(k);
      if (entry && !this.isExpired(entry)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: next, expiresAt: entry?.expiresAt });
    return next;
  }

  async incrby(key: string, by: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + by;
    const entry = this.store.get(key);
    this.store.set(key, { value: next, expiresAt: entry?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    const entry = this.store.get(key);
    if (entry && !this.isExpired(entry)) {
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    // También funciona para sorted sets
    if (this.sortedSets.has(key)) {
      this.sortedSetsTTL.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (entry) {
      if (!entry.expiresAt) return -1;
      const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }
    if (this.sortedSets.has(key)) {
      const expiresAt = this.sortedSetsTTL.get(key);
      if (!expiresAt) return -1;
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }
    return -2;
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  // ── SCAN ─────────────────────────────────────────────────────────

  /**
   * Implementación simple: ignora cursor real, devuelve todas las keys que
   * matcheen el pattern en una sola iteración. Suficiente para tests.
   */
  async scan(
    _cursor: string | number,
    options?: { match?: string; count?: number }
  ): Promise<[string, string[]]> {
    this.cleanExpired();
    const pattern = options?.match ?? "*";
    const regex = patternToRegex(pattern);

    const matchingKeys: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) matchingKeys.push(key);
    }
    for (const key of this.sortedSets.keys()) {
      if (regex.test(key)) matchingKeys.push(key);
    }

    // Cursor "0" = fin del iter. Siempre devolvemos todo en una pasada.
    return ["0", matchingKeys];
  }

  // ── Sorted Sets ──────────────────────────────────────────────────

  /**
   * zadd: agrega member con score. Upstash acepta varios formatos;
   * soportamos { score, member } como nuestro código usa.
   */
  async zadd(
    key: string,
    ...args: Array<{ score: number; member: string }>
  ): Promise<number> {
    let set = this.sortedSets.get(key);
    if (!set) {
      set = [];
      this.sortedSets.set(key, set);
    }
    let added = 0;
    for (const { score, member } of args) {
      const existing = set.findIndex((e) => e.member === member);
      if (existing >= 0) {
        set[existing].score = score;
      } else {
        set.push({ score, member });
        added++;
      }
    }
    return added;
  }

  async zcard(key: string): Promise<number> {
    this.cleanExpired();
    const set = this.sortedSets.get(key);
    return set ? set.length : 0;
  }

  /**
   * zrange con soporte para rev (orden descendente).
   * Retorna solo los members (strings), como hace Upstash por default.
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; withScores?: boolean }
  ): Promise<string[]> {
    this.cleanExpired();
    const set = this.sortedSets.get(key);
    if (!set || set.length === 0) return [];

    // Ordenar por score asc; rev=true para desc
    const sorted = [...set].sort((a, b) =>
      options?.rev ? b.score - a.score : a.score - b.score
    );

    // Convertir stop=-1 a sorted.length-1
    const end = stop < 0 ? sorted.length + stop : stop;
    const slice = sorted.slice(start, end + 1);

    if (options?.withScores) {
      const result: string[] = [];
      for (const e of slice) {
        result.push(e.member, String(e.score));
      }
      return result;
    }

    return slice.map((e) => e.member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const set = this.sortedSets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      const idx = set.findIndex((e) => e.member === m);
      if (idx >= 0) {
        set.splice(idx, 1);
        removed++;
      }
    }
    return removed;
  }

  /** Cast convertir a Redis para usar en repositories tipados. */
  asRedis(): Redis {
    return this as unknown as Redis;
  }
}

/** Helper para crear y obtener tipado. */
export function createFakeRedis(): { fake: FakeRedis; redis: Redis } {
  const fake = new FakeRedis();
  return { fake, redis: fake.asRedis() };
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Convierte un pattern de Redis (con * como wildcard) a RegExp.
 * Solo soporta * (no soporta ?, [], etc.).
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}
