import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pages = ['/', '/projects/', '/other/'];
const projects: { id: string; title: string }[] = JSON.parse(readFileSync('src/content/projects.json', 'utf8'));
const site: { otherEmpty: string } = JSON.parse(readFileSync('src/content/site.json', 'utf8'));
const hasOtherEntries = readdirSync('src/content/other').some((f) => f.endsWith('.md'));

const live = (page: Page) => expect(page.locator('#heatmap-readout')).toContainText('bins');

const sampleCount = async (page: Page) =>
  Number((await page.locator('#heatmap-readout').textContent())!.match(/^([\d,]+) samples/)![1].replace(/,/g, ''));

test('home identifies this Evan Chen and offers the resume', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Evan Chen.*Software Engineer.*University of Maryland/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Evan Chen');
  await expect(page.getByText('University of Maryland')).toBeVisible();
  const resume = page.getByRole('link', { name: 'Resume (PDF)' });
  await expect(resume).toBeVisible();
  const response = await page.request.get((await resume.getAttribute('href'))!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('the page nav reaches every page and marks the current one', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Pages' });
  for (const [label, url] of [['Projects', /\/projects\/$/], ['Other', /\/other\/$/], ['Home', /\/$/]] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(url);
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }
});

test('arriving from another page animates in nav order', async ({ page }) => {
  const arrival = () =>
    page.evaluate(() => [document.documentElement.dataset.arrive ?? null, document.documentElement.style.getPropertyValue('--mark-from') || null]);
  const nav = page.getByRole('navigation', { name: 'Pages' });

  await page.goto('/');
  expect(await arrival()).toEqual([null, null]);
  await nav.getByRole('link', { name: 'Other' }).click();
  await expect(page).toHaveURL(/\/other\/$/);
  expect(await arrival()).toEqual(['forward', '-2']);
  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/projects\/$/);
  expect(await arrival()).toEqual(['back', '1']);
  await expect(nav.locator('.mark')).toHaveCount(1);
  const current = (await nav.getByRole('link', { name: 'Projects' }).boundingBox())!;
  await expect.poll(async () => (await nav.locator('.mark').boundingBox())!.x).toBeCloseTo(current.x, 0);
  await page.reload();
  expect(await arrival()).toEqual([null, null]);
});

test('links stay clickable while animations play', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Pages' });
  const center = async (name: string) => {
    const box = (await nav.getByRole('link', { name }).boundingBox())!;
    return [box.x + box.width / 2, box.y + box.height / 2] as const;
  };
  const other = await center('Other');
  const projects = await center('Projects');

  const animating = () => page.evaluate(() => document.getAnimations().some((a) => a.playState === 'running'));

  await page.mouse.click(...projects);
  await expect(page).toHaveURL(/\/projects\/$/);
  expect(await animating()).toBe(true);
  await page.mouse.click(...other);
  await expect(page).toHaveURL(/\/other\/$/);

  await page.getByRole('button', { name: /^Switch to/ }).click();
  expect(await animating()).toBe(true);
  await page.mouse.click(...projects);
  await expect(page).toHaveURL(/\/projects\/$/);
});

test('every internal link resolves', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of hrefs.filter((h) => h.startsWith('#'))) {
      expect(await page.locator(href).count(), `${path} ${href}`).toBe(1);
    }
    for (const href of hrefs.filter((h) => h.startsWith('/'))) {
      expect((await page.request.get(href)).status(), `${path} ${href}`).toBe(200);
    }
  }
});

test('unknown paths serve the 404 page with a way home', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response!.status()).toBe(404);
  await page.getByRole('link', { name: 'Back to the home page' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('the theme toggle switches modes, persists, and starts from the system setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toDark = page.getByRole('button', { name: 'Switch to dark mode' });
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect(toDark.locator('.moon')).toBeVisible();
  await expect.poll(background).toBe('rgb(255, 255, 255)');

  await toDark.click();
  const toLight = page.getByRole('button', { name: 'Switch to light mode' });
  await expect(toLight.locator('.sun')).toBeVisible();
  await expect(toLight.locator('.moon')).toBeHidden();
  await expect.poll(background).toBe('rgb(11, 11, 11)');

  await page.goto('/projects/');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect.poll(background).toBe('rgb(11, 11, 11)');

  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.reload();
  await expect.poll(background).toBe('rgb(255, 255, 255)');

  const fresh = await page.context().browser()!.newContext({ colorScheme: 'dark' });
  const darkPage = await fresh.newPage();
  await darkPage.goto(page.url());
  await expect(darkPage.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await fresh.close();
});

test('the heatmap bins pointer movement and redraws for the chosen theme', async ({ page }) => {
  await page.goto('/');
  await live(page);
  const canvas = page.locator('#heatmap canvas');
  await expect(canvas).toBeVisible();
  const before = await sampleCount(page);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 20 });
  await expect.poll(() => sampleCount(page)).toBeGreaterThan(before);

  const corner = () => canvas.evaluate((c: HTMLCanvasElement) => [...c.getContext('2d')!.getImageData(0, 0, 1, 1).data.slice(0, 3)].join(','));
  const light = await corner();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect.poll(corner).not.toBe(light);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => sampleCount(page)).toBe(before);
});

const drawnReach = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#heatmap canvas')!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const cx = (innerWidth / 2 - rect.left) * scale;
    const cy = (innerHeight / 2 - rect.top) * scale;
    const { data, width, height } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const ground = [data[0], data[1], data[2]].join();
    let drawn = 0;
    let reach = 0;
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        if ([data[i], data[i + 1], data[i + 2]].join() === ground) continue;
        drawn += 1;
        reach = Math.max(reach, Math.hypot(x - cx, y - cy));
      }
    }
    return { drawn, reach };
  });

test('the heatmap ripples out from the center of the window on load', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await live(page);
  await page.clock.runFor(250);
  const early = await drawnReach(page);
  await page.clock.runFor(1500);
  const settled = await drawnReach(page);
  expect(early.drawn).toBeGreaterThan(0);
  expect(early.drawn).toBeLessThan(settled.drawn);
  expect(early.reach).toBeLessThan(settled.reach * 0.6);
});

test('the heatmap appears at once with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await live(page);
  await page.clock.runFor(50);
  const first = await drawnReach(page);
  await page.clock.runFor(1500);
  expect(await drawnReach(page)).toEqual(first);
});

test('the heatmap works from the keyboard', async ({ page }) => {
  await page.goto('/');
  await live(page);
  const before = await sampleCount(page);
  await page.locator('#heatmap canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => sampleCount(page)).toBe(before + 12);
});

for (const [width, height] of [[1440, 900], [2560, 1440]]) {
  test(`home fills a ${width} x ${height} screen inside a margin, with square heatmap bins`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await live(page);
    const heatmap = (await page.locator('#heatmap').boundingBox())!;
    const edge = await page.evaluate(() => document.body.clientWidth);
    const right = edge - (heatmap.x + heatmap.width);
    const bottom = height - (heatmap.y + heatmap.height);
    expect(right).toBeCloseTo(Math.min(288, edge * 0.12), 0);
    expect(bottom).toBeCloseTo(Math.min(288, edge * 0.12, height * 0.12), 0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
    expect(heatmap.width).toBeGreaterThan((width - 2 * right) * 0.6);
    const toggle = (await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).boundingBox())!;
    expect(toggle.x + toggle.width).toBeCloseTo(heatmap.x + heatmap.width, 0);
    const resume = (await page.getByRole('link', { name: 'Resume (PDF)' }).boundingBox())!;
    expect(resume.y + resume.height).toBeLessThanOrEqual(height);
    expect(resume.y).toBeGreaterThan(height * 0.6);
    const [cols, rows] = (await page.locator('#heatmap-readout').textContent())!.match(/(\d+) × (\d+) bins/)!.slice(1).map(Number);
    const canvas = (await page.locator('#heatmap canvas').boundingBox())!;
    expect(canvas.width / cols / (canvas.height / rows)).toBeCloseTo(1, 1);
  });
}

for (const width of [1280, 1920, 2560]) {
  test(`the header is identical on every page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const layout = async (path: string) => {
      await page.goto(path);
      const header = page.locator('header.top');
      const boxes = [header, header.getByRole('link', { name: 'Evan Chen' }), ...['Home', 'Projects', 'Other'].map((n) => header.getByRole('link', { name: n })), header.getByRole('button', { name: /Switch to/ })];
      const fonts = await header.getByRole('link', { name: 'Projects' }).evaluate((el) => getComputedStyle(el).fontSize);
      return { boxes: await Promise.all(boxes.map((b) => b.boundingBox())), fonts };
    };
    const home = await layout('/');
    for (const path of ['/projects/', '/other/', '/no-such-page']) expect(await layout(path), path).toEqual(home);
  });
}

test('home text runs 20% larger than the other pages, with the name at title size', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  const size = (selector: string) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await page.goto('/');
  const home = { body: await size('.links a'), name: await size('h1') };
  await page.goto('/projects/');
  expect(home.body / (await size('footer a'))).toBeCloseTo(1.2, 1);
  expect(home.name).toBe(await size('h1'));
});

test('the heatmap key tracks the live maximum', async ({ page }) => {
  await page.goto('/');
  await live(page);
  const ranges = page.locator('#heatmap .key-range');
  const upper = async () => Number((await ranges.last().textContent())!.split('-').pop()!.replace(/,/g, ''));
  await expect(ranges).toHaveCount(6);
  await expect(ranges.first()).toHaveText(/^1(-|$)/);
  const before = await upper();
  const box = (await page.locator('#heatmap canvas').boundingBox())!;
  const x = box.x + box.width * 0.9;
  const y = box.y + box.height * 0.9;
  for (let i = 0; i < before + 5; i++) await page.mouse.move(x + (i % 2), y);
  await expect.poll(upper).toBeGreaterThan(before);
});

test('pages render their content without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#heatmap .heatmap-fallback')).toBeVisible();
  expect(await page.locator('#heatmap .heatmap-fallback rect').count()).toBeGreaterThan(100);
  await expect(page.getByRole('button', { name: 'Reset' })).toBeHidden();
  await expect(page.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeHidden();
  await page.goto('/projects/');
  await expect(page.locator('[data-quantum] .circuit svg')).toBeVisible();
  await expect(page.locator('#quantum-stats')).toContainText('5 of 8 satisfy');
  await context.close();
});

test('projects are listed in content order', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.locator('.row h2')).toHaveText(projects.map((p) => p.title));
  await expect(page.locator('.row .index')).toHaveText(projects.map((_, i) => String(i + 1).padStart(2, '0')));
});

test('the quantum demo compiles typed expressions and reports errors', async ({ page }) => {
  await page.goto('/projects/');
  const input = page.getByRole('textbox', { name: 'f(a…e) =' });
  const stats = page.locator('#quantum-stats');
  await input.fill('a & b');
  await expect(stats).toContainText('2 inputs · 1 ancilla · 3 gates · 1 of 4 satisfy · 1 Grover iteration');
  await expect(page.locator('.circuit svg')).toHaveAttribute('aria-label', 'Oracle circuit with 3 qubits and 3 gates');
  await input.fill('a & (b');
  await expect(stats).toContainText('Missing )');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'a ^ b ^ c' }).click();
  await expect(input).toHaveValue('a ^ b ^ c');
  await expect(stats).toContainText('4 of 8 satisfy');
  await expect(input).not.toHaveAttribute('aria-invalid');
});

test('Other shows its empty state until entries exist', async ({ page }) => {
  test.skip(hasOtherEntries, 'Other has entries; the feed is covered by the editor suite');
  await page.goto('/other/');
  await expect(page.getByText(site.otherEmpty)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Filter entries' })).toHaveCount(0);
});

for (const width of [375, 768, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of [...pages, '/no-such-page']) {
      await page.goto(path);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${path}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
}

test('the published build ships no editor code', () => {
  const files = readdirSync('dist', { recursive: true, withFileTypes: true }).filter((f) => f.isFile() && /\.(html|js|css)$/.test(f.name));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(path.join(file.parentPath, file.name), 'utf8');
    expect(text, file.name).not.toMatch(/__editor|data-edit-|ed-bar/);
  }
});
