# CueCraft UI & Visual Design System
**Version:** 1.0.0  
**Status:** Approved & Baseline Established  
**Working Title:** CueCraft  

---

## 1. Brand Identity & Creative Exploration

CueCraft is a modern, high-precision snooker learning and gaming platform. It sits at the intersection of championship British billiards heritage and cutting-edge sports physics visualization.

### Exploration: Two Visual Direction Concepts

Before arriving at the final identity, we evaluated two distinct aesthetic philosophies:

#### Concept A: "The High-Tech Telemetry Lab" (Futuristic Cyber-Billiards)
- **Palette**: Deep obsidian `#05080E`, stark electric cyan `#00F0FF`, neon lime `#39FF14`, cold white `#FFFFFF`.
- **Aesthetic**: HUD overlays with hexagonal wireframes, high-contrast neon vector grids, glowing trajectory laser beams, dark glassmorphism.
- **Tone**: Analytical, futuristic, esports-centric.
- **Evaluation**: While impressive for raw telemetry, it strips away the gravitas, warmth, and tactile soul of snooker. Snooker is revered for its quiet concentration, green baize, polished mahogany rails, brass corners, and chalk dust. Concept A felt too much like an arcade laser shooter.

#### Concept B: "Championship Heritage & Precision Ballistics" (The Grand Masters Club) — **SELECTED**
- **Palette**: Royal West-of-England felt green (`#0B2B1E`), midnight slate (`#0A0D12`), warm parchment ivory (`#F5F2EB`), and brushed championship brass (`#C5A059`).
- **Aesthetic**: Refined British sporting club elegance paired with crisp, razor-sharp mathematical trajectory overlays, millimeter-accurate spin ballistics, and rich physical textures.
- **Typography**: A prestigious, editorial display serif paired with ultra-clean modern sans and tabular telemetry data.
- **Tone**: Masterful, prestigious, deeply satisfying, scientifically rigorous.
- **Why Concept B Won**: It respects the 150-year heritage of the sport while elevating it with 21st-century computational physics. It avoids generic SaaS/crypto clichés (no purple blobs, no cookie-cutter cards, no cheap neon).

---

## 2. Core Color Palette & Design Tokens

### Primary Table & Brand Hues
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--felt-darkest` | `#05160E` | Deepest table felt shadow, vignetted outer table borders |
| `--felt-surface` | `#0B2B1E` | Authentic championship Strachan No. 10 cloth baize |
| `--felt-light` | `#134430` | Illuminated felt under overhead canopy spotlights |
| `--felt-accent` | `#1D6648` | Interactive table hover zones & active aiming guides |

### Surface & Atmosphere (Dark Mode Standard)
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--surface-base` | `#080B0F` | Main application background (deepest midnight slate) |
| `--surface-card` | `#0E141C` | Elevated containers, control docks, lesson panels |
| `--surface-elevated` | `#161F2B` | Modals, active control bays, floating telemetry widgets |
| `--border-subtle` | `#1F2B3A` | Structural dividers, hairline table guide frames |
| `--border-focus` | `#33465C` | Active interactive element borders |

### Championship Accents & Ballistics
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--brass-primary` | `#C5A059` | Hand-rubbed brass corner plates, primary CTA accents |
| `--brass-hover` | `#DFC07C` | Active hover state for brass controls |
| `--brass-muted` | `#786033` | Inactive brass trims, coordinate axes, subtle badges |
| `--chalk-cyan` | `#2DD4BF` | Subtle chalk highlight for ghost ball & impact points |
| `--screw-red` | `#EF4444` | Backspin (screw) telemetry vectors & red balls |
| `--follow-blue` | `#38BDF8` | Topspin (follow) trajectory vectors |

### Editorial Typography Colors
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--text-ivory` | `#F7F5EE` | Primary headlines, crisp readouts, high contrast |
| `--text-body` | `#C8CFDA` | Editorial prose, instructional explanations |
| `--text-muted` | `#7D8796` | Technical footnotes, labels, secondary metadata |

---

## 3. Typography Scale & Hierarchy

We pair classical editorial weight with crisp technical legibility.

1. **Display & Editorial Serif**:
   - Primary: `Cinzel`, `Playfair Display`, or system serif `Georgia, serif`
   - Weight: `600`, `700`
   - Usage: Hero headlines, section titles, prestigious lesson headers.
2. **Body & Interface Sans**:
   - Primary: `Plus Jakarta Sans`, `Inter`, system sans-serif
   - Weight: `400` (Body), `500` (Medium), `600` (Semi-bold)
   - Usage: UI controls, descriptions, instructions, button labels.
3. **Telemetry & Math Monospace**:
   - Primary: `JetBrains Mono`, `ui-monospace`, monospace
   - Usage: Real-time ball coordinates $(x, y)$, angle degrees ($^\circ$), cue speed ($\text{m/s}$), spin coordinates. Always rendered with `font-variant-numeric: tabular-nums`.

---

## 4. Spacing & Spatial Discipline

- Base Grid: 4px increments (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`).
- Radius Discipline:
  - Table corners: True snooker pocket jaw geometry (curved leather drops).
  - HUD / Control Panels: Subtle, refined corners (`rounded-lg` = 8px; `rounded-xl` = 12px). Avoid excessive pill-shaped buttons.
  - Buttons: Precise 6px–8px radius, echoing tailored craftsmanship.

---

## 5. Visual Restraint & Anti-Patterns Checklist

- [x] NO generic purple-blue linear gradients.
- [x] NO identical repetitive cards with random icons in circles.
- [x] NO fuzzy, low-contrast text on dark backgrounds.
- [x] NO fake product mockups; every preview demonstrates true game canvas architecture.
- [x] NO distracting continuous background particle storms.
- [x] Motion exists to serve pedagogical clarity: showing ball deflection, spin rotation, and collision tangents.
