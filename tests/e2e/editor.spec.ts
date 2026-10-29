import { test, expect, type Locator, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const site = path.resolve('.sandbox/site');
const remote = path.resolve('.sandbox/remote.git');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

type Project = { id: string; title: string; media: { kind: string; src?: string } };
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(site, file), 'utf8'));
const siteJson = () => readJson<{ description: string; photo: { src: string } }>('src/content/site.json');
const projectList = () => readJson<Project[]>('src/content/projects.json');
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const hasLatexmk = (() => {
  try {
    execFileSync('latexmk', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

test.describe.configure({ mode: 'serial' });

async function startEditing(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-editing', '');
}

async function reloadsAfter(page: Page, action: () => Promise<unknown>) {
  const loaded = page.waitForEvent('load');
  await action();
  await loaded;
  await expect(page.locator('html')).toHaveAttribute('data-editing', '');
}

async function retype(page: Page, field: Locator, text: string) {
  await reloadsAfter(page, async () => {
    await field.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
  });
}

async function chooseFiles(page: Page, button: Locator, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  const chooser = page.waitForEvent('filechooser');
  await button.click();
  await (await chooser).setFiles(files);
}

async function recordWebm(page: Page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;
    const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame < 45; frame++) {
      ctx.fillStyle = `hsl(${frame * 8}, 70%, 50%)`;
      ctx.fillRect(0, 0, 320, 180);
      await new Promise((r) => setTimeout(r, 33));
    }
    const stopped = new Promise((r) => (recorder.onstop = r));
    recorder.stop();
    await stopped;
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
  });
  return Buffer.from(bytes);
}

test('pages open in view mode with the editor bar ready', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[contenteditable]')).toHaveCount(0);
  await expect(page.locator('.ed-tools')).toHaveCount(0);
});

test('editing the description in place writes site.json, with a placeholder while it is empty', async ({ page }) => {
  await startEditing(page, '/');
  const statement = page.locator('[data-edit-text="site:description"]');
  await reloadsAfter(page, async () => {
    await statement.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Enter');
  });
  expect(siteJson().description).toBe('');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('.statement .draft')).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  await retype(page, statement, 'I build compilers and agent tooling.');
  expect(siteJson().description).toBe('I build compilers and agent tooling.');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('.statement')).toHaveText('I build compilers and agent tooling.');
  await expect(page.locator('.statement .draft')).toHaveCount(0);
});

test('uploading a profile photo stores it under public/media and shows it', async ({ page }) => {
  await startEditing(page, '/');
  await reloadsAfter(page, () =>
    chooseFiles(page, page.locator('[data-edit-media="site:photo"]').getByRole('button', { name: 'Upload media' }), [
      { name: 'Me Portrait.png', mimeType: 'image/png', buffer: PNG },
    ]),
  );
  const src = siteJson().photo.src;
  expect(src).toMatch(/^\/media\/me-portrait-[a-z0-9]+\.png$/);
  expect(existsSync(path.join(site, 'public', src))).toBe(true);
  await expect(page.locator('.photo img')).toHaveAttribute('src', src);
});

test('projects can be added, renamed, reordered and removed', async ({ page }) => {
  await startEditing(page, '/projects/');
  await reloadsAfter(page, () => page.getByRole('button', { name: 'Add a project' }).click());
  expect(projectList().at(-1)!.id).toBe('new-project');

  await retype(page, page.locator('[data-edit-text="projects:new-project:title"]'), 'Sandbox demo');
  expect(projectList().at(-1)!.title).toBe('Sandbox demo');

  await reloadsAfter(page, () => page.locator('#new-project').getByRole('button', { name: 'Move up' }).first().click());
  expect(projectList().at(-2)!.id).toBe('new-project');
  await expect(page.locator('.row h2').nth(projectList().length - 2)).toHaveText('Sandbox demo');

  await page.locator('#new-project').getByRole('button', { name: 'Remove' }).first().click();
  await reloadsAfter(page, () => page.locator('dialog').getByRole('button', { name: 'Remove' }).click());
  expect(projectList().map((p) => p.id)).not.toContain('new-project');
  await expect(page.locator('#new-project')).toHaveCount(0);
});

test('uploaded project videos play one at a time as they scroll into view', async ({ page }) => {
  await startEditing(page, '/projects/');
  const webm = await recordWebm(page);
  for (const id of ['herd', 'midboss']) {
    await reloadsAfter(page, () =>
      chooseFiles(page, page.locator(`[data-edit-media="projects:${id}:media"]`).getByRole('button', { name: 'Upload media' }), [
        { name: `${id}.webm`, mimeType: 'video/webm', buffer: webm },
      ]),
    );
    expect(projectList().find((p) => p.id === id)!.media).toMatchObject({ kind: 'video', src: expect.stringMatching(/\.webm$/) });
  }
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const playing = (id: string) => page.locator(`#${id} video`).evaluate((v: HTMLVideoElement) => !v.paused);
  for (const [active, idle] of [['herd', 'midboss'], ['midboss', 'herd']]) {
    await page.locator(`#${active} video`).evaluate((v) => v.scrollIntoView({ block: 'center' }));
    await expect.poll(() => playing(active)).toBe(true);
    await expect.poll(() => playing(idle)).toBe(false);
    await expect(page.locator(`#${active}`)).toHaveClass(/active/);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.locator('#herd video').evaluate((v) => v.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  expect(await playing('herd')).toBe(false);
});

test('Other entries are created, written in Markdown, illustrated and filtered', async ({ page }) => {
  await page.goto('/other/');
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  await page.getByRole('button', { name: 'New post entry' }).click();
  await expect(page).toHaveURL(/\/other\/post-\d{4}-\d{2}-\d{2}\/$/);
  await retype(page, page.getByRole('heading', { level: 1 }), 'First post');
  await page.getByRole('button', { name: 'Edit the body as Markdown' }).click();
  await page.locator('dialog textarea').fill('## Why\n\nBecause **Markdown** is easy to keep.');
  await reloadsAfter(page, () => page.locator('dialog').getByRole('button', { name: 'Save' }).click());
  await expect(page.locator('.prose h2')).toHaveText('Why');
  await expect(page.locator('.prose strong')).toHaveText('Markdown');

  await page.goto('/other/');
  await page.getByRole('button', { name: 'New image entry' }).click();
  await expect(page).toHaveURL(/\/other\/image-/);
  await reloadsAfter(page, () =>
    chooseFiles(page, page.getByRole('button', { name: 'Add images' }), [
      { name: 'one.png', mimeType: 'image/png', buffer: PNG },
      { name: 'two.png', mimeType: 'image/png', buffer: PNG },
    ]),
  );
  await expect(page.locator('.gallery img')).toHaveCount(2);

  await page.goto('/other/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const feed = page.locator('.feed > li');
  await expect(feed).toHaveCount(2);
  await page.getByRole('button', { name: /^Images/ }).click();
  await expect(feed.filter({ visible: true })).toHaveCount(1);
  await expect(feed.filter({ visible: true }).locator('.thumbs img')).toHaveCount(2);
  await page.getByRole('button', { name: /^Posts/ }).click();
  await expect(feed.filter({ visible: true }).getByRole('heading')).toHaveText('First post');
});

test('publish commits every content change and pushes it to the remote', async ({ page }) => {
  await page.goto('/');
  const status = page.getByRole('status');
  await expect(status).toContainText(/\d+ unpublished changes?/);
  const pending = git(site, 'status', '--porcelain', '--untracked-files=all', '--', 'src/content', 'public/media').split('\n').filter(Boolean);
  expect(pending.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Publish' }).click();
  const dialog = page.locator('dialog');
  await expect(dialog).toContainText('pushes to origin');
  await dialog.getByRole('textbox').fill('Add first post and photos');
  await dialog.getByRole('button', { name: 'Publish' }).click();
  await expect(status).toHaveText(`Published ${pending.length} files`);

  expect(git(site, 'status', '--porcelain', '--', 'src/content', 'public/media')).toBe('');
  expect(git(remote, 'log', '-1', '--format=%s', 'main')).toBe('Add first post and photos');
  expect(git(remote, 'show', '--name-only', '--format=', 'main')).toContain('src/content/site.json');
  await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
});

test('the resume can be edited and rebuilt from the editor', async ({ page }) => {
  test.skip(!hasLatexmk, 'latexmk is not installed');
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const area = page.locator('dialog textarea');
  await expect(area).toHaveValue(/\\documentclass/);
  await area.fill((await area.inputValue()).replace('\\end{document}', '% edited in the sandbox\n\\end{document}'));
  await page.locator('dialog').getByRole('button', { name: 'Save and rebuild' }).click();
  await expect(page.locator('dialog h2')).toHaveText('Resume rebuilt', { timeout: 150_000 });
  expect(readFileSync(path.join(site, 'resume/main.tex'), 'utf8')).toContain('% edited in the sandbox');
  expect(readFileSync(path.join(site, 'public/resume.pdf')).subarray(0, 5).toString()).toBe('%PDF-');
});
