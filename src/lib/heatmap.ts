import { seeded, type Histogram } from './histogram';

type Rgb = [number, number, number];

const rgb = (value: string): Rgb => {
  const v = value.trim();
  if (!v.startsWith('#')) return v.match(/[\d.]+/g)!.slice(0, 3).map(Number) as Rgb;
  const full = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join('') : v.slice(1);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
};

const fmt = (n: number) => n.toLocaleString('en-US');

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as Rgb;
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const clamp = (t: number) => Math.min(1, Math.max(0, t));

const introWave = 800;
const introSpan = 560;

export const rangeLabel = (s: { lo: number; hi: number } | null) =>
  s === null ? '-' : s.lo === s.hi ? fmt(s.lo) : `${fmt(s.lo)}-${fmt(s.hi)}`;

export function initHeatmap(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const fallback = root.querySelector<SVGElement>('.heatmap-fallback')!;
  const readout = root.querySelector<HTMLElement>('.heatmap-readout')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!;
  const ranges = [...root.querySelectorAll<HTMLElement>('.key-range')];
  const ctx = canvas.getContext('2d')!;

  let hist: Histogram | null = null;
  let drawing = false;
  let cursor = { x: 0, y: 0 };
  let focused = false;
  let ramp: Rgb[] = [];
  let ground: Rgb = [0, 0, 0];
  let ink: Rgb = [0, 0, 0];
  let queued = false;
  let origin = { x: 0, y: 0 };
  let intro = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introStart = 0;

  const readColors = () => {
    const style = getComputedStyle(root);
    ramp = [1, 2, 3, 4, 5, 6].map((i) => rgb(style.getPropertyValue(`--h${i}`)));
    ground = rgb(style.getPropertyValue('--bg'));
    ink = rgb(style.getPropertyValue('--ink'));
  };

  const draw = (now: number) => {
    queued = false;
    if (!hist) return;
    readColors();
    const w = canvas.width / hist.cols;
    const h = canvas.height / hist.rows;
    const dpr = window.devicePixelRatio || 1;
    const gap = Math.max(Math.round(dpr), Math.round(w * 0.08));
    if (intro && !introStart) introStart = now;
    const elapsed = now - introStart;
    if (elapsed >= introWave + introSpan) intro = false;
    const reach = Math.max(...[0, canvas.width].flatMap((cx) => [0, canvas.height].map((cy) => Math.hypot(cx - origin.x, cy - origin.y))));
    const fill = (x: number, y: number, scale: number, color: Rgb) => {
      const size = [Math.ceil(w) - gap, Math.ceil(h) - gap];
      const inset = (1 - scale) / 2;
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fillRect(Math.round(x * w) + size[0] * inset, Math.round(y * h) + size[1] * inset, size[0] * scale, size[1] * scale);
    };
    ctx.fillStyle = `rgb(${ground.join(',')})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < hist.rows; y++) {
      for (let x = 0; x < hist.cols; x++) {
        const v = hist.bins[y * hist.cols + x];
        if (!v) continue;
        const color = ramp[hist.level(v) - 1];
        const t = intro ? (elapsed - (Math.hypot((x + 0.5) * w - origin.x, (y + 0.5) * h - origin.y) / reach) * introWave) / introSpan : 1;
        if (t >= 1) fill(x, y, 1, color);
        else if (t > 0) fill(x, y, easeOut(t), mix(ramp[5], color, easeOut(clamp((t - 0.15) / 0.85))));
      }
    }
    if (intro || document.documentElement.getAnimations().length) schedule();
    if (focused) {
      ctx.strokeStyle = `rgb(${ink.join(',')})`;
      ctx.lineWidth = 2 * dpr;
      ctx.strokeRect(cursor.x * w + dpr, cursor.y * h + dpr, w - 2 * dpr - gap, h - 2 * dpr - gap);
    }
    hist.steps().forEach((s, i) => (ranges[i].textContent = rangeLabel(s)));
    readout.textContent = `${fmt(hist.total)} samples in ${hist.cols} × ${hist.rows} bins. Move over the plot to add samples.`;
  };

  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  };

  const size = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    origin = { x: (innerWidth / 2 - rect.left) * dpr, y: (innerHeight / 2 - rect.top) * dpr };
    const cell = innerWidth < 700 ? innerWidth / 18 : innerWidth / 54;
    const cols = Math.max(8, Math.round(rect.width / cell));
    const rows = Math.max(6, Math.round(rect.height / (rect.width / cols)));
    if (!hist || hist.cols !== cols || hist.rows !== rows) {
      hist = seeded(cols, rows);
      cursor = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    }
    schedule();
  };

  const point = (e: PointerEvent, h: Histogram) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * h.cols, y: ((e.clientY - rect.top) / rect.height) * h.rows };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !hist) return;
    drawing = true;
    const p = point(e, hist);
    hist.add(p.x, p.y);
    schedule();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!hist || (e.pointerType !== 'mouse' && !drawing)) return;
    const p = point(e, hist);
    hist.add(p.x, p.y);
    schedule();
  });

  const release = () => (drawing = false);
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
    if (!hist) return;
    if (move) {
      cursor = {
        x: Math.max(0, Math.min(hist.cols - 1, cursor.x + move[0])),
        y: Math.max(0, Math.min(hist.rows - 1, cursor.y + move[1])),
      };
    } else if (e.key === 'Enter' || e.key === ' ') {
      for (let i = 0; i < 12; i++) hist.add(cursor.x + Math.random(), cursor.y + Math.random());
    } else {
      return;
    }
    e.preventDefault();
    schedule();
  });

  reset.addEventListener('click', () => {
    if (hist) hist = seeded(hist.cols, hist.rows);
    schedule();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  fallback.setAttribute('hidden', '');
  canvas.hidden = false;
  canvas.style.touchAction = 'pan-y';
  root.dataset.live = 'true';
  new ResizeObserver(size).observe(canvas);
}
