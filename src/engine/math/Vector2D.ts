/**
 * Pure 2D Vector mathematics for rigid body snooker physics.
 * Immutable methods for deterministic calculations with zero side effects.
 */

export class Vector2D {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}

  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vector2D {
    return new Vector2D(this.x * s, this.y * s);
  }

  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2D): number {
    return this.x * v.y - this.y * v.x;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): Vector2D {
    const len = this.length();
    if (len < 1e-9) return new Vector2D(0, 0);
    return new Vector2D(this.x / len, this.y / len);
  }

  distanceTo(v: Vector2D): number {
    return this.sub(v).length();
  }

  distanceSqTo(v: Vector2D): number {
    return this.sub(v).lengthSq();
  }

  perpendicular(): Vector2D {
    return new Vector2D(-this.y, this.x);
  }

  rotate(angleRad: number): Vector2D {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return new Vector2D(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  static zero(): Vector2D {
    return new Vector2D(0, 0);
  }

  static fromAngle(angleRad: number, length: number = 1): Vector2D {
    return new Vector2D(Math.cos(angleRad) * length, Math.sin(angleRad) * length);
  }
}
