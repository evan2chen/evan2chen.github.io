# evan2chen.github.io

Personal site and resume source, built with Astro and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Edit content

All copy lives in `src/data/site.ts`. Values written as `{ draft: '...' }` render highlighted as placeholders; replace each with a plain string in your own words. Figure actions without an `href` render as drafts until the page, video or write-up exists.

To show a video in a figure plate instead of its drawing, put the files in `public/media/` and add a `video` field to that entry in `selectedWork`:

```ts
video: { webm: '/media/herd.webm', mp4: '/media/herd.mp4', poster: '/media/herd-poster.webp', description: 'herd fanning one task out to three providers' },
```

WebM is required and MP4 is an optional fallback for older Safari. Videos play muted and looped while on screen, and stay paused for visitors who prefer reduced motion. With ffmpeg, from a raw screen recording:

```sh
ffmpeg -i raw.mp4 -vf scale=1600:-2,fps=30 -an -c:v libvpx-vp9 -crf 36 -b:v 0 herd.webm
ffmpeg -i raw.mp4 -vf scale=1600:-2,fps=30 -an -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart herd.mp4
ffmpeg -ss 2 -i raw.mp4 -frames:v 1 herd-poster.webp
```

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
