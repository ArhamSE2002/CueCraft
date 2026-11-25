import { Ball } from './Ball';
import { Vector2D } from '../math/Vector2D';
import { SnookerTable, type CushionSegment } from '../table/SnookerTable';
import { CUSHION_CATALOG, type CushionSpec } from '../equipment/Equipment';

export class Cushions {
  public static readonly RESTITUTION = 0.72; // Normal energy return
  public static readonly TANGENTIAL_FRICTION = 0.20; // Friction coefficient of rubber cushion
  public static readonly SIDE_SPIN_BITE = 1.8; // Angle adjustment factor from yaw

  public static readonly DEFAULT_CUSHION: CushionSpec = CUSHION_CATALOG[1]; // club-rails

  /**
   * Resolves collision between a ball and a cushion segment.
   * Modifies ball velocity and spin authentically (running side vs check side, plus border restitution).
   */
  public static resolveCushionCollision(
    ball: Ball,
    cushion: CushionSegment,
    spec: CushionSpec = this.DEFAULT_CUSHION,
    contactOut?: Vector2D
  ): boolean {
    if (ball.potted) return false;

    const seg = cushion.end.sub(cushion.start);
    const segLenSq = seg.lengthSq();
    if (segLenSq < 1e-6) return false;

    const toBall = ball.position.sub(cushion.start);
    const t = Math.max(0, Math.min(1, toBall.dot(seg) / segLenSq));
    const closestPoint = cushion.start.add(seg.scale(t));

    const distVec = ball.position.sub(closestPoint);
    const dist = distVec.length();

    if (dist >= ball.radius) {
      return false;
    }

    const isKnuckle = t <= 0.001 || t >= 0.999;
    const normal = isKnuckle && dist > 1e-4 ? distVec.normalize() : cushion.normal;
    const tangent = normal.perpendicular();

    const penetration = ball.radius - dist;
    ball.position = ball.position.add(normal.scale(penetration));

    const vNormal = ball.velocity.dot(normal);
    const vTangent = ball.velocity.dot(tangent);

    if (vNormal >= 0) {
      return false;
    }

    if (contactOut) {
      contactOut.x = closestPoint.x;
      contactOut.y = closestPoint.y;
    }

    const newVNormal = -vNormal * spec.restitution;

    const spinTangentialBoost = (ball.spin.yaw * ball.radius * 0.15) * spec.sideSpinBite;
    const frictionDecel = Math.abs(vTangent) * spec.tangentialFriction;

    let newVTangent = vTangent;
    if (vTangent > 0) {
      newVTangent = Math.max(0, vTangent - frictionDecel) + spinTangentialBoost;
    } else if (vTangent < 0) {
      newVTangent = Math.min(0, vTangent + frictionDecel) + spinTangentialBoost;
    } else {
      newVTangent = spinTangentialBoost;
    }

    ball.spin.yaw *= 0.55;
    ball.velocity = normal.scale(newVNormal).add(tangent.scale(newVTangent));

    const rNormal = ball.rollVel.dot(normal);
    const rTangent = ball.rollVel.dot(tangent);
    if (rNormal < 0) {
      ball.rollVel = normal.scale(-rNormal * spec.restitution * 0.85).add(tangent.scale(rTangent * 0.9));
    }

    return true;
  }

  /**
   * Checks if a position is within the throat/mouth of any of the 6 pockets.
   */
  public static isNearPocket(
    pos: Vector2D,
    threshold: number = 95,
    table?: SnookerTable
  ): boolean {
    if (table) {
      for (const p of table.pockets) {
        const limit = Math.max(threshold, p.radius + 45);
        if (pos.distanceTo(p.position) < limit) return true;
      }
      return false;
    }

    const W = SnookerTable.WIDTH;
    const L = SnookerTable.LENGTH;
    const pocketPositions = [
      new Vector2D(0, 0),
      new Vector2D(0, W),
      new Vector2D(L / 2, 0),
      new Vector2D(L / 2, W),
      new Vector2D(L, 0),
      new Vector2D(L, W),
    ];
    for (const p of pocketPositions) {
      if (pos.distanceTo(p) < threshold) return true;
    }
    return false;
  }

  /**
   * Clamps balls to table boundaries to ensure zero tunneling.
   */
  public static enforceTableBounds(
    ball: Ball,
    spec: CushionSpec = this.DEFAULT_CUSHION,
    table?: SnookerTable
  ): void {
    if (ball.potted) return;

    if (this.isNearPocket(ball.position, 95, table)) {
      return;
    }

    const R = ball.radius;
    const minX = R;
    const maxX = (table ? table.length : SnookerTable.LENGTH) - R;
    const minY = R;
    const maxY = (table ? table.width : SnookerTable.WIDTH) - R;

    let posX = ball.position.x;
    let posY = ball.position.y;
    let velX = ball.velocity.x;
    let velY = ball.velocity.y;
    let rollX = ball.rollVel.x;
    let rollY = ball.rollVel.y;

    if (posX < minX) {
      posX = minX;
      if (velX < 0) {
        velX = -velX * spec.restitution;
        rollX = -rollX * spec.restitution;
      }
    } else if (posX > maxX) {
      posX = maxX;
      if (velX > 0) {
        velX = -velX * spec.restitution;
        rollX = -rollX * spec.restitution;
      }
    }

    if (posY < minY) {
      posY = minY;
      if (velY < 0) {
        velY = -velY * spec.restitution;
        rollY = -rollY * spec.restitution;
      }
    } else if (posY > maxY) {
      posY = maxY;
      if (velY > 0) {
        velY = -velY * spec.restitution;
        rollY = -rollY * spec.restitution;
      }
    }

    ball.position = new Vector2D(posX, posY);
    ball.velocity = new Vector2D(velX, velY);
    ball.rollVel = new Vector2D(rollX, rollY);
  }
}
