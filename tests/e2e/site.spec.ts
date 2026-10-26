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
  const max = page.locator('#fig-1 .key-ticks span').last();
  const before = Number((await max.textContent())!.replace(/,/g, ''));
  const box = (await page.locator('#fig-1 canvas').boundingBox())!;
  const x = box.x + box.width * 0.9;
  const y = box.y + box.height * 0.9;
  for (let i = 0; i < before + 5; i++) await page.mouse.move(x + (i % 2), y);
  await expect.poll(async () => Number((await max.textContent())!.replace(/,/g, ''))).toBeGreaterThan(before);
});

test('every selected-work figure ends in one action', async ({ page }) => {
  await page.goto('/');
  for (const n of [2, 3, 4, 5]) {
    await expect(page.locator(`#fig-${n} .meta`).locator('a, mark')).toHaveCount(1);
  }
});
