export const LEVELS = 6;

export class Histogram {
  readonly bins: Uint32Array;
  total = 0;
  max = 1;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.bins = new Uint32Array(cols * rows);
  }

  add(x: number, y: number, weight = 1) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return false;
    const i = cy * this.cols + cx;
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
}

export function seeded(cols: number, rows: number) {
  const h = new Histogram(cols, rows);
  let state = 7;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());
  const density = (cols * rows) / 576;
  const clusters: [number, number, number, number][] = [
    [0.25, 0.28, 0.075, 520],
    [0.69, 0.61, 0.1, 700],
    [0.44, 0.78, 0.05, 260],
    [0.84, 0.22, 0.044, 180],
  ];
  for (const [mx, my, sd, n] of clusters) {
    for (let i = 0; i < n * density; i++) h.add(mx * cols + gauss() * sd * cols, my * rows + gauss() * sd * cols * 0.8);
  }
  return h;
}
