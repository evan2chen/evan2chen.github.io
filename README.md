# evan2chen.github.io

Personal site and resume source, built with Astro and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Edit content

All copy lives in `src/data/site.ts`. Values written as `{ draft: '...' }` render highlighted as placeholders; replace each with a plain string in your own words. Figure actions without an `href` render as drafts until the page, video or write-up exists.

## Resume

The resume source is `resume/main.tex`. To include your phone number in local builds, create the untracked `resume/private.tex`:

```tex
\renewcommand{\phoneline}{301-555-0100 $|$ }
```

CI builds without it, so the public `/resume.pdf` never contains the number.

## Commands

```sh
npm install
npm run build      # resume PDF (latexmk) + site into dist/
npm run preview    # serve dist/ at http://localhost:4321
npm run test:e2e   # Playwright suite against the preview server
npm run dev        # live-reloading dev server
```

Design decisions are recorded in `DESIGN.md` and `PRODUCT.md`.
