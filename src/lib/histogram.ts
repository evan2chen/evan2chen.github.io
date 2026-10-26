export const COLS = 32;
export const ROWS = 18;
export const LEVELS = 6;

export type Box = { x0: number; y0: number; x1: number; y1: number };

export class Histogram {
  bins = new Uint32Array(COLS * ROWS);
  total = 0;
  max = 1;

  add(x: number, y: number, weight = 1) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
    const i = cy * COLS + cx;
    this.bins[i] += weight;
    this.total += weight;
    if (this.bins[i] > this.max) this.max = this.bins[i];
    return true;
  }

  boundaries() {
    const b = [0];
    for (let k = 1; k <= LEVELS; k++) {
      b.push(Math.min(this.max, Math.max(Math.round(this.max * (k / LEVELS) ** 2), b[k - 1] + 1)));
    }
    return b;
  }

  steps() {
    const b = this.boundaries();
    return b.slice(1).map((hi, k) => {
      const lo = b[k] + 1;
      return lo > hi ? null : { lo, hi };
    });
  }

  level(count: number) {
    if (count === 0) return 0;
    const b = this.boundaries();
    return b.findIndex((hi, k) => k > 0 && count <= hi);
  }

  query(box: Box) {
    const x0 = Math.min(box.x0, box.x1);
    const x1 = Math.max(box.x0, box.x1) + 1;
    const y0 = Math.min(box.y0, box.y1);
    const y1 = Math.max(box.y0, box.y1) + 1;
    const w = COLS + 1;
    const sat = new Uint32Array(w * (ROWS + 1));
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        sat[(y + 1) * w + x + 1] = this.bins[y * COLS + x] + sat[y * w + x + 1] + sat[(y + 1) * w + x] - sat[y * w + x];
      }
    }
    return sat[y1 * w + x1] - sat[y0 * w + x1] - sat[y1 * w + x0] + sat[y0 * w + x0];
  }
}

export function seeded() {
  const h = new Histogram();
  let state = 7;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());
  const clusters: [number, number, number, number][] = [
    [8, 5, 2.4, 520],
    [22, 11, 3.2, 700],
    [14, 14, 1.6, 260],
    [27, 4, 1.4, 180],
  ];
  for (const [mx, my, sd, n] of clusters) {
    for (let i = 0; i < n; i++) h.add(mx + gauss() * sd, my + gauss() * sd * 0.8);
  }
  return h;
}

export function normalize(box: Box): Box {
  return {
    x0: Math.min(box.x0, box.x1),
    x1: Math.max(box.x0, box.x1),
    y0: Math.min(box.y0, box.y1),
    y1: Math.max(box.y0, box.y1),
  };
}
