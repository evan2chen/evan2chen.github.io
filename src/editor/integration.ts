import type { AstroIntegration } from 'astro';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Doc = { [key: string]: Json };
type Target = 'site' | 'projects' | 'other';
type Address = { target: Target; id?: string; path: string[] };

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const run = promisify(execFile);
const SEGMENT = /^(?!__)[A-Za-z0-9_-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MEDIA_TYPES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.mp4', '.webm']);
const ENTRY_TYPES = new Set(['post', 'image', 'project']);
const PUBLISHED = ['src/content', 'public/media', 'resume/main.tex'];

function parseAddress(address: unknown): Address {
  if (typeof address !== 'string') throw new HttpError(400, 'Missing address');
  const [target, ...rest] = address.split(':');
  const fields = (field = '') => {
    const parts = field.split('.').filter(Boolean);
    if (!parts.every((p) => SEGMENT.test(p))) throw new HttpError(400, `Bad field in ${address}`);
    return parts;
  };
  if (target === 'site') return { target, path: fields(rest[0]) };
  if (target === 'projects' || target === 'other') {
    const [id, field] = rest;
    if (!id || !SEGMENT.test(id)) throw new HttpError(400, `Bad id in ${address}`);
    return { target, id, path: fields(field) };
  }
  throw new HttpError(400, `Unknown address ${address}`);
}

const container = (doc: Json, keys: string[]): Doc | Json[] => {
  let node: Json = doc;
  for (const key of keys) {
    node = Array.isArray(node) ? node[Number(key)] : node && typeof node === 'object' ? node[key] : null;
  }
  if (!node || typeof node !== 'object') throw new HttpError(400, `No field ${keys.join('.')}`);
  return node;
};

const getAt = (doc: Doc, keys: string[]): Json => {
  if (!keys.length) return doc;
  const parent = container(doc, keys.slice(0, -1));
  const last = keys.at(-1)!;
  return (Array.isArray(parent) ? parent[Number(last)] : parent[last]) ?? null;
};

const setAt = (doc: Doc, keys: string[], value: Json) => {
  const parent = container(doc, keys.slice(0, -1));
  const last = keys.at(-1)!;
  if (Array.isArray(parent)) parent[Number(last)] = value;
  else parent[last] = value;
};

const removeAt = (doc: Doc, keys: string[]) => {
  const parent = container(doc, keys.slice(0, -1));
  const last = keys.at(-1)!;
  if (Array.isArray(parent)) parent.splice(Number(last), 1);
  else delete parent[last];
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';

const today = () => new Date().toISOString().slice(0, 10);

function createStore(root: string) {
  const at = (...parts: string[]) => path.join(root, ...parts);
  const sitePath = at('src/content/site.json');
  const projectsPath = at('src/content/projects.json');
  const otherDir = at('src/content/other');
  const mediaDir = at('public/media');
  const resumePath = at('resume/main.tex');
  const git = (...args: string[]) => run('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });

  const readJson = async <T>(file: string) => JSON.parse(await readFile(file, 'utf8')) as T;
  const writeJson = (file: string, value: unknown) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  const entryPath = (slug: string) => path.join(otherDir, `${slug}.md`);

  const readEntry = async (slug: string) => {
    if (!existsSync(entryPath(slug))) throw new HttpError(404, `No entry ${slug}`);
    const text = await readFile(entryPath(slug), 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) throw new HttpError(500, `${slug}.md has no frontmatter`);
    return { ...(parseYaml(match[1]) as Doc), body: match[2].trim() } as Doc;
  };

  const writeEntry = (slug: string, doc: Doc) => {
    const { body, ...data } = doc;
    return writeFile(entryPath(slug), `---\n${stringifyYaml(data).trimEnd()}\n---\n\n${String(body ?? '').trim()}\n`);
  };

  const open = async (a: Address): Promise<{ doc: Doc; save: () => Promise<void> }> => {
    if (a.target === 'site') {
      const doc = await readJson<Doc>(sitePath);
      return { doc, save: () => writeJson(sitePath, doc) };
    }
    if (a.target === 'projects') {
      const list = await readJson<Doc[]>(projectsPath);
      const doc = list.find((p) => p.id === a.id);
      if (!doc) throw new HttpError(404, `No project ${a.id}`);
      return { doc, save: () => writeJson(projectsPath, list) };
    }
    const doc = await readEntry(a.id!);
    return { doc, save: () => writeEntry(a.id!, doc) };
  };

  const validate = (a: Address, value: Json) => {
    if (a.target === 'other' && a.path.join('.') === 'date' && !(typeof value === 'string' && DATE.test(value))) {
      throw new HttpError(400, 'Dates are written as YYYY-MM-DD');
    }
    if (a.path.join('.') === 'id') throw new HttpError(400, 'Ids are fixed');
  };

  return {
    async get(address: unknown) {
      const a = parseAddress(address);
      return getAt((await open(a)).doc, a.path);
    },

    async set(address: unknown, value: Json) {
      const a = parseAddress(address);
      if (!a.path.length) throw new HttpError(400, 'Set needs a field');
      validate(a, value);
      const { doc, save } = await open(a);
      setAt(doc, a.path, value);
      await save();
    },

    async append(address: unknown, values: Json) {
      const a = parseAddress(address);
      if (!Array.isArray(values) || !values.length) throw new HttpError(400, 'Append needs a list of values');
      const { doc, save } = await open(a);
      const list = getAt(doc, a.path);
      if (!Array.isArray(list)) throw new HttpError(400, `${a.path.join('.')} is not a list`);
      list.push(...values);
      await save();
    },

    async remove(address: unknown) {
      const a = parseAddress(address);
      if (a.path.length) {
        const { doc, save } = await open(a);
        removeAt(doc, a.path);
        return save();
      }
      if (a.target === 'projects') {
        const list = await readJson<Doc[]>(projectsPath);
        return writeJson(projectsPath, list.filter((p) => p.id !== a.id));
      }
      if (a.target === 'other') return rm(entryPath(a.id!));
      throw new HttpError(400, 'The site record cannot be removed');
    },

    async move(address: unknown, by: unknown) {
      const a = parseAddress(address);
      if (a.target !== 'projects' || a.path.length || (by !== 1 && by !== -1)) throw new HttpError(400, 'Only projects move, by 1 or -1');
      const list = await readJson<Doc[]>(projectsPath);
      const from = list.findIndex((p) => p.id === a.id);
      const to = from + by;
      if (from < 0 || to < 0 || to >= list.length) return;
      [list[from], list[to]] = [list[to], list[from]];
      await writeJson(projectsPath, list);
    },

    async create(target: unknown, type: unknown) {
      if (target === 'projects') {
        const list = await readJson<Doc[]>(projectsPath);
        let id = 'new-project';
        for (let n = 2; list.some((p) => p.id === id); n++) id = `new-project-${n}`;
        list.push({ id, title: 'New project', blurb: 'What it does and the result that matters.', stack: 'Stack', links: [], media: { kind: 'none', note: 'Media coming soon' } });
        await writeJson(projectsPath, list);
        return id;
      }
      if (target === 'other' && typeof type === 'string' && ENTRY_TYPES.has(type)) {
        await mkdir(otherDir, { recursive: true });
        let id = `${type}-${today()}`;
        for (let n = 2; existsSync(entryPath(id)); n++) id = `${type}-${today()}-${n}`;
        await writeEntry(id, { title: 'Untitled', date: today(), type, excerpt: '', images: [], body: '' });
        return id;
      }
      throw new HttpError(400, 'Create a project, or an other entry of type post, image or project');
    },

    async upload(name: string | null, req: IncomingMessage) {
      const ext = path.extname(name ?? '').toLowerCase();
      if (!MEDIA_TYPES.has(ext)) throw new HttpError(400, `Upload images or videos (${[...MEDIA_TYPES].join(' ')})`);
      await mkdir(mediaDir, { recursive: true });
      const file = `${slugify(path.basename(name!, ext))}-${Date.now().toString(36)}${ext}`;
      await pipeline(req, createWriteStream(path.join(mediaDir, file)));
      return `/media/${file}`;
    },

    async resume() {
      return readFile(resumePath, 'utf8');
    },

    async saveResume(tex: unknown) {
      if (typeof tex !== 'string' || !tex.includes('\\documentclass')) throw new HttpError(400, 'That is not a LaTeX document');
      await writeFile(resumePath, tex);
      try {
        const { stdout, stderr } = await run(process.execPath, ['scripts/build-resume.mjs'], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
        return { ok: true, log: `${stdout}${stderr}`.trim().split('\n').slice(-20).join('\n') };
      } catch (err) {
        const { stdout = '', stderr = '' } = err as { stdout?: string; stderr?: string };
        return { ok: false, log: `${stdout}${stderr}`.trim().split('\n').slice(-40).join('\n') };
      }
    },

    async changes() {
      const paths = PUBLISHED.filter((p) => existsSync(at(p)));
      if (!paths.length) return [];
      const { stdout } = await git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...paths);
      const fields = stdout.split('\0').filter(Boolean);
      const files: string[] = [];
      for (let i = 0; i < fields.length; i++) {
        files.push(fields[i].slice(3));
        if (fields[i][0] === 'R' || fields[i][0] === 'C') i++;
      }
      return files;
    },

    async remote() {
      const { stdout } = await git('remote');
      return stdout.split('\n').find(Boolean) ?? null;
    },

    async publish(message: unknown) {
      const text = typeof message === 'string' && message.trim() ? message.trim() : 'Update site content';
      const files = await this.changes();
      if (!files.length) return { files, committed: false, pushed: false };
      await git('add', '--all', '--', ...files);
      await git('commit', '--quiet', '-m', text, '--', ...files);
      const remote = await this.remote();
      if (remote) await git('push', remote, 'HEAD');
      return { files, committed: true, pushed: Boolean(remote) };
    },
  };
}

type Store = ReturnType<typeof createStore>;

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return (text ? JSON.parse(text) : {}) as Record<string, Json>;
};

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body ?? null));
};

async function route(store: Store, req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://editor.local');
  switch (`${req.method} ${url.pathname}`) {
    case 'GET /state':
      return { changes: await store.changes(), remote: await store.remote() };
    case 'GET /value':
      return { value: await store.get(url.searchParams.get('address')) };
    case 'GET /resume':
      return { tex: await store.resume() };
    case 'POST /upload':
      return { src: await store.upload(url.searchParams.get('name'), req) };
  }
  const body = await readBody(req);
  switch (`${req.method} ${url.pathname}`) {
    case 'POST /set':
      return store.set(body.address, body.value ?? null);
    case 'POST /append':
      return store.append(body.address, body.values ?? null);
    case 'POST /remove':
      return store.remove(body.address);
    case 'POST /move':
      return store.move(body.address, body.by);
    case 'POST /create':
      return { id: await store.create(body.target, body.type) };
    case 'POST /resume':
      return store.saveResume(body.tex);
    case 'POST /publish':
      return store.publish(body.message);
  }
  throw new HttpError(404, `No editor route ${req.method} ${url.pathname}`);
}

export default function editor(): AstroIntegration {
  return {
    name: 'site-editor',
    hooks: {
      'astro:config:setup': ({ command, injectScript }) => {
        if (command === 'dev') injectScript('page', `import ${JSON.stringify(fileURLToPath(new URL('./client.ts', import.meta.url)))};`);
      },
      'astro:server:setup': ({ server }) => {
        const root = server.config.root ? path.resolve(server.config.root) : fileURLToPath(new URL('../..', import.meta.url));
        const store = createStore(root);
        server.middlewares.use('/__editor', (req, res) => {
          route(store, req).then(
            (result) => send(res, 200, result ?? { ok: true }),
            (err: Error) => send(res, err instanceof HttpError ? err.status : 500, { error: err.message }),
          );
        });
      },
    },
  };
}
