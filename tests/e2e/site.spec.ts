import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sampleCount = async (page: Page) =>
  Number((await page.locator('#fig-1-readout').textContent())!.match(/^([\d,]+) samples/)![1].replace(/,/g, ''));

test('home identifies this Evan Chen and offers the resume', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Evan Chen.*Software Engineer.*University of Maryland/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Evan\s*Chen/);
  const resume = page.getByRole('link', { name: 'Resume (PDF)' }).first();
  await expect(resume).toBeVisible();
  const response = await page.request.get((await resume.getAttribute('href'))!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('every internal link and fragment resolves', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  for (const href of hrefs.filter((h) => h.startsWith('#'))) {
    expect(await page.locator(href).count(), href).toBe(1);
  }
  for (const href of hrefs.filter((h) => h.startsWith('/'))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
});

test('unknown paths serve the 404 page with a way home', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response!.status()).toBe(404);
  await page.getByRole('link', { name: 'Back to the home page' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Fig. 1 bins pointer movement and answers box queries', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#fig-1 canvas');
  await expect(canvas).toBeVisible();
  const before = await sampleCount(page);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 20 });
  await expect.poll(() => sampleCount(page)).toBeGreaterThan(before);

  await page.getByRole('button', { name: 'Query' }).click();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('#fig-1-readout')).toContainText(/Box x \d+-\d+, y \d+-\d+ holds [\d,]+ \(\d+\.\d%\)/);
  await expect(page).toHaveURL(/fig1=\d+,\d+,\d+,\d+/);

  const query = await page.locator('#fig-1-readout').textContent();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Query' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#fig-1-readout')).toContainText(query!.match(/Box .*holds/)![0]);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page).not.toHaveURL(/fig1=/);
});

test('Fig. 1 works from the keyboard', async ({ page }) => {
  await page.goto('/');
  const before = await sampleCount(page);
  await page.locator('#fig-1 canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => sampleCount(page)).toBe(before + 12);
  await page.getByRole('button', { name: 'Query' }).click();
  await page.locator('#fig-1 canvas').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#fig-1-readout')).toContainText('holds');
});

test('Fig. 1 shows the seeded histogram without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#fig-1 .fig1-fallback')).toBeVisible();
  expect(await page.locator('#fig-1 .fig1-fallback rect').count()).toBeGreaterThan(100);
  await expect(page.locator('#fig-1 .tools')).toBeHidden();
  await context.close();
});

for (const width of [375, 768, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of ['/', '/no-such-page']) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${path}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
}

test('Fig. 1 key tracks the live maximum', async ({ page }) => {
  await page.goto('/');
  const ranges = page.locator('#fig-1 .key-range');
  const upper = async () => Number((await ranges.last().textContent())!.split('-').pop()!.replace(/,/g, ''));
  await expect(ranges).toHaveCount(6);
  await expect(ranges.first()).toHaveText(/^1(-|$)/);
  const before = await upper();
  const box = (await page.locator('#fig-1 canvas').boundingBox())!;
  const x = box.x + box.width * 0.9;
  const y = box.y + box.height * 0.9;
  for (let i = 0; i < before + 5; i++) await page.mouse.move(x + (i % 2), y);
  await expect.poll(upper).toBeGreaterThan(before);
});

test('every selected-work figure ends in one action', async ({ page }) => {
  await page.goto('/');
  for (const n of [2, 3, 4, 5]) {
    await expect(page.locator(`#fig-${n} .meta`).locator('a, mark')).toHaveCount(1);
  }
});

test.describe('figure videos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    test.skip((await page.locator('.plate video').count()) === 0, 'no figure videos configured in src/data/site.ts');
  });

  test('are muted plates with controls that play once scrolled into view', async ({ page }) => {
    const videos = page.locator('.plate video');
    for (let i = 0; i < (await videos.count()); i++) {
      const video = videos.nth(i);
      await expect(video).toHaveAttribute('poster', /.+/);
      await expect(video).toHaveAttribute('aria-label', /.+/);
      await expect(video).toHaveAttribute('controls', '');
      expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
      for (const src of await video.locator('source').evaluateAll((els) => els.map((e) => e.getAttribute('src')!))) {
        expect((await page.request.get(src)).status(), src).toBe(200);
      }
      expect((await page.request.get((await video.getAttribute('poster'))!)).status()).toBe(200);
      await video.scrollIntoViewIfNeeded();
      await expect.poll(() => video.evaluate((el: HTMLVideoElement) => !el.paused)).toBe(true);
    }
  });

  test('stay paused when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const video = page.locator('.plate video').first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  });
});
