import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/lib/bot/__tests__/setup.ts"],
    include: ["src/lib/bot/**/*.test.ts"],
    exclude: ["src/lib/bot/**/__tests__/fixtures/**", "node_modules/**"],
    testTimeout: 10000,

    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "fatal",

      OPENAI_API_KEY: "sk-test-fake-key-for-vitest-only-12345678",
      WHATSAPP_TOKEN: "test-whatsapp-token-fake-1234567890",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_VERIFY_TOKEN: "test-verify-token",

      STRIPE_SECRET_KEY: "sk_test_fake1234567890abcdefghij",
      STRIPE_WEBHOOK_SECRET: "whsec_test1234567890",
      STRIPE_CHECKOUT_WEBHOOK_SECRET: "whsec_test_checkout_1234567890",

      FACTURAPI_KEY: "sk_test_facturapi_fake1234567890",
      FACTURAPI_LIVE_SECRET_KEY: "sk_live_facturapi_fake_test_only_1234567890",

      UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "fake-upstash-token-1234567890abcdef",

      SUPABASE_URL: "https://fake.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key-for-tests-only",

      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",

      BOT_V2_ENABLED: "false",
      BOT_V2_PHONES: "",
      BOT_V2_PERCENTAGE: "0",
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/bot/**"],
      exclude: [
        "src/lib/bot/**/*.test.ts",
        "src/lib/bot/**/__tests__/**",
        "src/lib/bot/types/**",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
