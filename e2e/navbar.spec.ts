import { test, expect } from "@playwright/test";

for (const width of [360, 768, 1024, 1440, 1920]) {
  test(`navbar blends into the page and keeps its edge alignment at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const header = page.getByRole("banner");
    const surface = header.locator(":scope > div");

    const appearance = await surface.evaluate(element => {
      const surfaceStyle = getComputedStyle(element);
      const glassStyle = getComputedStyle(element, "::before");
      return {
        background: surfaceStyle.backgroundColor,
        image: surfaceStyle.backgroundImage,
        border: surfaceStyle.borderBottomWidth,
        shadow: surfaceStyle.boxShadow,
        glassOpacity: glassStyle.opacity,
        glassBlur: glassStyle.backdropFilter,
        glassMask: glassStyle.maskImage,
        glassImage: glassStyle.backgroundImage,
        pointerEvents: glassStyle.pointerEvents,
      };
    });
    expect(appearance.background).toBe("rgba(0, 0, 0, 0)");
    expect(appearance.image).toBe("none");
    expect(appearance.border).toBe("0px");
    expect(appearance.shadow).toBe("none");
    expect(appearance.glassOpacity).toBe("0");
    expect(appearance.glassBlur).toContain("blur(20px)");
    expect(appearance.glassMask).toContain("linear-gradient");
    expect(appearance.glassImage).toBe("none");
    expect(appearance.pointerEvents).toBe("none");

    const logo = await header.getByRole("link").first().boundingBox();
    const signIn = await header.getByRole("link", { name: "Sign in", exact: true }).boundingBox();
    expect(logo!.x).toBe(width < 640 ? 16 : 24);
    expect(width - signIn!.x - signIn!.width).toBe(width < 640 ? 16 : 24);
    const hero = await page.getByRole("main").locator("section").first().boundingBox();
    expect(hero!.y).toBe(0);
    if (width >= 1024) {
      const navigation = await header.getByRole("navigation", { name: "Main Navigation" }).boundingBox();
      expect(navigation!.x + navigation!.width / 2).toBeCloseTo(width / 2, 0);
    }
    if (width === 360 || width === 1440) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).filter(image => image.loading !== "lazy").map(image => image.decode().catch(() => {})));
      });
      await page.screenshot({ path: test.info().outputPath("navbar-top.png") });
    }

    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await expect.poll(() => surface.evaluate(element => getComputedStyle(element, "::before").opacity)).toBe("1");
    expect((await header.boundingBox())!.y).toBe(0);
    if (width === 360 || width === 1440) {
      await page.screenshot({ path: test.info().outputPath("navbar-scrolled.png") });
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => surface.evaluate(element => getComputedStyle(element, "::before").opacity)).toBe("0");
  });
}

test("mobile menu retains readable glass without a bottom border", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const header = page.getByRole("banner");
  const surface = header.locator(":scope > div");
  const toggle = header.getByRole("button", { name: "Toggle navigation menu" });
  await toggle.click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await expect.poll(() => surface.evaluate(element => getComputedStyle(element, "::before").opacity)).toBe("1");
  await expect(navigation).toHaveCSS("border-bottom-width", "0px");
  await toggle.click();
  await expect(navigation).not.toBeVisible();
  await expect.poll(() => surface.evaluate(element => getComputedStyle(element, "::before").opacity)).toBe("0");
});
