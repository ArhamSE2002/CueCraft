# CueCraft Development Log

## [2026-11-18] - Phase 0 & Initial Milestone Kickoff

### Architectural Decisions
- **Framework Choice**: Astro 5+ selected as the host SSG foundation to satisfy strict SEO and performance constraints while allowing fine-grained React islands for interactive canvas/gameplay experiences.
- **Physics Engine Isolation**: Built a custom, pure TypeScript physics engine (`src/engine/physics/`) with zero framework or DOM coupling. This ensures deterministic unit testing, reusable simulation across both 2D and 3D renderers, and zero overhead on static pages.
- **Visual Direction Selected**: Selected "Championship Heritage & Precision Ballistics" over futuristic neon aesthetics. Color scheme anchored in West-of-England championship felt (`#0B2B1E`), midnight slate (`#080B0F`), warm ivory (`#F7F5EE`), and hand-rubbed brass (`#C5A059`).
- **Animation Strategy**: Implemented Emil Kowalski animation principles (`animate` skill) and `frontend-design` standards to eliminate AI-generated design clichés (no repetitive rounded cards, no purple gradients, no purposeless particle fields).

### Infrastructure Established
- Initialized Git repository.
- Installed 5 required agent skills: `frontend-design`, `animate`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`.
- Created 8 custom project skills in `.agents/skills/`:
  - `project-architecture`
  - `astro-seo-performance`
  - `snooker-physics`
  - `canvas-2d-engine`
  - `threejs-3d-engine`
  - `snooker-ui-design`
  - `testing-and-quality`
  - `project-documentation`
- Created core documentation suite:
  - `ARCHITECTURE.md`
  - `ROADMAP.md`
  - `PHYSICS_MODEL.md`
  - `UI_DESIGN_SYSTEM.md`
  - `PERFORMANCE_GUIDELINES.md`
  - `DEVELOPMENT_LOG.md`
  - `TASKS.md`

### Implementation & Testing
- Developed headless rigid-body snooker physics engine (`Vector2D`, `Ball`, `Cloth`, `Collisions`, `Cushions`, `SnookerTable`, `PhysicsEngine`).
- Implemented and passed all 6 deterministic Vitest unit tests (linear momentum conservation, 90-degree tangent separation, rolling friction deceleration, screw-back draw dynamics, cushion rebound restitution, trajectory raycasting).
- Built high-DPI Retina Canvas 2D table renderer with Strachan cloth baize, mahogany rails, brass pocket caps, 3D ball spheres with drop shadows, aim line, cue stick pullback, and ghost ball overlays.
- Created full interactive gameplay shell (`/play`) with Zustand store, tactile power gauge, millimeter spin selector, and aim fine-tuner.
- Built editorial landing page (`/`) featuring an interactive hero physics demonstration island, 2D/3D dual-engine showcase, and curriculum highlights.
- Built supporting SEO educational pages (`/learn`, `/learn/[slug]`, `/lessons`, `/about`) with JSON-LD schema.
- Verified in live Chrome browser via browser subagent: verified both landing page animations and interactive `/play` snooker gameplay.

## [2026-11-18] - Phase 1: Major Quality, Precision Aiming & 3D Simulation Overhaul

### Multi-Cushion Full-Route Prediction Engine
- **Full Route Trajectory**: Extended `PhysicsEngine.calculateTrajectory()` with `traceFullRoute()` up to 8 cushion reflections with energy dissipation (`CUSHION_ENERGY = 0.72`) and ball contact detection.
- **Route Mode Toggle**: Integrated `showFullRoute` state in `useGameStore` with dedicated toolbar toggle button (`Route` icon) and keyboard shortcut (`R`).
- **Visual Distinction**: Multi-bounce cushion paths render with progressive opacity decay (`alpha = 0.65^bounce`), bounce marker dots at reflection origins, and dashed brass guidelines.

### Sub-Degree Precision Aiming System
- **Continuous Analog Slider**: Replaced coarse button-only steps with a continuous 0.05° resolution rotational slider (0.0° - 359.9°).
- **3-Tier Keyboard Aiming**:
  - `ArrowLeft` / `ArrowRight`: Fine adjustment (0.003 rad ≈ 0.17°).
  - `Shift` + Arrow: Precision sub-degree adjustment (0.001 rad ≈ 0.057°).
  - `Ctrl` + Arrow: Quick coarse adjustment (0.035 rad ≈ 2.0°).
- **Dynamic Telemetry**: Live readout of aim angle and cut angle in the top HUD bar.

### 3D Three.js Engine Polish & Optimization
- **Championship Table Details**: Added 8 turned mahogany legs with brass leveling feet, apron skirts, Strachan cloth baulk line, the "D" semicircle, spots, and leather drop pocket geometries.
- **3D Trajectory Rendering**: Full 3D path visualization for cue ball path, cushion reflections, target ball direction (red), cue ball deflection (cyan), and ghost ball ring.
- **Dynamic Code-Splitting**: Three.js dynamically imported on demand (`await import(...)`), reducing the initial `GameShell` bundle from 519 kB down to **36.01 kB (9.8 kB gzip)**!
- **Smooth Camera Interpolation**: Added smooth lerping for tactical (cue line), overhead (birds-eye), and free orbit camera modes.

### UI Polish & UX Improvements
- **Loading Screen**: Built `LoadingScreen.tsx` with animated rolling cue ball, gold progress bar, woven felt texture, and smooth entrance/exit transitions.
- **Shortcuts Overlay**: Built `ShortcutsOverlay.tsx` (`?` key toggle) documenting all keyboard controls.
- **Testing**: Added unit test coverage for multi-cushion full-route trace and state toggles (30/30 tests passing).
