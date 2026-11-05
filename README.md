# evan2chen.github.io

Personal site and resume source, built with Astro and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Setup

Use Node.js 24 (the CI version), npm, and Git. Install a LaTeX distribution with `latexmk` and the packages used by `resume/main.tex` for PDF builds, including the editor's **Save and rebuild** action.

```sh
npm ci
npm run dev
```

## Edit content

Run `npm run dev`, open http://localhost:4321, and press **Edit** in the bar at the bottom right.

- Click any outlined text to change it; Enter or clicking away saves it.
- **Upload** replaces a photo, project video or screenshot. Videos get **Poster**; existing images and videos get **Alt** and **Clear**. The quantum demo is selected in `projects.json`.
- **URL** sets a link's address. Links without an address show with a dashed red underline.
- Projects have ↑ ↓ ✕ and **+ Project**; links have **+ Link**.
- On Other, **+ Post**, **+ Image** and **+ Project** create an entry and open it. Each entry page has **Markdown** for the body and **+ Media** for photos and videos.
- **Resume** opens `resume/main.tex`; saving rebuilds `/resume.pdf` with latexmk.
- **Publish** commits changes in `src/content/`, `public/media/` and `resume/main.tex`, then pushes `HEAD` to the first configured Git remote. With no remote, it commits locally. Pushes to `main` trigger deployment after the workflow's build and tests pass.

The editor only exists on the dev server. Everything it writes is plain files you can also edit by hand:

| File | Holds |
| --- | --- |
| `src/content/site.json` | Name, description, study line, photo, contact links, page metadata |
| `src/content/projects.json` | Projects in display order, with their media and links |
| `src/content/other/*.md` | Other entries: frontmatter (`title`, `date`, `type`, `excerpt`, `media`) and a Markdown body; each `media` item has `kind` (`image` or `video`), `src` and `alt` |
| `public/media/` | Uploaded images and videos |

WebM or MP4 video both work. To shrink a raw screen recording with ffmpeg:

```sh
ffmpeg -i raw.mp4 -vf scale=1600:-2,fps=30 -an -c:v libvpx-vp9 -crf 36 -b:v 0 herd.webm
```

## Resume

The resume source is `resume/main.tex`. To include your phone number in local builds, create the untracked `resume/private.tex`:

```tex
\renewcommand{\phoneline}{301-555-0100 $|$ }
```

Local builds include `resume/private.tex` when present, including the PDF copied to `public/resume.pdf`. CI builds from the tracked source without that untracked file, so its public PDF omits the phone number.

### Variants

`main.tex` is the shared source and the public resume. Each file in `resume/variants/` is a role-specific version that sets its own values and then loads `main.tex`:

```tex
\newcommand{\graduation}{January 2028}
\input{main}
```

Values a variant can set are declared with `\providecommand` near the top of `main.tex`; add another there when a variant needs to change something new. `npm run resume:variants` builds every variant to `resume/<variant>.pdf`.

## Commands

```sh
npm run dev        # live site with the editor
npm run resume     # resume/resume.pdf, copied to public/resume.pdf
npm run resume:variants # resume/<variant>.pdf for each variant
npm run build:site # site into dist/, using the existing public/resume.pdf
npm run build      # resume PDF (latexmk) + site into dist/
npm run preview    # serve dist/ at http://localhost:4321
```

Build the PDF and site before running Playwright, and install its Chromium browser once:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright serves the built site on port 4323 and a fresh editor copy in `.sandbox/` on port 4322. The sandbox is recreated for each run, with its own Git repository and local bare remote for Publish tests. The editor resume test skips when `latexmk` is unavailable; the published-site tests still require a valid PDF in `dist/`. CI builds the PDF separately, runs `build:site` and both test suites on pushes to `main`, pull requests and manual runs; deployment is limited to `main`.

## Feature map

Paths below are relative to the repository root. Site tests live in `tests/e2e/site.spec.ts`; editor tests live in `tests/e2e/editor.spec.ts`.

| Feature or subsystem | Implementation | Tests |
| --- | --- | --- |
| Home, profile, study and contact links | `src/pages/index.astro`, `src/content/site.json` | Site: identity, resume and desktop layout |
| Interactive heatmap, synthetic seeds, live key, reset and keyboard input | `src/components/Heatmap.astro`, `src/lib/heatmap.ts`, `src/lib/histogram.ts` | Site: pointer, keyboard, reset, theme, ripple and sizing |
| Projects, ordering, media placeholders and video playback | `src/pages/projects.astro`, `src/components/Media.astro`, `src/content/projects.json` | Site: content order; editor: project operations and video playback |
| Boolean expression compiler, circuit and Grover iteration estimate | `src/components/QuantumDemo.astro`, `src/lib/oracle.ts` | Site: expressions, presets, errors and static fallback |
| Other feed, type filters and Markdown entry pages with galleries | `src/pages/other/index.astro`, `src/pages/other/[slug].astro`, `src/content/other/`, `src/content.config.ts` | Site: empty state; editor: creation, Markdown, photos, videos and filtering |
| Shared layout, metadata, navigation, contacts and 404 | `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/pages/404.astro` | Site: navigation, arrival, internal links, header and 404 |
| Theme persistence, responsive styles, motion and accessibility | `src/components/ThemeToggle.astro`, `src/styles/global.css`, page and component styles, `public/fonts/`, `public/favicon.svg` | Site: themes, motion, JavaScript disabled, overflow and axe scans |
| Content types, date helpers, editable hooks and project links | `src/lib/content.ts`, `src/components/LinkList.astro`, `src/content.config.ts` | Site and editor suites exercise rendered content and edits |
| Dev editor, uploads, item operations, Markdown and Publish | `src/editor/client.ts`, `src/editor/integration.ts`, `src/editor/editor.css`, `astro.config.mjs`, `public/media/` | Editor suite; site suite checks editor assets are absent from the build |
| Resume, optional local phone line and variants | `resume/main.tex`, optional `resume/private.tex`, `resume/variants/`, `scripts/build-resume.mjs`, `scripts/build-resume-variants.mjs` | Site: PDF response; editor: save and rebuild when `latexmk` is available |
| Build, test servers, isolated editor sandbox and Pages deployment | `package.json`, `astro.config.mjs`, `tsconfig.json`, `playwright.config.ts`, `scripts/editor-sandbox.mjs`, `.github/workflows/deploy.yml` | Both Playwright suites run in CI |

Agent guidance is in [AGENTS.md](AGENTS.md). Design and product requirements are recorded in [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).
