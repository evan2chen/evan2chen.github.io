import { COLS, ROWS, seeded, normalize, type Box, type Histogram } from './histogram';

type Mode = 'draw' | 'query';
type Rgb = [number, number, number];

const hex = (value: string): Rgb => {
  const v = value.trim().replace('#', '');
  const full = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
};

const fmt = (n: number) => n.toLocaleString('en-US');

export function initFig1(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const fallback = root.querySelector<SVGElement>('.fig1-fallback')!;
  const readout = root.querySelector<HTMLElement>('.fig1-readout')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const reset = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!;
  const ctx = canvas.getContext('2d')!;

  let hist: Histogram = seeded();
  let mode: Mode = 'draw';
  let box: Box | null = null;
  let anchor: { x: number; y: number } | null = null;
  let dragging = false;
  let cursor = { x: 16, y: 9 };
  let focused = false;
  let ramp: Rgb[] = [];
  let ground: Rgb = [0, 0, 0];
  let ink = '#000';
  let queued = false;

  const readColors = () => {
    const style = getComputedStyle(root);
    ramp = [1, 2, 3, 4, 5, 6].map((i) => hex(style.getPropertyValue(`--r${i}`)));
    ground = hex(style.getPropertyValue('--plate'));
    ink = style.getPropertyValue('--ink').trim();
  };

  const ticks = [...root.querySelectorAll<HTMLElement>('.key-ticks span')];
  const color = (level: number) => `rgb(${ramp[level - 1].join(',')})`;

  const flipY = (row: number) => ROWS - 1 - row;

  const describe = () => {
    let text = `${fmt(hist.total)} samples.`;
    if (box) {
      const b = normalize(box);
      const count = hist.query(b);
      const share = ((100 * count) / Math.max(1, hist.total)).toFixed(1);
      text += ` Box x ${b.x0}-${b.x1}, y ${flipY(b.y1)}-${flipY(b.y0)} holds ${fmt(count)} (${share}%).`;
    } else {
      text += mode === 'draw' ? ' Move over the plot to add samples.' : ' Drag a box to count the samples inside it.';
    }
    readout.textContent = text;
  };

  const draw = () => {
    queued = false;
    const w = canvas.width / COLS;
    const h = canvas.height / ROWS;
    const dpr = window.devicePixelRatio || 1;
    const gap = Math.max(1, Math.round(dpr));
    ctx.fillStyle = `rgb(${ground.join(',')})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = hist.bins[y * COLS + x];
        if (!v) continue;
        ctx.fillStyle = color(hist.level(v));
        ctx.fillRect(Math.round(x * w), Math.round(y * h), Math.ceil(w) - gap, Math.ceil(h) - gap);
      }
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2 * dpr;
    if (box) {
      const b = normalize(box);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.strokeRect(b.x0 * w, b.y0 * h, (b.x1 - b.x0 + 1) * w, (b.y1 - b.y0 + 1) * h);
      ctx.setLineDash([]);
    }
    if (focused) ctx.strokeRect(cursor.x * w + dpr, cursor.y * h + dpr, w - 2 * dpr - gap, h - 2 * dpr - gap);
    hist.boundaries().forEach((b, i) => (ticks[i].textContent = fmt(b)));
    describe();
  };

  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  };

  const size = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    schedule();
  };

  const writeUrl = () => {
    const params = new URLSearchParams(location.search);
    params.delete('fig1');
    const rest = params.toString();
    const parts = rest ? [rest] : [];
    if (box) {
      const b = normalize(box);
      parts.push(`fig1=${[b.x0, flipY(b.y1), b.x1, flipY(b.y0)].join(',')}`);
    }
    history.replaceState(null, '', `${location.pathname}${parts.length ? `?${parts.join('&')}` : ''}${location.hash}`);
  };

  const readUrl = () => {
    const raw = new URL(location.href).searchParams.get('fig1');
    const parts = raw?.split(',').map(Number) ?? [];
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return;
    const [x0, y0, x1, y1] = parts;
    const inside = (v: number, max: number) => v >= 0 && v < max;
    if (![x0, x1].every((v) => inside(v, COLS)) || ![y0, y1].every((v) => inside(v, ROWS))) return;
    box = { x0, x1, y0: flipY(y1), y1: flipY(y0) };
  };

  const setMode = (next: Mode) => {
    mode = next;
    anchor = null;
    for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    canvas.style.touchAction = mode === 'draw' ? 'pan-y' : 'none';
    schedule();
  };

  const cell = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * COLS;
    const y = ((e.clientY - rect.top) / rect.height) * ROWS;
    return { x, y, cx: Math.max(0, Math.min(COLS - 1, Math.floor(x))), cy: Math.max(0, Math.min(ROWS - 1, Math.floor(y))) };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = cell(e);
    if (mode === 'query') {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      box = { x0: p.cx, y0: p.cy, x1: p.cx, y1: p.cy };
    } else if (e.pointerType !== 'mouse') {
      dragging = true;
      hist.add(p.x, p.y);
    }
    schedule();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = cell(e);
    if (mode === 'query') {
      if (!dragging || !box) return;
      box.x1 = p.cx;
      box.y1 = p.cy;
    } else if (e.pointerType === 'mouse' || dragging) {
      hist.add(p.x, p.y);
    } else {
      return;
    }
    schedule();
  });

  const release = () => {
    if (dragging && mode === 'query') writeUrl();
    dragging = false;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('focus', () => {
    focused = true;
    schedule();
  });
  canvas.addEventListener('blur', () => {
    focused = false;
    schedule();
  });

  canvas.addEventListener('keydown', (e) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = moves[e.key];
    if (move) {
      cursor = {
        x: Math.max(0, Math.min(COLS - 1, cursor.x + move[0])),
        y: Math.max(0, Math.min(ROWS - 1, cursor.y + move[1])),
      };
      if (mode === 'query' && anchor) box = { x0: anchor.x, y0: anchor.y, x1: cursor.x, y1: cursor.y };
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (mode === 'draw') {
        for (let i = 0; i < 12; i++) hist.add(cursor.x + Math.random(), cursor.y + Math.random());
      } else if (anchor) {
        anchor = null;
        writeUrl();
      } else {
        anchor = { ...cursor };
        box = { x0: cursor.x, y0: cursor.y, x1: cursor.x, y1: cursor.y };
      }
    } else if (e.key === 'Escape') {
      anchor = null;
      box = null;
      writeUrl();
    } else {
      return;
    }
    e.preventDefault();
    schedule();
  });

  for (const b of modeButtons) b.addEventListener('click', () => setMode(b.dataset.mode as Mode));

  reset.addEventListener('click', () => {
    hist = seeded();
    box = null;
    anchor = null;
    writeUrl();
    schedule();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readColors();
    schedule();
  });

  readUrl();
  readColors();
  fallback.setAttribute('hidden', '');
  canvas.hidden = false;
  root.dataset.live = 'true';
  new ResizeObserver(size).observe(canvas);
  setMode(box ? 'query' : 'draw');
}
