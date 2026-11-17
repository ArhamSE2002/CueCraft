---
name: canvas-2d-engine
description: Best practices for implementing high-performance HTML5 2D Canvas rendering for the CueCraft snooker table, balls, aiming aids, trajectory rays, ghost ball overlays, and interactive ball placement. Use when developing or optimizing the 2D game interface.
---

# Canvas 2D Engine Guidelines

The 2D engine provides an exact top-down view of the championship snooker table, offering crystal-clear visualization of trajectories, angles, pocket mouths, and ball positions.

## Technical Requirements

1. **High-DPI Retina Support**:
   - Canvas resolution must scale with `window.devicePixelRatio`.
   - Table coordinates use normalized physical dimensions (meters or standardized table units) and map via an explicit transform matrix or scale factor to canvas pixels.
   - Clean sub-pixel rendering with crisp anti-aliasing.

2. **Render Loop Architecture**:
   - Table baize, cushions, baulk line, "D", and pocket leather are drawn efficiently. Static table elements can be pre-rendered to an off-screen canvas if needed.
   - Dynamic layer renders per frame via `requestAnimationFrame`:
     - Ball drop shadows (subtle radial gradients offset based on overhead table lighting).
     - Ball spheres with rich specular highlights (championship phenolic resin appearance).
     - Aiming line from cue ball extending to target or cushion.
     - Ghost ball indicator at point of first contact.
     - Projected target ball trajectory ray.
     - Projected cue ball deflection trajectory ray.
     - Interactive cue stick aligned with shot angle and pulled back by power percentage.

3. **Coordinate System & Scaling**:
   - Table coordinates: Origin $(0, 0)$ at center or top-left of playing surface.
   - Playing area: Width $W = 3.569\text{ m}$, Height $H = 1.778\text{ m}$ (Ratio 2:1 approx).
   - Canvas viewport auto-fits within container while maintaining aspect ratio and margin for wooden rails and pockets.

4. **Input Handling**:
   - Mouse / Touch aiming: Vector from cue ball to cursor calculates aim angle.
   - Interactive ball placement: In practice/setup mode, drag-and-drop cue ball within the "D" or anywhere on the table.
   - Power meter: Linear drag or slider (0% to 100%).

## Checklist

- [ ] Does canvas handle window resize gracefully with proper DPI scaling?
- [ ] Are ball shadows rendered underneath balls before ball color fills?
- [ ] Are trajectory rays dashed or styled with translucent guides so they don't obscure balls?
- [ ] Is `requestAnimationFrame` paused when simulation is idle and user is not aiming?
