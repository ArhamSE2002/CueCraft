# CueCraft Physics Model & Mathematical Formulation
**Version:** 1.0.0  
**Domain:** Rigid Body Ballistics, Cloth Friction Dynamics, and Elastic Impact Mechanics  

---

## 1. Physical Constants & Units

CueCraft coordinates are defined in SI metric units:
- Length: meters ($\text{m}$)
- Mass: kilograms ($\text{kg}$)
- Time: seconds ($\text{s}$)
- Angles: radians ($\text{rad}$)

### Standard Championship Snooker Constants
| Property | Symbol | Value | Notes |
| :--- | :--- | :--- | :--- |
| Table Surface Length | $L_x$ | $3.569\text{ m}$ | Inner cushion playing surface |
| Table Surface Width | $L_y$ | $1.778\text{ m}$ | Inner cushion playing surface (2:1 aspect) |
| Ball Radius | $R$ | $0.02625\text{ m}$ | $52.5\text{ mm}$ championship ball diameter |
| Ball Mass | $m$ | $0.142\text{ kg}$ | $142\text{ g}$ regulation phenolic resin |
| Ball Moment of Inertia | $I$ | $\frac{2}{5} m R^2$ | Solid homogeneous sphere |
| Gravitational Acceleration | $g$ | $9.80665\text{ m/s}^2$ | Standard gravity |
| Cloth Sliding Friction | $\mu_s$ | $0.22$ | Pure sliding phase coefficient |
| Cloth Rolling Friction | $\mu_r$ | $0.015$ | Pure rolling deceleration coefficient |
| Ball-to-Ball Restitution | $e_{bb}$ | $0.96$ | High elasticity phenolic resin collision |
| Cushion Normal Restitution | $e_c$ | $0.72$ | Rubber cushion energy return |
| Cushion Tangential Friction | $\mu_c$ | $0.20$ | Side spin bite coefficient |

---

## 2. Cue Strike Mechanics (Tip Contact Point)

Let $(x_c, y_c) \in [-1, 1] \times [-1, 1]$ be the normalized strike coordinates on the cue ball face:
- $x_c > 0 \implies$ Right side spin (Running/Check english)
- $x_c < 0 \implies$ Left side spin
- $y_c > 0 \implies$ Topspin (Follow)
- $y_c < 0 \implies$ Backspin (Screw / Draw)
- Constraint: $x_c^2 + y_c^2 \le 0.85^2$ (strikes beyond $0.85 R$ result in a miscue)

### Resulting Velocities Upon Strike
Given strike impulse magnitude $J$ (derived from cue power $P$):
1. **Linear Velocity**:
   $$\vec{v}_0 = \frac{J}{m} \begin{pmatrix} \cos\theta \\ \sin\theta \end{pmatrix}$$
2. **Angular Velocity (3D Spin Vector)** $\vec{\omega} = (\omega_x, \omega_y, \omega_z)$:
   - Top/Back spin $\omega_{\text{pitch}} = \frac{5}{2} \frac{y_c}{R} |\vec{v}_0|$
   - Side spin $\omega_z = \frac{5}{2} \frac{x_c}{R} |\vec{v}_0|$

---

## 3. Cloth Interaction & Transition to Rolling

When a cue ball is struck with backspin or topspin, it enters an initial **sliding state**.
The relative surface velocity between the bottom of the ball and the cloth is:
$$\vec{v}_{\text{rel}} = \vec{v} + \vec{\omega} \times (-R \hat{k})$$

### Sliding Phase ($\vec{v}_{\text{rel}} \neq \vec{0}$)
Cloth friction exerts a force:
$$\vec{F}_s = -\mu_s m g \frac{\vec{v}_{\text{rel}}}{|\vec{v}_{\text{rel}}|}$$
This generates both linear deceleration and torque:
$$\frac{d\vec{v}}{dt} = \frac{\vec{F}_s}{m} = -\mu_s g \hat{u}_{\text{rel}}$$
$$\frac{d\vec{\omega}}{dt} = \frac{(-R \hat{k}) \times \vec{F}_s}{I} = \frac{5}{2 R} \mu_s g (\hat{k} \times \hat{u}_{\text{rel}})$$

### Pure Rolling Phase ($\vec{v}_{\text{rel}} \approx \vec{0}$)
Once surface velocity matches angular velocity ($|\vec{v}| = R \omega$), the ball transitions into pure rolling.
Deceleration is governed solely by rolling resistance:
$$\frac{d\vec{v}}{dt} = -\mu_r g \frac{\vec{v}}{|\vec{v}|}$$
$$\vec{\omega} = \frac{1}{R} (\hat{k} \times \vec{v})$$

### The Physics of the "Screw Back" (Draw Shot)
When an object ball is struck while the cue ball still has backspin:
1. The forward linear velocity of the cue ball is transferred to the object ball along the line of centers.
2. The cue ball's forward linear velocity drops close to zero.
3. Because the cue ball still possesses rapid backwards angular rotation ($\vec{\omega} < 0$), the relative contact velocity $\vec{v}_{\text{rel}}$ against the cloth points forward.
4. The cloth exerts a sharp backward frictional force $-\mu_s m g$, accelerating the cue ball backward!

---

## 4. Ball-to-Ball Elastic Collisions

Let balls $A$ and $B$ collide at positions $\vec{p}_A, \vec{p}_B$ with velocities $\vec{v}_A, \vec{v}_B$.
1. **Normal Unit Vector**:
   $$\vec{n} = \frac{\vec{p}_B - \vec{p}_A}{|\vec{p}_B - \vec{p}_A|}$$
2. **Tangent Unit Vector**:
   $$\vec{t} = \begin{pmatrix} -n_y \\ n_x \end{pmatrix}$$
3. **Velocity Decomposition**:
   $$v_{An} = \vec{v}_A \cdot \vec{n}, \quad v_{At} = \vec{v}_A \cdot \vec{t}$$
   $$v_{Bn} = \vec{v}_B \cdot \vec{n}, \quad v_{Bt} = \vec{v}_B \cdot \vec{t}$$
4. **Collision Impulse**:
   $$v_{An}' = \frac{v_{An} + v_{Bn} - e_{bb}(v_{An} - v_{Bn})}{2}$$
   $$v_{Bn}' = \frac{v_{An} + v_{Bn} + e_{bb}(v_{An} - v_{Bn})}{2}$$
5. **Reconstruction**:
   $$\vec{v}_A' = v_{An}' \vec{n} + v_{At} \vec{t}$$
   $$\vec{v}_B' = v_{Bn}' \vec{n} + v_{Bt} \vec{t}$$
6. **Separation Safeguard**:
   To prevent sphere interpenetration during multi-ball clusters, position correction pushes the spheres apart along $\vec{n}$:
   $$\Delta \vec{p} = \frac{2R - |\vec{p}_B - \vec{p}_A|}{2} \vec{n}$$

---

## 5. Cushion Dynamics & Spin Reaction

When a ball strikes a cushion rail with normal vector $\vec{n}_c$:
- Normal component reverses with restitution: $v_n' = -e_c v_n$.
- Tangential component $v_t$ is affected by side spin $\omega_z$:
  - **Running Side**: Spin aligns with tangential bounce direction, imparting an accelerating impulse $\Delta v_t > 0$, widening the exit angle.
  - **Check Side**: Spin opposes bounce direction, reducing tangential velocity $\Delta v_t < 0$, steepening the rebound angle.

---

## 6. Numerical Integration

Simulation integrates using fixed-step Semi-Implicit Euler or Velocity Verlet:
$$\vec{v}_{t + \Delta t} = \vec{v}_t + \vec{a}_t \Delta t$$
$$\vec{p}_{t + \Delta t} = \vec{p}_t + \vec{v}_{t + \Delta t} \Delta t$$
Fixed timestep $\Delta t = \frac{1}{120}\text{ s}$ guarantees high stability, determinism, and zero penetration glitches.
