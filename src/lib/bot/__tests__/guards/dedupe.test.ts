import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createFakeRedis } from "../helpers/fake-redis";
import { isDuplicateMessage } from "../../guards/dedupe";

describe("guard: dedupe", () => {
  let env: ReturnType<typeof createFakeRedis>;
  
  beforeEach(() => { env = createFakeRedis(); });
  

  it("permite mensajes nuevos", async () => {
    const isDup = await isDuplicateMessage("msg_001", env.redis);
    expect(isDup).toBe(false);
  });

  it("bloquea mensajes que ya fueron procesados", async () => {
    await isDuplicateMessage("msg_002", env.redis);
    const isDupSecondTime = await isDuplicateMessage("msg_002", env.redis);
    expect(isDupSecondTime).toBe(true);
  });

  it("no bloquea si el ID es nulo o vacío", async () => {
    const isDup = await isDuplicateMessage("", env.redis);
    expect(isDup).toBe(false);
  });
});
