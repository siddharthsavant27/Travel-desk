import fs from "node:fs";
import { conciergeConfig } from "../src/lib/concierge/config";
import { answerTurn } from "../src/lib/concierge/provider";

async function main() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const config = conciergeConfig();
  if (!config) { console.log("Live smoke test skipped: configure GROQ_API_KEY and valid concierge settings in .env first."); return; }
  const usage = { promptTokens: 0, completionTokens: 0 };
  const result = await answerTurn({ config, message: "What are the portal steps to prepare and submit a visa application?", history: [], context: null, signal: AbortSignal.timeout(config.timeout), usage });
  console.log(JSON.stringify({ status: "passed", sources: result.citations.map((source) => source.id), ...usage }));
}
main().catch(() => { console.error("Live smoke test failed. Check model permissions, spend limits, credentials, and network access in Groq."); process.exitCode = 1; });
