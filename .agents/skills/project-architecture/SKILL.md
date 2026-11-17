---
name: project-architecture
description: Guidelines and architectural patterns for CueCraft. Covers separation of concerns between Astro static pages, React interactive islands, the headless physics engine, 2D/3D renderers, and shared state stores. Use whenever designing, refactoring, or integrating system layers.
---

# CueCraft Project Architecture

CueCraft is designed as a hybrid platform uniting two primary experiences:
1. **The Website**: A high-performance, SEO-optimized editorial & marketing platform built with Astro Islands.
2. **The Gameplay Application**: A high-precision snooker simulation supporting both 2D Canvas and 3D Three.js rendering modes powered by a headless, deterministic physics engine.

## Core Architectural Principles

1. **Decoupled Physics Engine**:
   - The physics simulation lives in `src/engine/physics/` and has ZERO dependencies on DOM, Canvas 2D, Three.js, or React.
   - It operates on pure TypeScript data structures (vectors, rigid bodies, contact points, collision manifolds).
   - Simulates in fixed timesteps (`dt = 1/120s` or `1/60s`) for numerical stability and determinism.

2. **Islands Architecture via Astro**:
   - Astro handles page routing, layout templating, and static content generation (`/`, `/learn`, `/learn/[slug]`, `/lessons`, `/about`).
   - React components are mounted only as interactive islands where user state, simulation controls, or 2D/3D canvases are required (`client:load` or `client:visible`).
   - Zero unnecessary JavaScript shipped to marketing or article pages.

3. **Pluggable Rendering Pipeline**:
   - Both 2D (`CanvasTableRenderer`) and 3D (`ThreeTableRenderer`) act as visual consumers of the physics state (`TableState` and `BallState[]`).
   - Rendering never mutates physics state directly; it dispatches player actions (aim vector, cue impact, spin impulse) to the physics controller.

4. **Layered State Management**:
   - High-frequency simulation state (ball positions, velocities, spin, contacts) resides in a lightweight mutable physics buffer or typed controller. React state is NOT updated per-frame.
   - Low-frequency UI state (active mode, selected cue ball spin, aiming power, game score, camera presets) is managed via Zustand stores (`src/stores/`).

## Directory Structure Conventions

```
src/
├── engine/                # Core simulation logic (Headless)
│   ├── math/              # Vector2D, Vector3D, Matrix, Angles
│   ├── physics/           # Collisions, friction, cloth, spin dynamics
│   ├── table/             # Snooker dimensions, cushion geometry, pockets
│   └── rules/             # Snooker rules, foul detection, score tracking
├── renderers/             # Visual presentation adapters
│   ├── 2d/                # HTML5 Canvas 2D renderer & overlays
│   └── 3d/                # Three.js scene, lighting, meshes, shaders
├── components/            # React UI components & islands
│   ├── game/              # Game canvas shell, aim controls, power slider
│   ├── landing/           # Editorial hero, showcase, physics demo
│   └── ui/                # Accessible design system elements
├── layouts/               # Astro base layouts
├── pages/                 # Astro route handlers
├── content/               # Markdown/MDX learning articles & scenarios
├── stores/                # Zustand client state stores
└── utils/                 # General helpers and constants
```

## Workflow

1. Define or update domain models in `src/engine/`.
2. Write unit tests in `tests/physics/` verifying numerical accuracy.
3. Bind engine states to the 2D canvas renderer first to establish visual truth.
4. Expose high-level reactive properties via Zustand stores for React HUD / control islands.
5. Extend to 3D renderer by mapping physics coordinates to Three.js coordinate space (X/Z table plane).

## Checklist

- [ ] Does `src/engine/` remain 100% free of browser/UI dependencies (`window`, `document`, React, Three.js)?
- [ ] Are simulation updates running on a fixed delta time (`dt`)?
- [ ] Are React re-renders avoided inside `requestAnimationFrame` simulation loops?
- [ ] Are 3D assets and Three.js dynamically loaded so the initial bundle stays minimal?
