import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const root = path.resolve(".concierge-tests");
fs.mkdirSync(root, { recursive: true });
const runDir = fs.mkdtempSync(path.join(root, "browser-"));
const origin = "http://127.0.0.1:3021";
const dbPath = path.join(runDir, "test.db");
fs.closeSync(fs.openSync(dbPath, "wx"));
const env = { ...process.env, DATABASE_URL: `file:${dbPath.replaceAll("\\", "/")}`, SESSION_SECRET: randomBytes(48).toString("hex"), NEXT_PUBLIC_APP_URL: origin, NEXT_PUBLIC_DEMO_MODE: "false", DOCUMENT_STORAGE_PATH: path.join(runDir, "documents"), GROQ_API_KEY: "browser-test-placeholder", AI_CONCIERGE_ENABLED: "true", CONCIERGE_BROWSER_RUN: "true", CONCIERGE_BROWSER_ORIGIN: origin, NEXT_TELEMETRY_DISABLED: "1" };
if (!env.PLAYWRIGHT_CHANNEL && process.platform === "win32" && fs.existsSync(path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"))) env.PLAYWRIGHT_CHANNEL = "msedge";
let server, db, output = "";
try {
  // Never connect to the developer's database or reuse a running app.
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env, stdio: "pipe" });
  db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  const employee = await db.user.create({ data: { email: "browser@harbingergroup.com", name: "Browser Employee", passwordHash: await bcrypt.hash("BrowserFixture2026!", 10) } });
  const app = await db.application.create({ data: { userId: employee.id, caseNumber: "TD-BROWSER", visaType: "US_B1", destinationCountry: "United States", travelPurpose: "Conference attendance", status: "VERIFIED", departureDate: new Date("2027-04-10"), returnDate: new Date("2027-04-20"), departureAirportName: "Mumbai", departureAirportCode: "BOM", destinationAirportName: "John F. Kennedy", destinationAirportCode: "JFK", destinationCity: "New York" } });
  await db.bookingProvider.create({ data: { id: "skyscanner", name: "Skyscanner", category: "flight", enabled: true, verifiedAt: new Date() } });
  fs.mkdirSync(env.DOCUMENT_STORAGE_PATH, { recursive: true });
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
  const filePath = path.join(env.DOCUMENT_STORAGE_PATH, "preview.png");
  fs.writeFileSync(filePath, image);
  const doc = await db.document.create({ data: { applicationId: app.id, documentType: "PASSPORT", originalFilename: "preview.png", sanitizedFilename: "preview.png", filePath, mimeType: "image/png", fileSizeBytes: image.length, status: "UPLOADED" } });
  env.CONCIERGE_BROWSER_APPLICATION_ID = app.id;
  env.CONCIERGE_BROWSER_DOCUMENT_ID = doc.id;
  await db.$disconnect(); db = undefined;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3021", "-H", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.on("data", (data) => { output = (output + data).slice(-30000); });
  server.stderr.on("data", (data) => { output = (output + data).slice(-30000); });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error("Browser test server exited before becoming ready.");
    if (output.includes("Ready")) {
      try { const res = await fetch(origin, { signal: AbortSignal.timeout(1000) }); if (res.ok && server.exitCode === null) { ready = true; break; } } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error("Browser test server did not become ready.");
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", "scripts/concierge-playwright.config.ts"], { env, stdio: "inherit", windowsHide: true });
    child.on("error", reject); child.on("exit", resolve);
  });
  if (result !== 0) throw new Error("Concierge browser checks failed.");
} catch (error) {
  console.error(error.message); if (output) console.error(output);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) { server.kill(); await new Promise((resolve) => server.once("exit", resolve)); }
  if (db) await db.$disconnect();
  if (path.dirname(runDir) === root) fs.rmSync(runDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
