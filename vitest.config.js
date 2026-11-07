import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 60000,
    exclude: ["**/node_modules/**", "**/dist/**", "tests/browser/**"],
    env: {
      SESSION_SECRET: "test-session-secret-at-least-32-chars-long",
      PUBLIC_ORIGIN: "http://localhost:3000",
      APP_MODE: "support",
      RATE_LIMIT_MAX_REQUESTS: "100"
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
