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
 *   const recuperado = await clientRepo.findByPhone('5215...', redis);
 */
import type { Redis } from "@upstash/redis";

interface Entry {
  value: unknown;
  /** Timestamp en ms cuando expira. undefined = nunca. */
  expiresAt?: number;
}

export class FakeRedis {
  private store = new Map<string, Entry>();

  /** Limpia todo. Útil entre tests. */
  flush(): void {
    this.store.clear();
  }

  /** Para inspección en tests. */
  size(): number {
    this.cleanExpired();
    return this.store.size;
  }

  /** Lista todas las keys vivas. Útil para debugging de tests. */
  keys(): string[] {
    this.cleanExpired();
    return Array.from(this.store.keys());
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private isExpired(entry: Entry): boolean {
    return !!entry.expiresAt && entry.expiresAt <= Date.now();
  }

  // ── Métodos de la API @upstash/redis ────────────────────────────

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    // Upstash deserializa JSON automáticamente. Aquí ya tenemos el valor JS.
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
    if (!entry || this.isExpired(entry)) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
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
