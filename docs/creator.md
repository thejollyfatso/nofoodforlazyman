# Plate Vibe Creator — Specification

## Overview

A single-page interactive React app that lets a user design an abstract "plate" by selecting colors and textures for a circular plate divided into segments. The result is a stylized, abstract representation of a food dish — not a literal recreation.

---

## Visual Structure

The plate is composed of two concentric circles rendered as SVG:

- **Outer circle** — the plate rim. Filled with a single user-selected color.
- **Inner circle** — the contents area. Divided into 1, 2, or 3 segments. Each segment has its own independently configured texture and color(s).

The outer circle should be noticeably larger than the inner circle, leaving a visible rim. Suggested ratio: outer radius 200px, inner radius 140px, both centered at the same point.

---

## Division Modes

The inner circle can be divided three ways:

- **Whole** — one single segment filling the entire inner circle
- **Halves** — two equal segments split by a straight line through the center
- **Thirds** — three equal segments split by lines at 0°, 120°, and 240°

The dividing lines should be clean straight lines from center to edge of the inner circle. Division is always equal — no unequal splits.

---

## Textures

Each segment independently receives one of four textures:

### 1. Flat
- Solid fill with a single color
- One color picker

### 2. Stripes
- Evenly spaced parallel lines across the segment
- Lines are diagonal (45°)
- 2 colors: background fill color + stripe line color
- Stripe density: approximately 10–14 stripes visible across the segment

### 3. Rings
- Concentric rings radiating from the center of the plate outward, clipped to the segment
- 2–3 colors alternating
- Ring width should be even and consistent
- Colors rotate: color A, color B, color C (if 3), then repeat

### 4. Splotch
- An organic, irregular pattern suggesting texture — like scattered blobs, rough brush strokes, or uneven patches
- 2–3 colors
- Should feel painterly and loose, not geometric
- Implementation suggestion: use a noise-based or random polygon approach to generate irregular patches within the segment bounds

---

## Color Selection

Every color input uses a **full RGB color picker** — the native browser `<input type="color">` is acceptable for v1.

Color assignments:
- Plate rim: 1 color picker
- Each segment: color pickers determined by its texture type
  - Flat: 1 picker
  - Stripes: 2 pickers (background, stripe)
  - Rings: 2–3 pickers (user can toggle between 2 and 3 ring colors)
  - Splotch: 2–3 pickers (user can toggle between 2 and 3 splotch colors)

---

## UI Layout

- **Left panel** — the plate preview, centered, SVG-rendered, updates live as user makes changes
- **Right panel** — controls, organized top to bottom:
  1. Plate rim color picker
  2. Division selector (whole / halves / thirds) — pill buttons or segmented control
  3. Per-segment controls — one section per segment, labeled "Segment 1", "Segment 2", etc.
     - Texture selector (flat / stripes / rings / splotch) — pill buttons
     - Color pickers relevant to selected texture

All changes update the preview in real time with no submit button needed.

---

## Technical Requirements

- React (Vite)
- SVG rendered inline, not canvas
- Each texture is rendered using SVG — use `<clipPath>` to clip textures to their segment shape
- Segment shapes are SVG `<path>` elements using arc commands to follow the inner circle boundary
- No external dependencies beyond React itself for v1 — all textures implemented in plain SVG
- Splotch texture may use a seeded random function for reproducibility — re-renders should not flicker

---

## File Structure

```
/src
  /components
    PlatePreview.jsx       — SVG plate rendering
    SegmentControls.jsx    — per-segment texture + color UI
    ColorPicker.jsx        — wrapper around input[type=color]
    DivisionSelector.jsx   — whole/halves/thirds control
  App.jsx                  — layout, top-level state
  main.jsx
```

---

## State Shape

```js
{
  rimColor: "#e8d5b0",
  division: "whole" | "halves" | "thirds",
  segments: [
    {
      texture: "flat" | "stripes" | "rings" | "splotch",
      colors: ["#hex", ...] // length depends on texture
    },
    // ...up to 3
  ]
}
```

When division changes, segments array is reset to defaults for the new segment count.

---

## Out of Scope for v1

- Saving or exporting the design
- Multiple plates
- Undo/redo
- Animation
- Mobile layout optimization
