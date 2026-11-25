import { Vector2D } from '../math/Vector2D';
import { SnookerTable } from '../table/SnookerTable';

export type BallType =
  | 'cue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'brown'
  | 'blue'
  | 'pink'
  | 'black'
  | 'pool-solid'
  | 'pool-stripe'
  | 'pool-8';

export interface BallColorInfo {
  type: BallType;
  points: number;
  hex: string;
  specularHex: string;
}

export interface PoolBallSpec {
  number: number;
  hex: string;
  specularHex: string;
  isStripe: boolean;
  label: string;
}

export const POOL_BALL_SPECS: Record<number, PoolBallSpec> = {
  1: { number: 1, hex: '#EAB308', specularHex: '#FDE047', isStripe: false, label: 'Yellow Solid' },
  2: { number: 2, hex: '#2563EB', specularHex: '#60A5FA', isStripe: false, label: 'Blue Solid' },
  3: { number: 3, hex: '#DC2626', specularHex: '#F87171', isStripe: false, label: 'Red Solid' },
  4: { number: 4, hex: '#7C3AED', specularHex: '#A78BFA', isStripe: false, label: 'Purple Solid' },
  5: { number: 5, hex: '#EA580C', specularHex: '#FB923C', isStripe: false, label: 'Orange Solid' },
  6: { number: 6, hex: '#16A34A', specularHex: '#4ADE80', isStripe: false, label: 'Green Solid' },
  7: { number: 7, hex: '#881337', specularHex: '#FB7185', isStripe: false, label: 'Maroon Solid' },
  8: { number: 8, hex: '#18181B', specularHex: '#52525B', isStripe: false, label: '8-Ball Black' },
  9: { number: 9, hex: '#EAB308', specularHex: '#FDE047', isStripe: true, label: 'Yellow Stripe' },
  10: { number: 10, hex: '#2563EB', specularHex: '#60A5FA', isStripe: true, label: 'Blue Stripe' },
  11: { number: 11, hex: '#DC2626', specularHex: '#F87171', isStripe: true, label: 'Red Stripe' },
  12: { number: 12, hex: '#7C3AED', specularHex: '#A78BFA', isStripe: true, label: 'Purple Stripe' },
  13: { number: 13, hex: '#EA580C', specularHex: '#FB923C', isStripe: true, label: 'Orange Stripe' },
  14: { number: 14, hex: '#16A34A', specularHex: '#4ADE80', isStripe: true, label: 'Green Stripe' },
  15: { number: 15, hex: '#881337', specularHex: '#FB7185', isStripe: true, label: 'Maroon Stripe' },
};

export const BALL_COLORS: Record<BallType, BallColorInfo> = {
  cue: { type: 'cue', points: 0, hex: '#FFFFFF', specularHex: '#EAEAEA' },
  red: { type: 'red', points: 1, hex: '#DC2626', specularHex: '#F87171' },
  yellow: { type: 'yellow', points: 2, hex: '#EAB308', specularHex: '#FDE047' },
  green: { type: 'green', points: 3, hex: '#16A34A', specularHex: '#4ADE80' },
  brown: { type: 'brown', points: 4, hex: '#92400E', specularHex: '#B45309' },
  blue: { type: 'blue', points: 5, hex: '#2563EB', specularHex: '#60A5FA' },
  pink: { type: 'pink', points: 6, hex: '#EC4899', specularHex: '#F472B6' },
  black: { type: 'black', points: 7, hex: '#18181B', specularHex: '#3F3F46' },
  'pool-solid': { type: 'pool-solid', points: 1, hex: '#EAB308', specularHex: '#FDE047' },
  'pool-stripe': { type: 'pool-stripe', points: 1, hex: '#2563EB', specularHex: '#60A5FA' },
  'pool-8': { type: 'pool-8', points: 8, hex: '#18181B', specularHex: '#3F3F46' },
};

export class Ball {
  public id: string;
  public type: BallType;
  public position: Vector2D;
  public velocity: Vector2D;

  /**
   * 2D rolling-equivalent surface velocity vector (mm/s).
   * At pure roll, rollVel equals velocity.
   * For topspin, rollVel > velocity in shot direction.
   * For backspin (screw), rollVel points opposite to shot direction.
   */
  public rollVel: Vector2D;

  // Angular spin velocity (rad/s)
  // pitch: Signed rolling angular speed (topspin + / backspin -) synced with rollVel
  // yaw: Left (-) / Right (+) side-spin around vertical axis
  public spin: { pitch: number; yaw: number };

  // 3D rotation angles for realistic visual roll
  public rotation: { x: number; y: number; z: number };

  // Swerve force from elevated cue strikes (masse)
  public swerveForce: number = 0;

  public radius: number;
  public mass: number; // in kg (0.142 kg regulation)
  public potted: boolean;
  public pottedInPocket: string | null = null;
  public number?: number;
  public isStripe: boolean = false;
  public customHex?: string;
  public customSpecularHex?: string;

  constructor(
    id: string,
    type: BallType,
    position: Vector2D,
    radius: number = SnookerTable.BALL_RADIUS,
    poolNumber?: number
  ) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.velocity = Vector2D.zero();
    this.rollVel = Vector2D.zero();
    this.spin = { pitch: 0, yaw: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.radius = radius;
    this.mass = 0.142;
    this.potted = false;

    if (poolNumber !== undefined && POOL_BALL_SPECS[poolNumber]) {
      const spec = POOL_BALL_SPECS[poolNumber];
      this.number = poolNumber;
      this.isStripe = spec.isStripe;
      this.customHex = spec.hex;
      this.customSpecularHex = spec.specularHex;
    }
  }

  get colorInfo(): BallColorInfo {
    const base = BALL_COLORS[this.type];
    if (this.customHex) {
      return {
        type: this.type,
        points: this.number ?? base.points,
        hex: this.customHex,
        specularHex: this.customSpecularHex ?? base.specularHex,
      };
    }
    return base;
  }

  isStationary(epsilon: number = 0.5): boolean {
    return (
      this.velocity.lengthSq() < epsilon * epsilon &&
      this.rollVel.lengthSq() < epsilon * epsilon &&
      Math.abs(this.spin.pitch) < 0.1 &&
      Math.abs(this.spin.yaw) < 0.1
    );
  }

  stop(): void {
    this.velocity = Vector2D.zero();
    this.rollVel = Vector2D.zero();
    this.spin = { pitch: 0, yaw: 0 };
    this.swerveForce = 0;
  }

  /**
   * Updates 3D visual rotation angles based on displacement and spin.
   */
  updateRotation(deltaPos: Vector2D, dt: number): void {
    const R = this.radius;
    const effDeltaX = this.rollVel.lengthSq() > 1 ? this.rollVel.x * dt : deltaPos.x;
    const effDeltaY = this.rollVel.lengthSq() > 1 ? this.rollVel.y * dt : deltaPos.y;
    this.rotation.z -= effDeltaX / R;
    this.rotation.x += effDeltaY / R;
    this.rotation.y += this.spin.yaw * dt;
  }

  clone(): Ball {
    const copy = new Ball(this.id, this.type, this.position.clone(), this.radius, this.number);
    copy.velocity = this.velocity.clone();
    copy.rollVel = this.rollVel.clone();
    copy.spin = { ...this.spin };
    copy.rotation = { ...this.rotation };
    copy.swerveForce = this.swerveForce;
    copy.mass = this.mass;
    copy.potted = this.potted;
    copy.pottedInPocket = this.pottedInPocket;
    copy.isStripe = this.isStripe;
    copy.customHex = this.customHex;
    copy.customSpecularHex = this.customSpecularHex;
    return copy;
  }
}
