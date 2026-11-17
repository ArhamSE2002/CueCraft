# CueCraft Task Tracker

| Task ID | Objective | Dependencies | Affected Files | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-001** | Project Setup & Skill Authoring | None | `.agents/skills/*`, Docs | 5 external skills installed, 8 custom skills created, documentation baseline established. | **DONE** |
| **TSK-002** | Package Configuration & Tooling | TSK-001 | `package.json`, `astro.config.mjs`, `tsconfig.json`, `tailwind.config.mjs` | Astro 5, React, Tailwind, TypeScript, Lucide, Zustand, Vitest configured. | **DONE** |
| **TSK-003** | Core Headless Physics Engine | TSK-002 | `src/engine/physics/*`, `src/engine/math/*` | Vector math, ball states, friction, collision impulse, spin dynamics, cushion rebound. | **DONE** |
| **TSK-004** | Deterministic Physics Unit Tests | TSK-003 | `tests/physics/*` | Vitest tests verifying momentum conservation, screw-back, cushion angle, rolling stopping distance. | **DONE** |
| **TSK-005** | High-DPI 2D Canvas Table Renderer | TSK-003 | `src/renderers/2d/*` | Accurate snooker table baize, baulk line, "D", pocket drops, ball rendering, shadows, aiming ray, ghost ball. | **DONE** |
| **TSK-006** | Interactive Gameplay Application (`/play`) | TSK-004, TSK-005 | `src/pages/play.astro`, `src/components/game/*`, `src/stores/*` | Responsive game shell, aim controls, power slider, millimeter spin selector, shot strike, reset/rack. | **DONE** |
| **TSK-007** | Editorial Landing Page (`/`) | TSK-002, TSK-005 | `src/pages/index.astro`, `src/components/landing/*` | High-impact hero, interactive physics showcase, 2D/3D preview, visual narrative, Start Playing CTA. | **DONE** |
| **TSK-008** | Supporting Pages (`/learn`, `/about`) | TSK-002 | `src/pages/learn/*`, `src/pages/about.astro` | Educational snooker articles, SEO schema, navigation consistency. | **DONE** |
| **TSK-009** | Browser Verification & Quality Audit | TSK-006, TSK-007 | Whole project | Real browser verification of landing page and 2D playable game, responsiveness check. | **DONE** |
