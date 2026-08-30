import "dotenv/config";
import { z } from "zod";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST !== undefined;

export const config = z.object({
  DATABASE_URL: z.string().default(isTest ? "postgresql://test:test@localhost:5432/test" : ""),
  JWT_SECRET: z.string().default(isTest ? "test-secret-key-that-is-long-enough-for-validation" : ""),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
}).parse(process.env);
