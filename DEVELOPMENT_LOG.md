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
