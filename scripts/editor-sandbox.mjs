import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, '.sandbox');
const site = path.join(base, 'site');
const remote = path.join(base, 'remote.git');
const port = process.argv[2] ?? '4322';

rmSync(base, { recursive: true, force: true });
mkdirSync(path.join(site, 'resume'), { recursive: true });
for (const entry of ['src', 'public', 'scripts', 'astro.config.mjs', 'tsconfig.json']) {
  cpSync(path.join(root, entry), path.join(site, entry), { recursive: true });
}
cpSync(path.join(root, 'resume', 'main.tex'), path.join(site, 'resume', 'main.tex'));
writeFileSync(path.join(site, '.gitignore'), '.astro/\nnode_modules/\ndist/\npublic/resume.pdf\nresume/*\n!resume/main.tex\n');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'ignore' });
git(base, 'init', '--bare', '--initial-branch=main', remote);
git(site, 'init', '--initial-branch=main');
git(site, 'config', 'user.name', 'Editor Sandbox');
git(site, 'config', 'user.email', 'sandbox@localhost');
git(site, 'config', 'commit.gpgsign', 'false');
git(site, 'add', '--all');
git(site, 'commit', '--quiet', '-m', 'Sandbox start');
git(site, 'remote', 'add', 'origin', remote);
git(site, 'push', '--quiet', '--set-upstream', 'origin', 'main');

const astro = spawn(process.execPath, [path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--root', site, '--port', port], { stdio: 'inherit' });
const stop = () => astro.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
astro.on('exit', (code) => process.exit(code ?? 0));
