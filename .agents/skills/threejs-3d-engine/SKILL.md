---
name: threejs-3d-engine
description: Architecture and optimization guidelines for the CueCraft 3D Three.js snooker simulation. Covers dynamic code-splitting, PBR materials, procedural or GLTF table models, ball mesh instancing, overhead lighting setup, camera perspectives, and physics synchronization.
---

# Three.js 3D Engine Guidelines

The 3D engine brings realistic perspective, lighting, and tactile presence to the snooker simulation while running on the exact same underlying physics engine as the 2D mode.

## Architecture

1. **Lazy Loading**:
   - Three.js and heavy 3D modules must NEVER be in the initial page bundle.
   - Dynamically import (`await import('three')`) only when user selects 3D mode in `/play`.

2. **Table Geometry and Materials**:
   - **Cloth Baize**: MeshStandardMaterial with high roughness ($\approx 0.85$), subtle green tint (`#0B4728` to `#0E5C34`), and fine bump map simulating wool felt.
   - **Cushion Rails**: Rich mahogany or dark walnut wood finish with moderate roughness ($\approx 0.35$).
   - **Pocket Corners & Plates**: Polished brass or brushed gold metalness ($\approx 0.85$, roughness $\approx 0.25$).
   - **Balls**: High-specular MeshPhysicalMaterial with clearcoat ($1.0$), clearcoatRoughness ($0.05$), and authentic colors (White cue, Reds, Yellow, Green, Brown, Blue, Pink, Black).

3. **Lighting & Shadows**:
   - Championship canopy lighting: 3-4 rectangular or spot lights directly above table surface pointing straight down with soft shadow maps (`PCFSoftShadowMap`).
   - Subtle ambient light so rails and shadows are not completely black.

4. **Camera Modes**:
   - **Free Orbit**: Smooth OrbitControls for observing the shot.
   - **Aiming Cam**: Positioned behind cue ball along aiming vector, tilted down at $\approx 15^\circ$.
   - **Bird's Eye**: Straight top-down view orthographic or high-FOV perspective.

5. **Physics Synchronization**:
   - The 3D render loop reads ball positions $(x, y)$ from `physicsEngine.balls` and sets mesh positions `(x, ballRadius, z)`.
   - Ball angular velocities $\vec{\omega}$ rotate the 3D ball meshes using quaternions so ball logos/reflections visibly roll and spin realistically.

## Checklist

- [ ] Is Three.js dynamically imported on-demand?
- [ ] Are ball meshes disposed properly if switching modes or unmounting to prevent WebGL memory leaks?
- [ ] Is shadow map resolution balanced for low-end GPU performance ($1024\times 1024$ or $2048\times 2048$)?
- [ ] Does ball rotation match true physical roll and spin vectors?
