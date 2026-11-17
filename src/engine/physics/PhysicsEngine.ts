import { Vector2D } from '../math/Vector2D';
import { SnookerTable, type Pocket } from '../table/SnookerTable';
import { Ball, type BallType } from './Ball';
import { Cloth } from './Cloth';
import { Collisions, type CollisionEvent } from './Collisions';
import { Cushions } from './Cushions';

export interface TrajectorySegment {
  start: Vector2D;
  end: Vector2D;
  type: 'cue' | 'target' | 'cue-deflection' | 'cushion-reflection' | 'swerve';
  bounce: number; // 0 = first leg, 1 = after first cushion, etc.
}

export interface TrajectoryPrediction {
  cuePath: TrajectorySegment[];
  ghostBall: Vector2D | null;
  targetBall: Ball | null;
  targetPath: TrajectorySegment[];
  cueDeflectionPath: TrajectorySegment[];
  cushionHit: Vector2D | null;
  angleDegrees: number; // Cut angle in degrees
  isCurvedSwerve?: boolean;
  fullRoute: boolean; // Whether multi-cushion trace was computed
}

export interface FoulEvent {
  type: 'in-off' | 'miss' | 'wrong-ball';
  penalty: number;
  message: string;
}

export class PhysicsEngine {
  public table: SnookerTable;
  public balls: Ball[] = [];
  public isSimulating: boolean = false;
  public onBallPotted?: (ball: Ball, pocket: Pocket) => void;
  public onCollision?: (event: CollisionEvent) => void;
  public onFoul?: (foul: FoulEvent) => void;

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
   * @param power Percentage from 2 to 100
   * @param angleRad Direction angle in radians
   * @param spinX Horizontal tip offset (-1 = left, +1 = right english)
   * @param spinY Vertical tip offset (-1 = screw/backspin, +1 = follow/topspin)
   * @param cueElevationDeg Butt elevation angle (0° = level to 70° = masse)
   */
  public strikeCueBall(
    power: number,
    angleRad: number,
    spinX: number = 0,
    spinY: number = 0,
    cueElevationDeg: number = 0
  ): boolean {
    const cue = this.cueBall;
    if (!cue || cue.potted || !this.isStationary()) {
      return false;
    }

    // Power mapping: 2% - 100% -> 600 mm/s to 6500 mm/s
    const clampedPower = Math.max(2, Math.min(100, power));
    let speed = 600 + (clampedPower / 100) * 5800; // mm/s

    // Butt elevation downforce factor
    const elevationRad = (Math.max(0, Math.min(75, cueElevationDeg)) * Math.PI) / 180;
    const forwardEfficiency = Math.cos(elevationRad); // Downward strike absorbs some forward speed
    speed *= Math.max(0.4, forwardEfficiency);

    cue.velocity = Vector2D.fromAngle(angleRad, speed);

    // Spin mapping
    const clampedSpinX = Math.max(-0.85, Math.min(0.85, spinX));
    const clampedSpinY = Math.max(-0.85, Math.min(0.85, spinY));

    const pitchMultiplier = clampedSpinY < 0 ? 2.2 : 1.6;
    cue.spin.pitch = clampedSpinY * (speed / cue.radius) * pitchMultiplier;
    cue.spin.yaw = clampedSpinX * 35; // rad/s side spin

    // Swerve dynamics: Elevated cue + side spin exerts persistent lateral force on cloth
    if (cueElevationDeg > 2 && Math.abs(clampedSpinX) > 0.05) {
      // Swerve force perpendicular to travel
      cue.swerveForce = Math.sin(elevationRad) * clampedSpinX * (150 + speed * 0.12);
    } else {
      cue.swerveForce = 0;
    }

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
      // 1. Move balls & apply swerve mechanics
      for (const ball of this.balls) {
        if (ball.potted) continue;

        // Apply swerve curve if cue ball was struck with elevation + side spin
        if (ball.type === 'cue' && Math.abs(ball.swerveForce) > 1) {
          const speed = ball.velocity.length();
          if (speed > 100) {
            const perp = ball.velocity.perpendicular().normalize();
            ball.velocity = ball.velocity.add(perp.scale(ball.swerveForce * subDt));
            // Swerve force decays as ball bites and transitions to roll
            ball.swerveForce *= Math.pow(0.965, subDt * 120);
          } else {
            ball.swerveForce = 0;
          }
        }

        const deltaPos = ball.velocity.scale(subDt);
        ball.position = ball.position.add(deltaPos);
        ball.updateRotation(deltaPos, subDt);
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

      // 4. Pocket detection & Foul Handling
      for (const ball of this.balls) {
        if (ball.potted) continue;
        for (const pocket of this.table.pockets) {
          const distToPocket = ball.position.distanceTo(pocket.position);
          if (distToPocket <= pocket.radius) {
            if (ball.type === 'cue') {
              // FOUL: In-off (Cue ball pocketed)
              ball.stop();
              // In snooker rules: Cue ball potted is a foul (minimum 4 points penalty)
              // and the ball is returned in-hand inside the "D"
              this.placeCueBall(new Vector2D(737, SnookerTable.WIDTH / 2));
              
              if (this.onFoul) {
                this.onFoul({
                  type: 'in-off',
                  penalty: 4,
                  message: `FOUL: In-off into ${pocket.name}. Penalty: -4 points. Cue ball placed in the 'D'.`,
                });
              }
            } else {
              // Valid object ball pot
              ball.potted = true;
              ball.pottedInPocket = pocket.id;
              ball.stop();
              if (this.onBallPotted) {
                this.onBallPotted(ball, pocket);
              }
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
   * Line lengths dynamically scale with cue power.
   * If cue butt is elevated with side spin, computes curved swerve prediction.
   * @param fullRoute If true, traces multi-cushion path until distance budget is exhausted.
   */
  public calculateTrajectory(
    angleRad: number,
    power: number = 35,
    spinX: number = 0,
    spinY: number = 0,
    cueElevationDeg: number = 0,
    fullRoute: boolean = false
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
      isCurvedSwerve: false,
      fullRoute,
    };

    if (!cue || cue.potted) return prediction;

    // Line length scales directly with cue power:
    // 2% power -> ~400 mm
    // 50% power -> ~2200 mm
    // 100% power -> ~4000 mm (full table length)
    const effectivePower = Math.max(5, Math.min(100, power));
    const maxLookaheadDist = 400 + (effectivePower / 100) * 3600;

    const startPos = cue.position;

    // Check if curved swerve trajectory (masse shot)
    if (cueElevationDeg > 5 && Math.abs(spinX) > 0.08) {
      prediction.isCurvedSwerve = true;
      const elevationRad = (cueElevationDeg * Math.PI) / 180;
      const swerveStrength = Math.sin(elevationRad) * spinX * 0.45;

      let currentPos = startPos;
      let currentAngle = angleRad;
      const stepDist = 40;
      const totalSteps = Math.min(50, Math.floor(maxLookaheadDist / stepDist));

      for (let i = 0; i < totalSteps; i++) {
        // Curve direction
        currentAngle += swerveStrength * 0.08 * Math.max(0.2, 1 - i / totalSteps);
        const nextPos = currentPos.add(Vector2D.fromAngle(currentAngle, stepDist));

        prediction.cuePath.push({
          start: currentPos,
          end: nextPos,
          type: 'swerve',
          bounce: 0,
        });
        currentPos = nextPos;
      }
      return prediction;
    }

    if (fullRoute) {
      // ---- FULL MULTI-CUSHION ROUTE TRACE ----
      this.traceFullRoute(prediction, startPos, angleRad, maxLookaheadDist, effectivePower, cue);
    } else {
      // ---- SINGLE-LEG TRACE (direction only) ----
      this.traceSingleLeg(prediction, startPos, angleRad, maxLookaheadDist, effectivePower, cue);
    }

    return prediction;
  }

  /**
   * Traces one leg from startPos in direction angleRad — first ball OR first cushion then stops.
   */
  private traceSingleLeg(
    prediction: TrajectoryPrediction,
    startPos: Vector2D,
    angleRad: number,
    maxLookaheadDist: number,
    effectivePower: number,
    cue: Ball
  ): void {
    const rayDir = Vector2D.fromAngle(angleRad, 1);

    // Check intersection with all active non-cue balls
    let closestBallDist = maxLookaheadDist;
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
        bounce: 0,
      });
      prediction.ghostBall = ghostPos;
      prediction.targetBall = hitBall;

      // Line of centers (normal to contact)
      const normal = hitBall.position.sub(ghostPos).normalize();
      const tangent = normal.perpendicular();

      // Cut angle
      const cutCos = Math.max(-1, Math.min(1, rayDir.dot(normal)));
      prediction.angleDegrees = Math.acos(cutCos) * (180 / Math.PI);

      // Target ball path: length scales with power and cut angle
      const targetDist = Math.max(150, (effectivePower / 100) * 2200 * cutCos);
      const targetEnd = hitBall.position.add(normal.scale(targetDist));
      prediction.targetPath.push({
        start: hitBall.position,
        end: targetEnd,
        type: 'target',
        bounce: 0,
      });

      // Cue ball deflection: length scales with power and remaining tangential speed
      const sinCut = Math.sin(Math.acos(cutCos));
      const deflectionDist = Math.max(120, (effectivePower / 100) * 1600 * Math.max(0.2, sinCut));
      const deflectionDir = tangent.scale(Math.sign(rayDir.dot(tangent)) || 1);
      const cueDeflectionEnd = ghostPos.add(deflectionDir.scale(deflectionDist));
      prediction.cueDeflectionPath.push({
        start: ghostPos,
        end: cueDeflectionEnd,
        type: 'cue-deflection',
        bounce: 0,
      });

      return;
    }

    // If no ball was hit, raycast against table cushions within power distance
    const cushionResult = this.rayCastCushion(startPos, rayDir, maxLookaheadDist, cue.radius);

    if (cushionResult) {
      prediction.cuePath.push({
        start: startPos,
        end: cushionResult.hitPoint,
        type: 'cue',
        bounce: 0,
      });
      prediction.cushionHit = cushionResult.hitPoint;

      // Reflected ray (length scales with remaining power)
      const remainingDist = Math.max(100, (maxLookaheadDist - cushionResult.dist) * 0.72);
      const reflectEnd = cushionResult.hitPoint.add(cushionResult.reflectDir.scale(remainingDist));

      prediction.cuePath.push({
        start: cushionResult.hitPoint,
        end: reflectEnd,
        type: 'cushion-reflection',
        bounce: 1,
      });
    } else {
      // Free open ray: length proportional to shot power
      prediction.cuePath.push({
        start: startPos,
        end: startPos.add(rayDir.scale(maxLookaheadDist)),
        type: 'cue',
        bounce: 0,
      });
    }
  }

  /**
   * Full multi-cushion trace — follows the cue ball through up to 8 cushion bounces
   * or until the distance budget is exhausted.
   */
  private traceFullRoute(
    prediction: TrajectoryPrediction,
    startPos: Vector2D,
    angleRad: number,
    totalDist: number,
    effectivePower: number,
    cue: Ball
  ): void {
    let currentPos = startPos;
    let currentDir = Vector2D.fromAngle(angleRad, 1);
    let remainingDist = totalDist;
    let bounce = 0;
    const MAX_BOUNCES = 8;
    // Cushion energy loss: each bounce loses ~28% of remaining distance
    const CUSHION_ENERGY = 0.72;

    while (remainingDist > 50 && bounce <= MAX_BOUNCES) {
      // Check ball intersection first
      let closestBallDist = remainingDist;
      let hitBall: Ball | null = null;
      let ghostPos: Vector2D | null = null;

      for (const ball of this.balls) {
        if (ball.type === 'cue' || ball.potted) continue;
        const d = ball.position.sub(currentPos);
        const proj = d.dot(currentDir);
        if (proj <= 0) continue;
        const perpSq = d.lengthSq() - proj * proj;
        const collisionRadius = cue.radius + ball.radius;
        if (perpSq <= collisionRadius * collisionRadius) {
          const halfChord = Math.sqrt(collisionRadius * collisionRadius - perpSq);
          const hitDist = proj - halfChord;
          if (hitDist > 0 && hitDist < closestBallDist) {
            closestBallDist = hitDist;
            hitBall = ball;
            ghostPos = currentPos.add(currentDir.scale(hitDist));
          }
        }
      }

      if (hitBall && ghostPos) {
        // Trace stops at first ball contact
        prediction.cuePath.push({
          start: currentPos,
          end: ghostPos,
          type: bounce === 0 ? 'cue' : 'cushion-reflection',
          bounce,
        });
        prediction.ghostBall = ghostPos;
        prediction.targetBall = hitBall;

        const normal = hitBall.position.sub(ghostPos).normalize();
        const tangent = normal.perpendicular();
        const cutCos = Math.max(-1, Math.min(1, currentDir.dot(normal)));
        prediction.angleDegrees = Math.acos(cutCos) * (180 / Math.PI);

        const targetDist = Math.max(150, (effectivePower / 100) * 2200 * cutCos);
        prediction.targetPath.push({
          start: hitBall.position,
          end: hitBall.position.add(normal.scale(targetDist)),
          type: 'target',
          bounce: 0,
        });

        const sinCut = Math.sin(Math.acos(cutCos));
        const deflectionDist = Math.max(120, (effectivePower / 100) * 1600 * Math.max(0.2, sinCut));
        const deflectionDir = tangent.scale(Math.sign(currentDir.dot(tangent)) || 1);
        prediction.cueDeflectionPath.push({
          start: ghostPos,
          end: ghostPos.add(deflectionDir.scale(deflectionDist)),
          type: 'cue-deflection',
          bounce: 0,
        });

        return;
      }

      // Raycast against cushions
      const cushionResult = this.rayCastCushion(currentPos, currentDir, remainingDist, cue.radius);

      if (cushionResult) {
        prediction.cuePath.push({
          start: currentPos,
          end: cushionResult.hitPoint,
          type: bounce === 0 ? 'cue' : 'cushion-reflection',
          bounce,
        });
        if (bounce === 0) prediction.cushionHit = cushionResult.hitPoint;

        currentPos = cushionResult.hitPoint;
        currentDir = cushionResult.reflectDir;
        remainingDist = (remainingDist - cushionResult.dist) * CUSHION_ENERGY;
        bounce++;
      } else {
        // No cushion in range — draw remaining leg and stop
        prediction.cuePath.push({
          start: currentPos,
          end: currentPos.add(currentDir.scale(remainingDist)),
          type: bounce === 0 ? 'cue' : 'cushion-reflection',
          bounce,
        });
        break;
      }
    }
  }

  /**
   * Raycast a line from origin in direction dir against all cushion segments.
   * Returns the closest hit point, its distance, and the reflected direction.
   */
  private rayCastCushion(
    origin: Vector2D,
    dir: Vector2D,
    maxDist: number,
    ballRadius: number
  ): { hitPoint: Vector2D; dist: number; reflectDir: Vector2D } | null {
    let closestDist = maxDist;
    let cushionHitPoint: Vector2D | null = null;
    let cushionNormal: Vector2D | null = null;

    for (const cushion of this.table.cushions) {
      const p1 = cushion.start;
      const p2 = cushion.end;
      const v1 = origin.sub(p1);
      const v2 = p2.sub(p1);
      const v3 = new Vector2D(-dir.y, dir.x);

      const dot = v2.dot(v3);
      if (Math.abs(dot) < 1e-6) continue;

      const t1 = v2.cross(v1) / dot;
      const t2 = v1.dot(v3) / dot;

      if (t1 > ballRadius && t1 < closestDist && t2 >= 0 && t2 <= 1) {
        closestDist = t1;
        cushionHitPoint = origin.add(dir.scale(t1 - ballRadius));
        cushionNormal = cushion.normal;
      }
    }

    if (cushionHitPoint && cushionNormal) {
      const incidentNormal = dir.dot(cushionNormal);
      const reflectDir = dir.sub(cushionNormal.scale(2 * incidentNormal)).normalize();
      return { hitPoint: cushionHitPoint, dist: closestDist, reflectDir };
    }

    return null;
  }

  /**
   * Sets up practice scenario.
   */
  public setupPracticeRack(): void {
    this.balls = [
      new Ball('cue', 'cue', new Vector2D(737, SnookerTable.WIDTH / 2)),
      new Ball('red-1', 'red', new Vector2D(2200, SnookerTable.WIDTH / 2)),
      new Ball('red-2', 'red', new Vector2D(2700, SnookerTable.WIDTH / 2 + 250)),
      new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
      new Ball('blue', 'blue', SnookerTable.SPOTS.BLUE.clone()),
    ];
    this.isSimulating = false;
  }

  /**
   * Sets up championship 22-ball rack.
   */
  public setupChampionshipRack(): void {
    this.balls = [
      new Ball('cue', 'cue', new Vector2D(737, SnookerTable.WIDTH / 2 - 120)),
      new Ball('yellow', 'yellow', SnookerTable.SPOTS.YELLOW.clone()),
      new Ball('green', 'green', SnookerTable.SPOTS.GREEN.clone()),
      new Ball('brown', 'brown', SnookerTable.SPOTS.BROWN.clone()),
      new Ball('blue', 'blue', SnookerTable.SPOTS.BLUE.clone()),
      new Ball('pink', 'pink', SnookerTable.SPOTS.PINK.clone()),
      new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
    ];

    const apexX = SnookerTable.SPOTS.PINK.x + SnookerTable.BALL_DIAMETER + 3;
    const centerY = SnookerTable.WIDTH / 2;
    const d = SnookerTable.BALL_DIAMETER;
    const dx = d * Math.cos(Math.PI / 6);

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
   * Reposition cue ball in hand (e.g. within "D").
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
      cue.swerveForce = 0;
      cue.potted = false;
      cue.pottedInPocket = null;
    }
  }
}
