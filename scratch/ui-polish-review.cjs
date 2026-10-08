const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const baseURL = process.env.UI_POLISH_URL || 'http://localhost:3002';
const output = 'scratch/ui-polish';
fs.mkdirSync(output, { recursive: true });

async function screenshot(page, name) {
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => {
      img.loading = 'eager';
      return img.decode().catch(() => {});
    }));
  });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 1000 } });
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/', '/visas', '/travel-info', '/travel-info?city=NEW_YORK', '/passport', '/visas/info', '/faq', '/access-help', '/login']) {
        await page.goto(route);
        await expect(page.locator('h1')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), `${route} overflows at ${width}px`);
        if (['/', '/travel-info', '/travel-info?city=NEW_YORK', '/access-help', '/visas'].includes(route) && width !== 768) {
          await screenshot(page, `${route === '/' ? 'home' : route.replace(/[^a-z]/gi, '-')}-${width}`);
        }
      }
      console.log(`Public layouts fit ${width}px`);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const faq = page.getByRole('region', { name: 'Before you get started' });
    await expect(faq.locator('details')).toHaveCount(3);
    await faq.locator('summary').first().click();
    await expect(faq.getByText('The pre-screening interview asks', { exact: false })).toBeVisible();
    await expect(faq.getByRole('link', { name: 'View all FAQs' })).toHaveAttribute('href', '/faq');
    console.log('Homepage FAQs expand and link to the full help page');

    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('button', { name: 'Open AI Travel & Visa Concierge' }).click();
      const panel = page.getByRole('dialog', { name: 'AI Travel Concierge Assistant' });
      await expect(panel).toHaveCSS('backdrop-filter', 'blur(24px) saturate(1.4)');
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 72);
      await page.getByRole('textbox', { name: 'Search travel guidance' }).fill('passport');
      await expect(panel.getByRole('link', { name: /Passport Validity/ })).toBeVisible();
      await screenshot(page, `concierge-${width}`);
      await page.getByRole('button', { name: 'Minimize concierge' }).click();
      await expect(page.getByRole('button', { name: 'Expand concierge' })).toBeVisible();
      await page.getByRole('button', { name: 'Expand concierge' }).click();
      await page.getByRole('button', { name: 'Close concierge' }).click();
    }
    console.log('Concierge uses real blur and stays inside both viewports');

    await page.goto('/visas/info');
    const back = page.getByRole('link', { name: 'Back to Visa Navigator' });
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await page.goto('/access-help');
    await expect(page.locator('.back-link')).toHaveCSS('text-decoration-line', 'none');
    await page.locator('.back-link').hover();
    await expect(page.locator('.back-link')).toHaveCSS('text-decoration-line', 'none');
    const heights = await page.locator('main input, main select').evaluateAll(fields => fields.map(field => field.getBoundingClientRect().height));
    assert.ok(heights.every(height => height === 48), `Input heights: ${heights}`);
    await page.locator('#main-content').focus();
    await expect(page.locator('#main-content')).toHaveCSS('outline-style', 'none');
    await page.goto('/faq');
    await page.goBack();
    await expect(page.locator('#main-content')).toHaveCSS('outline-style', 'none');
    await page.goto('/visas/info');
    await page.getByRole('link', { name: 'Back to Visa Navigator' }).click();
    await expect(page).toHaveURL(/\/visas$/);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 300, button: 'back', buttons: 8, clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 300, button: 'back', buttons: 0, clickCount: 1 });
    await expect(page).toHaveURL(/\/visas\/info$/);
    await expect(page.locator('#main-content')).toHaveCSS('outline-style', 'none');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(7, 20, 38)');
    console.log('Back links have no underline, history restoration has no content outline, fields align at 48px');

    await page.goto('/travel-info');
    for (const city of ['munich', 'newyork']) {
      if (city === 'newyork') await page.locator('#city-newyork-btn').click();
      const hero = page.locator(`img[src*="dest_${city}_hd"]`);
      await expect(hero).toBeVisible();
      await hero.evaluate(img => img.decode());
      assert.ok(await hero.evaluate(img => img.naturalWidth >= img.clientWidth));
      const cards = await page.locator('details').evaluateAll(items => items.map(item => item.getBoundingClientRect()));
      assert.equal(cards[0].height, cards[1].height);
    }
    console.log('Both high-resolution banners load and guide cards have equal heights');

    const login = await page.request.post('/api/auth/demo-login', { data: { role: 'CUSTOMER' } });
    if (login.ok()) {
      await page.goto('/applications/new');
      await expect(page.locator('h1')).toHaveText('Set up your trip');
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), `Signed-in header overflows at ${width}px`);
        const profile = page.getByRole('button', { name: 'User profile and account settings' });
        await expect(profile).toHaveCSS('backdrop-filter', 'blur(16px) saturate(1.2)');
        await profile.click();
        const dropdown = page.getByText('Change Password', { exact: true }).locator('..').locator('..').locator('..');
        await expect(dropdown).toHaveCSS('backdrop-filter', 'blur(24px) saturate(1.4)');
        await screenshot(page, `profile-${width}`);
        await profile.click();
        await page.locator('#notification-bell-btn').click();
        const notifications = page.getByRole('region', { name: 'Notification center' });
        await expect(notifications).toHaveCSS('backdrop-filter', 'blur(24px) saturate(1.4)');
        const bounds = await notifications.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `Notifications overflow at ${width}px: ${JSON.stringify(bounds)}`);
        await page.locator('#notification-bell-btn').click();
        await screenshot(page, `trip-form-${width}`);
      }
      console.log('Signed-in profile, notifications and trip form fit all viewports and retain blur');
    } else {
      throw new Error(`Demo login unavailable: HTTP ${login.status()}`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
