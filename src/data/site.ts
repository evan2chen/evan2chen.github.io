export type Text = string | { draft: string };

export const person = {
  name: 'Evan Chen',
  statement: { draft: 'One sentence in your own voice about what you build and why.' } as Text,
  role: 'Software engineer',
  degree: 'B.S. Computer Science & Mathematics',
  school: 'University of Maryland',
  graduation: 'May 2027',
  status: 'Open to new-grad software engineering roles.',
  email: 'evan2.fm@gmail.com',
  github: 'https://github.com/evan2chen',
  linkedin: 'https://www.linkedin.com/in/evan--chen/',
  resume: '/resume.pdf',
};

export const site = {
  title: 'Evan Chen - Software Engineer, University of Maryland',
  description:
    'Evan Chen, software engineer and University of Maryland CS & Math student graduating May 2027. Two Amazon SWE internships, a TAE @ NeurIPS 2026 workshop paper, and projects in quantum compilation, agent orchestration and game systems.',
};

export type Figure = {
  id: string;
  number: number;
  title: string;
  caption: string;
  note?: string;
  stack: string;
  action: { label: string; href?: string };
  video?: { webm: string; mp4?: string; poster: string; description: string };
};

export const selectedWork: Figure[] = [
  {
    id: 'quantum',
    number: 2,
    title: 'Quantum SAT solver',
    caption:
      'Compiles arbitrary boolean expressions into Grover oracles by walking the AST. Solving the reversible pebble game with Z3 cuts ancilla qubits 45% against a one-per-node baseline.',
    stack: 'Python · Qiskit · Z3',
    action: { label: 'Try the compiler (demo page in progress)' },
  },
  {
    id: 'herd',
    number: 3,
    title: 'herd',
    caption:
      'Routes coding subagents across Claude, Codex and Cursor by tier and live quota, each in its own git worktree. A rate-limited task fails over to another provider in the same worktree.',
    note: 'Timeline illustrative.',
    stack: 'Node.js · git · Herdr',
    action: { label: 'Watch it run (recording to come)' },
  },
  {
    id: 'midboss',
    number: 4,
    title: 'Midboss Mayhem',
    caption:
      'A round-based 6v6 Deadlock mode fought in the midboss pit, built as a Deadworks plugin around this phase machine, with self-test suites and a Loadout Builder for hero builds.',
    stack: 'C# · .NET · Deadworks',
    action: { label: 'Watch a round (clip to come)' },
  },
  {
    id: 'valorant',
    number: 5,
    title: 'Valorant Assistant',
    caption:
      'Positioning advice from safe zones mapped over 10K ranked matches. A Redis hot-path cache in front of MongoDB holds p95 latency under 100 ms over 1.1M match points.',
    note: 'Distribution illustrative.',
    stack: 'Python · Redis · MongoDB · AWS EC2',
    action: { label: 'Read how it works (write-up to come)' },
  },
];

export const experience = [
  {
    period: 'Jun - Aug 2026',
    org: 'Amazon',
    role: 'Software Engineer Intern',
    place: 'Seattle, WA',
    results: [
      'Boosted researcher productivity by 20% by exposing 100K+ raw datapoints from SageMaker to a SQL query-able catalog.',
      'Automated 2.5 human work-hours/week by giving AI Agents semantic context through MCP-readable feature descriptions.',
      'Reduced on-call workload by 2 hours/week by enabling on-click AI debugging and documenting a detailed service runbook.',
    ],
  },
  {
    period: 'May - Aug 2025',
    org: 'Amazon',
    role: 'Software Engineer Intern',
    place: 'Seattle, WA',
    results: [
      'Enabled the first set of security measures for a high-traffic compliance API by designing a configurable access control layer.',
      'Served 1.2K requests/min at 15ms p90 over a redaction config store by caching the results of hot-path read operations.',
      'Reduced team-wide onboarding time by 50% by documenting a cohesive setup guide for a novel integration testing suite.',
    ],
  },
];

export const research = {
  title: 'The Retrieval-Robustness Paradox: Data Poisoning in Retrieval-Dependent Domains',
  authors: ['James Zhou', 'Evan Chen', 'Wei Zou', 'Jinyuan Jia'],
  venue: 'Accepted to TAE @ NeurIPS 2026',
  role: [
    'Surveyed & curated evaluation frameworks for 3 datasets to form retrieval-dependent tasks for RAG defense benchmarking.',
    'Quantified retrieval-dependence by comparing RAG and no-RAG accuracy to select datasets to be included in the paper.',
    "Illustrated the paper's 3 flagship figures and co-wrote the abstract and intro to communicate key ideas and findings.",
  ],
};

export const moreWork = [
  {
    title: 'IMC Prosperity Trading Challenge',
    detail:
      'Placed top 100 globally and top 35 in the US at peak, of 12K teams, via market making, arbitrage and game-theoretic bids.',
    stack: 'Algorithmic trading · Statistics',
  },
  {
    title: 'GEA Bot',
    detail: 'Real-time multi-user competitions on 100K+ procedurally generated sequence-recognition puzzles, on Discord.',
    stack: 'Python · Azure',
  },
];

export const about = {
  text: { draft: 'Three or four sentences in your own voice: what you enjoy outside of work (math, games, puzzles, agent tooling) and that you speak English and Mandarin.' } as Text,
  now: { date: 'October 2026', text: { draft: 'One line on what you are working on right now.' } as Text },
};

export const education = {
  school: 'University of Maryland, College Park',
  degree: 'B.S. Computer Science & Mathematics, dual degree',
  gpa: '3.9 / 4.0',
  graduation: 'May 2027',
  coursework:
    'Advanced Data Structures, Algorithm Analysis, Machine Learning, Functional Programming, Quantum Computing, Linear Algebra, Complex Analysis, Combinatorics, Group Theory, Signal Processing',
};

export const skills: { area: string; items: string; figures: number[] }[] = [
  { area: 'Python', items: 'NumPy, Pandas, scikit-learn, Flask', figures: [2, 5] },
  { area: 'Quantum', items: 'Qiskit, Z3', figures: [2] },
  { area: 'JavaScript', items: 'Node.js, TypeScript, React', figures: [1, 3] },
  { area: 'C#', items: '.NET, Deadworks', figures: [4] },
  { area: 'Data and infrastructure', items: 'Redis, MongoDB, AWS EC2', figures: [5] },
];

export const otherSkills =
  'Also: Java, C, Rust, OCaml, MATLAB, R, Assembly · DynamoDB, PostgreSQL · AWS ECS, Lambda, CloudFormation, IAM · Docker';
