---
name: Evan Chen
description: A sheet of numbered figure plates drawn by code from real or labeled data.
colors:
  paper: "#f7f8fa"
  plate: "#ffffff"
  ink: "#151a2e"
  ink-2: "#4d566b"
  rule: "#cfd4de"
  r1: "#fcefb4"
  r2: "#fe9f6d"
  r3: "#de4968"
  r4: "#8c2981"
  r5: "#3b0f70"
  r6: "#150d34"
  hot: "#de4968"
  mark: "#fe9f6d"
  on-mark: "#151a2e"
  quiet: "#e3dbee"
  quiet-2: "#d7c3e3"
  quiet-line: "#6e5a8f"
  draft: "#fcefb4"
  paper-dark: "#11152a"
  plate-dark: "#171c33"
  ink-dark: "#e9ecf3"
  ink-2-dark: "#a7b0c4"
  rule-dark: "#2e3554"
  r1-dark: "#3b0f70"
  r2-dark: "#8c2981"
  r3-dark: "#de4968"
  r4-dark: "#fe9f6d"
  r5-dark: "#fcd38f"
  r6-dark: "#fcfdbf"
  hot-dark: "#fcd38f"
  mark-dark: "#fe9f6d"
  on-mark-dark: "#151a2e"
  quiet-dark: "#4b2a7a"
  quiet-2-dark: "#8c2981"
  quiet-line-dark: "#8c6cb8"
  draft-dark: "#4a2a1f"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(56px, 7.4vw, 96px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(26px, 2.6vw, 34px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
  figure-number:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    fontVariation: "'wdth' 112"
  statement:
    fontFamily: "STIX Two Text, Times New Roman, serif"
    fontSize: "clamp(19px, 1.6vw, 22px)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "STIX Two Text, Times New Roman, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'lnum', 'tnum'"
  caption:
    fontFamily: "STIX Two Text, Times New Roman, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  nav:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  axis:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1
rounded:
  none: "0px"
  draft: "1px"
  button: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  inset: "10px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(64px, 9vw, 112px)"
  measure: "66ch"
  page-max: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.r5}"
    textColor: "{colors.paper}"
  toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    height: "36px"
  toggle-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  plate-frame:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.none}"
    padding: "{spacing.inset}"
  draft-mark:
    backgroundColor: "{colors.draft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.draft}"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    padding: "4px 0"
---

# Design System: Evan Chen

## Overview

**Creative North Star: "The Figure Plate Sheet"**

The site reads as one sheet of scientific plotting paper: numbered figure plates drawn by code, captions in a book serif, tables with numbered captions, and heavy expanded sans for the name and figure numbers. Every figure shows its baseline, axes or key, and labels illustrative data as illustrative. Color belongs to data: one magma-family heat ramp is the only chroma, and a single reserved hot accent marks the one thing in each plate that matters.

Density is high and deliberate. Small multiples sit four across, captions run full paragraphs, and sections are separated by heavy ink rules instead of whitespace boxes. Surfaces are flat: plate grounds and hairlines carry all structure, with no shadows and almost no radius.

The world has a full dark counterpart driven by `prefers-color-scheme`: deep blue-black paper, light ink, and the magma ramp inverted so that quantity always moves toward the ground's opposite.

**Key Characteristics:**
- Cool white plotting paper, blue-black ink, magma ramp as the only color.
- Numbered captions: `Fig. n` under every figure, `Table n` above every table.
- Hairline plate frames on a white plate ground, 10px inset.
- 1.5px ink rules open every section and the footer.
- Archivo expanded heavy for display and numbers; STIX Two Text for prose and captions; lining tabular figures everywhere.
- User-owned copy that is not yet written shows as a highlighted draft mark.

## Colors

A near-monochrome ink-on-paper palette where the only hue is a six-step magma heat ramp plus a quiet violet family for secondary data.

### Primary
- **Magma Ramp** (r1 to r6, Pale Straw to Midnight Violet): the data scale. In order, the six steps encode quantity in Fig. 1 bins and its stepped key. Light mode runs pale to dark on white plate; dark mode reverses so the ramp climbs toward pale cream on the dark plate. Single steps also serve as fixed tints: r1 for text selection and secondary fills in drawings (the diffuser box, the latency tail), r5 for the primary button hover.
- **Hot** (Rose Signal in light, Warm Cream in dark): the reserved emphasis state. It appears only on hover and focus-within of a plate, on link hover underlines, and as the focus outline.
- **Mark** (Apricot): the at-rest emphasis fill for the single event a plate is about (the compiled oracle, the failover task, the Ongoing phase). It transitions to Hot when the plate is hovered or holds focus; an emphasis line (the p95 threshold, the failover arrow) rests in Ink and turns Hot with it.
- **On-Mark** (Ink Navy): text set on a Mark or Hot fill, in both schemes.

### Secondary
- **Quiet / Quiet-2 / Quiet-Line** (Lavender Mist, Heather, Dusk Violet line): context data that must recede so Mark can lead - the bulk of a histogram, background lanes in a timeline. Quiet-Line strokes Quiet fills at 0.8px.

### Tertiary
- **Draft** (Straw highlight in light, Ember Brown in dark): marks placeholder copy that Evan has not yet written. Ink text sits on it with a 0.15em halo.

### Neutral
- **Paper** (Cool Plotting White / Night Navy): page ground and the text color of inverted buttons.
- **Plate** (Plate White / Deep Slate): the ground inside every figure frame and plot field. In print, Paper and Plate both become white.
- **Ink** (Blue-Black / Fog White): all primary text, section rules, axes and drawing strokes, primary button fill.
- **Ink-2** (Slate Gray / Steel Mist): labels, axis ticks, secondary metadata, list markers, illustrative-data notes.
- **Rule** (Hairline Gray / Night Rule): plate frames, table and row dividers, toggle borders, scrollbar thumb.

### Named Rules
**The Data Owns Color Rule.** The ramp, Mark, Hot and Quiet tokens color figures and their states; text, chrome and grounds stay Ink, Ink-2, Paper, Plate and Rule.

**The One Hot Thing Rule.** Each plate emphasizes one event: a Mark fill, an Ink emphasis line, or both on the same event, and only that event turns Hot on interaction.

**The Inverted Ramp Rule.** In dark mode the ramp reverses so its highest step is the lightest; quantity always reads as distance from the ground.

## Typography

**Display Font:** Archivo variable, self-hosted (with Arial Narrow, sans-serif)
**Body Font:** STIX Two Text variable, self-hosted (with Times New Roman, serif)

**Character:** A wide, heavy grotesque in the role of a journal's figure numbering, set against a scholarly text serif. The sans is the voice of names, numbers and controls; the serif is the voice of explanation.

### Hierarchy
- **Display** (Archivo 800, width 118%, clamp(56px, 7.4vw, 96px), line-height 0.92, -0.03em): the name only, broken over two lines.
- **Headline** (Archivo 800, width 112%, clamp(26px, 2.6vw, 34px), line-height 1.1): section titles; balanced wrapping.
- **Title** (Archivo 700, 20px, line-height 1.25): organizations, paper title, project names in lists.
- **Figure number** (Archivo 700, width 112%, 16px): the bold `Fig. n` / `Table n` that opens every caption.
- **Statement** (STIX 400, clamp(19px, 1.6vw, 22px), line-height 1.45, max 30em): the one-sentence intro.
- **Body** (STIX 400, 18px, line-height 1.55, max 66ch): prose and result bullets; lining tabular figures.
- **Caption** (STIX 400, 16px, line-height 1.5): figure captions; the project name inside is STIX bold.
- **Label** (Archivo 400, 14px, line-height 1.4, Ink-2): status line, metadata, stacks, table captions, readouts.
- **Axis** (Archivo 400, 12px; 9.6px inside SVG plates): tick values and in-figure annotation, Ink-2.

### Named Rules
**The Numbers Are Sans Rule.** Figure and table numbers, axis ticks, key ranges and dates set in Archivo; sentences set in STIX.

**The Tabular Figures Rule.** All text uses lining tabular numerals so columns of numbers align.

## Layout

A single centered sheet, max 1280px, with a fluid gutter (clamp(16px, 4vw, 56px)). The first viewport splits 5/12 intro and 7/12 Fig. 1. Below it, each section opens with a 1.5px Ink rule, 16px of top padding, and a section gap of clamp(64px, 9vw, 112px); the footer gap is clamp(80px, 10vw, 128px).

Content sections use a 3/12 heading column and 9/12 content column. Selected work is a four-column small-multiples grid (32px row gap, 24px column gap). Experience rows are a three-column table (8em date, 12em organization, flexible results) divided by Rule hairlines with 18px vertical padding.

Spacing steps are 4, 8, 16, 24 and 32px, with 10 to 12px used for caption and key offsets. Prose is capped at 66ch.

Breakpoints: at 1100px the multiples drop to two columns; at 900px the hero and split sections stack to one column and experience rows collapse; at 560px the multiples go to one column and the skills table steps down to 15px.

## Elevation & Depth

The system is flat. There are no shadows; depth is conveyed only by the Plate ground sitting inside a Rule hairline on Paper, and by heavy Ink rules dividing sections. The one box-shadow in the build is a zero-offset 0.15em spread on draft marks, used as a highlight halo, not elevation.

### Named Rules
**The Flat Sheet Rule.** Surfaces never lift; separate them with a ground change and a hairline.

## Shapes

Corners are square. The primary button rounds to 2px and draft marks to 1px; frames, plot fields, toggles, keys and swatches are sharp. Borders are 1px Rule hairlines for frames and dividers, 1.5px Ink for section and table-header rules, 1px Ink for drawing strokes. Drawings use dashed strokes (3 2) for thresholds, ancillas and optional paths, and small solid triangular arrowheads.

## Components

### Buttons
- **Shape:** nearly square (2px).
- **Primary:** solid Ink with Paper text, Archivo 700 16px, 12px 18px padding, no underline. One per first viewport and one in the footer, always the resume.
- **Hover / Focus:** fill shifts to ramp step r5; focus shows the global 2px Hot outline at 3px offset.
- **Toggle group:** transparent, Ink text, Archivo 600 14px, 1px Rule border, adjoining buttons share a border, min height 36px. Pressed state is solid Ink with Paper text; hover darkens the border to Ink-2.

### Links
- **Style:** inherit color, 1px underline at 0.2em offset. Hover thickens to 2px and turns the underline Hot. Nav links drop the underline at rest and show a Hot underline on hover.

### Figure Plate
- **Frame:** Plate ground, 1px Rule border, 10px inset, square corners, SVG drawn to full width at a 200 x 120 viewBox.
- **Drawing:** Ink strokes, Plate-filled boxes, Ink-2 annotation text, Quiet fills for context data, and one emphasized event (a Mark fill, an Ink emphasis line, or both).
- **State:** on plate hover or focus-within, the Mark fill and the Ink emphasis line transition to Hot over 0.25s on cubic-bezier(0.16, 1, 0.3, 1).
- **Caption:** `Fig. n` in figure-number type, project name in STIX bold, caption prose, an Ink-2 note when data is illustrative, then a label row of stack items and exactly one action link in Ink 600.

### Fig. 1 Heatmap
The signature component: a 32 x 18 binned field on Plate inside a Rule hairline, Ink-2 axis ticks outside the field, a crosshair cursor, Draw / Query toggles above and Reset at the right, a stepped six-swatch key right-aligned under the plot, the caption, and a live Label readout.

### Stepped Key
A label ("Samples per bin") followed by six flush 10px swatches in ramp order with 1px gaps, each with its centered 12px range below, at most 22em wide.

### Tables
A `Table n` caption in Label type above, Ink-2 Archivo 600 14px column heads over a 1.5px Ink rule, Archivo 700 row heads, 1px Rule row dividers, 10px vertical cell padding, left aligned.

### Draft Mark
Placeholder copy sits in a `mark` with the Draft ground, inherited ink, a 0.15em halo and 1px radius, so unwritten copy is visible at a glance and never mistaken for final text.

## Do's and Don'ts

### Do:
- **Do** open every figure caption with a bold Archivo `Fig. n` and every table with `Table n` in its caption above.
- **Do** frame every drawing in a Plate ground with a 1px Rule border and 10px inset.
- **Do** give each plate one emphasized event and let it go Hot on hover and focus-within.
- **Do** use the six ramp steps in order to encode quantity and show them in a stepped key with ranges.
- **Do** label illustrative data in the caption with an Ink-2 note.
- **Do** open each section with a 1.5px Ink rule and an Archivo 800 headline.
- **Do** set placeholder copy in a Draft mark until Evan writes it.
- **Do** define every color as a token with a dark-mode counterpart in the same `:root` override.

### Don't:
- **Don't** add shadows, gradients or rounded cards; separate surfaces with Plate ground and hairlines.
- **Don't** introduce a hue outside the magma ramp, Quiet family and Draft.
- **Don't** use Hot at rest; it is the response to hover, focus-within and focus.
- **Don't** set sentences in Archivo or numbers in STIX.
