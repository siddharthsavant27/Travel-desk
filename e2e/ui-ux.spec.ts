import { test, expect } from "@playwright/test";

for (const width of [360, 768, 1440]) {
  test(`public pages fit a ${width}px viewport`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/visas", "/flights", "/hotels", "/travel-info", "/passport", "/visas/info", "/faq", "/login"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}

test("mobile navigation and search reach the intended visa route", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Visas", exact: true }).click();
  await expect(page).toHaveURL(/\/visas$/);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).not.toBeVisible();
  await page.goto("/");
  await page.getByLabel("Describe your business trip").fill("US business conference");
  await page.getByRole("button", { name: "Submit travel query to Visa Navigator" }).click();
  await expect(page.locator("#evaluation-category-heading")).toContainText("US B-1");
  await expect(page.locator("#dest-usa-btn")).toHaveAttribute("aria-pressed", "true");
});

test("visa details stay accessible without blocking the next action", async ({ page }) => {
  await page.goto("/visas");
  const checklist = page.locator("details").filter({ hasText: "Documents to prepare" });
  await expect(checklist).not.toHaveAttribute("open");
  await expect(page.getByRole("link", { name: "Start pre-screening", exact: true })).toBeVisible();
  await checklist.locator("summary").click();
  await expect(checklist.getByText("Travel Medical Insurance", { exact: false })).toBeVisible();
  await page.locator("#purpose-local_work-btn").click();
  await expect(page.locator("#evaluation-category-heading")).toContainText("National Employment");
  await expect(page.getByText("Regulatory Compliance Notice:")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start pre-screening", exact: true })).not.toBeVisible();
});

test("hotel allowance updates and invalid dates block partner handoff", async ({ page }) => {
  await page.goto("/hotels");
  await page.getByLabel("Destination", { exact: true }).selectOption("NYC");
  await expect(page.getByText("Nightly allowance: $250 / night")).toBeVisible();
  const checkIn = await page.getByLabel("Check-in Date").inputValue();
  await page.getByLabel("Check-out Date").fill(checkIn);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("check-out date after check-in");
  await expect(page.locator("#search-hotels-booking-btn")).toBeDisabled();
});

test("partner modal works with the keyboard and restores focus", async ({ page }) => {
  await page.goto("/flights");
  const trigger = page.locator("#search-flights-ixigo-btn");
  await trigger.click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Close redirect modal" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(modal.locator("#confirm-partner-redirect-btn")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("destination links select the right city and FAQ details expand", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "New York Airport transfers & local guidance" }).click();
  await expect(page.locator("#city-newyork-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("911 (Police / Fire / EMS)")).toBeVisible();
  await page.goto("/faq");
  const expense = page.locator("details").filter({ hasText: "Who pays for corporate visa" });
  await expect(expense).not.toHaveAttribute("open");
  await expense.locator("summary").click();
  await expect(expense.getByText("Harbinger Group covers", { exact: false })).toBeVisible();
});
