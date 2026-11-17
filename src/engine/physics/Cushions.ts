import { Ball } from './Ball';
import { Vector2D } from '../math/Vector2D';
import { SnookerTable, type CushionSegment } from '../table/SnookerTable';

export class Cushions {
  public static readonly RESTITUTION = 0.72; // Normal energy return
  public static readonly TANGENTIAL_FRICTION = 0.20; // Friction coefficient of rubber cushion
  public static readonly SIDE_SPIN_BITE = 1.8; // Angle adjustment factor from yaw

  /**
   * Resolves collision between a ball and a cushion segment.
   * Modifies ball velocity and spin authentically.
   */
  public static resolveCushionCollision(ball: Ball, cushion: CushionSegment): boolean {
    if (ball.potted) return false;

    // Find closest point on cushion segment to ball center
    const seg = cushion.end.sub(cushion.start);
    const segLenSq = seg.lengthSq();
    if (segLenSq < 1e-6) return false;

    const toBall = ball.position.sub(cushion.start);
    const t = Math.max(0, Math.min(1, toBall.dot(seg) / segLenSq));
    const closestPoint = cushion.start.add(seg.scale(t));

    const distVec = ball.position.sub(closestPoint);
    const dist = distVec.length();

    if (dist >= ball.radius) {
      return false; // No contact
    }

    const normal = cushion.normal;
    const tangent = normal.perpendicular();

    // Push ball back outside the cushion rubber boundary
    const penetration = ball.radius - dist;
    ball.position = ball.position.add(normal.scale(penetration));

    // Velocities relative to cushion normal & tangent
    const vNormal = ball.velocity.dot(normal);
    const vTangent = ball.velocity.dot(tangent);

    // If ball is already moving away from cushion, skip impulse
    if (vNormal >= 0) {
      return false;
    }

    // Normal velocity reverses with restitution
    const newVNormal = -vNormal * this.RESTITUTION;

    // Side spin interaction (Running side vs Check side)
    // Positive yaw creates positive tangential acceleration along tangent
    const spinTangentialBoost = (ball.spin.yaw * ball.radius * 0.15) * this.SIDE_SPIN_BITE;
    const frictionDecel = Math.abs(vTangent) * this.TANGENTIAL_FRICTION;
    
    let newVTangent = vTangent;
    if (vTangent > 0) {
      newVTangent = Math.max(0, vTangent - frictionDecel) + spinTangentialBoost;
    } else if (vTangent < 0) {
      newVTangent = Math.min(0, vTangent + frictionDecel) + spinTangentialBoost;
    } else {
      newVTangent = spinTangentialBoost;
    }

    // Cushion also reduces ball's side spin by biting into it
    ball.spin.yaw *= 0.55;

    // Reconstruct new velocity vector
    ball.velocity = normal.scale(newVNormal).add(tangent.scale(newVTangent));

    return true;
  }

  /**
   * Clamps balls to table boundaries to ensure zero tunneling.
   */
  public static enforceTableBounds(ball: Ball): void {
    if (ball.potted) return;

    const R = ball.radius;
    const minX = R;
    const maxX = SnookerTable.LENGTH - R;
    const minY = R;
    const maxY = SnookerTable.WIDTH - R;

    let posX = ball.position.x;
    let posY = ball.position.y;
    let velX = ball.velocity.x;
    let velY = ball.velocity.y;

    if (posX < minX) {
      posX = minX;
      if (velX < 0) velX = -velX * this.RESTITUTION;
    } else if (posX > maxX) {
      posX = maxX;
      if (velX > 0) velX = -velX * this.RESTITUTION;
    }

    if (posY < minY) {
      posY = minY;
      if (velY < 0) velY = -velY * this.RESTITUTION;
    } else if (posY > maxY) {
      posY = maxY;
      if (velY > 0) velY = -velY * this.RESTITUTION;
    }

    ball.position = new Vector2D(posX, posY);
    ball.velocity = new Vector2D(velX, velY);
  }
}
