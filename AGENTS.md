# Working in this repo

Start with the [feature map in README.md](README.md#feature-map) for implementation and test paths. [README.md](README.md) also covers setup, content editing, resume builds and verification. Use [DESIGN.md](DESIGN.md) for visual guidance and [PRODUCT.md](PRODUCT.md) for audience and content requirements.

- Keep site content in `src/content/`, media in `public/media/`, and resume content in `resume/main.tex`.
- Extend editor fields through `src/lib/content.ts`, the relevant page or component, and `src/editor/`; keep editor hooks and assets scoped to development.
- Verify site changes against a fresh build with the Playwright commands in README.md. The editor suite uses a disposable `.sandbox/` site and local bare remote.
