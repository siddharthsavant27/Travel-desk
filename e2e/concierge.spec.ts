import { test, expect, type Page } from "@playwright/test";

test.skip(!process.env.CONCIERGE_BROWSER_RUN, "Run with npm run test:concierge:browser for isolated fixtures.");
const appId = process.env.CONCIERGE_BROWSER_APPLICATION_ID!;
const docId = process.env.CONCIERGE_BROWSER_DOCUMENT_ID!;
async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Company email").fill("browser@harbingergroup.com");
  await page.locator("#password").fill("BrowserFixture2026!");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}
async function openChat(page: Page) {
  await page.getByRole("button", { name: "Open AI Travel & Visa Concierge" }).click();
  await expect(page.getByLabel("Application context", { exact: true })).toBeEnabled();
}
const reply = { answer: "Complete the checklist, then submit it for coordinator review.", citations: [{ id: "workflow", title: "Application workflow", href: "/interview" }], links: [], conversationToken: "test-token" };

test("guest sign-in prompt and responsive panel", async ({ page }) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    const response = await page.goto("/");
    expect(response?.headers()["content-security-policy"]).toContain("nonce-");
    await page.getByRole("button", { name: "Open AI Travel & Visa Concierge" }).click();
    const panel = page.getByRole("dialog", { name: "AI Travel Concierge Assistant" });
    await expect(panel.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Ask the travel assistant")).toHaveCount(0);
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  }
});

test("signed-in messages, citations, follow-ups, case reset and ephemeral history", async ({ page }) => {
  await signIn(page);
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/concierge", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ json: reply });
  });
  await openChat(page);
  await page.getByLabel("Ask the travel assistant").fill("Help with preparation");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(reply.answer);
  await expect(page.getByRole("log").getByRole("link", { name: "Application workflow" })).toHaveAttribute("href", "/interview");
  await page.getByLabel("Ask the travel assistant").fill("What happens next?");
  await page.getByLabel("Ask the travel assistant").press("Enter");
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[1].conversationToken).toBe("test-token");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible();
  await page.getByLabel("Application context", { exact: true }).selectOption(appId);
  await expect(page.getByRole("log")).not.toContainText(reply.answer);
  await page.getByLabel("Ask the travel assistant").fill("My case checklist");
  await page.getByLabel("Ask the travel assistant").press("Enter");
  await expect.poll(() => payloads.length).toBe(3);
  expect(payloads[2].applicationId).toBe(appId); expect(payloads[2].conversationToken).toBeUndefined();
  await expect(page.getByRole("log")).toContainText(reply.answer);
  await page.getByRole("button", { name: "Minimize concierge" }).click();
  await page.getByRole("button", { name: "Expand concierge" }).click();
  await expect(page.getByRole("log")).toContainText(reply.answer);
  await page.reload(); await openChat(page);
  await expect(page.getByRole("log")).not.toContainText(reply.answer);
});

test("error retry, cancellation and keyboard clearing", async ({ page }) => {
  await signIn(page); let attempt = 0;
  await page.route("**/api/concierge", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    attempt++;
    if (attempt === 1) return route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } });
    if (attempt === 2) return route.fulfill({ json: reply });
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ json: reply }).catch(() => {});
  });
  await openChat(page);
  await page.getByLabel("Ask the travel assistant").fill("Help me prepare");
  await page.getByLabel("Ask the travel assistant").press("Enter");
  await expect(page.getByRole("dialog", { name: "AI Travel Concierge Assistant" }).getByRole("alert")).toContainText("Temporarily unavailable");
  await page.getByRole("button", { name: "Retry message" }).click();
  await expect(page.getByRole("log")).toContainText(reply.answer);
  await page.getByLabel("Ask the travel assistant").fill("A second question");
  await page.getByLabel("Ask the travel assistant").press("Enter");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Checking guidance" })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear conversation" }).click();
  await expect(page.getByRole("log")).not.toContainText(reply.answer);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open AI Travel & Visa Concierge" })).toBeFocused();
});

test("production CSP allows protected document previews and booking navigation", async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction("recordCspViolation", (directive: string) => violations.push(directive));
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (event) => {
    (window as unknown as { recordCspViolation: (value: string) => void }).recordCspViolation(event.violatedDirective);
  }));
  await signIn(page);
  const url = `/api/documents/${docId}/download?preview=1`;
  const preview = await page.request.get(url);
  expect(preview.status()).toBe(200); expect(preview.headers()["content-disposition"]).toContain("inline");
  const loaded = await page.evaluate(async (src) => {
    const image = document.createElement("img"); image.src = src; document.body.append(image);
    return await new Promise((resolve) => { image.onload = () => resolve(true); image.onerror = () => resolve(false); });
  }, url);
  expect(loaded).toBe(true);
  await page.goto(`/flights?applicationId=${appId}`);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("button", { name: /search/i }).first()).toBeEnabled();
  await page.getByLabel("Travellers", { exact: true }).fill("1");
  await page.getByRole("combobox", { name: /^Cabin class/ }).selectOption("economy");
  await page.getByRole("combobox", { name: /^Booking website/ }).selectOption("skyscanner");
  await page.getByRole("button", { name: "Review search & continue" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.context().route("https://www.skyscanner.net/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>Mock booking destination</p>" }));
  const popupReady = page.context().waitForEvent("page");
  await page.locator("#confirm-partner-redirect-btn").click();
  const popup = await popupReady;
  await popup.waitForLoadState();
  expect(new URL(popup.url()).hostname).toBe("www.skyscanner.net");
  await popup.close();
  expect(violations).toEqual([]);
});
