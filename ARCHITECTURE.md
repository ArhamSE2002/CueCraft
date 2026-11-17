# CueCraft Architecture Specification
**Version:** 1.0.0  
**Status:** Living Document  

---

## 1. System Overview

CueCraft is structured as an Astro-centered application integrating interactive React islands for high-performance Canvas 2D and Three.js 3D gameplay simulations, backed by a headless TypeScript physics engine.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      Astro 5+                          │
                    │   Static Site Generation & Content Collections (SSG)   │
                    │   - Marketing Landing Page (/)                         │
                    │   - Educational Articles (/learn, /learn/[slug])       │
                    │   - Interactive Scenarios (/lessons, /lessons/[slug])  │
                    │   - Product Mission (/about)                           │
                    └──────────────────────────┬─────────────────────────────┘
                                               │ Hydrates interactive islands
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               React Interactive Islands                │
                    │   - Gameplay Viewport Container (/play)                │
                    │   - Interactive Hero Physics Demonstration (/)         │
                    │   - Tactical Aiming & Power HUD                        │
                    │   - Millimeter Spin Selector Widget                    │
                    └──────────────────────────┬─────────────────────────────┘
                                               │ Dispatches player inputs
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │            Zustand Global Configuration Store          │
                    │   - Active Rendering Mode: '2d' | '3d'                 │
                    │   - Simulation Mode: 'practice' | 'lesson' | 'game'    │
                    │   - Aim Vector (angle, fineOffset)                     │
                    │   - Cue Ball Strike Offset (spinX, spinY, power)       │
                    │   - Trajectory Projection Toggles (ghostBall, rays)    │
                    └──────────┬───────────────────────────────┬─────────────┘
                               │ Reads state                   │ Reads state
                               ▼                               ▼
       ┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
       │     Canvas 2D Table Renderer        │   │       Three.js 3D Renderer          │
       │   - Native HTML5 Canvas 2D          │   │   - Procedural PBR Snooker Table    │
       │   - Retina DPI Scaling              │   │   - Dynamic Overhead Spotlights     │
       │   - Sub-pixel Baize & Shadows       │   │   - Physical Ball Materials         │
       │   - Instant Trajectory Vector Rays  │   │   - Orbit & Cue Follow Cameras      │
       └───────────────────┬─────────────────┘   └──────────────────┬──────────────────┘
                           │ Consumes visual state                  │ Consumes visual state
                           └───────────────────┬────────────────────┘
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │             Headless Physics Engine (Pure TS)          │
                    │   - 100% Decoupled from DOM, Canvas, Three.js, React   │
                    │   - Fixed-timestep Integration (dt = 1/120s)           │
                    │   - Sliding Friction & Rolling Resistance on Cloth     │
                    │   - 2D Rigid Sphere Elastic Collisions (Impulse)       │
                    │   - Cushion Normal Restitution & Tangential Friction   │
                    │   - Topspin / Backspin / Side-spin Ballistics          │
                    │   - Deterministic Multi-Step Trajectory Raycasting     │
                    └────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Module Boundaries

- `src/engine/`: Pure, deterministic TypeScript physics and snooker logic.
  - `math/`: `Vector2D`, `Vector3D`, geometric ray-circle and ray-box intersection algorithms.
  - `physics/`: Integrators, collision resolution, friction matrices, spin transfer equations.
  - `table/`: Standard championship table geometries (dimensions, pockets, cushion normals).
  - `rules/`: Snooker foul detection, ball potting, ball respawning on spots.
- `src/renderers/`:
  - `2d/`: `Canvas2DRenderer.ts`, high-DPI scaling, overlays for ghost balls and trajectory rays.
  - `3d/`: `ThreeRenderer.ts`, lazy-loaded Three.js scene, materials, lighting, camera controllers.
- `src/stores/`:
  - `gameStore.ts`: Zustand store for aiming, power, selected spin, mode toggles, telemetry.
- `src/components/`:
  - `game/`: Canvas viewport wrapper, spin selector, power slider, mode switcher.
  - `landing/`: Editorial hero, interactive physics showcase, feature sections.
  - `ui/`: Design system primitives (buttons, badges, telemetry cards).
- `src/pages/`: Astro routes.
- `src/content/`: Snooker learning articles and interactive lesson scenario schemas.

---

## 3. Data Flow & Rendering Loop

1. **Input Stage**:
   - Player drags on table canvas to set aiming vector $\vec{u}_{aim}$.
   - Player drags on Spin Selector widget to set tip contact point $(x_c, y_c) \in [-1, 1]^2$.
   - Player adjusts power slider $P \in [0, 100]\%$.
2. **Trajectory Prediction**:
   - Engine performs a rapid lookahead raycast:
     - Detects closest ball or cushion in line of aim.
     - Calculates ghost ball location $P_{ghost}$.
     - Computes normal collision impulse direction and resulting deflection angles for both object ball and cue ball.
     - Projects cushion reflection path.
3. **Execution Stage**:
   - On shot strike, an impulse $J = f(P)$ and angular torque $\vec{\tau} = \vec{r}_c \times \vec{J}$ are applied to the cue ball.
   - The simulation loop steps forward at fixed $\Delta t = \frac{1}{120}\text{ s}$ until all balls come to rest ($|\vec{v}| < \epsilon$ and $|\vec{\omega}| < \epsilon$).
4. **Render Stage**:
   - The active renderer (2D or 3D) reads `physicsEngine.getBallStates()` and paints each ball at its exact position, with drop shadows and spin rotation.

---

## 4. Portability & Extensibility

- **Branding Isolation**: All product names, URLs, and meta tags are driven by `src/config/site.ts`. The working name "CueCraft" can be rebranded across the entire platform in a single config edit.
- **Backend Ready**: The architecture provides clean hook points for Supabase authentication, cloud scenario saving, and multiplayer WebSocket synchronization without refactoring the core simulation.
