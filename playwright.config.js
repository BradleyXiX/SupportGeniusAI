import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 3888;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: "node server/index.js",
    url: `http://localhost:${TEST_PORT}/health`,
    timeout: 30000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "development",
      APP_MODE: "demo",
      PORT: String(TEST_PORT),
      RATE_LIMIT_MAX_REQUESTS: "1000",
      RATE_LIMIT_WINDOW_MS: "60000",
      SESSION_SECRET: "test-session-secret-at-least-32-chars-long",
      PUBLIC_ORIGIN: `http://localhost:${TEST_PORT}`,
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
      CLIENT_WEBHOOK_URL: "",
      OLLAMA_URL: "http://127.0.0.1:54321",
      CORS_ALLOWED_ORIGINS: `http://localhost:${TEST_PORT},http://127.0.0.1:${TEST_PORT}`
    }
  }
});

