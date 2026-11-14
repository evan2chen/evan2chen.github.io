export function startAgents({ root, glyphs: F, animate, still }) {
  const wires = root.querySelector('.wires');
  const defs = root.querySelector('defs');
  const crowd = root.querySelector('.crowd');
  const bay = document.querySelector('.eye .bay');
  const countEl = document.querySelector('.eye .count b');
  const logEl = document.querySelector('.eye .log');
  const html = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  const CANCEL = Symbol('cancel');
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];

  let gen = 0;
  let pace = 1;
  let shipped = 0;
  const pointer = { x: 0, y: 0, inside: false };
  const CLICKABLE = '.links a, .top nav a, .who, .theme';
  const NEAR = 80;

  function nearestClickable() {
    let best = null;
    let bestD = NEAR;
    for (const el of qa(CLICKABLE)) {
      const r = rel(el);
      const dx = Math.max(r.x - pointer.x, 0, pointer.x - (r.x + r.w));
      const dy = Math.max(r.y - pointer.y, 0, pointer.y - (r.y + r.h));
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = el;
      }
    }
    return best;
  }

  const ease = {
    linear: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function alive(g) {
    if (g !== gen) throw CANCEL;
  }

  function tween(ms, fn, ez = ease.inOut) {
    const g = gen;
    const d = Math.max(16, ms);
    return new Promise((res, rej) => {
      const t0 = performance.now();
      const frame = () => {
        if (g !== gen) return rej(CANCEL);
        const t = Math.min(1, (performance.now() - t0) / d);
        fn(ez(t));
        if (t < 1) requestAnimationFrame(frame);
        else res();
      };
      requestAnimationFrame(frame);
    });
  }

  function sleep(ms) {
    const g = gen;
    return new Promise((res, rej) => setTimeout(() => (g === gen ? res() : rej(CANCEL)), ms));
  }

  function rel(el) {
    const s = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  function lineBoxes(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const er = el.getBoundingClientRect();
    const lines = [];
    for (const r of range.getClientRects()) {
      if (r.width < 1) continue;
      const top = r.top - er.top;
      const line = lines.find((l) => Math.abs(l.top - top) < 4);
      if (line) {
        line.left = Math.min(line.left, r.left - er.left);
        line.right = Math.max(line.right, r.right - er.left);
        line.bottom = Math.max(line.bottom, r.bottom - er.top);
      } else {
        lines.push({ top, bottom: r.bottom - er.top, left: r.left - er.left, right: r.right - er.left });
      }
    }
    return lines.sort((a, b) => a.top - b.top);
  }

  const AGENTS = [
    ['grid', 'builder'],
    ['type', 'leaver'],
    ['copy', 'leaver'],
    ['media', 'builder'],
    ['a11y', 'escort'],
    ['links', 'leaver'],
    ['qa', 'maintainer'],
    ['ship', 'builder'],
    ['ux', 'escort'],
    ['perf', 'leaver'],
  ];

  class Agent {
    constructor([name, role], i) {
      this.name = name;
      this.color = 'var(--acc)';
      this.role = role;
      this.i = i;
      this.x = -40;
      this.y = -40;
      this.el = document.createElement('div');
      this.el.className = 'agent';
      this.el.innerHTML = '<svg viewBox="0 0 20 20"><path d="M3 3 L17.5 9 L9 17.5 Z" fill="#fff" stroke="#fff" stroke-width="5.5" stroke-linejoin="round"/><path d="M3 3 L17.5 9 L9 17.5 Z" style="fill:var(--acc);stroke:var(--acc)" stroke-width="2.6" stroke-linejoin="round"/></svg>';
      crowd.appendChild(this.el);
      const p = document.createElementNS(NS, 'pattern');
      p.setAttribute('id', `hatch-${i}`);
      p.setAttribute('width', '7');
      p.setAttribute('height', '7');
      p.setAttribute('patternUnits', 'userSpaceOnUse');
      p.setAttribute('patternTransform', 'rotate(45)');
      p.innerHTML = '<rect width="7" height="7" style="fill:var(--acc)" fill-opacity="0.07"/><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--acc)" stroke-opacity="0.5" stroke-width="1.2"/>';
      defs.appendChild(p);
    }

    set(x, y) {
      this.x = x;
      this.y = y;
      this.el.style.transform = `translate3d(${x - 2}px, ${y - 2}px, 0)`;
    }

    down() {
      this.el.classList.add('down');
    }

    up() {
      this.el.classList.remove('down');
    }

    async click() {
      this.down();
      await sleep(70);
      this.up();
    }

    async move(x, y, ms, opts = {}) {
      const x0 = this.x;
      const y0 = this.y;
      const dx = x - x0;
      const dy = y - y0;
      const d = Math.hypot(dx, dy);
      const dur = ms ?? Math.min(620, 150 + d * 0.42) * pace;
      const bend = opts.straight ? 0 : rand(-0.3, 0.3) * d;
      const nx = d ? -dy / d : 0;
      const ny = d ? dx / d : 0;
      const cx = x0 + dx / 2 + nx * bend;
      const cy = y0 + dy / 2 + ny * bend;
      await tween(
        dur,
        (p) => {
          const k = 1 - p;
          this.set(k * k * x0 + 2 * k * p * cx + p * p * x, k * k * y0 + 2 * k * p * cy + p * p * y);
          if (opts.step) opts.step(p);
        },
        opts.ease || ease.inOut,
      );
    }
  }

  const agents = AGENTS.map((a, i) => new Agent(a, i));
  const A = Object.fromEntries(agents.map((a) => [a.name, a]));
  const HELPERS = ['sk1', 'sk2', 'sk3'].map((name, i) => new Agent([name, 'helper'], agents.length + i));

  function svgRect(r, attrs) {
    const el = document.createElementNS(NS, 'rect');
    el.setAttribute('x', r.x);
    el.setAttribute('y', r.y);
    el.setAttribute('width', Math.max(0, r.w));
    el.setAttribute('height', Math.max(0, r.h));
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'fill' || k === 'stroke') el.style.setProperty(k, v);
      else el.setAttribute(k, v);
    }
    wires.appendChild(el);
    return el;
  }

  async function wire(agent, r, ms = 300) {
    await agent.move(r.x, r.y);
    agent.down();
    const rect = svgRect({ x: r.x, y: r.y, w: 0, h: 0 }, { fill: 'none', stroke: agent.color, 'stroke-width': 1.5, 'stroke-dasharray': '5 4', class: 'wire' });
    await agent.move(r.x + r.w, r.y + r.h, ms, {
      straight: true,
      ease: ease.out,
      step: () => {
        rect.setAttribute('width', Math.max(0, agent.x - r.x));
        rect.setAttribute('height', Math.max(0, agent.y - r.y));
      },
    });
    agent.up();
    return rect;
  }

  async function shade(agent, r, strokes = 4, ms = 90) {
    const fill = svgRect({ x: r.x, y: r.y, w: 0, h: r.h }, { fill: `url(#hatch-${agent.i})`, class: 'wire' });
    agent.down();
    await agent.move(r.x + 4, r.y + 4, 120);
    for (let s = 0; s < strokes; s++) {
      const tx = r.x + (r.w * (s + 1)) / strokes;
      const ty = s % 2 ? r.y + 4 : r.y + r.h - 4;
      await agent.move(tx, ty, ms, {
        straight: true,
        ease: ease.linear,
        step: () => fill.setAttribute('width', Math.max(+fill.getAttribute('width'), agent.x - r.x)),
      });
    }
    fill.setAttribute('width', r.w);
    agent.up();
    return fill;
  }

  async function typeReveal(agent, el, msPerPx = 0.4) {
    const r = rel(el);
    const lines = lineBoxes(el);
    if (!lines.length) return;
    const W = r.w;
    const pad = 30;
    const clip = (i, cx) => {
      const top = i === 0 ? -pad : lines[i].top;
      const bottom = i < lines.length - 1 ? lines[i + 1].top : r.h + pad;
      el.style.clipPath = `polygon(${-pad}px ${-pad}px, ${W + pad}px ${-pad}px, ${W + pad}px ${top}px, ${cx}px ${top}px, ${cx}px ${bottom}px, ${-pad}px ${bottom}px)`;
    };
    clip(0, lines[0].left);
    el.classList.add('in');
    const mid = (l) => r.y + (l.top + l.bottom) / 2 + 4;
    await agent.move(r.x + lines[0].left, mid(lines[0]));
    agent.down();
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (i > 0) {
        clip(i, L.left);
        await agent.move(r.x + L.left, mid(L), 70, { straight: true });
      }
      await agent.move(r.x + L.right, mid(L), Math.max(60, (L.right - L.left) * msPerPx), {
        straight: true,
        ease: ease.linear,
        step: () => clip(i, agent.x - r.x),
      });
    }
    agent.up();
    el.style.clipPath = '';
  }

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    parent.appendChild(el);
    return el;
  }

  function nameLayout(el) {
    const s = root.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(el).fontSize);
    const text = el.firstChild;
    const range = document.createRange();
    const letters = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text.data[i];
      if (!F.glyphs[ch]) continue;
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const r = range.getBoundingClientRect();
      letters.push({ ch, i, g: F.glyphs[ch], x: r.left - s.left, top: r.top - s.top });
    }
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(probe);
    const drop = probe.getBoundingClientRect().top - s.top - letters[letters.length - 1].top;
    probe.remove();
    const lines = [];
    for (const l of letters) {
      l.base = l.top + drop;
      let line = lines.find((n) => Math.abs(n.base - l.base) < 2);
      if (!line) lines.push((line = { base: l.base, letters: [] }));
      l.n = l.i - (line.letters[0]?.i ?? l.i);
      line.letters.push(l);
    }
    return { size, k: size / F.upm, lines, letters };
  }

  function interior(p) {
    const b = p.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const inside = (x, y) => p.isPointInFill(new DOMPoint(x, y));
    const m = 70;
    let best = { x: cx, y: cy };
    let bd = Infinity;
    for (let i = 1; i < 18; i++) {
      for (let j = 1; j < 18; j++) {
        const x = b.x + (b.width * i) / 18;
        const y = b.y + (b.height * j) / 18;
        if (!inside(x, y) || !inside(x + m, y) || !inside(x - m, y) || !inside(x, y + m) || !inside(x, y - m)) continue;
        const d = Math.hypot(x - cx, (y - cy) * 1.6);
        if (d < bd) {
          bd = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  function layer(a, attrs = {}) {
    const g = svgEl('g', { class: 'wire', ...attrs }, wires);
    g.style.setProperty('--c', a.color);
    return g;
  }

  async function nameGuides(a, lines, size, k, T) {
    const g = layer(a);
    for (const line of lines) {
      const first = line.letters[0];
      const last = line.letters[line.letters.length - 1];
      const x0 = first.x - size * 0.12;
      const x1 = last.x + last.n * T + last.g.adv * k + size * 0.12;
      const marks = [['cap height', F.cap], ['x-height', F.x], ['baseline', 0]];
      for (let m = 0; m < marks.length; m++) {
        const [label, h] = marks[m];
        const y = line.base - h * k;
        const [from, to] = m % 2 ? [x1, x0] : [x0, x1];
        await a.move(from, y, m ? 90 : undefined);
        a.down();
        const ln = svgEl('line', { x1: from, y1: y, x2: from, y2: y, class: 'guide' }, g);
        await a.move(to, y, 240, { straight: true, ease: ease.out, step: () => ln.setAttribute('x2', a.x) });
        a.up();
        const room = root.getBoundingClientRect().width - x1 > 80;
        svgEl('text', room ? { x: x1 + 8, y: y + 3.5, class: 'spec' } : { x: x1, y: y - 4, class: 'spec', 'text-anchor': 'end' }, g).textContent = label;
      }
    }
    return g;
  }

  function nameBoxes(a, letters, size, k, T) {
    const g = layer(a);
    const boxes = letters.map((l) => ({ l, loose: l.x + l.n * T, w: l.g.adv * k, top: l.base - F.cap * k, h: F.cap * k, drawn: false, claimed: false }));
    const tail = boxes[boxes.length - 1];

    async function draw() {
      for (const b of boxes) {
        await a.move(b.loose, b.top, b === boxes[0] ? undefined : 35);
        a.down();
        b.r = svgEl('rect', { x: b.loose, y: b.top, width: 0, height: 0, class: 'box' }, g);
        await a.move(b.loose + b.w, b.top + b.h, 45, {
          straight: true,
          ease: ease.out,
          step: () => {
            b.r.setAttribute('width', Math.max(0, a.x - b.loose));
            b.r.setAttribute('height', Math.max(0, a.y - b.top));
          },
        });
        a.up();
        b.drawn = true;
      }
    }

    async function pull(onStep) {
      const readout = svgEl('text', { x: tail.loose + tail.w, y: tail.top - 10, class: 'spec', 'text-anchor': 'end' }, g);
      readout.textContent = 'tracking +25';
      await a.move(tail.loose + tail.w, tail.top + tail.h, 90);
      a.down();
      await a.move(tail.l.x + tail.w, tail.top + tail.h, 360, {
        straight: true,
        step: (p) => {
          for (const b of boxes) b.r.setAttribute('x', b.loose + (b.l.x - b.loose) * p);
          readout.setAttribute('x', a.x);
          const v = Math.round(25 - 80 * p);
          readout.textContent = `tracking ${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
          onStep(p);
        },
      });
      a.up();
    }

    return { g, boxes, tail, draw, pull };
  }

  function nameInk(letters, k) {
    const at = (l, pt) => [l.x + l.off + pt.x * k, l.base - pt.y * k];
    const place = (l) => `translate(${l.x + l.off} ${l.base}) scale(${k} ${-k})`;
    const inkG = svgEl('g', { class: 'wire' }, wires);
    const layers = [inkG];
    const floods = [];
    const jobs = new Map();
    const pens = new Map();
    const penLayers = new Map();
    for (const l of letters) {
      const gg = svgEl('g', { transform: `translate(${l.x} ${l.base}) scale(${k} ${-k})` }, inkG);
      const id = `flood-${gen}-${l.i}`;
      const disc = svgEl('circle', { r: 0 }, svgEl('clipPath', { id }, gg));
      const p = svgEl('path', { d: l.g.contours.join(''), class: 'ink', 'clip-path': `url(#${id})` }, gg);
      const c = interior(p);
      const b = p.getBBox();
      const R = Math.max(...[[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
      disc.setAttribute('cx', c.x);
      disc.setAttribute('cy', c.y);
      jobs.set(l, { traced: false, claimed: false, c, R, disc });
    }

    const penLayer = (a) => {
      if (!penLayers.has(a)) {
        const g = layer(a);
        wires.insertBefore(g, inkG);
        layers.push(g);
        penLayers.set(a, svgEl('g', { filter: 'url(#pencil)' }, g));
      }
      return penLayers.get(a);
    };

    async function trace(a, l, msPerUnit) {
      const gg = svgEl('g', { transform: place(l) }, penLayer(a));
      pens.set(l, gg);
      const strokes = l.g.contours.map((d) => {
        const p = svgEl('path', { d, class: 'pen', 'stroke-width': 1.7 / k }, gg);
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len} ${len}`;
        p.style.strokeDashoffset = len;
        return { p, len };
      });
      for (const st of strokes) {
        await a.move(...at(l, st.p.getPointAtLength(0)), st === strokes[0] ? 110 : 45);
        a.down();
        await tween(Math.max(35, st.len * msPerUnit), (t) => {
          const d = st.len * t;
          st.p.style.strokeDashoffset = st.len - d;
          a.set(...at(l, st.p.getPointAtLength(d)));
        }, ease.linear);
        a.up();
      }
      jobs.get(l).traced = true;
    }

    function slide(p) {
      for (const l of letters) {
        l.off = l.loose * (1 - p);
        pens.get(l)?.setAttribute('transform', place(l));
      }
    }

    const traced = (l) => jobs.get(l).traced;

    async function fill(a) {
      for (;;) {
        const open = letters.filter((l) => jobs.get(l).traced && !jobs.get(l).claimed);
        if (open.length) {
          const dist = (l) => Math.hypot(at(l, jobs.get(l).c)[0] - a.x, at(l, jobs.get(l).c)[1] - a.y);
          const l = open.reduce((best, n) => (dist(n) < dist(best) ? n : best));
          const j = jobs.get(l);
          j.claimed = true;
          await a.move(...at(l, j.c), 90);
          await a.click();
          const f = tween(300, (t) => j.disc.setAttribute('r', j.R * t), ease.out);
          f.catch(() => {});
          floods.push(f);
          continue;
        }
        const pending = letters.find((l) => !jobs.get(l).traced);
        if (!pending) return;
        const top = pending.base - F.cap * k;
        await a.move(pending.x + rand(0.2, 0.8) * pending.g.adv * k, top + rand(0.35, 0.9) * F.cap * k, 220);
      }
    }

    return { trace, slide, traced, fill, floods, layers };
  }

  async function nameOutline(crew, el, rest, helpers) {
    const { size, k, lines, letters } = nameLayout(el);
    const T = size * 0.08;
    for (const l of letters) {
      l.loose = l.n * T;
      l.off = l.loose;
    }
    const ink = nameInk(letters, k);
    const [guider, boxer] = crew;
    const frame = nameBoxes(boxer, letters, size, k, T);
    const lengths = letters.map((l) => {
      const p = svgEl('path', { d: l.g.contours.join('') }, wires);
      const len = p.getTotalLength();
      p.remove();
      return len;
    });
    const rate = 200 / (lengths.reduce((x, y) => x + y, 0) / lengths.length);

    const sketch = async (a) => {
      for (;;) {
        const next = frame.boxes.find((b) => b.drawn && !b.claimed);
        if (next) {
          next.claimed = true;
          await ink.trace(a, next.l, rate);
          continue;
        }
        const waiting = frame.boxes.find((b) => !b.claimed);
        if (!waiting) return;
        await a.move(waiting.loose + rand(0.2, 0.8) * waiting.w, waiting.top + rand(0.3, 0.8) * waiting.h, 150);
      }
    };

    const guides = (async () => {
      const g = await nameGuides(guider, lines, size, k, T);
      await sketch(guider);
      rest(guider);
      return g;
    })();
    const crewIn = helpers.map(async (h, i) => {
      await sleep(i * 80);
      await sketch(h);
      leave(h).catch(() => {});
    });
    const boxes = (async () => {
      await frame.draw();
      const t = frame.tail;
      while (!letters.every(ink.traced)) await boxer.move(t.loose + t.w + rand(4, 26), t.top + t.h * rand(0.5, 1.1), 150);
      await frame.pull(ink.slide);
      rest(boxer);
    })();
    const [guideG] = await Promise.all([guides, boxes, ...crewIn]);
    return { crew, el, ink, scaffolds: [guideG, frame.g] };
  }

  async function nameFill(job, ready) {
    const fills = job.crew.map(async (a) => {
      await ready(a);
      await job.ink.fill(a);
    });
    const exits = fills.map(async (f, ci) => {
      await f;
      await leave(job.crew[ci]);
    });
    const settle = (async () => {
      await Promise.all(fills);
      await Promise.all(job.ink.floods);
      job.el.classList.add('in');
      await sleep(60);
      for (const g of [...job.scaffolds, ...job.ink.layers]) g.classList.add('fade');
    })();
    await Promise.all([...exits, settle]);
  }

  function statementWords(el) {
    const s = root.getBoundingClientRect();
    const k = parseFloat(getComputedStyle(el).fontSize) / F.upm;
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const words = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (const m of n.data.matchAll(/\S+/g)) {
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        words.push(...[...range.getClientRects()].filter((r) => r.width));
      }
    }
    if (!words.length) return [];
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.prepend(probe);
    const drop = probe.getBoundingClientRect().top - words[0].top;
    probe.remove();
    const lines = [];
    for (const r of words) {
      const base = r.top - s.top + drop;
      let line = lines.find((n) => Math.abs(n.base - base) < 2);
      if (!line) lines.push((line = { base, cap: base - F.cap * k, words: [] }));
      line.words.push({ x0: r.left - s.left, x1: r.right - s.left });
    }
    return lines.sort((a, b) => a.base - b.base);
  }

  function typedLines(el) {
    const er = el.getBoundingClientRect();
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (let i = 0; i < n.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        const top = r.top - er.top;
        let line = lines.find((l) => Math.abs(l.top - top) < 4);
        if (!line) lines.push((line = { top, bottom: r.bottom - er.top, left: r.left - er.left, stops: [] }));
        line.stops.push(r.right - er.left);
      }
    }
    lines.sort((a, b) => a.top - b.top);
    const pad = 24;
    lines.forEach((l, i) => {
      l.y0 = i ? (lines[i - 1].bottom + l.top) / 2 : -pad;
      l.y1 = i < lines.length - 1 ? (l.bottom + lines[i + 1].top) / 2 : er.height + pad;
    });
    return lines;
  }

  async function typeLines(a, el, msPerChar = 26) {
    const lines = typedLines(el);
    const r = rel(el);
    const pad = 24;
    const g = layer(a);
    const carets = lines.map((l) => svgEl('line', { x1: r.x + l.left, y1: r.y + l.top, x2: r.x + l.left, y2: r.y + l.bottom, class: 'tick' }, g));
    const longest = Math.max(...lines.map((l) => l.stops.length));
    const lead = lines.reduce((best, l) => (l.stops.length > best.stops.length ? l : best));
    const edge = (l, n) => (n ? l.stops[Math.min(n, l.stops.length) - 1] : l.left);
    const show = (n) => {
      const pts = [[-pad, lines[0].y0]];
      for (const l of lines) pts.push([edge(l, n), l.y0], [edge(l, n), l.y1]);
      pts.push([-pad, lines[lines.length - 1].y1]);
      el.style.clipPath = `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;
      lines.forEach((l, i) => {
        const x = r.x + edge(l, n) + 1;
        carets[i].setAttribute('x1', x);
        carets[i].setAttribute('x2', x);
      });
    };
    show(0);
    el.classList.add('in');
    await a.move(r.x + lead.left, r.y + lead.bottom + 4, 160);
    a.down();
    await tween(longest * msPerChar, (t) => {
      const n = Math.round(t * longest);
      show(n);
      a.set(r.x + edge(lead, n), r.y + lead.bottom + 4);
    }, ease.linear);
    a.up();
    el.style.clipPath = '';
    return g;
  }

  async function statementOutline(crew, el, rest) {
    const lines = statementWords(el);
    if (!lines.length) {
      crew.forEach(rest);
      return { el, rules: layer(crew[0]), ticks: layer(crew[1]) };
    }
    const r = rel(el);
    const x0 = r.x - 8;
    const x1 = r.x + r.w + 8;
    const [ruler, marker] = crew;
    const rules = layer(ruler);
    const ticks = layer(marker);
    const sweep = 560;
    let started;
    const ruling = new Promise((res) => (started = res));

    const stagger = lines.length > 1 ? Math.min(70, 420 / (lines.length - 1)) : 0;
    const span = sweep + stagger * (lines.length - 1);
    const reach = (i, elapsed) => x0 + (x1 - x0) * Math.min(1, Math.max(0, (elapsed - i * stagger) / sweep));
    const front = (elapsed, yOf) => {
      const kf = stagger ? Math.min(lines.length - 1, elapsed / stagger) : lines.length - 1;
      const k = Math.floor(kf);
      const k2 = Math.min(lines.length - 1, k + 1);
      return [reach(k, elapsed), yOf(lines[k]) + (yOf(lines[k2]) - yOf(lines[k])) * (kf - k)];
    };

    const sweepRules = async () => {
      const bars = lines.map((l) => [l.cap, l.base].map((y) => svgEl('line', { x1: x0, y1: y, x2: x0, y2: y, class: 'guide' }, rules)));
      await ruler.move(x0, lines[0].cap, 280);
      ruler.down();
      started();
      await tween(span, (t) => {
        const e = t * span;
        bars.forEach((pair, i) => pair.forEach((b) => b.setAttribute('x2', reach(i, e))));
        ruler.set(...front(e, (l) => l.cap));
      }, ease.linear);
      ruler.up();
      rest(ruler);
    };

    const sweepMargins = async () => {
      const marks = lines.map((l) => l.words.flatMap((w) => [w.x0, w.x1]));
      const shown = lines.map(() => 0);
      const mid = (l) => (l.cap + l.base) / 2;
      const tick = (x, line) => {
        const m = mid(line);
        const ln = svgEl('line', { x1: x, y1: m, x2: x, y2: m, class: 'tick' }, ticks);
        tween(110, (t) => {
          ln.setAttribute('y1', m + (line.cap - 3 - m) * t);
          ln.setAttribute('y2', m + (line.base + 3 - m) * t);
        }, ease.out).catch(() => {});
      };
      await marker.move(x0, mid(lines[0]), 280);
      await ruling;
      await sleep(180);
      marker.down();
      await tween(span, (t) => {
        const e = t * span;
        lines.forEach((l, i) => {
          const x = reach(i, e);
          while (shown[i] < marks[i].length && marks[i][shown[i]] <= x) tick(marks[i][shown[i]++], l);
        });
        marker.set(...front(e, mid));
      }, ease.linear);
      lines.forEach((l, i) => {
        while (shown[i] < marks[i].length) tick(marks[i][shown[i]++], l);
      });
      marker.up();
      rest(marker);
    };

    await Promise.all([sweepRules(), sweepMargins()]);
    return { el, rules, ticks };
  }

  async function statementFill(a, job) {
    if (!typedLines(job.el).length) {
      job.el.classList.add('in');
      return;
    }
    const carets = await typeLines(a, job.el);
    await sleep(60);
    for (const g of [job.rules, job.ticks, carets]) g.classList.add('fade');
    leave(a).catch(() => {});
  }

  async function popIn(agent, el) {
    const r = rel(el);
    await agent.move(r.x + r.w / 2, r.y + r.h / 2);
    await agent.click();
    el.classList.add('in', 'pop');
  }

  async function drag(agent, el, dx, dy, ms = 340, s0 = 1) {
    const r = rel(el);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    await agent.move(cx + dx, cy + dy);
    agent.down();
    await tween(ms, (p) => {
      const k = 1 - p;
      const s = s0 + (1 - s0) * p;
      el.style.transform = `translate(${dx * k}px, ${dy * k}px) scale(${s})`;
      agent.set(cx + dx * k, cy + dy * k);
    });
    el.style.transform = '';
    agent.up();
  }

  function spawnAt(el, dx, dy, s = 1) {
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    el.classList.add('in', 'pop');
  }

  function ring(agent, el, ms = 1100) {
    const r = rel(el);
    const d = document.createElement('div');
    d.className = 'ring';
    d.style.setProperty('--c', agent.color);
    Object.assign(d.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    crowd.appendChild(d);
    setTimeout(() => (d.style.opacity = '0'), ms * 0.7);
    setTimeout(() => d.remove(), ms + 600);
  }

  function reset() {
    gen++;
    shipped = 0;
    wires.textContent = '';
    crowd.querySelectorAll('.ring').forEach((n) => n.remove());
    bay.textContent = '';
    logEl.textContent = '';
    countEl.textContent = '000';
    qa('[data-hide]').forEach((el) => {
      el.classList.remove('in', 'pop');
      el.style.transform = '';
      el.style.clipPath = '';
    });
    const media = q('.photo > *');
    if (media) media.style.clipPath = '';
    pace = 1;
    [...agents, ...HELPERS].forEach((a) => {
      a.idling = null;
      a.up();
      a.el.style.opacity = '1';
    });
  }

  function view() {
    const s = root.getBoundingClientRect();
    return { x: -s.left, y: -s.top, w: innerWidth, h: innerHeight };
  }

  function offscreen(a) {
    const v = view();
    const side = a.i % 4;
    const x = side === 0 ? v.x - 30 : side === 1 ? v.x + v.w + 30 : v.x + rand(0, v.w);
    const y = side === 2 ? v.y - 30 : side === 3 ? v.y + v.h + 30 : v.y + rand(0, v.h);
    a.set(x, y);
  }

  async function idle(a, gate) {
    let open = false;
    gate.then(() => (open = true));
    const hx = a.x;
    const hy = a.y;
    while (!open) await a.move(hx + rand(-30, 30), hy + rand(-20, 20), rand(170, 240), { straight: true });
  }

  async function build() {
    html.dataset.build = 'outline';
    [...agents, ...HELPERS].forEach(offscreen);
    const done = {};
    const signal = {};
    const wait = (k) => (done[k] ??= new Promise((r) => (signal[k] = r)));
    const finish = (k) => (wait(k), signal[k]());
    const eye = q('.eye');
    const bayR = () => rel(bay);

    const slotsIn = async (b) => {
      const bay = bayR();
      for (let i = 0; i < 3; i++) await wire(b, { x: bay.x + bay.w * (0.05 + i * 0.32), y: bay.y + bay.h * 0.08, w: bay.w * 0.26, h: bay.h * 0.22 }, 110);
    };
    let openGate;
    const gate = new Promise((res) => (openGate = res));
    const rest = (a) => {
      if (a.idling) return;
      a.idling = idle(a, gate);
      a.idling.catch(() => {});
    };
    const ready = (a) => a.idling ?? Promise.resolve();
    let nameJob;
    let photoHatch;
    let copyJob;

    const plan = {
      grid: {
        async outline(a) {
          await wire(a, rel(q('.top')), 240);
          const er = rel(eye);
          await wire(a, er, 280);
          const cols = 8;
          const cw = er.w / cols;
          await a.move(er.x, er.y + er.h * 0.5, 100);
          a.down();
          for (let c = 0; c < cols; c++) {
            svgRect({ x: er.x + c * cw + 4, y: er.y, w: cw - 8, h: er.h }, { fill: a.color, 'fill-opacity': 0.06, class: 'wire' });
            await a.move(er.x + (c + 1) * cw, er.y + er.h * (c % 2 ? 0.35 : 0.65), 38, { straight: true, ease: ease.linear });
          }
          a.up();
        },
        async fill(a) {
          await wait('links');
          await popIn(a, q('.dock'));
        },
      },
      ux: {
        async outline(a) {
          for (const el of [q('.who'), ...qa('.top nav a'), q('.theme')]) await wire(a, rel(el), 90);
        },
        async fill(a) {
          for (const el of [q('.theme'), ...qa('.top nav a').reverse(), q('.who')]) {
            const r = rel(el);
            await a.move(r.x + r.w / 2, r.y + r.h / 2, 130);
            await a.click();
            el.classList.add('in', 'pop');
          }
        },
      },
      type: {
        async outline(a) {
          nameJob = await nameOutline([a, A.perf], q('.name'), rest, HELPERS);
        },
        async fill() {
          await nameFill(nameJob, ready);
        },
      },
      perf: {
        driven: true,
        async fill(a) {
          await wait('type');
          ring(a, q('.name'), 700);
        },
      },
      copy: {
        async outline(a) {
          copyJob = await statementOutline([a, A.ship], q('.statement'), rest);
        },
        async fill(a) {
          await statementFill(a, copyJob);
        },
      },
      ship: {
        driven: true,
      },
      media: {
        async outline(a) {
          const r = rel(q('.photo'));
          await wire(a, r, 200);
          photoHatch = await shade(a, r, 4, 60);
          await wire(a, rel(q('.dock')), 200);
        },
        async fill(a) {
          const fig = q('.photo');
          const img = fig.firstElementChild;
          const r = rel(fig);
          img.style.clipPath = 'inset(0 0 100% 0)';
          fig.classList.add('in');
          await a.move(r.x + 2, r.y + 2);
          a.down();
          await a.move(r.x + r.w - 2, r.y + r.h, 520, {
            straight: true,
            ease: ease.inOut,
            step: () => {
              const shown = Math.min(r.h, Math.max(0, a.y - r.y));
              img.style.clipPath = `inset(0 0 ${100 - (shown / r.h) * 100}% 0)`;
              photoHatch.setAttribute('y', r.y + shown);
              photoHatch.setAttribute('height', r.h - shown);
            },
          });
          a.up();
          img.style.clipPath = '';
          photoHatch.remove();
        },
      },
      a11y: {
        async outline(a) {
          await wire(a, rel(q('.facts')), 200);
          await wire(a, rel(q('.facts dt')), 90);
          await wire(a, rel(q('.facts dd')), 140);
        },
        async fill(a) {
          await popIn(a, q('.facts dt'));
          await typeReveal(a, q('.facts dd'), 0.3);
          await wait('media');
          ring(a, q('.photo'), 700);
        },
      },
      links: {
        async outline(a) {
          await wire(a, rel(q('.links')), 200);
          for (const el of qa('.links a')) await wire(a, rel(el), 90);
        },
        async fill(a) {
          const ls = qa('.links a');
          const rs = ls.map(rel);
          const off = -(Math.max(...rs.map((r) => r.x + r.w)) + 40);
          const lag = 0.12;
          const at = (i, p) => ease.out(Math.min(1, Math.max(0, (p * (1 + lag * (ls.length - 1)) - i * lag))));
          ls.forEach((el) => {
            el.style.transform = `translateX(${off}px)`;
            el.classList.add('in');
          });
          const lead = rs[0];
          const grip = (p) => [lead.x + lead.w * 0.15 + off * (1 - at(0, p)), lead.y + lead.h / 2];
          await a.move(...grip(0), 200);
          a.down();
          await tween(560, (p) => {
            ls.forEach((el, i) => (el.style.transform = `translateX(${off * (1 - at(i, p))}px)`));
            a.set(...grip(p));
          }, ease.linear);
          ls.forEach((el) => (el.style.transform = ''));
          a.up();
        },
      },
      qa: {
        async outline(a) {
          await slotsIn(a);
        },
        async fill(a) {
          await wait('links');
          for (const el of qa('.links a')) {
            const r = rel(el);
            await a.move(r.x + r.w - 10, r.y + r.h / 2, 100);
            await a.click();
            ring(a, el, 600);
          }
        },
      },
    };

    pace = 0.6;
    await Promise.all(agents.map(async (a) => {
      const step = plan[a.name];
      if (step.driven) return;
      if (step.outline) await step.outline(a);
      rest(a);
    }));
    pace = 1;
    html.dataset.build = 'fill';
    openGate();
    const runs = agents.map(async (a) => {
      await ready(a);
      if (plan[a.name].fill) await plan[a.name].fill(a);
      finish(a.name);
    });
    await Promise.all(runs);
    await sleep(200);
    qa('[data-hide]').forEach((el) => el.classList.add('in'));
    for (const w of wires.querySelectorAll('.wire')) w.classList.add('fade');
    setTimeout(() => (wires.textContent = ''), 800);
  }

  function finalize() {
    qa('[data-hide]').forEach((el) => {
      el.classList.add('in');
      el.style.transform = '';
      el.style.clipPath = '';
    });
    const media = q('.photo > *');
    if (media) media.style.clipPath = '';
    delete html.dataset.build;
  }

  function escorts() {
    const g = gen;
    const list = agents.filter((a) => a.role === 'escort');
    let last = performance.now();
    let phase = 0;
    let focus = null;
    const tick = (now) => {
      if (g !== gen) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phase += dt;
      const near = pointer.inside ? nearestClickable() : null;
      focus = near;
      const fr = focus ? rel(focus) : null;
      const onEl = fr && pointer.x >= fr.x && pointer.x <= fr.x + fr.w && pointer.y >= fr.y && pointer.y <= fr.y + fr.h;
      list.forEach((a, k) => {
        let tx;
        let ty;
        let stiff = 7 - k * 2;
        if (onEl) {
          const ang = phase * 3 + k * Math.PI;
          tx = pointer.x + Math.cos(ang) * 20;
          ty = pointer.y + Math.sin(ang) * 14 + 6;
          stiff = 16 - k * 3;
        } else if (fr) {
          const ang = phase * 1.4 + k * Math.PI;
          tx = fr.x + fr.w / 2 + Math.cos(ang) * (fr.w / 2 + 16);
          ty = fr.y + fr.h / 2 + Math.sin(ang) * (fr.h / 2 + 14);
          stiff = 3.5 - k;
        } else if (pointer.inside) {
          const ang = phase * 1.4 + k * Math.PI;
          const rad = 46 + Math.sin(phase * 2 + k) * 8;
          tx = pointer.x + Math.cos(ang) * rad;
          ty = pointer.y + Math.sin(ang) * rad * 0.7 + 10;
        } else {
          const r = rel(q('.name'));
          tx = r.x + r.w * (0.3 + 0.4 * k) + Math.cos(phase + k * 2) * 30;
          ty = r.y + r.h + 16 + Math.sin(phase * 1.3 + k) * 10;
        }
        const kk = 1 - Math.exp(-dt * stiff);
        a.set(a.x + (tx - a.x) * kk, a.y + (ty - a.y) * kk);
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const FLOAT = { ax: 14, ay: 9 };

  const QA_SPOTS = [
    { id: 1, label: 'Beside name', at: () => {
      const n = rel(q('.name'));
      const room = root.getBoundingClientRect().width - (n.x + n.w);
      return [n.x + n.w + Math.min(70, room / 3), n.y + n.h / 2];
    } },
    { id: 2, label: 'Header gap', at: () => {
      const who = rel(q('.who'));
      const nav = rel(q('.top nav'));
      return [(who.x + who.w + nav.x) / 2 - 10, who.y + who.h / 2 - 6];
    } },
    { id: 3, label: 'Left margin, description', at: () => {
      const r = rel(q('.statement'));
      return [r.x - Math.min(46, r.x / 2) - 10, r.y + r.h / 2];
    } },
    { id: 4, label: 'Gap, description to eye-catcher', at: () => {
      const r = rel(q('.statement'));
      const e = rel(q('.eye'));
      return [(r.x + r.w + e.x) / 2 - 10, r.y + r.h / 2];
    } },
    { id: 5, label: 'Above Study', at: () => {
      const f = rel(q('.facts'));
      const box = rel(q('.about'));
      return [f.x + f.w * 0.4, (box.y + f.y) / 2 - 6];
    } },
    { id: 6, label: 'Left margin, photo', at: () => {
      const r = rel(q('.photo'));
      return [r.x - Math.min(46, r.x / 2) - 10, r.y + r.h / 2];
    } },
    { id: 7, label: 'Below links', at: () => {
      const r = rel(q('.links'));
      return [r.x + r.w * 0.4, r.y + r.h + 34];
    } },
  ];

  function keepClear() {
    const s = root.getBoundingClientRect();
    const rects = [];
    const range = document.createRange();
    for (const el of qa('.statement, .facts dt, .facts dd')) {
      range.selectNodeContents(el);
      rects.push(...range.getClientRects());
    }
    for (const el of qa('.name, .photo, .links a, .who, .top nav a, .theme, .count, .log, .item')) rects.push(el.getBoundingClientRect());
    return rects.filter((r) => r.width && r.height).map((r) => ({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }));
  }

  function spotClear([x, y], clear) {
    const s = root.getBoundingClientRect();
    const box = { x: x - FLOAT.ax - 4, y: y - FLOAT.ay - 4, w: FLOAT.ax * 2 + 28, h: FLOAT.ay * 2 + 28 };
    if (box.x < 0 || box.y < 0 || box.x + box.w > s.width || box.y + box.h > s.height) return false;
    return !clear.some((r) => r.x < box.x + box.w && box.x < r.x + r.w && r.y < box.y + box.h && box.y < r.y + r.h);
  }

  async function maintain(a) {
    const g = gen;
    let last = null;
    try {
      while (true) {
        alive(g);
        const clear = keepClear();
        const open = QA_SPOTS.filter((sp) => sp.id !== last).map((sp) => [sp, sp.at()]).filter(([, at]) => spotClear(at, clear));
        if (!open.length) {
          await sleep(1200);
          continue;
        }
        const [sp, [hx, hy]] = pick(open);
        last = sp.id;
        await a.move(hx, hy, rand(1500, 2100), { ease: ease.sine });
        const hold = rand(2200, 3200);
        const ax = rand(FLOAT.ax * 0.6, FLOAT.ax);
        const ay = rand(FLOAT.ay * 0.6, FLOAT.ay);
        const wx = rand(0.9, 1.3);
        const wy = rand(1.2, 1.7);
        await tween(hold, (t) => {
          const sec = (t * hold) / 1000;
          const amp = Math.min(1, t * 4, (1 - t) * 4);
          a.set(hx + Math.sin(sec * wx * Math.PI) * ax * amp, hy + Math.sin(sec * wy * Math.PI) * ay * amp);
        }, ease.linear);
      }
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  }

  const slots = new Set();

  function slotRects() {
    const b = rel(bay);
    const cols = Math.max(2, Math.min(4, Math.floor(b.w / 230)));
    const rows = Math.max(1, Math.min(4, Math.floor(b.h / 190)));
    const out = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) out.push({ id: `${r}-${c}`, x: b.x + (c * b.w) / cols, y: b.y + (r * b.h) / rows, w: b.w / cols, h: b.h / rows });
    return out;
  }

  const part = (cls, style, html = '') => {
    const d = document.createElement('div');
    d.className = `part ${cls}`;
    Object.assign(d.style, style);
    d.innerHTML = html;
    return d;
  };

  const KINDS = {
    'bar-chart'(w, h) {
      const n = 6;
      const parts = [part('wide', { left: '8%', right: '8%', bottom: '14%', height: '1.5px', background: 'var(--ink)' })];
      for (let i = 0; i < n; i++)
        parts.push(part('grow', { left: `${10 + i * (80 / n)}%`, width: `${(80 / n) * 0.62}%`, bottom: '14%', height: `${rand(18, 70)}%`, background: i === 3 ? 'var(--acc)' : 'var(--ink)' }));
      return parts;
    },
    circuit(w, h) {
      const parts = [];
      const ys = [28, 52, 76];
      ys.forEach((y) => parts.push(part('wide', { left: '8%', right: '8%', top: `${y}%`, height: '1.5px', background: 'var(--ink)' })));
      const s = Math.min(22, h * 0.18);
      ['H', 'X', 'Z', 'H'].forEach((g, i) =>
        parts.push(part('gate', { left: `calc(${16 + i * 19}% - ${s / 2}px)`, top: `calc(${ys[(i * 2 + 1) % 3]}% - ${s / 2}px)`, width: `${s}px`, height: `${s}px`, borderColor: i === 2 ? 'var(--acc)' : '' }, g)),
      );
      return parts;
    },
    heatmap(w, h) {
      const cols = 8;
      const rows = 5;
      const ramp = ['var(--h1)', 'var(--h2)', 'var(--h3)', 'var(--h4)', 'var(--h5)', 'var(--h6)'];
      const parts = [];
      for (let c = 0; c < cols; c++) {
        let cells = '';
        for (let r = 0; r < rows; r++) {
          const v = Math.max(0, Math.min(5, Math.round(5 * Math.exp(-((c - 4.5) ** 2 + (r - 2) ** 2) / 6) + rand(-1, 1))));
          cells += `<div style="flex:1;background:${ramp[v]}"></div>`;
        }
        parts.push(part('grow', { left: `${8 + c * 10.5}%`, width: '10%', top: '10%', bottom: '10%', display: 'flex', flexDirection: 'column', gap: '2px' }, cells));
      }
      return parts;
    },
    button() {
      return [
        part('', { left: '14%', right: '14%', top: '34%', bottom: '34%', background: 'var(--ink)' }),
        part('', { left: '14%', right: '14%', top: '34%', bottom: '34%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', color: 'var(--bg)', fontSize: '13px', fontWeight: 600 }, '<span>Ship it</span><span>→</span>'),
      ];
    },
    toggle(w, h) {
      const th = Math.min(28, h * 0.26);
      const track = part('tg-track', { left: `calc(50% - ${th}px)`, top: `calc(50% - ${th / 2}px)`, width: `${th * 2}px`, height: `${th}px` });
      const knob = part('tg-knob', { left: `calc(50% - ${th}px + 3px)`, top: `calc(50% - ${th / 2}px + 3px)`, width: `${th - 6}px`, height: `${th - 6}px` });
      knob.onShow = () =>
        setTimeout(() => {
          knob.style.left = `calc(50% + 3px)`;
          track.classList.add('lit');
          knob.style.background = 'var(--on-acc)';
        }, 120);
      return [track, knob, part('lbl', { left: '0', right: '0', bottom: '12%', textAlign: 'center' }, 'dark mode')];
    },
    'code-block'() {
      const parts = [];
      const colors = ['var(--ink)', 'var(--ink-2)', 'var(--acc)', 'var(--ink)', 'var(--ink-2)', 'var(--ink)'];
      const indent = [0, 8, 8, 16, 8, 0];
      for (let i = 0; i < 6; i++)
        parts.push(part('wide', { left: `${10 + indent[i]}%`, top: `${14 + i * 13}%`, width: `${rand(24, 62 - indent[i])}%`, height: '5px', background: colors[i] }));
      return parts;
    },
    sparkline(w, h) {
      const n = 8;
      const pts = Array.from({ length: n }, (_, i) => [8 + (i * 84) / (n - 1), 20 + rand(0, 55)]);
      const svgWrap = part('', { inset: '0' }, `<svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline fill="none" stroke="var(--acc)" stroke-width="2" vector-effect="non-scaling-stroke" points=""/></svg>`);
      const line = svgWrap.querySelector('polyline');
      const parts = [svgWrap];
      pts.forEach(([x, y], i) => {
        const dot = part('', { left: `calc(${x}% - 3px)`, top: `calc(${y}% - 3px)`, width: '6px', height: '6px', background: 'var(--ink)' });
        dot.onShow = () => line.setAttribute('points', pts.slice(0, i + 1).map((p) => p.join(',')).join(' '));
        parts.push(dot);
      });
      return parts;
    },
    card(w, h) {
      const s = Math.min(40, h * 0.34);
      return [
        part('', { left: '10%', top: `calc(50% - ${s / 2}px)`, width: `${s}px`, height: `${s}px`, borderRadius: '50%', background: 'var(--wash)', border: '1.5px solid var(--ink)' }),
        part('wide', { left: `calc(10% + ${s + 12}px)`, top: '36%', width: '42%', height: '7px', background: 'var(--ink)' }),
        part('wide', { left: `calc(10% + ${s + 12}px)`, top: '52%', width: '28%', height: '6px', background: 'var(--ink-2)' }),
        part('', { right: '8%', top: '14%', padding: '2px 6px', background: 'var(--acc)', color: 'var(--on-acc)', fontSize: '10px', fontWeight: 700 }, 'NEW'),
      ];
    },
    'type-spec'(w, h) {
      return [
        part('', { left: '10%', top: '6%', fontSize: `${Math.min(h * 0.5, 64)}px`, fontWeight: 600, letterSpacing: '-0.05em', lineHeight: 1 }, 'Aa'),
        part('lbl', { left: '10%', bottom: '10%' }, 'Inter Tight 600'),
        part('', { right: '10%', bottom: '12%', width: '14px', height: '14px', background: 'var(--acc)' }),
      ];
    },
  };

  function stillLife() {
    const b = rel(bay);
    slotRects().slice(0, 3).forEach((slot, i) => {
      const kind = Object.keys(KINDS)[i * 3];
      const w = Math.min(260, slot.w - 24);
      const h = Math.min(170, slot.h - 24);
      const item = document.createElement('div');
      item.className = 'item done';
      Object.assign(item.style, { left: `${slot.x - b.x + 12}px`, top: `${slot.y - b.y + 12}px`, width: `${w}px`, height: `${h}px` });
      for (const p of KINDS[kind](w, h)) {
        item.appendChild(p);
        p.classList.add('on');
        p.onShow?.();
      }
      bay.appendChild(item);
    });
    countEl.textContent = '003';
  }

  async function buildItem(a, slot) {
    const g = gen;
    const kind = pick(Object.keys(KINDS));
    const b = rel(bay);
    const iw = Math.min(260, Math.max(120, slot.w * rand(0.66, 0.9)));
    const ih = Math.min(170, Math.max(84, slot.h * rand(0.6, 0.86)));
    const r = { x: slot.x + rand(10, Math.max(12, slot.w - iw - 10)), y: slot.y + rand(10, Math.max(12, slot.h - ih - 10)), w: Math.min(iw, slot.w - 20), h: Math.min(ih, slot.h - 20) };
    const rect = await wire(a, r, 220);
    const fill = await shade(a, r, 3, 70);
    const item = document.createElement('div');
    item.className = 'item';
    Object.assign(item.style, { left: `${r.x - b.x}px`, top: `${r.y - b.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const parts = KINDS[kind](r.w, r.h);
    parts.forEach((p) => item.appendChild(p));
    bay.appendChild(item);
    fill.classList.add('fade');
    for (const p of parts) {
      alive(g);
      const pr = rel(p);
      await a.move(pr.x + Math.min(pr.w / 2, 30), pr.y + pr.h / 2, rand(120, 200));
      await a.click();
      p.classList.add('on');
      if (p.onShow) p.onShow();
    }
    item.classList.add('done');
    rect.classList.add('fade');
    await sleep(rand(250, 500));
    const dest = rel(countEl);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const dx = dest.x + dest.w / 2 - cx;
    const dy = dest.y + dest.h / 2 - cy;
    await a.move(cx, cy, 160);
    a.down();
    await tween(rand(380, 520), (p) => {
      const s = 1 - 0.85 * p;
      item.style.transform = `translate(${dx * p}px, ${dy * p}px) scale(${s})`;
      item.style.opacity = String(1 - p * 0.7);
      a.set(cx + dx * p, cy + dy * p);
    });
    a.up();
    item.remove();
    rect.remove();
    fill.remove();
    shipped++;
    countEl.textContent = String(shipped).padStart(3, '0');
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot"></span><span>#${String(shipped).padStart(3, '0')}</span><span>${kind}</span>`;
    logEl.prepend(li);
    while (logEl.children.length > 3) logEl.lastChild.remove();
  }

  async function builder(a) {
    const g = gen;
    try {
      await sleep(rand(0, 400));
      while (true) {
        alive(g);
        const free = slotRects().filter((s) => !slots.has(s.id));
        if (!free.length) {
          await a.move(rel(bay).x + rand(0, rel(bay).w), rel(bay).y + rand(0, rel(bay).h), 500);
          await sleep(300);
          continue;
        }
        const slot = pick(free);
        slots.add(slot.id);
        try {
          await buildItem(a, slot);
        } finally {
          slots.delete(slot.id);
        }
        await sleep(rand(150, 500));
      }
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  }

  async function leave(a) {
    const v = view();
    const exits = [
      [v.x - 40, a.y],
      [v.x + v.w + 40, a.y],
      [a.x, v.y - 40],
      [a.x, v.y + v.h + 40],
    ];
    const dist = ([x, y]) => Math.hypot(x - a.x, y - a.y);
    const [x, y] = exits.sort((p, q2) => dist(p) - dist(q2))[0];
    try {
      await a.move(x, y, rand(450, 750), { ease: ease.inOut });
      a.el.style.opacity = '0';
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  }

  function roles() {
    slots.clear();
    agents.filter((a) => a.role === 'leaver').forEach(leave);
    escorts();
    agents.filter((a) => a.role === 'maintainer').forEach(maintain);
    agents.filter((a) => a.role === 'builder').forEach(builder);
  }

  async function run(animated) {
    reset();
    const g = gen;
    try {
      if (animated) {
        await build();
        alive(g);
      } else {
        [...agents, ...HELPERS].forEach(offscreen);
      }
      finalize();
      roles();
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  }

  if (still) {
    finalize();
    stillLife();
    return;
  }

  document.addEventListener('pointermove', (e) => {
    const s = root.getBoundingClientRect();
    pointer.x = e.clientX - s.left;
    pointer.y = e.clientY - s.top;
    pointer.inside = true;
  });
  html.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  let resizeTimer = 0;
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => run(false), 250);
  });

  run(animate);
}
