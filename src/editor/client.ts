import './editor.css';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

document.body.insertAdjacentHTML(
  'beforeend',
  `<div class="ed-bar" data-editor-bar>
  <button type="button" data-ed="toggle" aria-pressed="false">Edit</button>
  <span class="ed-status" data-ed="status" role="status"></span>
  <button type="button" data-ed="resume">Resume</button>
  <button type="button" data-ed="publish" disabled>Publish</button>
</div>

<dialog class="ed-dialog" data-ed="dialog" aria-labelledby="ed-title">
  <form method="dialog">
    <h2 id="ed-title" data-ed="title"></h2>
    <p data-ed="hint"></p>
    <input type="text" data-ed="input" aria-labelledby="ed-title" />
    <textarea data-ed="area" spellcheck="false" aria-labelledby="ed-title"></textarea>
    <pre data-ed="log"></pre>
    <div class="ed-actions">
      <button value="ok" data-ed="ok">Save</button>
      <button value="cancel" formnovalidate>Cancel</button>
    </div>
  </form>
</dialog>

<input type="file" data-ed="file" hidden />`,
);

const STORAGE_KEY = 'site-editor';
const GOTO_KEY = 'site-editor-goto';
const root = document.documentElement;
const bar = document.querySelector<HTMLElement>('[data-editor-bar]')!;
const toggle = bar.querySelector<HTMLButtonElement>('[data-ed="toggle"]')!;
const status = bar.querySelector<HTMLElement>('[data-ed="status"]')!;
const publishButton = bar.querySelector<HTMLButtonElement>('[data-ed="publish"]')!;
const resumeButton = bar.querySelector<HTMLButtonElement>('[data-ed="resume"]')!;
const dialog = document.querySelector<HTMLDialogElement>('[data-ed="dialog"]')!;
const fileInput = document.querySelector<HTMLInputElement>('[data-ed="file"]')!;
const wired = new WeakSet<Element>();

async function api<T = unknown>(route: string, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined ? {} : body instanceof File ? { method: 'POST', body } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(`/__editor/${route}`, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

const getValue = async (address: string) => (await api<{ value: Json }>(`value?address=${encodeURIComponent(address)}`)).value;
const set = (address: string, value: Json) => api('set', { address, value });

function say(text: string, tone: 'ok' | 'error' = 'ok') {
  status.textContent = text;
  status.dataset.tone = tone;
}

async function refresh() {
  const { changes, remote } = await api<{ changes: string[]; remote: string | null }>('state');
  publishButton.disabled = changes.length === 0;
  publishButton.dataset.files = changes.join('\n');
  publishButton.dataset.remote = remote ?? '';
  if (status.dataset.tone !== 'error') say(changes.length ? `${changes.length} unpublished change${changes.length === 1 ? '' : 's'}` : 'All changes published');
}

async function guard(action: () => Promise<unknown>) {
  try {
    await action();
    say('Saved');
    await refresh();
  } catch (err) {
    say((err as Error).message, 'error');
  }
}

type Ask = { title: string; hint?: string; value?: string; multiline?: boolean; log?: string; confirm?: string };

function ask({ title, hint = '', value, multiline = false, log, confirm = 'Save' }: Ask): Promise<string | null> {
  const q = <T extends HTMLElement>(name: string) => dialog.querySelector<T>(`[data-ed="${name}"]`)!;
  const input = q<HTMLInputElement>('input');
  const area = q<HTMLTextAreaElement>('area');
  const pre = q<HTMLPreElement>('log');
  q('title').textContent = title;
  q('hint').textContent = hint;
  q('ok').textContent = confirm;
  input.hidden = multiline || value === undefined;
  area.hidden = !multiline;
  pre.hidden = log === undefined;
  pre.textContent = log ?? '';
  input.value = area.value = value ?? '';
  dialog.returnValue = '';
  dialog.showModal();
  (multiline ? area : input.hidden ? q('ok') : input).focus();
  return new Promise((resolve) => {
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === 'ok' ? (multiline ? area.value : input.value) : null),
      { once: true },
    );
  });
}

function pick(accept: string, multiple = false): Promise<File[]> {
  fileInput.accept = accept;
  fileInput.multiple = multiple;
  fileInput.value = '';
  return new Promise((resolve) => {
    fileInput.addEventListener('change', () => resolve([...(fileInput.files ?? [])]), { once: true });
    fileInput.click();
  });
}

const upload = async (file: File) => (await api<{ src: string }>(`upload?name=${encodeURIComponent(file.name)}`, file)).src;

function tools(el: HTMLElement, className = 'ed-tools') {
  let box = [...el.children].find((c) => c.classList.contains(className)) as HTMLElement | undefined;
  if (!box) {
    box = document.createElement('div');
    box.className = className;
    box.dataset.edTool = '';
    el.append(box);
  }
  return box;
}

function button(box: HTMLElement, label: string, title: string, onClick: () => unknown) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  box.append(b);
}

function wireText(el: HTMLElement) {
  const address = el.dataset.editText!;
  if (el.dataset.editRaw !== undefined) {
    el.dataset.edShown = el.innerHTML;
    el.textContent = el.dataset.editRaw;
  }
  el.dataset.edOriginal = el.textContent ?? '';
  el.contentEditable = 'plaintext-only';
  if (wired.has(el)) return;
  wired.add(el);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.blur();
    } else if (e.key === 'Escape') {
      el.textContent = el.dataset.edOriginal ?? '';
      el.blur();
    }
  });
  el.addEventListener('blur', () => {
    if (!root.hasAttribute('data-editing')) return;
    const value = (el.textContent ?? '').trim();
    if (value === el.dataset.edOriginal) return;
    el.dataset.edOriginal = value;
    guard(() => set(address, value));
  });
}

function wireTools(el: HTMLElement) {
  const d = el.dataset;
  const box = tools(el);

  if (d.editHref) {
    const address = d.editHref;
    button(box, 'URL', 'Edit link address', async () => {
      const value = await ask({ title: 'Link address', hint: 'Leave empty to show the label as unfinished.', value: String((await getValue(address)) ?? '') });
      if (value !== null) guard(() => set(address, value.trim()));
    });
  }

  if (d.editMedia && d.editAccept !== 'none') {
    const address = d.editMedia;
    const isPhoto = address === 'site:photo';
    button(box, 'Upload', 'Upload media', async () => {
      const [file] = await pick(d.editAccept ?? 'image/*');
      if (!file) return;
      say(`Uploading ${file.name}…`);
      guard(async () => {
        const src = await upload(file);
        if (isPhoto) return set(`${address}.src`, src);
        const current = (await getValue(address)) as { alt?: string } | null;
        return set(address, { kind: file.type.startsWith('video/') ? 'video' : 'image', src, alt: current?.alt ?? '' });
      });
    });
    if (!isPhoto && el.querySelector('video')) {
      button(box, 'Poster', 'Upload a poster image for the video', async () => {
        const [file] = await pick('image/*');
        if (file) guard(async () => set(`${address}.poster`, await upload(file)));
      });
    }
    if (el.querySelector('img, video')) {
      button(box, 'Alt', 'Edit the description for screen readers', async () => {
        const value = await ask({ title: 'Alt text', hint: 'Describe what the image or video shows.', value: String((await getValue(`${address}.alt`)) ?? '') });
        if (value !== null) guard(() => set(`${address}.alt`, value.trim()));
      });
      button(box, 'Clear', 'Remove this media', () =>
        guard(() => (isPhoto ? set(`${address}.src`, '') : set(address, { kind: 'none', note: 'Media coming soon' }))),
      );
    }
  }

  if (d.editBody) {
    const address = d.editBody;
    button(box, 'Markdown', 'Edit the body as Markdown', async () => {
      const value = await ask({ title: 'Body (Markdown)', value: String((await getValue(address)) ?? ''), multiline: true });
      if (value !== null) guard(() => set(address, value));
    });
  }

  if (d.editImages) {
    const address = d.editImages;
    button(box, '+ Images', 'Add images', async () => {
      const files = await pick('image/*', true);
      if (!files.length) return;
      say(`Uploading ${files.length} image${files.length === 1 ? '' : 's'}…`);
      guard(async () => {
        const values = [];
        for (const file of files) values.push({ src: await upload(file), alt: '' });
        return api('append', { address, values });
      });
    });
  }

  if (d.editItem) {
    const address = d.editItem;
    if (d.editMove) {
      button(box, '↑', 'Move up', () => guard(() => api('move', { address, by: -1 })));
      button(box, '↓', 'Move down', () => guard(() => api('move', { address, by: 1 })));
    }
    button(box, '✕', 'Remove', async () => {
      if ((await ask({ title: 'Remove this?', hint: 'This deletes it from the content files.', confirm: 'Remove' })) === null) return;
      await guard(() => api('remove', { address }));
      if (d.editAfter) location.href = d.editAfter;
    });
  }

  if (d.editAppend) {
    const address = d.editAppend;
    const add = tools(el, 'ed-add');
    button(add, d.editLabel ?? '+ Add', 'Add an item', () => guard(() => api('append', { address, values: [JSON.parse(d.editValue ?? 'null')] })));
  }

  if (d.editAdd) {
    const target = d.editAdd;
    const add = tools(el, 'ed-add');
    if (target === 'projects') {
      button(add, d.editLabel ?? '+ Add', 'Add a project', () => guard(() => api('create', { target })));
    } else {
      for (const type of (d.editTypes ?? '').split(',')) {
        button(add, `+ ${type[0].toUpperCase()}${type.slice(1)}`, `New ${type} entry`, async () => {
          try {
            const { id } = await api<{ id: string }>('create', { target, type });
            await goTo(`/other/${id}/`);
          } catch (err) {
            say((err as Error).message, 'error');
          }
        });
      }
    }
  }

  if (!box.childElementCount) box.remove();
}

async function goTo(url: string) {
  try {
    sessionStorage.setItem(GOTO_KEY, url);
  } catch {}
  say('Opening…');
  for (let tries = 0; tries < 40 && !(await fetch(url, { method: 'HEAD' })).ok; tries++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  location.href = url;
}

const TOOL_SELECTOR = '[data-edit-href],[data-edit-media],[data-edit-body],[data-edit-images],[data-edit-item],[data-edit-append],[data-edit-add]';

function setEditing(on: boolean) {
  root.toggleAttribute('data-editing', on);
  toggle.setAttribute('aria-pressed', String(on));
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {}
  if (on) {
    document.querySelectorAll<HTMLElement>('[data-edit-text]').forEach(wireText);
    document.querySelectorAll<HTMLElement>(TOOL_SELECTOR).forEach(wireTools);
    return;
  }
  document.querySelectorAll('[data-ed-tool]').forEach((t) => t.remove());
  document.querySelectorAll<HTMLElement>('[data-edit-text]').forEach((el) => {
    el.removeAttribute('contenteditable');
    if (el.dataset.edShown !== undefined) el.innerHTML = el.dataset.edShown;
  });
}

document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement;
    if (root.hasAttribute('data-editing') && target.closest('[data-edit-text]') && target.closest('a')) e.preventDefault();
  },
  true,
);

toggle.addEventListener('click', () => setEditing(!root.hasAttribute('data-editing')));

publishButton.addEventListener('click', async () => {
  const files = publishButton.dataset.files ?? '';
  const remote = publishButton.dataset.remote;
  const message = await ask({
    title: 'Publish',
    hint: remote ? `Commits these files and pushes to ${remote}; GitHub Actions deploys the site.` : 'Commits these files. No git remote is set up, so nothing is pushed yet.',
    value: 'Update site content',
    log: files,
    confirm: 'Publish',
  });
  if (message === null) return;
  say('Publishing…');
  try {
    const result = await api<{ files: string[]; committed: boolean; pushed: boolean }>('publish', { message });
    await refresh();
    say(result.committed ? `Published ${result.files.length} file${result.files.length === 1 ? '' : 's'}${result.pushed ? '' : ' (committed locally, not pushed)'}` : 'Nothing to publish');
  } catch (err) {
    say((err as Error).message, 'error');
  }
});

resumeButton.addEventListener('click', async () => {
  const { tex } = await api<{ tex: string }>('resume');
  const value = await ask({ title: 'Resume (resume/main.tex)', hint: 'Saving rebuilds /resume.pdf with latexmk.', value: tex, multiline: true, confirm: 'Save and rebuild' });
  if (value === null) return;
  say('Rebuilding resume…');
  try {
    const result = await api<{ ok: boolean; log: string }>('resume', { tex: value });
    await refresh();
    say(result.ok ? 'Resume rebuilt' : 'Resume build failed', result.ok ? 'ok' : 'error');
    await ask({ title: result.ok ? 'Resume rebuilt' : 'Resume build failed', hint: result.ok ? 'Open /resume.pdf to check it.' : 'The saved main.tex did not compile.', log: result.log, confirm: 'Close' });
  } catch (err) {
    say((err as Error).message, 'error');
  }
});

let stored = 'off';
let pending: string | null = null;
try {
  stored = sessionStorage.getItem(STORAGE_KEY) ?? 'off';
  pending = sessionStorage.getItem(GOTO_KEY);
  if (pending === location.pathname) sessionStorage.removeItem(GOTO_KEY);
} catch {}
setEditing(stored === 'on');
if (pending && pending !== location.pathname) goTo(pending);
refresh().catch((err) => say((err as Error).message, 'error'));
