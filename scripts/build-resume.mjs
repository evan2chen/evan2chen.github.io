import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';

execFileSync('latexmk', ['-pdf', '-interaction=nonstopmode', '-halt-on-error', '-quiet', '-jobname=resume', 'main.tex'], { cwd: 'resume', stdio: 'inherit' });
mkdirSync('public', { recursive: true });
copyFileSync('resume/resume.pdf', 'public/resume.pdf');
