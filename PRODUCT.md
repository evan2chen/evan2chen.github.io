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
- Resume source of truth: `main.tex` (LaTeX). The site serves a PDF built from it without the phone number.
- Viewing: recruiters on laptops during work hours; engineers on laptops and phones.

## Capabilities and Constraints

- Launch scope: home page plus one project page with a live interactive demo. Further project pages and demos are added after launch.
- Launch demo: the quantum oracle compiler (CMSC437 boolean-oracle and pebbling labs; the course allows publishing), reimplemented in TypeScript as a reversible gate list, bitwise verification, and Grover over the input amplitudes. Pebbling schedules come from a JavaScript SAT solver in a Web Worker using the Z3 encoding; preset schedules are precomputed by the Python code at build time.
- Featured projects: Quantum SAT solver, herd, Midboss Mayhem, Valorant Assistant. IMC Prosperity and GEA Bot sit in a compact list.
- Demos run fully client-side on precomputed data checked into the repo; no backend.
- Hosting: evan2chen.github.io; a custom domain may come later. No analytics.
- `main.tex` lives in the site repo; CI builds the public resume PDF without the phone number.
- herd and Midboss Mayhem are shown with screen-recorded video.
- Amazon internship content stays at resume-level detail.
- Course code may fall under academic-integrity policy; a project can ship as demo plus write-up without a public repo.
- Undecided: which project repos become public.

## Brand Commitments

All prose is written by Evan. Builds use clearly marked placeholders; copy edits only tighten Evan's drafts and keep Evan's voice.

## Evidence on Hand

From `main.tex`:
- Amazon SWE intern, 2025 and 2026 (Seattle).
- Research: "The Retrieval-Robustness Paradox: Data Poisoning in Retrieval-Dependent Domains", accepted to TAE @ NeurIPS 2026 (James Zhou, Evan Chen, Wei Zou, Jinyuan Jia). Evan illustrated the paper's 3 flagship figures.
- Projects: Valorant Assistant, Quantum SAT Solver via AST Oracle Compilation, IMC Prosperity Trading Challenge (top 100 globally of 12K teams at peak), GEA Bot.
- GPA 3.9/4.0; fluent in English and Mandarin Chinese.

Absent and not to be fabricated: testimonials, project screenshots, demo datasets, paper link, headshot. Paper figures appear only once the paper is public and co-authors agree.

## Product Principles

1. Evidence over adjectives: every claim is backed by a number, a decision, or something the visitor can try.
2. The 10-second skim always succeeds: name, status, and resume are visible without scrolling on any device.
3. Depth is opt-in: the home page stays brief and project pages carry the detail.
4. Evan's voice is the content; design serves it and never substitutes for it.
5. The site stays fast, static, and maintainable by one person.

## Accessibility & Inclusion

WCAG 2.2 AA. Every page and demo works by keyboard, respects reduced motion, and keeps core content readable with JavaScript disabled.
