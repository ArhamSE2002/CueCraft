import { Vector2D } from '../math/Vector2D';
import { SnookerTable, type Pocket } from '../table/SnookerTable';
import { Ball, type BallType } from './Ball';
import { Cloth } from './Cloth';
import { Collisions, type CollisionEvent } from './Collisions';
import { Cushions } from './Cushions';

export interface TrajectorySegment {
  start: Vector2D;
  end: Vector2D;
  type: 'cue' | 'target' | 'cue-deflection' | 'cushion-reflection';
}

export interface TrajectoryPrediction {
  cuePath: TrajectorySegment[];
  ghostBall: Vector2D | null;
  targetBall: Ball | null;
  targetPath: TrajectorySegment[];
  cueDeflectionPath: TrajectorySegment[];
  cushionHit: Vector2D | null;
  angleDegrees: number; // Cut angle in degrees
}

export class PhysicsEngine {
  public table: SnookerTable;
  public balls: Ball[] = [];
  public isSimulating: boolean = false;
  public onBallPotted?: (ball: Ball, pocket: Pocket) => void;
  public onCollision?: (event: CollisionEvent) => void;

  constructor() {
    this.table = new SnookerTable();
    this.setupPracticeRack();
  }

  public get cueBall(): Ball | undefined {
    return this.balls.find((b) => b.type === 'cue');
  }

  public get activeBalls(): Ball[] {
    return this.balls.filter((b) => !b.potted);
  }

  public isStationary(epsilon: number = 0.5): boolean {
    return this.balls.every((b) => b.isStationary(epsilon));
  }

  /**
   * Applies strike impulse to the cue ball.
   * @param power Percentage from 0 to 100
   * @param angleRad Direction angle in radians
   * @param spinX Horizontal tip offset (-1 = left, +1 = right)
   * @param spinY Vertical tip offset (-1 = screw/backspin, +1 = follow/topspin)
   */
  public strikeCueBall(
    power: number,
    angleRad: number,
    spinX: number = 0,
    spinY: number = 0
  ): boolean {
    const cue = this.cueBall;
    if (!cue || cue.potted || !this.isStationary()) {
      return false;
    }

    // Power mapping: 0% - 100% -> 600 mm/s to 6500 mm/s
    const clampedPower = Math.max(2, Math.min(100, power));
    const speed = 600 + (clampedPower / 100) * 5800; // mm/s

    cue.velocity = Vector2D.fromAngle(angleRad, speed);

    // Spin mapping
    // spinY: +1 (topspin) -> +speed/R * 1.5; -1 (backspin) -> -speed/R * 2.0
    const clampedSpinX = Math.max(-1, Math.min(1, spinX));
    const clampedSpinY = Math.max(-1, Math.min(1, spinY));

    const pitchMultiplier = clampedSpinY < 0 ? 2.2 : 1.6;
    cue.spin.pitch = clampedSpinY * (speed / cue.radius) * pitchMultiplier;
    cue.spin.yaw = clampedSpinX * 35; // rad/s side spin

    this.isSimulating = true;
    return true;
  }

  /**
   * Advances simulation by delta time (seconds).
   * Substeps for numeric stability.
   */
  public step(dt: number, subSteps: number = 4): void {
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      // 1. Move balls
      for (const ball of this.balls) {
        if (ball.potted) continue;
        ball.position = ball.position.add(ball.velocity.scale(subDt));
      }

      // 2. Ball-cushion collisions
      for (const ball of this.balls) {
        if (ball.potted) continue;
        for (const cushion of this.table.cushions) {
          Cushions.resolveCushionCollision(ball, cushion);
        }
        Cushions.enforceTableBounds(ball);
      }

      // 3. Ball-ball collisions
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const event = Collisions.resolveBallCollision(this.balls[i], this.balls[j]);
          if (event && this.onCollision) {
            this.onCollision(event);
          }
        }
      }

      // 4. Pocket detection
      for (const ball of this.balls) {
        if (ball.potted) continue;
        for (const pocket of this.table.pockets) {
          const distToPocket = ball.position.distanceTo(pocket.position);
          if (distToPocket <= pocket.radius) {
            ball.potted = true;
            ball.pottedInPocket = pocket.id;
            ball.stop();
            if (this.onBallPotted) {
              this.onBallPotted(ball, pocket);
            }
            break;
          }
        }
      }

      // 5. Apply cloth friction
      for (const ball of this.balls) {
        Cloth.applyFriction(ball, subDt);
      }
    }

    if (this.isStationary()) {
      this.isSimulating = false;
    }
  }

  /**
   * Predicts trajectory rays, ghost ball position, and deflection angles.
   */
  public calculateTrajectory(
    angleRad: number,
    maxDistance: number = 4000
  ): TrajectoryPrediction {
    const cue = this.cueBall;
    const prediction: TrajectoryPrediction = {
      cuePath: [],
      ghostBall: null,
      targetBall: null,
      targetPath: [],
      cueDeflectionPath: [],
      cushionHit: null,
      angleDegrees: 0,
    };

    if (!cue || cue.potted) return prediction;

    const rayDir = Vector2D.fromAngle(angleRad, 1);
    const startPos = cue.position;

    // Check intersection with all active non-cue balls
    let closestBallDist = Infinity;
    let hitBall: Ball | null = null;
    let ghostPos: Vector2D | null = null;

    for (const ball of this.balls) {
      if (ball.type === 'cue' || ball.potted) continue;

      const d = ball.position.sub(startPos);
      const proj = d.dot(rayDir);
      if (proj <= 0) continue; // Behind cue ball

      const perpSq = d.lengthSq() - proj * proj;
      const collisionRadius = cue.radius + ball.radius; // 52.5 mm

      if (perpSq <= collisionRadius * collisionRadius) {
        // Ray intersects ball bounding circle
        const halfChord = Math.sqrt(collisionRadius * collisionRadius - perpSq);
        const hitDist = proj - halfChord;

        if (hitDist > 0 && hitDist < closestBallDist) {
          closestBallDist = hitDist;
          hitBall = ball;
          ghostPos = startPos.add(rayDir.scale(hitDist));
        }
      }
    }

    if (hitBall && ghostPos) {
      // Cue ball to ghost ball segment
      prediction.cuePath.push({
        start: startPos,
        end: ghostPos,
        type: 'cue',
      });
      prediction.ghostBall = ghostPos;
      prediction.targetBall = hitBall;

      // Line of centers (normal to contact)
      const normal = hitBall.position.sub(ghostPos).normalize();
      const tangent = normal.perpendicular();

      // Cut angle
      const cutCos = Math.max(-1, Math.min(1, rayDir.dot(normal)));
      prediction.angleDegrees = Math.acos(cutCos) * (180 / Math.PI);

      // Target ball path: projects along normal
      const targetEnd = hitBall.position.add(normal.scale(700));
      prediction.targetPath.push({
        start: hitBall.position,
        end: targetEnd,
        type: 'target',
      });

      // Cue ball deflection: projects along tangent
      const deflectionDir = tangent.scale(Math.sign(rayDir.dot(tangent)) || 1);
      const cueDeflectionEnd = ghostPos.add(deflectionDir.scale(500));
      prediction.cueDeflectionPath.push({
        start: ghostPos,
        end: cueDeflectionEnd,
        type: 'cue-deflection',
      });

      return prediction;
    }

    // If no ball was hit, raycast against table cushions
    let closestCushionDist = maxDistance;
    let cushionHitPoint: Vector2D | null = null;
    let cushionNormal: Vector2D | null = null;

    for (const cushion of this.table.cushions) {
      // Ray-line segment intersection
      const p1 = cushion.start;
      const p2 = cushion.end;
      const v1 = startPos.sub(p1);
      const v2 = p2.sub(p1);
      const v3 = new Vector2D(-rayDir.y, rayDir.x);

      const dot = v2.dot(v3);
      if (Math.abs(dot) < 1e-6) continue;

      const t1 = v2.cross(v1) / dot;
      const t2 = v1.dot(v3) / dot;

      if (t1 > cue.radius && t1 < closestCushionDist && t2 >= 0 && t2 <= 1) {
        closestCushionDist = t1;
        cushionHitPoint = startPos.add(rayDir.scale(t1 - cue.radius));
        cushionNormal = cushion.normal;
      }
    }

    if (cushionHitPoint && cushionNormal) {
      prediction.cuePath.push({
        start: startPos,
        end: cushionHitPoint,
        type: 'cue',
      });
      prediction.cushionHit = cushionHitPoint;

      // Reflected ray
      const incidentNormal = rayDir.dot(cushionNormal);
      const reflectDir = rayDir.sub(cushionNormal.scale(2 * incidentNormal)).normalize();
      const reflectEnd = cushionHitPoint.add(reflectDir.scale(600));

      prediction.cuePath.push({
        start: cushionHitPoint,
        end: reflectEnd,
        type: 'cushion-reflection',
      });
    } else {
      // Open table ray
      prediction.cuePath.push({
        start: startPos,
        end: startPos.add(rayDir.scale(maxDistance)),
        type: 'cue',
      });
    }

    return prediction;
  }

  /**
   * Sets up practice scenario with cue ball in baulk and 3 object balls
   * (Red near black spot, Red in center, Black on spot).
   */
  public setupPracticeRack(): void {
    this.balls = [
      // Cue ball on baulk line
      new Ball('cue', 'cue', new Vector2D(737, SnookerTable.WIDTH / 2)),
      // Red 1: Center line shot
      new Ball('red-1', 'red', new Vector2D(2200, SnookerTable.WIDTH / 2)),
      // Red 2: Angled cut shot
      new Ball('red-2', 'red', new Vector2D(2700, SnookerTable.WIDTH / 2 + 250)),
      // Black ball on spot
      new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
      // Blue ball on center spot
      new Ball('blue', 'blue', SnookerTable.SPOTS.BLUE.clone()),
    ];
    this.isSimulating = false;
  }

  /**
   * Sets up official championship 22-ball rack.
   */
  public setupChampionshipRack(): void {
    this.balls = [
      // Cue ball in "D"
      new Ball('cue', 'cue', new Vector2D(737, SnookerTable.WIDTH / 2 - 120)),
      // 6 Colors on official spots
      new Ball('yellow', 'yellow', SnookerTable.SPOTS.YELLOW.clone()),
      new Ball('green', 'green', SnookerTable.SPOTS.GREEN.clone()),
      new Ball('brown', 'brown', SnookerTable.SPOTS.BROWN.clone()),
      new Ball('blue', 'blue', SnookerTable.SPOTS.BLUE.clone()),
      new Ball('pink', 'pink', SnookerTable.SPOTS.PINK.clone()),
      new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
    ];

    // 15 Reds in triangle behind Pink spot
    // Apex of red triangle is placed just behind Pink spot
    const apexX = SnookerTable.SPOTS.PINK.x + SnookerTable.BALL_DIAMETER + 3;
    const centerY = SnookerTable.WIDTH / 2;
    const r = SnookerTable.BALL_RADIUS;
    const d = SnookerTable.BALL_DIAMETER;
    const dx = d * Math.cos(Math.PI / 6); // row horizontal spacing

    let redId = 1;
    for (let row = 0; row < 5; row++) {
      const rowX = apexX + row * dx;
      const startY = centerY - (row * d) / 2;
      for (let col = 0; col <= row; col++) {
        const rowY = startY + col * d;
        this.balls.push(new Ball(`red-${redId++}`, 'red', new Vector2D(rowX, rowY)));
      }
    }

    this.isSimulating = false;
  }

  /**
   * Reposition cue ball in hand (e.g. within "D" or practice table spot).
   */
  public placeCueBall(position: Vector2D): void {
    let cue = this.cueBall;
    if (!cue) {
      cue = new Ball('cue', 'cue', position);
      this.balls.push(cue);
    } else {
      cue.position = position;
      cue.velocity = Vector2D.zero();
      cue.spin = { pitch: 0, yaw: 0 };
      cue.potted = false;
      cue.pottedInPocket = null;
    }
  }
}
