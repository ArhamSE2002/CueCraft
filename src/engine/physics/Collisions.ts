import { Ball } from './Ball';
import { Vector2D } from '../math/Vector2D';

export interface CollisionEvent {
  ballA: Ball;
  ballB: Ball;
  contactPoint: Vector2D;
  normal: Vector2D;
  impulse: number;
}

export class Collisions {
  public static readonly RESTITUTION = 0.96; // Standard phenolic resin ball elasticity
  public static readonly THROW_COEFFICIENT = 0.03; // Cut-induced throw friction
  public static readonly SPIN_THROW_COEFF = 0.004; // Spin-induced throw (yaw)

  /**
   * Resolves collision between two balls if they overlap and are approaching.
   * Preserves 2D rollVel so cloth sliding friction naturally generates follow and screw curves.
   */
  public static resolveBallCollision(ballA: Ball, ballB: Ball): CollisionEvent | null {
    if (ballA.potted || ballB.potted) return null;

    const delta = ballB.position.sub(ballA.position);
    const distSq = delta.lengthSq();
    const minDist = ballA.radius + ballB.radius; // 52.5 mm

    if (distSq >= minDist * minDist) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const normal = dist > 1e-6 ? delta.scale(1 / dist) : new Vector2D(1, 0);
    const relVel = ballA.velocity.sub(ballB.velocity);
    const velAlongNormal = relVel.dot(normal);

    // Position correction to prevent sphere interpenetration
    const overlap = minDist - dist;
    const separation = normal.scale(overlap * 0.5);
    ballA.position = ballA.position.sub(separation);
    ballB.position = ballB.position.add(separation);

    // If already moving away from each other, don't re-apply impulse
    if (velAlongNormal <= 0) {
      return null;
    }

    // Normal impulse calculation
    const impulseMag = ((1 + this.RESTITUTION) * velAlongNormal) / 2; // Equal mass
    const impulse = normal.scale(impulseMag);

    ballA.velocity = ballA.velocity.sub(impulse);
    ballB.velocity = ballB.velocity.add(impulse);

    // Cut-induced throw + Spin-induced throw (tangential friction)
    const tangent = normal.perpendicular();
    const velAlongTangent = relVel.dot(tangent);
    const spinThrow = (ballA.spin.yaw - ballB.spin.yaw) * ballA.radius * this.SPIN_THROW_COEFF * velAlongNormal * 0.05;
    const throwImpulseMag = velAlongTangent * this.THROW_COEFFICIENT - spinThrow;
    const throwImpulse = tangent.scale(throwImpulseMag);

    ballA.velocity = ballA.velocity.sub(throwImpulse);
    ballB.velocity = ballB.velocity.add(throwImpulse);

    // Spin transfer: Side-spin on ball A transfers opposite side-spin to ball B
    if (Math.abs(ballA.spin.yaw) > 0.1) {
      const transferredSpin = ballA.spin.yaw * 0.14;
      ballB.spin.yaw -= transferredSpin;
      ballA.spin.yaw *= 0.86;
    }

    return {
      ballA,
      ballB,
      contactPoint: ballA.position.add(normal.scale(ballA.radius)),
      normal,
      impulse: impulseMag,
    };
  }
}
