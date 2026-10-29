import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().positive().default(3000),
  OPENAI_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_EMBED_MODEL: z.string().optional().default("nomic-embed-text:latest"),
  OLLAMA_CHAT_MODEL: z.string().optional().default("qwen2.5-coder:7b"),
  CLIENT_WEBHOOK_URL: z.string().url().optional().or(z.literal("")).default(""),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000")
    .transform((val) => val.split(",").map((s) => s.trim())),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(10)
});

export function parseEnv(rawEnv = process.env) {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error("❌ FATAL: Application environment variable validation failed:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    if (rawEnv.NODE_ENV === "production") {
      process.exit(1);
    }
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = parseEnv(process.env);
