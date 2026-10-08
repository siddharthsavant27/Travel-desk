const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [360, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const header = document.querySelector("header");
        const surface = header.firstElementChild;
        const logo = header.querySelector("a").getBoundingClientRect();
        const sign = header.querySelector('a[href="/login"]').getBoundingClientRect();
        const nav = header.querySelector("nav").getBoundingClientRect();
        const css = getComputedStyle(surface);
        const glass = getComputedStyle(surface, "::before");
        return {
          width: innerWidth,
          logoLeft: logo.left,
          signRight: innerWidth - sign.right,
          navCenter: nav.width ? nav.x + nav.width / 2 : null,
          blur: glass.backdropFilter,
          glassOpacity: glass.opacity,
          glassMask: glass.maskImage,
          border: css.borderBottomWidth,
          background: css.backgroundColor,
          backgroundImage: css.backgroundImage,
          shadow: css.boxShadow,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      console.log(JSON.stringify(result));
      if (!result.blur.includes("blur(20px)")) throw Error("Glass blur is not applied");
      if (result.glassOpacity !== "0" || result.backgroundImage !== "none" || result.shadow !== "none") throw Error("Navbar should blend into the page at the top");
      if (result.overflow > 1 || result.border !== "0px" || result.logoLeft > 25 || result.signRight > 25) throw Error("Navbar layout check failed");
      if (width >= 1024 && Math.abs(result.navCenter - width / 2) > 1) throw Error("Navigation is not centered");
      if (width === 1440) await page.screenshot({ path: "scratch/navbar-desktop.png" });
      if (width === 360) await page.screenshot({ path: "scratch/navbar-mobile.png" });
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
