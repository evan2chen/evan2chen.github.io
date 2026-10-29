# evan2chen.github.io

Personal site and resume source, built with Astro and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Edit content

Run `npm run dev`, open http://localhost:4321, and press **Edit** in the bar at the bottom right.

- Click any outlined text to change it; Enter or clicking away saves it.
- **Upload** replaces a photo, project video or screenshot. Videos get **Poster** and every media item gets **Alt**.
- **URL** sets a link's address. Links without an address show with a dashed red underline.
- Projects have ↑ ↓ ✕ and **+ Project**; links have **+ Link**.
- On Other, **+ Post**, **+ Image** and **+ Project** create an entry and open it. Each entry page has **Markdown** for the body and **+ Images** for photos.
- **Resume** opens `resume/main.tex`; saving rebuilds `/resume.pdf` with latexmk.
- **Publish** commits the content files and pushes them; the workflow then deploys the site.

The editor only exists on the dev server. Everything it writes is plain files you can also edit by hand:

| File | Holds |
| --- | --- |
| `src/content/site.json` | Name, description, study line, photo, contact links, page metadata |
| `src/content/projects.json` | Projects in display order, with their media and links |
| `src/content/other/*.md` | Other entries: frontmatter (`title`, `date`, `type`, `excerpt`, `images`) and a Markdown body |
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

CI builds without it, so the public `/resume.pdf` never contains the number.

## Commands

```sh
npm install
npm run dev        # live site with the editor
npm run build      # resume PDF (latexmk) + site into dist/
npm run preview    # serve dist/ at http://localhost:4321
npm run test:e2e   # Playwright: the built site, plus the editor against a throwaway copy in .sandbox/
```

Design decisions are recorded in `DESIGN.md` and `PRODUCT.md`.
