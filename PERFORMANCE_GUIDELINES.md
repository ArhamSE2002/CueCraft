# CueCraft Performance Guidelines
**Standardized Benchmarks & Architectural Budgets**

---

## 1. Web Performance & Core Web Vitals (The Website)

- **Largest Contentful Paint (LCP)**: $\le 1.8\text{ s}$ on 4G fast network.
- **Cumulative Layout Shift (CLS)**: $\le 0.02$.
- **Interaction to Next Paint (INP)**: $\le 80\text{ ms}$.
- **Initial JS Bundle Budget**: $\le 60\text{ KB}$ gzipped for marketing pages (`/`, `/learn`, `/about`).
- **Static First**: All article text, layout wrappers, and marketing copy must render server-side (SSG) with zero JavaScript required for initial paint.
- **Hydration Discipline**:
  - `client:load` reserved strictly for primary interactive game canvas at `/play`.
  - `client:idle` for interactive physics demonstration widgets on landing page.
  - `client:visible` for below-the-fold media carousels or scenario pickers.

---

## 2. Simulation & Canvas 2D Performance (The Game)

- **Frame Rate Target**: Rock-solid 60 FPS (16.6ms frame time budget) on standard integrated GPUs (e.g. Intel Iris Xe / Apple M1 baseline).
- **Physics Integration**:
  - Sub-stepped fixed timestep $\Delta t = \frac{1}{120}\text{ s}$ for collision precision.
  - Zero heap allocation per frame inside the simulation step; reuse vector buffers and collision manifolds to eliminate garbage collection pauses.
  - Epsilon sleep threshold: When all ball linear speeds $|\vec{v}| < 0.003\text{ m/s}$ and angular speeds $|\vec{\omega}| < 0.01\text{ rad/s}$, freeze velocities and sleep the simulation tick.
- **Canvas 2D Optimization**:
  - Pre-render static table markings (cloth baize, baulk line, "D", brass pockets) to an off-screen canvas if redraw overhead exceeds 3ms.
  - Dynamic render pass draws strictly moving elements (balls, shadows, aim guides, ghost balls).

---

## 3. 3D Three.js Engine Performance

- **Code Splitting**: Three.js must NEVER be bundled into the initial page load. Load via `const { Scene, WebGLRenderer, ... } = await import('three')` only when 3D mode is explicitly engaged.
- **Draw Call Budget**: $\le 40$ draw calls for the entire 3D table scene.
- **Geometry Sharing**: A single SphereGeometry instance shared across all 22 snooker balls, using distinct material instances or instanced attributes.
- **Shadow Map Resolution**: Cap shadow maps at $1024\times 1024$ or $2048\times 2048$ with PCF soft filtering; disable shadows on ball-to-ball secondary reflections.
- **Memory Management**: Explicitly invoke `.dispose()` on geometries, materials, and textures when switching modes or unmounting.
