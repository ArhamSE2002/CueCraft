# CueCraft 🎱

> **Precision Snooker Learning, Simulation & Gaming Platform**  
> Built with Astro 5 Islands, React 19, Tailwind CSS, TypeScript, and a custom Headless Rigid-Body Physics Engine.

---

## Quick Start & Running the Project

The server is currently running locally. You can access it directly at:
- **Landing Page:** [http://localhost:4321/](http://localhost:4321/)
- **Interactive Simulator:** [http://localhost:4321/play](http://localhost:4321/play)
- **Learning Center:** [http://localhost:4321/learn](http://localhost:4321/learn)
- **Guided Lessons:** [http://localhost:4321/lessons](http://localhost:4321/lessons)
- **Platform Architecture:** [http://localhost:4321/about](http://localhost:4321/about)

---

## Available Commands

### 1. Start Development Server (Hot Reload)
```bash
npm run dev
# or
npx astro dev --port 4321
```
Spins up the Astro local development server at `http://localhost:4321/`.

### 2. Run Test Suite
```bash
npm test
```
Runs the full Vitest suite (26 tests covering linear momentum conservation, 90-degree tangent separation, screw-back draw mechanics, cloth rolling friction, cushion rebounds, and SSG route generation).

### 3. Build for Production
```bash
npm run build
```
Compiles and generates all 11 static HTML pages and client bundles to the `dist/` directory.

### 4. Preview Production Build
```bash
npm run preview
```
Serves the compiled production build locally for performance and audit testing.

---

## Key Features

1. **Headless Deterministic Physics (`src/engine/physics/`):**
   - Decoupled from DOM and canvas APIs.
   - Fixed-timestep integration ($\Delta t = 1/120\,\text{s}$).
   - Phenolic resin elastic collision impulses ($e = 0.96$).
   - Cloth sliding friction ($\mu_s = 0.22$) vs. pure rolling resistance ($\mu_r = 0.015$).
   - Authentic screw-back (draw) and topspin (follow) transition mechanics.
   - Cushion rubber normal restitution ($e_c = 0.72$) and tangential side-spin interaction (running vs. check side).
2. **High-DPI Retina 2D Canvas Engine (`src/renderers/2d/`):**
   - Regulation 12ft × 6ft table geometry (3569 mm × 1778 mm).
   - Strachan No. 10 cloth baize texture with subtle canopy spotlight shading.
   - Sub-pixel ball drop shadows, specular highlights, and animated wooden cue stick.
   - Real-time trajectory prediction raycasting, ghost ball indicator, and deflection tangents.
3. **Tactile Gameplay Interface (`/play`):**
   - Millimeter Cue Tip Contact Spin Selector.
   - Haptic-feeling power gauge (0% to 100%).
   - Aim Dial with $\pm 0.3^\circ$ and $\pm 2.0^\circ$ fine-tuning steppers.
   - Instant rack switching (*Practice Mode* vs. *Championship 22-Rack*).
4. **Editorial Learning Center (`/learn` and `/lessons`):**
   - Structured guides on cue ball control, side spin ballistics, cushion restitution, and collision angles.
   - Schema.org JSON-LD structured data for SEO indexing.

---

## Architectural Documentation
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System boundaries, data flow, and module contracts.
- [`PHYSICS_MODEL.md`](./PHYSICS_MODEL.md) — Mathematical formulas and derivations.
- [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md) — Visual tokens, typography, and palette specifications.
- [`ROADMAP.md`](./ROADMAP.md) — Multi-phase implementation roadmap.
- [`TASKS.md`](./TASKS.md) — Living task tracker.
