type Node =
  | { kind: 'var'; name: string }
  | { kind: 'not'; a: Node }
  | { kind: 'bin'; op: '&' | '|' | '^'; a: Node; b: Node };

type Gate =
  | { kind: 'x'; controls: [number, boolean][]; target: number; uncompute: boolean }
  | { kind: 'z'; line: number; negated: boolean };

export type Oracle = {
  inputs: string[];
  lines: string[];
  gates: Gate[];
  satisfying: number;
  assignments: number;
};

export const presets = ['(a & b) | ~c', 'a ^ b ^ c', '(a | b) & (~a | c) & ~d', '~(a & b & c & d)'];

export function parse(source: string): Node {
  const clean = source.replace(/\s+/g, '');
  const tokens = clean.match(/[a-e]|[~&|^()]/g) ?? [];
  if (!clean || tokens.join('') !== clean) throw new Error('Use variables a-e with ~ & | ^ and parentheses');
  let i = 0;
  const atom = (): Node => {
    const t = tokens[i++];
    if (t === '(') {
      const n = or();
      if (tokens[i++] !== ')') throw new Error('Missing )');
      return n;
    }
    if (t && /[a-e]/.test(t)) return { kind: 'var', name: t };
    throw new Error(t ? `Unexpected ${t}` : 'Expression ends early');
  };
  const not = (): Node => (tokens[i] === '~' ? (i++, { kind: 'not', a: not() }) : atom());
  const binary = (next: () => Node, op: '&' | '|' | '^') => (): Node => {
    let n = next();
    while (tokens[i] === op) {
      i++;
      n = { kind: 'bin', op, a: n, b: next() };
    }
    return n;
  };
  const and = binary(not, '&');
  const xor = binary(and, '^');
  const or = binary(xor, '|');
  const tree = or();
  if (i < tokens.length) throw new Error(`Unexpected ${tokens[i]}`);
  return tree;
}

const variables = (n: Node): string[] =>
  n.kind === 'var' ? [n.name] : n.kind === 'not' ? variables(n.a) : [...variables(n.a), ...variables(n.b)];

const evaluate = (n: Node, env: Record<string, boolean>): boolean => {
  if (n.kind === 'var') return env[n.name];
  if (n.kind === 'not') return !evaluate(n.a, env);
  const a = evaluate(n.a, env);
  const b = evaluate(n.b, env);
  return n.op === '&' ? a && b : n.op === '|' ? a || b : a !== b;
};

export function compile(tree: Node): Oracle {
  const inputs = [...new Set(variables(tree))].sort();
  const lines = [...inputs];
  const compute: Extract<Gate, { kind: 'x' }>[] = [];
  const walk = (n: Node): { line: number; negated: boolean } => {
    if (n.kind === 'var') return { line: lines.indexOf(n.name), negated: false };
    if (n.kind === 'not') {
      const r = walk(n.a);
      return { line: r.line, negated: !r.negated };
    }
    const a = walk(n.a);
    const b = walk(n.b);
    const target = lines.push(`t${lines.length - inputs.length + 1}`) - 1;
    if (n.op === '^') {
      compute.push(
        { kind: 'x', controls: [[a.line, true]], target, uncompute: false },
        { kind: 'x', controls: [[b.line, true]], target, uncompute: false },
      );
      return { line: target, negated: a.negated !== b.negated };
    }
    if (n.op === '&') {
      compute.push({ kind: 'x', controls: [[a.line, !a.negated], [b.line, !b.negated]], target, uncompute: false });
      return { line: target, negated: false };
    }
    compute.push({ kind: 'x', controls: [[a.line, a.negated], [b.line, b.negated]], target, uncompute: false });
    return { line: target, negated: true };
  };
  const root = walk(tree);
  const gates: Gate[] = [
    ...compute,
    { kind: 'z', line: root.line, negated: root.negated },
    ...[...compute].reverse().map((g) => ({ ...g, uncompute: true })),
  ];
  const assignments = 2 ** inputs.length;
  let satisfying = 0;
  for (let m = 0; m < assignments; m++) {
    if (evaluate(tree, Object.fromEntries(inputs.map((v, k) => [v, Boolean((m >> k) & 1)])))) satisfying++;
  }
  return { inputs, lines, gates, satisfying, assignments };
}

export const iterations = (o: Oracle) =>
  o.satisfying ? Math.max(1, Math.floor((Math.PI / 4) * Math.sqrt(o.assignments / o.satisfying))) : 0;

export function circuitSvg(o: Oracle) {
  const x0 = 34;
  const dx = 26;
  const dy = 24;
  const y0 = 14;
  const width = x0 + o.gates.length * dx + 10;
  const height = y0 * 2 + (o.lines.length - 1) * dy;
  const y = (line: number) => y0 + line * dy;
  let svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Oracle circuit with ${o.lines.length} qubits and ${o.gates.length} gates">`;
  o.lines.forEach((name, k) => {
    svg += `<text x="2" y="${y(k) + 4}" class="q-label">${name}</text><line x1="${x0 - 12}" y1="${y(k)}" x2="${width - 4}" y2="${y(k)}" class="q-wire"/>`;
  });
  o.gates.forEach((g, k) => {
    const x = x0 + k * dx + dx / 2;
    if (g.kind === 'z') {
      const cls = g.negated ? ' negated' : '';
      svg += `<g><rect x="${x - 9}" y="${y(g.line) - 9}" width="18" height="18" class="q-phase${cls}"/><text x="${x}" y="${y(g.line) + 4}" text-anchor="middle" class="q-phase-label${cls}">Z</text></g>`;
      return;
    }
    const ys = [...g.controls.map(([line]) => y(line)), y(g.target)];
    const ty = y(g.target);
    svg += `<g${g.uncompute ? ' class="q-uncompute"' : ''}><line x1="${x}" y1="${Math.min(...ys)}" x2="${x}" y2="${Math.max(...ys)}" class="q-gate"/>`;
    for (const [line, positive] of g.controls) {
      svg += `<circle cx="${x}" cy="${y(line)}" r="3.4" class="${positive ? 'q-control' : 'q-control negated'}"/>`;
    }
    svg += `<circle cx="${x}" cy="${ty}" r="6.5" class="q-target"/><line x1="${x - 6.5}" y1="${ty}" x2="${x + 6.5}" y2="${ty}" class="q-gate"/><line x1="${x}" y1="${ty - 6.5}" x2="${x}" y2="${ty + 6.5}" class="q-gate"/></g>`;
  });
  return `${svg}</svg>`;
}

const count = (n: number, word: string) => `<b>${n}</b> ${word}${n === 1 ? '' : 's'}`;

export function statsHtml(o: Oracle) {
  const grover = o.satisfying ? count(iterations(o), 'Grover iteration') : 'unsatisfiable';
  return `${count(o.inputs.length, 'input')} · ${count(o.lines.length - o.inputs.length, 'ancilla')} · ${count(o.gates.length, 'gate')} · <b>${o.satisfying}</b> of ${o.assignments} satisfy · ${grover}`;
}
