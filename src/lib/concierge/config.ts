import { z } from "zod";

const configSchema = z.object({
  enabled: z.enum(["true", "false"]),
  key: z.string().max(512).regex(/^[!-~]*$/),
  model: z.literal("openai/gpt-oss-120b"),
  guardModel: z.literal("openai/gpt-oss-safeguard-20b"),
  timeout: z.coerce.number().int().min(1000).max(60000),
  completionTokens: z.coerce.number().int().min(256).max(4096),
  perMinute: z.coerce.number().int().min(1).max(30),
  perDay: z.coerce.number().int().min(1).max(500),
  sitePerDay: z.coerce.number().int().min(1).max(10000),
});

export function conciergeConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.safeParse({
    enabled: env.AI_CONCIERGE_ENABLED ?? "true",
    key: env.GROQ_API_KEY?.trim() ?? "",
    model: env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    guardModel: env.GROQ_GUARD_MODEL ?? "openai/gpt-oss-safeguard-20b",
    timeout: env.AI_CONCIERGE_TIMEOUT_MS ?? 45000,
    completionTokens: env.AI_CONCIERGE_MAX_COMPLETION_TOKENS ?? 2048,
    perMinute: env.AI_CONCIERGE_USER_TURNS_PER_MINUTE ?? 10,
    perDay: env.AI_CONCIERGE_USER_TURNS_PER_DAY ?? 100,
    sitePerDay: env.AI_CONCIERGE_SITE_TURNS_PER_DAY ?? 1000,
  });
  return parsed.success && parsed.data.enabled === "true" && parsed.data.key
    ? parsed.data
    : null;
}
export type ConciergeConfig = NonNullable<ReturnType<typeof conciergeConfig>>;
