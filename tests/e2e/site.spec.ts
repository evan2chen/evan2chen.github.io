import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pages = ['/', '/projects/', '/other/'];
const projects: { id: string; title: string }[] = JSON.parse(readFileSync('src/content/projects.json', 'utf8'));
const site: { otherEmpty: string } = JSON.parse(readFileSync('src/content/site.json', 'utf8'));
const hasOtherEntries = readdirSync('src/content/other').some((f) => f.endsWith('.md'));

const built = (page: Page) => page.waitForFunction(() => !document.documentElement.dataset.build, null, { timeout: 15000 });

const phases = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Record<string, number>>((resolve) => {
        const root = document.documentElement;
        const seen: Record<string, number> = {};
        const t0 = performance.now();
        const watch = () => {
          const phase = root.dataset.build ?? 'done';
          seen[phase] ??= performance.now() - t0;
          if (phase === 'done' || performance.now() - t0 > 12000) resolve(seen);
          else requestAnimationFrame(watch);
        };
        watch();
      }),
  );

const opacity = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).opacity);

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
  await expect(toDark).toBeVisible();
  await expect.poll(background).toBe('rgb(255, 255, 255)');

  await toDark.click();
  const toLight = page.getByRole('button', { name: 'Switch to light mode' });
  expect(await toLight.evaluate((el) => el.style.getPropertyValue('--spin'))).toBe('180deg');
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

test('pressing the theme toggle mid-switch finishes that switch and plays the next', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/projects/');
  const toggle = page.getByRole('button', { name: /^Switch to/ });
  const box = (await toggle.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.classList.contains('theme-sweep'))).toBe(true);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await expect(page.locator('.theme-snapshot')).toHaveCount(1);
  expect(await toggle.evaluate((el) => el.style.getPropertyValue('--spin'))).toBe('360deg');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test('a fresh visit to home draws every outline, then fills the page in within about two seconds', async ({ page }) => {
  await page.goto('/');
  const timeline = phases(page);
  await expect(page.locator('html')).toHaveAttribute('data-build', 'outline');
  expect(await opacity(page, 'h1')).toBe('0');
  expect(await opacity(page, '.links a')).toBe('0');
  await expect.poll(() => page.locator('.agents .wires > *').count()).toBeGreaterThan(5);
  const seen = await timeline;
  expect(seen.fill).toBeDefined();
  expect(seen.done - seen.fill).toBeLessThan(2600);
  expect(await opacity(page, 'h1')).toBe('1');
  await expect(page.getByRole('link', { name: 'Resume (PDF)' })).toBeInViewport();
  await expect(page.locator('.agents .agent')).not.toHaveCount(0);
});

test('the outline phase hands off to the fill phase at about two seconds', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-build', 'outline');
  const started = Date.now();
  await expect(page.locator('html')).toHaveAttribute('data-build', 'fill', { timeout: 5000 });
  expect(Date.now() - started).toBeLessThan(2600);
});

test('builders keep shipping components after the build', async ({ page }) => {
  await page.goto('/');
  await built(page);
  await expect(page.locator('.count b')).not.toHaveText('000', { timeout: 20000 });
  await expect(page.locator('.log li')).not.toHaveCount(0);
});

test('returning to home from another page shows it without the build', async ({ page }) => {
  await page.goto('/projects/');
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => document.documentElement.dataset.build ?? null)).toBeNull();
  expect(await opacity(page, '.statement')).toBe('1');
  expect(await page.locator('.agents .wires > *').count()).toBe(0);
});

test('home appears at once with a still eye-catcher under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.dataset.build ?? null)).toBeNull();
  await expect(page.locator('.bay .item')).toHaveCount(3);
  await expect(page.locator('.count b')).toHaveText('003');
  await page.waitForTimeout(500);
  await expect(page.locator('.bay .item')).toHaveCount(3);
});

for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440]]) {
  test(`home fills a ${width} x ${height} screen inside a margin`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const eye = (await page.locator('.eye').boundingBox())!;
    const edge = await page.evaluate(() => document.body.clientWidth);
    const right = edge - (eye.x + eye.width);
    const bottom = height - (eye.y + eye.height);
    expect(right).toBeCloseTo(Math.min(288, edge * 0.12), 0);
    expect(bottom).toBeCloseTo(Math.min(288, edge * 0.12, height * 0.12), 0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
    expect(eye.width).toBeGreaterThan((width - 2 * right) * 0.6);
    const toggle = (await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).boundingBox())!;
    expect(toggle.x + toggle.width).toBeCloseTo(eye.x + eye.width, 0);
    const resume = (await page.getByRole('link', { name: 'Resume (PDF)' }).boundingBox())!;
    expect(resume.y + resume.height).toBeLessThanOrEqual(height);
    expect(resume.y).toBeGreaterThan(height * 0.6);
    const photo = (await page.locator('.photo img').boundingBox())!;
    const about = (await page.locator('.about').boundingBox())!;
    expect(photo.y + photo.height).toBeCloseTo(about.y + about.height, 0);
    expect(Math.max(photo.height / about.height, photo.width / (about.width * 0.62))).toBeCloseTo(1, 2);
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

test('pages render their content without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await opacity(page, '.statement')).toBe('1');
  await expect(page.locator('.dock')).toBeHidden();
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
      await built(page);
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
