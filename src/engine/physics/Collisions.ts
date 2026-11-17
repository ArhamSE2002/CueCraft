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

  /**
   * Resolves collision between two balls if they overlap and are approaching.
   * Returns collision event if a physical impact occurred.
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

    // Cut-induced throw (tangential friction)
    const tangent = normal.perpendicular();
    const velAlongTangent = relVel.dot(tangent);
    const throwImpulseMag = velAlongTangent * this.THROW_COEFFICIENT;
    const throwImpulse = tangent.scale(throwImpulseMag);

    ballA.velocity = ballA.velocity.sub(throwImpulse);
    ballB.velocity = ballB.velocity.add(throwImpulse);

    // Spin transfer: Side-spin on ball A transfers small opposite side-spin to ball B
    if (Math.abs(ballA.spin.yaw) > 0.1) {
      const transferredSpin = ballA.spin.yaw * 0.12;
      ballB.spin.yaw -= transferredSpin;
      ballA.spin.yaw *= 0.88;
    }

    // If ballA had severe backspin (screw), when forward normal velocity is absorbed,
    // the remaining backspin immediately begins biting the cloth backwards
    if (ballA.type === 'cue' && ballA.spin.pitch < -20) {
      // The classic screw-back behavior
      const screwForce = Math.abs(ballA.spin.pitch) * 12;
      ballA.velocity = ballA.velocity.sub(normal.scale(screwForce));
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
