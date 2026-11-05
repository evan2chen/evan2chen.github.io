import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

for (const file of readdirSync('resume/variants').filter((name) => name.endsWith('.tex'))) {
  const name = path.basename(file, '.tex');
  execFileSync('latexmk', ['-pdf', '-interaction=nonstopmode', '-halt-on-error', '-quiet', `-jobname=${name}`, `variants/${file}`], { cwd: 'resume', stdio: 'inherit' });
  console.log(`resume/${name}.pdf`);
}
