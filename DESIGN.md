---
name: Evan Chen
description: Swiss minimal - a strict 12-column grid, one sans, black and white with a single signal red.
colors:
  bg: "#ffffff"
  ink: "#0a0a0a"
  ink-2: "#6b6b6b"
  rule: "#0a0a0a"
  hair: "#d9d9d9"
  wash: "#efefef"
  acc: "#e0301a"
  on-acc: "#ffffff"
  h1: "#e8e8e8"
  h2: "#bdbdbd"
  h3: "#7d7d7d"
  h4: "#2b2b2b"
  h5: "#8f2414"
  h6: "#e0301a"
  video-ground: "#121212"
  bg-dark: "#0b0b0b"
  ink-dark: "#f2f2f2"
  ink-2-dark: "#8f8f8f"
  rule-dark: "#f2f2f2"
  hair-dark: "#2a2a2a"
  wash-dark: "#171717"
  acc-dark: "#ff5a3c"
  on-acc-dark: "#0b0b0b"
  h1-dark: "#1c1c1c"
  h2-dark: "#3a3a3a"
  h3-dark: "#6e6e6e"
  h4-dark: "#c8c8c8"
  h5-dark: "#e4917a"
  h6-dark: "#ff5a3c"
typography:
  name:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 10vw, 176px)"
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: "-0.055em"
  display:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 13.75vw, 176px)"
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: "-0.055em"
  entry-title:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(40px, 7vw, 96px)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(26px, 2.7vw, 34px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  statement:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  prose:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  nav:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  label:
    fontFamily: "Inter Tight, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  editor-code:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  gutter: "clamp(16px, 3.75vw, 48px)"
  edge: "clamp(32px, 12vw, 288px)"
  gap: "16px"
  measure: "66ch"
  page-max: "1280px"
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  button-solid-hover:
    backgroundColor: "{colors.acc}"
    textColor: "{colors.on-acc}"
  nav-link-current:
    textColor: "{colors.acc}"
  theme-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  theme-button-hover:
    textColor: "{colors.acc}"
---

# Design System: Evan Chen

## Overview

**Creative North Star: "The Grid Sheet"**

Projects and Other share a 1280px sheet: a header row, a page title set enormous, one heavy rule, and content on a strict 12-column grid. Home is the exception. It fills the window inside a comfortable margin, one screen tall, with the heatmap taking the right two-thirds. Black on white, white on near-black, and one signal red that marks where you are and what matters. Nothing floats, nothing is rounded, nothing casts a shadow. Interest comes from scale contrast (176px titles against 12-15px text) and from the live heatmap on Home.

**Key Characteristics:**
- One typeface, Inter Tight, self-hosted as a variable font.
- 12 columns with a 16px gap inside a 1280px sheet; on Home the grid spans the window inside the edge margin. Home's content text runs 20% larger than elsewhere (17px body, 14px labels), and its description scales with the screen (clamp(16px, min(1.45vw, 2.4svh), 25px)) so Home fits one screen; the header is the same on every page.
- A 1.5px rule under every page title and above the footer; 1px hairlines between rows.
- Signal red only for the current page, pressed or hot states, the hottest heatmap bins, the quantum phase gate, and placeholder underlines.
- Light and dark are full counterparts; visitors switch with the sun/crescent button and the choice persists.

## Colors

### Primary
- **Signal Red** (`acc`: #e0301a light, #ff5a3c dark): current nav item, hover underlines, focus outline, the solid button's hover fill, the active project number, the quantum Z gate, and dashed draft underlines.

### Heat ramp
- **h1 to h6**: light runs pale gray, mid gray, dark gray, near black, oxblood (#8f2414), signal red. Dark runs dark gray up to light gray, then muted rose (#e4917a), then signal red. The oxblood or rose step bridges the darkest neutral to red, so the hottest bins grow out of the densest ones.

### Neutral
- **bg / ink**: page ground and all primary text.
- **ink-2**: labels, nav numbers, captions.
- **rule**: the 1.5px structural rules, matching ink.
- **hair**: row dividers, plot and demo outlines, preset button borders.
- **wash**: placeholder and code grounds.
- **video-ground**: the fixed near-black behind videos and images while they load, in both themes.

### Named Rules
**The One Red Rule.** Red marks state or the single hottest thing; it never decorates.

**The Theme Choice Rule.** The site follows `prefers-color-scheme` until the visitor presses the theme button; after that `html[data-theme]` wins and is stored in `localStorage` under `theme`.

## Typography

**Font:** Inter Tight (variable, 100-900), fallback Helvetica Neue, Arial. Editor code fields use the system monospace.

- **Name** (600, clamp(64px, min(10vw, 14svh), 176px), line-height 0.86, -0.055em): the name on Home, on one line across the page.
- **Display** (600, clamp(64px, 11vw, 280px)): the page titles Projects, Other, 404. Both are optically pulled left by 0.045em.
- **Entry title** (600, clamp(40px, 7vw, 96px)): Other entry pages.
- **Headline** (600, 26-34px, -0.03em): project names, feed titles.
- **Statement** (400, 21px, line-height 1.3): the personal description and entry excerpts.
- **Body** (400, 14-15px, line-height 1.5): blurbs, lists, links, header, footer. Markdown prose runs 17px at 66ch.
- **Label** (400, 12px, ink-2): heatmap key, captions, readouts, demo notes.

All numbers are tabular.

## Layout

The sheet is max 1280px with a fluid gutter (16-48px). The header row is identical on every page: it spans the window inside the edge margin (`--edge`: 12vw up to 288px, 32px on phones), with name in columns 1-3, numbered nav in 7-11, and the theme button at the right edge of 12. Home (`body.fill`) uses the same edge margin on the sides of its content and 12% of the screen height (capped at the edge margin) below it, so it always fits one screen.

- **Home ("name across"):** the page is exactly one screen tall, from 1280 × 720 up. The name runs across all 12 columns as a masthead. Below it, columns 1-4 hold the description at full column width, then the photo (3:4) beside the Study fact, then the link list pinned to the bottom, with GitHub and LinkedIn sharing a row. Columns 5-12 are the heatmap, starting under the name and ending at the margin on the right and bottom, with its key in a notch cut from the field's bottom-left corner. Vertical spacing is min(0.55 × gutter, 2.4svh), so short screens tighten instead of overflowing. Below 900px it stacks: name, full-bleed heatmap with the key under it, description, photo and Study, links.
- **Projects and Other:** the display title, then a 1.5px rule, then the content below.
- **Projects:** one row per project: index in column 1, media 2-8 at 16:9, text 9-12. Rows are separated by hairlines. Below 900px rows stack.
- **Other:** filter row, then a feed: date 1-2, type 3, content 4-10, action 11-12.
- **Footer:** © in 1-3, Resume / Email / GitHub / LinkedIn in 7-12.

## Components

- **Nav marker:** a 2px signal-red bar under the current page's nav column, 6px below the labels.
- **Link list:** stacked rows with a hairline above each and an arrow at the right; the first can be a solid ink button (Resume). Hover turns the row red.
- **Facts:** an 88px label column and value column, hairlines between.
- **Theme button:** a square hairline-outlined icon button (2.5x body size). It shows a crescent in light mode and a sun in dark mode, and its label names the mode it switches to. Hover darkens the outline to ink and turns the icon red.
- **Heatmap:** fills its container with square bins: about 54 across the viewport on desktop and 18 on phones, recomputed and reseeded when the size changes. The key notch holds the stepped six-swatch key with live ranges, the caption, the readout with the bin count, and Reset. It draws on pointer movement, touch drag, or arrows + Enter. Without JavaScript, a seeded 48 x 27 SVG fills the same area.
- **Quantum demo:** expression input on a 1.5px ink underline, preset chips with hairline borders, the oracle circuit as inline SVG (filled dot control, hollow dot negated control, ⊕ target, red Z phase gate, faded uncompute), stats line.
- **Project video:** muted, looped, with native controls. Only the video most in view plays, and its row number turns red. Reduced motion never autoplays.
- **Draft underline:** unfinished copy and links without an address carry a 1.5px dashed red underline.

## Motion

Motion runs on the live page, so links and the heatmap stay usable while it plays. Reduced motion removes all of it.

- **Page arrival:** coming from another page of the site, the content slides in from the nav direction (from the right going to a higher-numbered page, from the left going back) by up to the gutter, 0.44s, while the nav marker slides over from the previous column, 0.48s, both on `cubic-bezier(0.16, 1, 0.3, 1)`. The head script sets `html[data-arrive]` and `--mark-from`.
- **Theme change:** every color token is a registered `@property` color, and `html` fades them together over 0.4s.
- **Heatmap load-in (Ripple):** bins appear in a circular wave from the center of the window, not of the heatmap, reaching the farthest bin at 0.8s. Each bin grows from a point and lands in signal red, then cools to its level over 0.56s. Red here is transient heat and settles before the page is at rest.

## Rules

- Place every element on the 12-column grid.
- Set everything in Inter Tight; build hierarchy from size and weight.
- Keep surfaces flat and corners square; separate sections with the 1.5px rule and rows with hairlines.
- Reserve red for state and the hottest datum.
- Define every color as a token with a dark counterpart in both dark blocks of `global.css`, and register it with `@property` so theme changes fade.
- Keep the editor's styles and hooks dev-only, so the published build carries only the site.
