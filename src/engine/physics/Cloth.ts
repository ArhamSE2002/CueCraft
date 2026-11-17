import { Ball } from './Ball';

export class Cloth {
  // Dimensionally accurate for mm & s
  public static readonly GRAVITY = 9810; // mm/s^2
  public static readonly SLIDING_FRICTION = 0.22; // mu_s
  public static readonly ROLLING_FRICTION = 0.015; // mu_r
  public static readonly SPIN_DECAY = 0.985; // Side spin dampening per 1/120s step

  /**
   * Applies friction over timestep dt (seconds).
   * Transitions seamlessly between sliding phase (backspin/topspin) and pure rolling.
   */
  public static applyFriction(ball: Ball, dt: number): void {
    if (ball.potted || ball.isStationary()) {
      if (ball.velocity.lengthSq() < 1.0) {
        ball.stop();
      }
      return;
    }

    const speed = ball.velocity.length();
    const R = ball.radius; // 26.25 mm
    const dir = speed > 1e-6 ? ball.velocity.scale(1 / speed) : null;

    // Ideal rolling angular velocity (rad/s) in direction of travel
    const idealPitch = speed / R;
    const pitchDiff = ball.spin.pitch - idealPitch;

    // Check if sliding vs rolling
    if (Math.abs(pitchDiff) > 0.05) {
      // Sliding phase
      // Friction force magnitude Fs = mu_s * m * g
      // Linear acceleration magnitude = mu_s * g
      const accelMag = this.SLIDING_FRICTION * this.GRAVITY; // ~2158 mm/s^2
      
      // Torque response: I = 2/5 m R^2 -> angular acceleration = 5/2 * (mu_s * g) / R
      const angularAccel = (2.5 * accelMag) / R;

      if (pitchDiff < 0) {
        // Backspin: linear speed decelerates faster, pitch increases toward rolling
        const newSpeed = Math.max(0, speed - accelMag * dt);
        if (dir) {
          ball.velocity = dir.scale(newSpeed);
        }
        ball.spin.pitch += angularAccel * dt;
        if (ball.spin.pitch > idealPitch) {
          ball.spin.pitch = idealPitch;
        }
      } else {
        // Topspin / follow: linear speed increases slightly or sustains, pitch decreases
        const newSpeed = speed + accelMag * dt * 0.4;
        if (dir) {
          ball.velocity = dir.scale(newSpeed);
        }
        ball.spin.pitch -= angularAccel * dt;
        if (ball.spin.pitch < idealPitch) {
          ball.spin.pitch = idealPitch;
        }
      }
    } else {
      // Pure rolling phase
      // Deceleration a_r = mu_r * g
      const rollDecel = this.ROLLING_FRICTION * this.GRAVITY; // ~147 mm/s^2
      const newSpeed = Math.max(0, speed - rollDecel * dt);

      if (dir && newSpeed > 1.0) {
        ball.velocity = dir.scale(newSpeed);
        ball.spin.pitch = newSpeed / R;
      } else {
        ball.stop();
      }
    }

    // Dampen vertical axis side spin (yaw)
    ball.spin.yaw *= Math.pow(this.SPIN_DECAY, dt * 120);
    if (Math.abs(ball.spin.yaw) < 0.05) {
      ball.spin.yaw = 0;
    }
  }
}
