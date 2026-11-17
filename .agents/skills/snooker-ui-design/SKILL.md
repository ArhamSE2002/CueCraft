---
name: snooker-ui-design
description: Design system rules and UI principles for CueCraft. Covers visual identity (British billiards heritage meets modern sports science), deep felt green and dark slate palette, muted brass accents, typography pairings, HUD design, spin selector, and responsive layout constraints.
---

# CueCraft UI & Visual Design System

CueCraft blends the prestigious, refined heritage of traditional British snooker clubs with the analytical precision of cutting-edge biomechanics and sports simulation.

## Visual Identity & Color Palette

- **Felt / Table Greens**:
  - `felt-deep`: `#061C12` (rich dark canvas / background depth)
  - `felt-emerald`: `#0D3823` (table baize shade)
  - `felt-accent`: `#1B5E3C` (interactive baize hover & focus)
- **Charcoal & Slate Foundation**:
  - `surface-base`: `#0B0E11` (primary app & site background)
  - `surface-elevated`: `#13181F` (panels, cards, control bays)
  - `surface-subtle`: `#1C232D` (borders, dividers, inactive states)
- **Brass & Championship Gold Accents**:
  - `gold-brass`: `#C5A059` (primary accent, buttons, key indicators)
  - `gold-bright`: `#E5C378` (hover states, active highlights)
  - `gold-muted`: `#826938` (subtle badges, guidelines)
- **Warm Editorial Typography**:
  - `text-primary`: `#F5F2EB` (warm ivory, high legibility)
  - `text-secondary`: `#9FA7B3` (slate gray for metadata & labels)
  - `text-muted`: `#636C78` (helper text, coordinate labels)

## Typography Pairings

- **Headlines & Editorial Display**: High-character serif with classic British tailoring and optical elegance (e.g. *Cinzel*, *Cormorant Garamond*, or *Playfair Display* / *Instrument Serif*).
- **Body & Sports Science Data**: Clean, precise sans-serif with high tabular clarity and legibility (e.g. *Outfit*, *Plus Jakarta Sans*, or *Inter*).
- **HUD & Telemetry Readouts**: Monospace tabular numerals for ball coordinates, velocity, angles, and power percentages (e.g. *JetBrains Mono* or *Space Mono*).

## Gameplay Layout Principles

1. **Table Primacy**:
   - The snooker table must command 80%+ of the visible viewport in play mode.
   - HUD overlays and toolbars must never obstruct the cushion rails or pocket mouths.

2. **Specialized Controls**:
   - **Spin Control Widget**: A circular tactile cue ball widget allowing users to click/drag to position the cue tip impact point with millimeter precision. Shows live coordinates $(x, y)$ and spin type (Screw, Follow, Left/Right English).
   - **Power Slider**: Elegant vertical or horizontal gauge with percentage readout, haptic-feeling notches (soft, medium, firm, break power), and fine-tuning buttons.
   - **Aim Fine-Tuner**: Smooth rotation dial or step buttons ($-0.1^\circ$, $+0.1^\circ$) for precision cuts.

3. **Restraint & Anti-Clichés**:
   - No generic purple/blue gradients or neon glassmorphism.
   - No repetitive rounded cards.
   - Visual accents must stem directly from real snooker materials: baize felt, brass brackets, polished mahogany, white chalk, and phenolic resin balls.

## Checklist

- [ ] Does the color scheme adhere to deep greens, slate charcoal, warm ivory, and muted brass?
- [ ] Are numeric readouts formatted with tabular numerals for stable layout?
- [ ] Is the spin selector intuitive with clear feedback on strike position?
- [ ] Is the interface responsive from mobile screens up to 4K displays?
