---
name: testing-and-quality
description: Quality assurance and test patterns for CueCraft. Covers Vitest unit testing for deterministic physics equations, momentum conservation, cushion restitution, collision geometry, visual regression testing, and code hygiene. Use when creating or running test suites.
---

# Testing and Quality Assurance Guidelines

Because snooker relies entirely on exact physical interactions, testing the physics engine deterministically is a top priority. A broken restitution formula or sign error in spin dampening destroys user trust.

## Testing Strategy

1. **Deterministic Physics Unit Tests (Vitest)**:
   - **Conservation of Momentum**: In elastic head-on collisions without friction ($e = 1.0$), total linear momentum $\vec{P} = m_A \vec{v}_A + m_B \vec{v}_B$ must be conserved within $10^{-5}$ tolerance.
   - **90-Degree Tangent Line Rule**: An off-center collision between two equal-mass frictionless spheres must separate at exactly $90^\circ$ angles.
   - **Cushion Rebound Angles**: Verify that perpendicular impacts rebound at $180^\circ$ and that side-spin adjusts rebound angles in the expected direction (running side widens, check side steepens).
   - **Deceleration & Stop Condition**: Verify that balls decelerate under rolling friction and come to a complete rest ($v = 0, \omega = 0$) within calculated physical stopping distances:
     $$d = \frac{v_0^2}{2 \mu g}$$
   - **Screw-back / Draw Verification**: Verify that a cue ball struck low reverses its linear velocity upon impacting an object ball while retaining backspin.

2. **Integration & Rendering Tests**:
   - Verify that canvas resize preserves table aspect ratio ($2:1$).
   - Verify coordinate transforms between physics units (meters) and screen pixels.
   - Verify that all standard 22 snooker balls (1 cue, 15 reds, 6 colors) initialize at official table spot positions.

3. **Code Hygiene & Type Safety**:
   - TypeScript `strict: true`. No untyped `any` in physics formulas.
   - Zero lint errors (`npm run lint`).
   - Clean unit test execution (`npm run test`).

## Workflow

1. Write physics unit tests alongside new physics calculations in `tests/physics/`.
2. Run Vitest using `npm run test` or `npx vitest run`.
3. Check edge cases: grazing collisions ($r \approx 2R$), maximum power strikes, multi-ball clusters, corner pocket jaw rebounds.

## Checklist

- [ ] Are physics tests independent of browser APIs and canvas contexts?
- [ ] Do unit tests pass with zero flakiness?
- [ ] Are conservation laws verified with numeric tolerance thresholds?
- [ ] Is TypeScript free of compilation errors?
