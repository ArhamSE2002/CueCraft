# CueCraft Project Roadmap
**Long-Term Product Plan & Milestones**

---

## Phase 0: Setup & Infrastructure (Current)
- [x] Environment inspection and Git initialization.
- [x] Install third-party skills (`frontend-design`, `animate`, `vercel-labs` skills).
- [x] Author 8 project-specific custom skills inside `.agents/skills/`.
- [x] Establish product branding & visual design system (`UI_DESIGN_SYSTEM.md`).
- [x] Author comprehensive project specifications (`ARCHITECTURE.md`, `PHYSICS_MODEL.md`, `ROADMAP.md`, etc.).
- [ ] Initialize Astro project with React, Tailwind CSS, TypeScript strict mode, and Vitest.

## Phase 1: Product Identity & Design Tokens
- [x] Select "Championship Heritage & Precision Ballistics" direction.
- [ ] Implement Tailwind theme tokens matching British snooker heritage colors (Strachan felt, slate, brass, ivory).
- [ ] Configure typography (Cinzel / Serif display + Plus Jakarta Sans + JetBrains Mono).
- [ ] Implement global motion principles and accessible reduced-motion support.

## Phase 2: Website Implementation (The Public Platform)
- [ ] High-impact editorial Landing Page (`/`):
  - Premium Hero with animated snooker visual narrative.
  - Interactive physics showcase widget (topspin, screw, side spin interactive preview).
  - 2D vs 3D simulation mode showcase.
  - Interactive trajectory ray explanation section.
  - Snooker learning curriculum highlights.
  - Start Playing CTA and refined British club footer.
- [ ] Learning Center (`/learn` and `/learn/[slug]`):
  - Indexable educational articles with rich diagrams and step-by-step cue-ball control physics.
- [ ] Structured Lessons Index (`/lessons`):
  - Scenario catalog for guided practice.
- [ ] Platform Mission & About (`/about`).

## Phase 3: Game Foundation & 2D Canvas Engine
- [ ] Full-screen game shell at `/play` with responsive HUD and control bays.
- [ ] High-DPI Retina Canvas 2D table renderer:
  - Championship 12ft x 6ft snooker table geometry with baize texture, baulk line, "D", and pocket leather drops.
  - Realistic ball spheres with resin specular highlights and soft drop shadows.
- [ ] Interactive controls:
  - Cue ball placement within "D" or free-practice table placement.
  - Mouse/touch drag aiming with fine-tune degree steppers.
  - Haptic-feeling power gauge (0% - 100%).
  - Tactile Millimeter Cue Ball Spin Selector (offset $x_c, y_c$ for screw, follow, and side-spin).
  - Real-time trajectory prediction rays with ghost ball and cushion reflection.

## Phase 4: Headless Physics Engine & Ballistics
- [ ] Pure TypeScript simulation engine:
  - Vector math, fixed-step integrator ($\Delta t = 1/120\text{ s}$).
  - Sliding vs rolling friction transitions.
  - Ball-to-ball elastic collisions with momentum conservation and 90-degree tangent separation.
  - Cushion rebounds with restitution and side-spin friction (running vs check side).
  - Authentic screw-back (draw) and follow-through dynamics.
- [ ] Vitest deterministic physics test suite verifying physical laws.

## Phase 5: Interactive Learning Scenarios & Practice Modes
- [ ] Reusable scenario data model (`Scenario`, `BallSetup`, `TargetZone`, `GuidanceOverlay`).
- [ ] Interactive lessons:
  - 1. Basic Potting & Line of Centers.
  - 2. Stun Shot (stopping dead at collision).
  - 3. Screw Back (Backspin dynamics).
  - 4. Follow-Through (Topspin maintenance).
  - 5. Side Spin on Cushions (Running vs Check side).
  - 6. Multi-Cushion Escape Routines.

## Phase 6: 3D Three.js Engine
- [ ] Dynamically loaded Three.js scene at `/play` (zero bloat in main bundle).
- [ ] PBR table mesh with mahogany rails, brass corners, and felt shaders.
- [ ] Overhead canopy spotlights and soft shadow mapping.
- [ ] Physical ball rotation matching physics angular velocity $\vec{\omega}$.
- [ ] OrbitControls and cue-perspective aiming camera.

## Phase 7: Backend & Cloud Features (Future)
- [ ] Supabase authentication & cloud profiles.
- [ ] User progress tracking, achievement badges, and custom saved shot scenarios.

## Phase 8: Production Polish & Audits
- [ ] Core Web Vitals audit (LCP, CLS, INP).
- [ ] Cross-browser testing and low-end mobile hardware profiling.
