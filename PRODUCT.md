# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with static output, deployed to GitHub Pages by a GitHub Actions workflow. Interactive demos ship their own JavaScript only on the pages that use them.

## Users

- Recruiters and hiring managers for new-grad software engineering roles (backend, full stack, AI engineering), arriving from the link on Evan's resume or LinkedIn. They skim for about 10 seconds to learn who Evan is, when Evan graduates, and where the resume is.
- Engineers on interview loops who keep reading. They want evidence of judgment: the decisions behind a project, real numbers, and something they can try.

## Product Purpose

A personal site for Evan Chen, UMD B.S. Computer Science and Mathematics (dual degree), graduating May 2027, open to new-grad software engineering roles. It carries what a one-page resume cannot: depth on selected projects, a working demo, and a person behind the bullet points. Success means a recruiter finds status and resume instantly, and an engineer leaves with a concrete memory of one project.

## Positioning

Work that combines software engineering with real mathematics: a compiler from boolean expressions to quantum oracles, game-theoretic trading strategies, spatial analytics over 10K ranked matches, and a workshop paper on retrieval-dependent data poisoning. The site demonstrates this through working artifacts rather than claims.

Name disambiguation is a standing requirement: a well-known math olympiad coach also named Evan Chen runs evanchen.cc. Title, meta, and first line identify this Evan Chen as a UMD software engineer.

## Operating Context

- Entry points: the resume header link and LinkedIn.
- Resume source of truth: `resume/main.tex` (LaTeX). CI builds the public PDF without the optional local phone line; local builds include `resume/private.tex` when present. See [README.md](README.md#resume) for build instructions.
- Viewing: recruiters on laptops during work hours; engineers on laptops and phones.

## Capabilities and Constraints

- Three main pages: Home (name, Evan's description, study line, photo, resume and contact links, the heatmap as the eye-catcher), Projects (one row per project with media, blurb, stack and links), and Other (one feed of posts, images and non-technical projects, filterable by type, with an empty state until entries exist). Other entries have individual Markdown pages with photo and video galleries; unknown paths have a 404 page.
- Content lives in `src/content` (`site.json`, `projects.json`, `other/*.md`) and is edited in place on the local dev server; Publish commits and pushes, and GitHub Actions deploys.
- Quantum demo: a TypeScript parser for variables `a` through `e`, operators `~`, `&`, `|`, `^` and parentheses. It builds a reversible compute/phase/uncompute gate list and SVG circuit, counts satisfying assignments classically, and reports a Grover iteration estimate. The Python/Qiskit/Z3 ancilla optimization project described in the content is separate from this inline compiler.
- Projects: Quantum Ancilla Optimizer (inline compiler demo), herd, Midboss Mayhem and Valorant Assistant. herd and Midboss Mayhem show screen-recorded videos; Valorant Assistant uses a media placeholder. Uploaded project videos autoplay one at a time when sufficiently in view, with reduced-motion support. Experience, research, IMC Prosperity and GEA Bot are left to the resume PDF.
- Interactive updates run in the browser: quantum circuits compile from the visitor's expression and the heatmap bins pointer or keyboard samples over synthetic seeds. Initial circuits and a heatmap SVG render statically. The published site uses static hosting; the local editor has development-only server endpoints.
- Hosting: evan2chen.github.io; a custom domain may come later. No analytics.
- Use screen-recorded video for herd and Midboss Mayhem when recordings are available.
- Amazon internship content stays at resume-level detail.
- Course code may fall under academic-integrity policy; a project can ship as demo plus write-up without a public repo.
- Undecided: which project repos become public.

## Brand Commitments

All prose is written by Evan. Builds use clearly marked placeholders; copy edits only tighten Evan's drafts and keep Evan's voice.

## Evidence on Hand

From `resume/main.tex`:
- Amazon SWE intern, 2025 and 2026 (Seattle).
- Research: "The Retrieval-Robustness Paradox: Data Poisoning in Retrieval-Dependent Domains", accepted to TAE @ NeurIPS 2026 (James Zhou, Evan Chen, Wei Zou, Jinyuan Jia). Evan illustrated the paper's 3 flagship figures.
- Projects: Valorant Assistant, Quantum SAT Solver via AST Oracle Compilation, IMC Prosperity Trading Challenge (top 100 globally of 12K teams at peak), GEA Bot.
- GPA 3.9/4.0; fluent in English and Mandarin Chinese.

The profile photo is configured in `src/content/site.json` and stored in `public/media/`. The Valorant Assistant media placeholder and empty write-up/repository links remain in `src/content/projects.json`. Use supplied evidence for testimonials, project screenshots, real demo datasets and paper links. Publish paper figures once the paper is public and co-authors agree.

## Product Principles

1. Evidence over adjectives: every claim is backed by a number, a decision, or something the visitor can try.
2. The 10-second skim always succeeds: name, description, and resume are visible without scrolling on any device.
3. Depth is opt-in: the home page stays brief and the Projects listing and Other entry pages carry the detail.
4. Evan's voice is the content; design serves it and never substitutes for it.
5. The site stays fast, static, and maintainable by one person.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Maintain keyboard access, reduced-motion support and readable core content with JavaScript disabled. The site suite runs axe scans in light and dark themes and checks keyboard heatmap input and static fallbacks; these checks support the target rather than establish full conformance.

Implementation and test paths are indexed in the [README feature map](README.md#feature-map).
