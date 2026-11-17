---
name: snooker-physics
description: Comprehensive physical modeling and mathematical specifications for the CueCraft snooker engine. Covers rolling and sliding friction, ball-to-ball collisions, cushion restitution and tangential friction, spin dynamics (topspin, backspin, side spin), cue tip strike impulse, and trajectory prediction.
---

# CueCraft Snooker Physics Model

The physics engine simulates the actual mechanics of standard championship snooker. It must produce authentic trajectories and spin behaviors without compromising performance.

## Standard Snooker Specifications

- **Table Playing Surface**: 3569 mm × 1778 mm (11 ft 8.5 in × 5 ft 10 in), commonly referred to as 12 ft × 6 ft table.
- **Ball Diameter**: 52.5 mm (Radius $R = 26.25\text{ mm} = 0.02625\text{ m}$).
- **Ball Mass**: $m \approx 0.142\text{ kg}$ (142 grams).
- **Cloth Friction (Rolling)**: $\mu_r \approx 0.012 - 0.018$ (deceleration $a = \mu_r \cdot g \approx 0.12 - 0.18\text{ m/s}^2$).
- **Cloth Friction (Sliding)**: $\mu_s \approx 0.20 - 0.25$.
- **Ball-to-Ball Restitution ($e_{bb}$)**: $\approx 0.95 - 0.98$ (nearly elastic collision).
- **Cushion Restitution ($e_c$)**: Normal restitution $\approx 0.65 - 0.78$ depending on impact velocity.
- **Cushion Tangential Friction ($\mu_c$)**: $\approx 0.18 - 0.25$, causing angle reduction or widening based on side spin (running side vs check side).

## Physical Mechanics

### 1. Cue Strike Impulse & Contact Point
When the cue strikes the ball at offset $(x_c, y_c)$ from center (normalized to $[-1, 1]$ where radius is $R$):
- **Linear Impulse**: Directed along cue vector $\vec{u}_{cue}$.
  $$\vec{v}_0 = \frac{J}{m} \vec{u}_{cue}$$
- **Angular Velocity Vector** $\vec{\omega}_0$:
  - Vertical offset $y_c > 0$ generates forward topspin (follow).
  - Vertical offset $y_c < 0$ generates backspin (screw / draw).
  - Horizontal offset $x_c > 0$ generates right side spin.
  - Horizontal offset $x_c < 0$ generates left side spin.
  $$\vec{\omega}_0 = \frac{5}{2 m R^2} (\vec{r}_c \times \vec{J})$$

### 2. Transition from Sliding to Rolling
Immediately after an off-center or high-speed strike:
- The ball initially slides across the baize cloth if relative surface contact velocity $\vec{v}_{rel} = \vec{v} + \vec{\omega} \times (-R \hat{k}) \neq 0$.
- Sliding friction $\vec{F}_s = -\mu_s m g \frac{\vec{v}_{rel}}{|\vec{v}_{rel}|}$ decelerates linear velocity and applies torque until pure rolling condition $\vec{v} = R (\vec{\omega} \times \hat{k})$ is satisfied.
- Backspin causes the cue ball to decelerate more rapidly and, upon impacting an object ball while still having backspin, causes the cue ball to reverse direction (the classic screw-back shot).
- Topspin maintains forward momentum through the collision, driving the cue ball through the object ball line (the follow-through shot).

### 3. Ball-to-Ball Collision
At contact of balls $A$ and $B$:
- Normal unit vector $\vec{n} = \frac{\vec{p}_B - \vec{p}_A}{|\vec{p}_B - \vec{p}_A|}$.
- Tangent unit vector $\vec{t} \perp \vec{n}$.
- Velocities decomposed into normal and tangential components.
- Normal impulse with restitution $e$:
  $$J_n = \frac{-(1 + e)(\vec{v}_{rel} \cdot \vec{n})}{\frac{1}{m_A} + \frac{1}{m_B}}$$
- Cut-induced throw: Slight tangential friction transfers spin and small angle deviation to object ball.

### 4. Cushion Dynamics
When colliding with cushions:
- Normal velocity reverses: $v_n' = -e_c \cdot v_n$.
- Tangential velocity is modified by side spin:
  - **Running Side**: Spin in direction of rebound increases exit speed and widens angle.
  - **Check Side**: Spin against cushion direction bites into the rubber, reduces exit angle, and slows rebound.

### 5. Deterministic Trajectory Prediction
- Raycast forward along linear vector from cue ball to first collision (ball or cushion).
- Compute ghost ball position at distance $2R$ from target ball.
- Compute normal vector $\vec{n}$ and tangent vector $\vec{t}$ to project object ball path and cue ball deflection path.
- Account for backspin/topspin curvature on secondary cue ball trajectory.

## Checklist

- [ ] Does physics loop run in a fixed simulation tick (`fixedDeltaTime = 1/120` or `1/60`)?
- [ ] Are balls constrained strictly within inner cushion boundaries?
- [ ] Do backspin shots authentically reverse direction after ball-to-ball contact?
- [ ] Do cushions react realistically to left/right side spin?
- [ ] Does simulation stop cleanly when all ball velocities fall below epsilon threshold ($\approx 0.002\text{ m/s}$)?
