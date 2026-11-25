import { Ball } from './Ball';
import { Vector2D } from '../math/Vector2D';
import { CLOTH_CATALOG, type ClothSpec } from '../equipment/Equipment';

export class Cloth {
  // Dimensionally accurate for mm & s
  public static readonly GRAVITY = 9810; // mm/s^2
  public static readonly SLIDING_FRICTION = 0.22; // mu_s
  public static readonly ROLLING_FRICTION = 0.035; // mu_r (realistic club cloth)
  public static readonly SPIN_DECAY = 0.985; // Side spin dampening per 1/120s step

  public static readonly DEFAULT_CLOTH: ClothSpec = CLOTH_CATALOG[1]; // club-standard

  /**
   * Applies authentic 2D rigid-body cloth friction over timestep dt (seconds).
   * Handles 2D sliding friction (generating true parabolic curves for screw/follow cuts),
   * transitions smoothly into pure rolling friction, and decays vertical yaw spin.
   */
  public static applyFriction(
    ball: Ball,
    dt: number,
    cloth: ClothSpec = this.DEFAULT_CLOTH
  ): void {
    if (ball.potted) return;

    const R = ball.radius; // 26.25 mm

    // Backward-compatibility bridge: if a caller/test set ball.spin.pitch directly without rollVel
    if (ball.rollVel.lengthSq() < 1e-6 && Math.abs(ball.spin.pitch) > 0.05 && ball.velocity.lengthSq() > 1e-6) {
      ball.rollVel = ball.velocity.normalize().scale(ball.spin.pitch * R);
    }

    if (ball.isStationary()) {
      ball.stop();
      return;
    }

    const muS = cloth.slidingFriction;
    const muR = cloth.rollingFriction;
    const spinDecay = cloth.spinDecay;

    // 2D slip velocity of bottom contact point relative to cloth: v_slip = v - rollVel
    const slipVel = ball.velocity.sub(ball.rollVel);
    const slipMag = slipVel.length();

    if (slipMag > 2.0) {
      // ── SLIDING PHASE ──────────────────────────────────────────────────────
      const accelLin = muS * this.GRAVITY;
      const accelRoll = 2.5 * accelLin;
      const totalClosureRate = (accelLin + accelRoll) * dt; // 3.5 * mu_s * g * dt

      if (totalClosureRate >= slipMag) {
        // Conservation of angular momentum about contact point: v_final = (5/7)v + (2/7)rollVel
        const exactPureRoll = ball.velocity.scale(5 / 7).add(ball.rollVel.scale(2 / 7));
        ball.velocity = exactPureRoll;
        ball.rollVel = exactPureRoll.clone();
      } else {
        const slipDir = slipVel.scale(1 / slipMag);
        ball.velocity = ball.velocity.sub(slipDir.scale(accelLin * dt));
        ball.rollVel = ball.rollVel.add(slipDir.scale(accelRoll * dt));
      }
    } else {
      // ── PURE ROLLING PHASE ─────────────────────────────────────────────────
      ball.rollVel = ball.velocity.clone();
      const speed = ball.velocity.length();
      const rollDecel = muR * this.GRAVITY;
      const newSpeed = Math.max(0, speed - rollDecel * dt);

      if (speed > 1e-6 && newSpeed > 1.0) {
        const dir = ball.velocity.scale(1 / speed);
        ball.velocity = dir.scale(newSpeed);
        ball.rollVel = ball.velocity.clone();
      } else {
        ball.velocity = Vector2D.zero();
        ball.rollVel = Vector2D.zero();
      }
    }

    // Sync scalar pitch for telemetry and test compatibility
    const currentSpeed = ball.velocity.length();
    if (currentSpeed > 1e-3) {
      const dir = ball.velocity.scale(1 / currentSpeed);
      ball.spin.pitch = ball.rollVel.dot(dir) / R;
    } else if (ball.rollVel.lengthSq() > 1) {
      ball.spin.pitch = ball.rollVel.length() / R;
    } else {
      ball.spin.pitch = 0;
    }

    // Dampen vertical axis side spin (yaw)
    ball.spin.yaw *= Math.pow(spinDecay, dt * 120);
    if (Math.abs(ball.spin.yaw) < 0.08) {
      ball.spin.yaw = 0;
    }

    if (ball.velocity.lengthSq() < 1.0 && ball.rollVel.lengthSq() < 1.0 && Math.abs(ball.spin.yaw) < 0.1) {
      ball.stop();
    }
  }
}
