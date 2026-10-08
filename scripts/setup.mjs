import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendConciergeDefaults } from "./concierge-env.mjs";

const root = process.cwd(),
  envPath = path.join(root, ".env");
if (
  !fs.existsSync(envPath) &&
  !(process.env.DATABASE_URL && process.env.SESSION_SECRET)
) {
  fs.writeFileSync(
    envPath,
    `DATABASE_URL="file:./dev.db"\nSESSION_SECRET="${randomBytes(48).toString("hex")}"\nNEXT_PUBLIC_APP_URL="http://localhost:3001"\nNEXT_PUBLIC_DEMO_MODE=true\n`,
  );
  console.log("Created local configuration with a unique session secret.");
}
appendConciergeDefaults(envPath);
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.DATABASE_URL?.startsWith("file:"))
  throw new Error("TravelDesk requires a SQLite file: DATABASE_URL.");
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
const sqliteLocation = process.env.DATABASE_URL.slice(5).split("?")[0];
const sqlitePath = path.isAbsolute(sqliteLocation)
  ? sqliteLocation
  : path.resolve(root, "prisma", sqliteLocation);
fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
if (!fs.existsSync(sqlitePath)) fs.closeSync(fs.openSync(sqlitePath, "wx"));
const prismaCli = path.join(root, "node_modules/prisma/build/index.js");
if (!process.argv.includes("--skip-generate"))
  execFileSync(process.execPath, [prismaCli, "generate"], { stdio: "inherit" });
// Additive indexes are checked before creation. Existing duplicate records are never deleted.
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
try {
  const tables = await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table'",
  );
  for (const [table, fields, index] of [
    [
      "Document",
      ["applicationId", "documentType"],
      "Document_applicationId_documentType_key",
    ],
    [
      "InterviewAnswer",
      ["sessionId", "questionId"],
      "InterviewAnswer_sessionId_questionId_key",
    ],
  ]) {
    if (!tables.some((t) => t.name === table)) continue;
    const duplicates = await db.$queryRawUnsafe(
      `SELECT COUNT(*) AS count FROM "${table}" GROUP BY "${fields[0]}", "${fields[1]}" HAVING COUNT(*) > 1 LIMIT 1`,
    );
    if (duplicates.length)
      throw new Error(
        `Existing duplicate ${table} records need review before migration. No records were removed.`,
      );
    await db.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${index}" ON "${table}" ("${fields[0]}", "${fields[1]}")`,
    );
  }
} finally {
  await db.$disconnect();
}
execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
  stdio: "inherit",
});
execFileSync(
  process.execPath,
  [path.join(root, "node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"],
  { stdio: "inherit" },
);
console.log("TravelDesk database and account configuration are ready.");
