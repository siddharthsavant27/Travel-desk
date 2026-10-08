import fs from "node:fs";
import path from "node:path";

export const conciergeDefaults = {
  GROQ_API_KEY: "",
  GROQ_MODEL: "openai/gpt-oss-120b",
  GROQ_GUARD_MODEL: "openai/gpt-oss-safeguard-20b",
  AI_CONCIERGE_ENABLED: "true",
  AI_CONCIERGE_TIMEOUT_MS: "45000",
  AI_CONCIERGE_MAX_COMPLETION_TOKENS: "2048",
  AI_CONCIERGE_USER_TURNS_PER_MINUTE: "10",
  AI_CONCIERGE_USER_TURNS_PER_DAY: "100",
  AI_CONCIERGE_SITE_TURNS_PER_DAY: "1000",
};
export function appendConciergeDefaults(envPath) {
  if (!fs.existsSync(envPath)) return;
  const existing = fs.readFileSync(envPath, "utf8");
  const names = new Set([...existing.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((match) => match[1]));
  const missing = Object.entries(conciergeDefaults).filter(([name]) => !names.has(name));
  if (missing.length) fs.appendFileSync(envPath, `${existing.endsWith("\n") ? "" : "\n"}\n# Groq concierge (server-only; set the API key locally)\n${missing.map(([name, value]) => `${name}=${value}`).join("\n")}\n`);
}
if (process.argv.includes("--write")) appendConciergeDefaults(path.resolve(".env"));
