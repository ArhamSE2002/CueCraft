# CueCraft

> **Interactive Snooker Learning, Simulation & Ballistics Lab**  
> Built with Astro 5 Islands, React 19, TypeScript, Tailwind CSS, Zustand, HTML5 Canvas 2D, and lazy-loaded Three.js 3D — powered by a deterministic headless rigid-body physics engine.

---

## Overview

CueCraft combines a structured snooker physics curriculum with an interactive **2D & 3D snooker simulator**. Both rendering modes share the exact same pure TypeScript physics core, allowing learners and players to dissect cue-ball kinematics, millimeter tip contact offsets, spin curves, multi-cushion rebounds, and equipment behavior before transitioning smoothly between top-down geometric analysis and immersive 3D camera angles.

---

## Key Features

### 1. Deterministic Physics & 1:1 Trajectory Simulation (`src/engine/`)
- **Headless Fixed-Timestep Core (`PhysicsEngine.ts`)**: Pure TypeScript engine completely decoupled from DOM/rendering, stepping at `FIXED_DT = 1/60s` with `4` substeps (`240 Hz` integration).
- **2D Rigid-Body Spin & Surface Slip (`Ball.ts`, `Cloth.ts`, `Collisions.ts`)**:
  - Tracks 2D rolling-equivalent surface velocity (`rollVel`) alongside linear velocity so screw-back curves, topspin follow arcs, and dead-stop stuns behave physically across any cut angle.
  - Models cue squirt (deflection), cut-induced throw, spin-induced throw, elevated-cue swerve/masse force, and vertical-axis yaw spin decay.
- **Ghost-Simulation Trajectory Prediction (`Full Route` vs. `Aim Ray`)**:
  - In `Full Route` mode, runs a memoized clone of the live fixed-step physics engine until balls settle—displaying exact curved screw/follow arcs, cushion border reflections, secondary collisions, and full paths for both the cue ball and **all struck object balls**.
- **Pre-Strike vs. Post-Strike Shot Telemetry (`ShotLogPanel.tsx`)**:
  - Logs predicted stopping coordinates, travel distances, and pot outcomes against actual executed results (`Δ Cue` and `Δ Target` error telemetry).

### 2. Equipment & Table Physics Customization (`src/engine/equipment/Equipment.ts`)
Open **Table & Cue Lab** inside `/play` to adjust table conditions with live explanations of the physical impact:
- **Cue Shafts**: *Classic Ash Championship*, *Carbon Fiber Pro (Low Deflection)*, *Power Break Heavy Maple*, and *Finesse Tapered 9mm*.
- **Cue Tips**: *Soft Elk Leather* (`0.90R`), *Medium Laminated Pro* (`0.85R`), and *Hard Compressed/Phenolic* (`0.72R`).
- **Cloth Surfaces**: *Crucible Worsted (Fast)*, *Strachan Club (Standard)*, and *Heavy Napped Wool (Slow)*.
- **Border / Cushion Strengths**: *Soft/Dead (`e=0.56`)*, *Regulation Club (`e=0.72`)*, *Lively Tournament (`e=0.84`)*, and *High-Elasticity Lab (`e=0.93`)*.

### 3. Dual 2D & 3D Simulation Modes (`/play`)
- **High-DPI 2D Canvas Engine (`CanvasTableRenderer.ts`)**: Regulation 12ft × 6ft table geometry (`3569 × 1778 mm`), Strachan baize shading, mahogany rails, dynamic cloth/cue/tip styling, zoom/pan support, ghost ball indicator, and multi-ball trajectory overlays.
- **Lazy-Loaded Three.js 3D Engine (`ThreeTableRenderer.ts`)**: Code-split on demand when entering 3D mode, featuring:
  - **5 Camera Angles**: `Cue` (with `low` / `med` / `high` stance), `Target` (reverse angle behind object ball), `Side` (profile elevation & curve view), `Top` (bird's-eye), and `Orbit` (360° free drag).
  - **Stiff vs. Follow Camera Toggle (`F`)**: Keep the camera locked during shot execution or track the cue ball dynamically.
  - **3D Table-Plane Raycasting**: Click/drag on the 3D table to aim or reposition balls directly.
- **Precision Controls & Interaction Modes**:
  - **Aim Dial & Sensitivity Selector**: `0.05°`, `0.1°`, `0.5°`, and `2°` precision steps, continuous range slider, coarse `±5°` steppers, and multi-tier arrow key controls.
  - **Spin & Elevation Selector**: Interactive cue-ball face with tip-dependent safe zone, `0°–85°` butt elevation slider, and 8 spin presets (`Follow`, `Stun`, `Screw`, `Right`, `Left`, `SideDraw`, `Swerve`, `Masse80°`).
  - **Move Balls Mode (`M`)**: Drag any ball anywhere on the table in 2D or 3D with automatic overlap prevention.

### 4. Interactive Physics Curriculum (`/learn`, `/learn/[slug]`, `/lessons`)
- **6 Educational Articles (`/learn/[slug]`)**: Covers cue-ball control, side spin & swerve, cushion rebounds, collision angles, speed/distance, and topspin/backspin with Schema.org JSON-LD metadata.
- **Embedded Lecture Labs (`LessonPlayLab.tsx`) & Guided Drills (`scenarios.ts`)**: Every lecture embeds a playable canvas tuned to its physics topic and links straight into `/play?scenario=<id>` with preset setups and coaching takeaways.

---

## Project Structure

```text
src/
├── components/
│   ├── game/          # GameShell, SpinSelector, PowerControl, EquipmentLabPanel, ShotLogPanel
│   ├── landing/       # InteractiveHeroDemo
│   ├── learn/         # LessonPlayLab (embedded lecture simulator)
│   └── ui/            # LoadingScreen, ShortcutsOverlay
├── config/            # site.ts branding & scenarios.ts playable drills
├── engine/
│   ├── equipment/     # Cue, tip, cloth & cushion physics specifications
│   ├── math/          # Vector2D immutable math primitives
│   ├── physics/       # Ball, Cloth, Collisions, Cushions, PhysicsEngine
│   └── table/         # SnookerTable dimensions, spots, pockets & rails
├── layouts/           # BaseLayout.astro
├── pages/             # index.astro, play.astro, about.astro, learn/*, lessons/*
├── renderers/
│   ├── 2d/            # CanvasTableRenderer.ts
│   └── 3d/            # ThreeTableRenderer.ts (dynamically imported)
└── stores/            # Zustand gameStore.ts
```

---

## Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
# Starts Astro dev server at http://localhost:4321/
```

### Run Test Suite
```bash
npm test
```
Runs the Vitest suite (35 tests across 6 test files covering conservation of momentum, 90° tangent separation, 2D spin/screw-back dynamics, 1:1 trajectory prediction vs. live execution error, pocket capture, `moveBall()` containment, store clamping, and route verification).

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## Routes
- `/` — Editorial homepage with live interactive physics demonstration
- `/play` — Main 2D/3D snooker simulator (`?mode=3d`, `?rack=championship`, `?scenario=<id>`)
- `/learn` — Snooker physics curriculum index
- `/learn/[slug]` — Individual physics articles with embedded interactive simulation labs
- `/lessons` — Guided practice scenarios & drills
- `/about` — Platform philosophy & architecture overview

---

## Architectural Documentation
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System boundaries, data flow, and module contracts
- [`PHYSICS_MODEL.md`](./PHYSICS_MODEL.md) — Mathematical equations and derivations
- [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md) — Typography, color tokens, and visual design principles
- [`ROADMAP.md`](./ROADMAP.md) — Phased implementation roadmap
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — Engineering milestone log
- [`TASKS.md`](./TASKS.md) — Task checklist
