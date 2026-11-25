import { Vector2D } from '../math/Vector2D';
import { SnookerTable, type Pocket } from '../table/SnookerTable';
import { Ball } from './Ball';
import { Cloth } from './Cloth';
import { Collisions, type CollisionEvent } from './Collisions';
import { Cushions } from './Cushions';
import {
  CLOTH_CATALOG,
  CUSHION_CATALOG,
  CUE_CATALOG,
  TIP_CATALOG,
  type ClothSpec,
  type CushionSpec,
  type CueSpec,
  type CueTipSpec,
} from '../equipment/Equipment';

export interface TrajectorySegment {
  start: Vector2D;
  end: Vector2D;
  type: 'cue' | 'target' | 'cue-deflection' | 'cushion-reflection' | 'swerve';
  bounce: number;
}

export interface ObjectBallTrajectory {
  ballId: string;
  colorHex: string;
  segments: TrajectorySegment[];
  endPos: Vector2D;
  potted: boolean;
  pottedPocketName?: string;
  cushionBounces: number;
}

export interface TrajectoryPrediction {
  cuePath: TrajectorySegment[];
  ghostBall: Vector2D | null;
  targetBall: Ball | null;
  targetPath: TrajectorySegment[];
  objectBallPaths: ObjectBallTrajectory[];
  cueDeflectionPath: TrajectorySegment[];
  cushionHit: Vector2D | null;
  cueFinalPos: Vector2D | null;
  cueCushionBounces: number;
  totalPredictedDistanceMm: number;
  angleDegrees: number;
  isCurvedSwerve?: boolean;
  fullRoute: boolean;
}

export interface FoulEvent {
  type: 'in-off' | 'miss' | 'wrong-ball';
  penalty: number;
  message: string;
}

export interface ShotTelemetryLog {
  id: number;
  timestamp: string;
  power: number;
  angleDeg: number;
  spinX: number;
  spinY: number;
  cueElevationDeg: number;
  cueName: string;
  tipName: string;
  clothName: string;
  cushionName: string;
  predictedCueEnd: { x: number; y: number } | null;
  actualCueEnd: { x: number; y: number };
  predictedCueDistMm: number;
  actualCueDistMm: number;
  cueErrorMm: number;
  predictedTargetId: string | null;
  predictedTargetEnd: { x: number; y: number } | null;
  actualTargetEnd: { x: number; y: number } | null;
  targetErrorMm: number | null;
  predictedTargetPotted: boolean;
  actualTargetPotted: boolean;
  pottedList: string[];
  foulMessage: string | null;
}

export class PhysicsEngine {
  public static readonly FIXED_DT = 1 / 60;

  public table: SnookerTable;
  public balls: Ball[] = [];
  public isSimulating: boolean = false;

  // Live configurable equipment & table physics
  public clothConfig: ClothSpec = CLOTH_CATALOG[1];
  public cushionConfig: CushionSpec = CUSHION_CATALOG[1];
  public cueConfig: CueSpec = CUE_CATALOG[0];
  public tipConfig: CueTipSpec = TIP_CATALOG[1];

  public onBallPotted?: (ball: Ball, pocket: Pocket) => void;
  public onCollision?: (event: CollisionEvent) => void;
  public onFoul?: (foul: FoulEvent) => void;
  public onShotCompleted?: (log: ShotTelemetryLog) => void;

  // Fixed-timestep accumulator for frame-rate independence
  private dtAccumulator: number = 0;

  // Active shot verification tracking
  private activeShotTracking: {
    id: number;
    power: number;
    angleDeg: number;
    spinX: number;
    spinY: number;
    cueElevationDeg: number;
    prediction: TrajectoryPrediction | null;
    cueStartPos: Vector2D;
    lastCuePos: Vector2D;
    actualCueDistMm: number;
    pottedList: string[];
    foulMessage: string | null;
  } | null = null;
  private shotCounter: number = 0;

  // Cache for ghost simulation trajectory prediction
  private cachedKey: string = '';
  private cachedPrediction: TrajectoryPrediction | null = null;

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

  public invalidatePredictionCache(): void {
    this.cachedKey = '';
    this.cachedPrediction = null;
  }

  /**
   * Computes actual initial strike speed and adjusted aim angle (including cue squirt).
   */
  public computeStrikeKinematics(
    power: number,
    angleRad: number,
    spinX: number,
    cueElevationDeg: number
  ): { speed: number; effectiveAngleRad: number; squirtRad: number } {
    const clampedPower = Math.max(2, Math.min(100, power));
    let speed =
      (500 + (clampedPower / 100) * 3800) *
      this.cueConfig.powerMultiplier *
      this.tipConfig.speedEfficiency;

    const elevationRad = (Math.max(0, Math.min(85, cueElevationDeg)) * Math.PI) / 180;
    const forwardEfficiency = Math.cos(elevationRad);
    speed *= Math.max(0.18, forwardEfficiency);

    const maxSpin = this.tipConfig.maxSpinOffset;
    const clampedSpinX = Math.max(-maxSpin, Math.min(maxSpin, spinX));

    // Cue squirt (deflection): off-center tip strike pushes cue ball slightly opposite to spinX
    const squirtRad = -clampedSpinX * this.cueConfig.squirtFactor * 0.028;
    const effectiveAngleRad = angleRad + squirtRad;

    return { speed, effectiveAngleRad, squirtRad };
  }

  /**
   * Applies strike impulse to the cue ball.
   */
  public strikeCueBall(
    power: number,
    angleRad: number,
    spinX: number = 0,
    spinY: number = 0,
    cueElevationDeg: number = 0,
    trackTelemetry: boolean = true
  ): boolean {
    const cue = this.cueBall;
    if (!cue || cue.potted || !this.isStationary()) {
      return false;
    }

    // Snapshot exact full-route prediction BEFORE mutating balls for telemetry comparison
    let preShotPrediction: TrajectoryPrediction | null = null;
    if (trackTelemetry) {
      preShotPrediction = this.calculateTrajectory(
        angleRad,
        power,
        spinX,
        spinY,
        cueElevationDeg,
        true
      );
    }

    const { speed, effectiveAngleRad } = this.computeStrikeKinematics(
      power,
      angleRad,
      spinX,
      cueElevationDeg
    );

    const maxSpin = this.tipConfig.maxSpinOffset;
    const clampedSpinX = Math.max(-maxSpin, Math.min(maxSpin, spinX));
    const clampedSpinY = Math.max(-maxSpin, Math.min(maxSpin, spinY));
    const spinMult = this.tipConfig.spinMultiplier;

    const shotDir = Vector2D.fromAngle(effectiveAngleRad, 1);
    cue.velocity = shotDir.scale(speed);

    // 2D Roll Spin Setup (mm/s rolling-equivalent surface speed vector)
    // Pure center strike (spinY ≈ 0) starts near stun (slight natural roll 0.25x) so it transitions cleanly
    // Screw (spinY < 0) gives strong reverse rollVel up to -2.2x speed
    // Topspin (spinY > 0) gives excess forward rollVel up to +2.4x speed
    let rollSpeed: number;
    if (clampedSpinY < -0.05) {
      rollSpeed = clampedSpinY * 2.25 * spinMult * speed;
    } else if (clampedSpinY > 0.05) {
      rollSpeed = speed * (0.4 + clampedSpinY * 2.0 * spinMult);
    } else {
      rollSpeed = speed * 0.2;
    }

    cue.rollVel = shotDir.scale(rollSpeed);
    cue.spin.pitch = rollSpeed / cue.radius;
    cue.spin.yaw = clampedSpinX * 42 * spinMult;

    // Swerve dynamics: Elevated cue + side spin exerts curved lateral cloth bite
    const elevationRad = (Math.max(0, Math.min(85, cueElevationDeg)) * Math.PI) / 180;
    if (cueElevationDeg > 2 && Math.abs(clampedSpinX) > 0.05) {
      cue.swerveForce =
        Math.sin(elevationRad) * clampedSpinX * (220 + speed * 0.16) * spinMult;
    } else {
      cue.swerveForce = 0;
    }

    this.dtAccumulator = 0;
    this.isSimulating = true;

    if (trackTelemetry) {
      this.shotCounter++;
      this.activeShotTracking = {
        id: this.shotCounter,
        power,
        angleDeg: ((angleRad * 180) / Math.PI + 360) % 360,
        spinX: clampedSpinX,
        spinY: clampedSpinY,
        cueElevationDeg,
        prediction: preShotPrediction,
        cueStartPos: cue.position.clone(),
        lastCuePos: cue.position.clone(),
        actualCueDistMm: 0,
        pottedList: [],
        foulMessage: null,
      };
    }

    this.invalidatePredictionCache();
    return true;
  }

  /**
   * Advances simulation using fixed timestep accumulator so live play is
   * frame-rate independent and matches ghost-simulation predictions exactly.
   */
  public step(dt: number, subSteps: number = 4): void {
    this.dtAccumulator += Math.min(dt, 0.05);

    while (this.dtAccumulator + 1e-9 >= PhysicsEngine.FIXED_DT) {
      if (this.isStationary() && !this.isSimulating) {
        this.dtAccumulator = 0;
        break;
      }
      this.isSimulating = true;
      this.stepFixed(PhysicsEngine.FIXED_DT, subSteps);
      this.dtAccumulator -= PhysicsEngine.FIXED_DT;
      if (this.isStationary()) {
        this.isSimulating = false;
      }
    }
  }

  /**
   * Executes one fixed 1/60s physics step (used identically by live loop and trajectory predictor).
   */
  public stepFixed(
    fixedDt: number = PhysicsEngine.FIXED_DT,
    subSteps: number = 4,
    emitCallbacks: boolean = true,
    onCueCushionHit?: () => void,
    onBallCushionHit?: (ballId: string) => void
  ): void {
    const subDt = fixedDt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      // 1. Move balls & apply elevated swerve curve
      for (const ball of this.balls) {
        if (ball.potted) continue;

        if (ball.type === 'cue' && Math.abs(ball.swerveForce) > 1) {
          const speed = ball.velocity.length();
          if (speed > 40) {
            const perp = ball.velocity.perpendicular().normalize();
            const lateralDelta = perp.scale(ball.swerveForce * subDt);
            ball.velocity = ball.velocity.add(lateralDelta);
            ball.swerveForce *= Math.pow(0.968, subDt * 120);
          } else {
            ball.swerveForce = 0;
          }
        }

        const deltaPos = ball.velocity.scale(subDt);
        ball.position = ball.position.add(deltaPos);
        ball.updateRotation(deltaPos, subDt);

        if (emitCallbacks && this.activeShotTracking && ball.type === 'cue') {
          this.activeShotTracking.actualCueDistMm += deltaPos.length();
        }
      }

      // 2. Ball-cushion collisions
      for (const ball of this.balls) {
        if (ball.potted) continue;
        let hitCushion = false;
        for (const cushion of this.table.cushions) {
          if (Cushions.resolveCushionCollision(ball, cushion, this.cushionConfig)) {
            hitCushion = true;
          }
        }
        Cushions.enforceTableBounds(ball, this.cushionConfig);
        if (hitCushion) {
          if (ball.type === 'cue' && onCueCushionHit) onCueCushionHit();
          if (ball.type !== 'cue' && onBallCushionHit) onBallCushionHit(ball.id);
        }
      }

      // 3. Ball-ball collisions
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const event = Collisions.resolveBallCollision(this.balls[i], this.balls[j]);
          if (event && emitCallbacks && this.onCollision) {
            this.onCollision(event);
          }
        }
      }

      // 4. Pocket detection & Foul Handling
      for (const ball of this.balls) {
        if (ball.potted) continue;
        for (const pocket of this.table.pockets) {
          const distToPocket = ball.position.distanceTo(pocket.position);
          const captureRadius = pocket.radius + ball.radius * 0.45;
          if (distToPocket <= captureRadius) {
            if (ball.type === 'cue') {
              ball.stop();
              if (emitCallbacks) {
                this.placeCueBall(new Vector2D(737, SnookerTable.WIDTH / 2));
                const msg = `FOUL: In-off into ${pocket.name}. Penalty: -4 points. Cue ball placed in the 'D'.`;
                if (this.activeShotTracking) {
                  this.activeShotTracking.foulMessage = msg;
                }
                if (this.onFoul) {
                  this.onFoul({ type: 'in-off', penalty: 4, message: msg });
                }
              } else {
                ball.potted = true;
                ball.pottedInPocket = pocket.id;
              }
            } else {
              ball.potted = true;
              ball.pottedInPocket = pocket.id;
              ball.stop();
              if (emitCallbacks) {
                if (this.activeShotTracking) {
                  this.activeShotTracking.pottedList.push(ball.type.toUpperCase());
                }
                if (this.onBallPotted) {
                  this.onBallPotted(ball, pocket);
                }
              }
            }
            break;
          }
        }
      }

      // 5. Apply cloth friction (2D sliding & rolling)
      for (const ball of this.balls) {
        Cloth.applyFriction(ball, subDt, this.clothConfig);
      }
    }

    if (this.isStationary()) {
      this.isSimulating = false;
      if (emitCallbacks && this.activeShotTracking) {
        this.finalizeShotTelemetry();
      }
    }
  }

  private finalizeShotTelemetry(): void {
    const tracking = this.activeShotTracking;
    if (!tracking) return;
    this.activeShotTracking = null;

    const cue = this.cueBall;
    const actualCueEnd = cue ? { x: Math.round(cue.position.x), y: Math.round(cue.position.y) } : { x: 0, y: 0 };
    const pred = tracking.prediction;
    const predCueEnd = pred?.cueFinalPos
      ? { x: Math.round(pred.cueFinalPos.x), y: Math.round(pred.cueFinalPos.y) }
      : null;

    const cueErrorMm =
      pred?.cueFinalPos && cue
        ? Number(cue.position.distanceTo(pred.cueFinalPos).toFixed(1))
        : 0;

    let predTargetId: string | null = null;
    let predTargetEnd: { x: number; y: number } | null = null;
    let actualTargetEnd: { x: number; y: number } | null = null;
    let targetErrorMm: number | null = null;
    let predTargetPotted = false;
    let actualTargetPotted = false;

    if (pred && pred.objectBallPaths.length > 0) {
      const firstObj = pred.objectBallPaths[0];
      predTargetId = firstObj.ballId;
      predTargetEnd = { x: Math.round(firstObj.endPos.x), y: Math.round(firstObj.endPos.y) };
      predTargetPotted = firstObj.potted;

      const realBall = this.balls.find((b) => b.id === firstObj.ballId);
      if (realBall) {
        actualTargetPotted = realBall.potted;
        actualTargetEnd = { x: Math.round(realBall.position.x), y: Math.round(realBall.position.y) };
        if (!predTargetPotted && !actualTargetPotted) {
          targetErrorMm = Number(realBall.position.distanceTo(firstObj.endPos).toFixed(1));
        } else if (predTargetPotted === actualTargetPotted) {
          targetErrorMm = 0;
        }
      }
    }

    const log: ShotTelemetryLog = {
      id: tracking.id,
      timestamp: new Date().toLocaleTimeString(),
      power: tracking.power,
      angleDeg: Number(tracking.angleDeg.toFixed(2)),
      spinX: tracking.spinX,
      spinY: tracking.spinY,
      cueElevationDeg: tracking.cueElevationDeg,
      cueName: this.cueConfig.name,
      tipName: this.tipConfig.name,
      clothName: this.clothConfig.name,
      cushionName: this.cushionConfig.name,
      predictedCueEnd: predCueEnd,
      actualCueEnd,
      predictedCueDistMm: Math.round(pred?.totalPredictedDistanceMm ?? 0),
      actualCueDistMm: Math.round(tracking.actualCueDistMm),
      cueErrorMm,
      predictedTargetId: predTargetId,
      predictedTargetEnd: predTargetEnd,
      actualTargetEnd,
      targetErrorMm,
      predictedTargetPotted: predTargetPotted,
      actualTargetPotted,
      pottedList: tracking.pottedList,
      foulMessage: tracking.foulMessage,
    };

    if (this.onShotCompleted) {
      this.onShotCompleted(log);
    }
  }

  /**
   * Predicts trajectory rays using exact deterministic ghost-simulation when fullRoute=true,
   * guaranteeing 1:1 fidelity with live ball movement (distance, curves, spin, cushions, multi-ball hits).
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
    const empty: TrajectoryPrediction = {
      cuePath: [],
      ghostBall: null,
      targetBall: null,
      targetPath: [],
      objectBallPaths: [],
      cueDeflectionPath: [],
      cushionHit: null,
      cueFinalPos: null,
      cueCushionBounces: 0,
      totalPredictedDistanceMm: 0,
      angleDegrees: 0,
      isCurvedSwerve: false,
      fullRoute,
    };

    if (!cue || cue.potted) return empty;

    // Cache lookup
    const ballSig = this.balls
      .filter((b) => !b.potted)
      .map((b) => `${b.id}:${b.position.x.toFixed(1)},${b.position.y.toFixed(1)}`)
      .join('|');
    const key = `${ballSig}#${angleRad.toFixed(5)}#${power}#${spinX.toFixed(2)}#${spinY.toFixed(
      2
    )}#${cueElevationDeg}#${fullRoute}#${this.clothConfig.id}#${this.cushionConfig.id}#${
      this.cueConfig.id
    }#${this.tipConfig.id}`;

    if (this.cachedKey === key && this.cachedPrediction) {
      return this.cachedPrediction;
    }

    const { effectiveAngleRad } = this.computeStrikeKinematics(
      power,
      angleRad,
      spinX,
      cueElevationDeg
    );
    const effectivePower = Math.max(5, Math.min(100, power));
    const maxLookaheadDist = 400 + (effectivePower / 100) * 3600;

    // ── Exact Analytical First-Impact Geometry (always gives sub-mm Ghost Ball & Cut Angle) ──
    const firstRayInfo = this.findFirstRayIntersection(
      cue,
      effectiveAngleRad,
      fullRoute ? 4200 : maxLookaheadDist
    );

    if (!fullRoute) {
      // Curved swerve preview when cue butt elevated with side spin
      if (cueElevationDeg > 5 && Math.abs(spinX) > 0.08) {
        const pred: TrajectoryPrediction = {
          ...empty,
          isCurvedSwerve: true,
        };
        const elevationRad = (cueElevationDeg * Math.PI) / 180;
        const swerveStrength = Math.sin(elevationRad) * spinX * 0.45 * this.tipConfig.spinMultiplier;
        let curPos = cue.position.clone();
        let curAngle = effectiveAngleRad;
        const stepDist = 40;
        const totalSteps = Math.min(50, Math.floor(maxLookaheadDist / stepDist));
        for (let i = 0; i < totalSteps; i++) {
          curAngle += swerveStrength * 0.08 * Math.max(0.2, 1 - i / totalSteps);
          const nextPos = curPos.add(Vector2D.fromAngle(curAngle, stepDist));
          pred.cuePath.push({ start: curPos, end: nextPos, type: 'swerve', bounce: 0 });
          curPos = nextPos;
        }
        this.cachedKey = key;
        this.cachedPrediction = pred;
        return pred;
      }

      // Single-leg "Aim Ray Only" mode with spin-aware initial deflection
      const pred: TrajectoryPrediction = {
        ...empty,
        ghostBall: firstRayInfo.ghostBall,
        targetBall: firstRayInfo.targetBall,
        angleDegrees: firstRayInfo.cutAngleDeg,
        cushionHit: firstRayInfo.cushionHit,
      };

      if (firstRayInfo.ghostBall && firstRayInfo.targetBall) {
        pred.cuePath.push({
          start: cue.position.clone(),
          end: firstRayInfo.ghostBall,
          type: 'cue',
          bounce: 0,
        });
        const normal = firstRayInfo.targetBall.position.sub(firstRayInfo.ghostBall).normalize();
        const tangent = normal.perpendicular();
        const rayDir = Vector2D.fromAngle(effectiveAngleRad, 1);
        const cutCos = Math.max(0, Math.min(1, rayDir.dot(normal)));
        pred.targetPath.push({
          start: firstRayInfo.targetBall.position.clone(),
          end: firstRayInfo.targetBall.position.add(normal.scale(Math.max(160, (effectivePower / 100) * 2000 * cutCos))),
          type: 'target',
          bounce: 0,
        });

        // Compute initial cue post-impact deflection vector with spin
        const speed = 500 + (effectivePower / 100) * 3800;
        let deflectionVec = tangent.scale(rayDir.dot(tangent) * speed);
        if (spinY < -0.05) {
          deflectionVec = deflectionVec.sub(normal.scale(Math.abs(spinY) * speed * 0.8 * cutCos));
        } else if (spinY > 0.05) {
          deflectionVec = deflectionVec.add(normal.scale(spinY * speed * 0.65 * cutCos));
        }
        if (deflectionVec.length() > 15) {
          const defDist = Math.max(120, (deflectionVec.length() / 4300) * 1600);
          pred.cueDeflectionPath.push({
            start: firstRayInfo.ghostBall.clone(),
            end: firstRayInfo.ghostBall.add(deflectionVec.normalize().scale(defDist)),
            type: 'cue-deflection',
            bounce: 0,
          });
        }
      } else if (firstRayInfo.cushionHit) {
        pred.cuePath.push({
          start: cue.position.clone(),
          end: firstRayInfo.cushionHit,
          type: 'cue',
          bounce: 0,
        });
      } else {
        pred.cuePath.push({
          start: cue.position.clone(),
          end: cue.position.add(Vector2D.fromAngle(effectiveAngleRad, maxLookaheadDist)),
          type: 'cue',
          bounce: 0,
        });
      }

      this.cachedKey = key;
      this.cachedPrediction = pred;
      return pred;
    }

    // ── FULL SIMULATION ROUTE TRACE ───────────────────────────────────────────
    const sim = new PhysicsEngine();
    sim.clothConfig = this.clothConfig;
    sim.cushionConfig = this.cushionConfig;
    sim.cueConfig = this.cueConfig;
    sim.tipConfig = this.tipConfig;
    sim.balls = this.balls.map((b) => b.clone());

    const simCue = sim.cueBall!;
    sim.strikeCueBall(power, angleRad, spinX, spinY, cueElevationDeg, false);

    // Emit trajectory vertices ONLY on direction changes (> 0.015 rad), cushion bounces, collisions, or stop
    const cueSamples: Array<{ pos: Vector2D; bounce: number; postImpact: boolean }> = [
      { pos: simCue.position.clone(), bounce: 0, postImpact: false },
    ];
    let lastCueSampleDir = simCue.velocity.length() > 1 ? simCue.velocity.normalize() : Vector2D.fromAngle(effectiveAngleRad, 1);

    const objTrackers = new Map<
      string,
      {
        startPos: Vector2D;
        lastRecordedPos: Vector2D;
        lastDir: Vector2D | null;
        samples: Array<{ pos: Vector2D; bounce: number }>;
        bounces: number;
        colorHex: string;
        moved: boolean;
      }
    >();

    for (const b of sim.balls) {
      if (b.type !== 'cue' && !b.potted) {
        objTrackers.set(b.id, {
          startPos: b.position.clone(),
          lastRecordedPos: b.position.clone(),
          lastDir: null,
          samples: [{ pos: b.position.clone(), bounce: 0 }],
          bounces: 0,
          colorHex: b.colorInfo.hex,
          moved: false,
        });
      }
    }

    let cueBounces = 0;
    let hasHitBall = false;
    let firstHitBallId: string | null = null;
    let ghostImpactPos: Vector2D | null = firstRayInfo.ghostBall;
    let simCutAngleDeg = firstRayInfo.cutAngleDeg;
    let firstCushionHitPos: Vector2D | null = null;
    let totalCueDist = 0;
    let prevCuePos = simCue.position.clone();

    sim.onCollision = (ev) => {
      if (!hasHitBall && (ev.ballA.type === 'cue' || ev.ballB.type === 'cue')) {
        hasHitBall = true;
        const other = ev.ballA.type === 'cue' ? ev.ballB : ev.ballA;
        firstHitBallId = other.id;

        if (!ghostImpactPos) {
          const hitCuePos = ev.ballA.type === 'cue' ? ev.ballA.position : ev.ballB.position;
          ghostImpactPos = hitCuePos.clone();
          const normal = other.position.sub(hitCuePos).normalize();
          const curDir = simCue.velocity.length() > 1 ? simCue.velocity.normalize() : Vector2D.fromAngle(effectiveAngleRad, 1);
          const cos = Math.max(-1, Math.min(1, curDir.dot(normal)));
          simCutAngleDeg = Math.acos(cos) * (180 / Math.PI);
        }

        cueSamples.push({ pos: simCue.position.clone(), bounce: cueBounces, postImpact: false });
        if (simCue.velocity.length() > 1) {
          lastCueSampleDir = simCue.velocity.normalize();
        }
      }
    };

    const MAX_SIM_FRAMES = 450;
    for (let f = 0; f < MAX_SIM_FRAMES && sim.isSimulating; f++) {
      sim.stepFixed(
        PhysicsEngine.FIXED_DT,
        4,
        true,
        () => {
          cueBounces++;
          if (!firstCushionHitPos) firstCushionHitPos = simCue.position.clone();
          cueSamples.push({ pos: simCue.position.clone(), bounce: cueBounces, postImpact: hasHitBall });
          if (simCue.velocity.length() > 1) {
            lastCueSampleDir = simCue.velocity.normalize();
          }
        },
        (ballId) => {
          const t = objTrackers.get(ballId);
          if (t) {
            t.bounces++;
            const realB = sim.balls.find((x) => x.id === ballId);
            if (realB) {
              t.samples.push({ pos: realB.position.clone(), bounce: t.bounces });
              t.lastRecordedPos = realB.position.clone();
              t.lastDir = realB.velocity.length() > 1 ? realB.velocity.normalize() : null;
            }
          }
        }
      );

      totalCueDist += simCue.position.distanceTo(prevCuePos);
      prevCuePos = simCue.position.clone();

      // Record cue vertex ONLY if curve/direction changed noticeably or simulation ended
      if (!sim.isSimulating || simCue.potted) {
        cueSamples.push({ pos: simCue.position.clone(), bounce: cueBounces, postImpact: hasHitBall });
      } else if (simCue.velocity.length() > 15) {
        const curDir = simCue.velocity.normalize();
        const dot = curDir.dot(lastCueSampleDir);
        if (dot < 0.9996 && simCue.position.distanceTo(cueSamples[cueSamples.length - 1].pos) >= 20) {
          cueSamples.push({ pos: simCue.position.clone(), bounce: cueBounces, postImpact: hasHitBall });
          lastCueSampleDir = curDir;
        }
      }

      // Record object ball vertices ONLY on direction changes, potting, or end of motion
      for (const b of sim.balls) {
        if (b.type === 'cue') continue;
        const t = objTrackers.get(b.id);
        if (!t) continue;
        if (b.position.distanceTo(t.startPos) > 1.0) {
          t.moved = true;
        }
        if (t.moved) {
          if (b.potted || !sim.isSimulating) {
            t.samples.push({ pos: b.position.clone(), bounce: t.bounces });
            t.lastRecordedPos = b.position.clone();
          } else if (b.velocity.length() > 15) {
            const curDir = b.velocity.normalize();
            if (!t.lastDir || curDir.dot(t.lastDir) < 0.9996) {
              if (b.position.distanceTo(t.lastRecordedPos) >= 20) {
                t.samples.push({ pos: b.position.clone(), bounce: t.bounces });
                t.lastRecordedPos = b.position.clone();
              }
              t.lastDir = curDir;
            }
          }
        }
      }
    }

    // Build TrajectorySegments from sampled points
    const cuePath: TrajectorySegment[] = [];
    const cueDeflectionPath: TrajectorySegment[] = [];
    const isSwerve = cueElevationDeg > 4 && Math.abs(spinX) > 0.06;

    for (let i = 0; i < cueSamples.length - 1; i++) {
      const a = cueSamples[i];
      const b = cueSamples[i + 1];
      if (a.pos.distanceTo(b.pos) < 1.5) continue;

      if (a.postImpact) {
        cueDeflectionPath.push({
          start: a.pos,
          end: b.pos,
          type: a.bounce > 0 ? 'cushion-reflection' : 'cue-deflection',
          bounce: a.bounce,
        });
      } else {
        cuePath.push({
          start: a.pos,
          end: b.pos,
          type: isSwerve && a.bounce === 0 ? 'swerve' : a.bounce > 0 ? 'cushion-reflection' : 'cue',
          bounce: a.bounce,
        });
      }
    }

    const objectBallPaths: ObjectBallTrajectory[] = [];
    let primaryTargetSegments: TrajectorySegment[] = [];

    for (const [ballId, tracker] of objTrackers.entries()) {
      if (!tracker.moved) continue;
      const simBall = sim.balls.find((b) => b.id === ballId)!;
      const segs: TrajectorySegment[] = [];
      for (let i = 0; i < tracker.samples.length - 1; i++) {
        const a = tracker.samples[i];
        const b = tracker.samples[i + 1];
        if (a.pos.distanceTo(b.pos) < 1.5) continue;
        segs.push({
          start: a.pos,
          end: b.pos,
          type: 'target',
          bounce: a.bounce,
        });
      }
      const pocketObj = simBall.pottedInPocket
        ? this.table.pockets.find((p) => p.id === simBall.pottedInPocket)
        : undefined;

      const entry: ObjectBallTrajectory = {
        ballId,
        colorHex: tracker.colorHex,
        segments: segs,
        endPos: simBall.position.clone(),
        potted: simBall.potted,
        pottedPocketName: pocketObj?.name,
        cushionBounces: tracker.bounces,
      };
      objectBallPaths.push(entry);

      if (ballId === firstHitBallId || (primaryTargetSegments.length === 0 && segs.length > 0)) {
        primaryTargetSegments = segs;
      }
    }

    const targetBallRef = firstHitBallId
      ? this.balls.find((b) => b.id === firstHitBallId) ?? firstRayInfo.targetBall
      : firstRayInfo.targetBall;

    const prediction: TrajectoryPrediction = {
      cuePath,
      ghostBall: ghostImpactPos,
      targetBall: targetBallRef,
      targetPath: primaryTargetSegments,
      objectBallPaths,
      cueDeflectionPath,
      cushionHit: firstCushionHitPos ?? firstRayInfo.cushionHit,
      cueFinalPos: simCue.position.clone(),
      cueCushionBounces: cueBounces,
      totalPredictedDistanceMm: totalCueDist,
      angleDegrees: simCutAngleDeg,
      isCurvedSwerve: isSwerve,
      fullRoute: true,
    };

    this.cachedKey = key;
    this.cachedPrediction = prediction;
    return prediction;
  }

  /**
   * Analytical raycast for first contact point (exact 2R ghost ball position & cut angle).
   */
  private findFirstRayIntersection(
    cue: Ball,
    angleRad: number,
    maxDist: number
  ): {
    ghostBall: Vector2D | null;
    targetBall: Ball | null;
    cushionHit: Vector2D | null;
    cutAngleDeg: number;
  } {
    const rayDir = Vector2D.fromAngle(angleRad, 1);
    const startPos = cue.position;
    let closestBallDist = maxDist;
    let hitBall: Ball | null = null;
    let ghostPos: Vector2D | null = null;

    for (const ball of this.balls) {
      if (ball.type === 'cue' || ball.potted) continue;
      const d = ball.position.sub(startPos);
      const proj = d.dot(rayDir);
      if (proj <= 0) continue;

      const perpSq = d.lengthSq() - proj * proj;
      const collisionRadius = cue.radius + ball.radius;
      if (perpSq <= collisionRadius * collisionRadius) {
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
      const normal = hitBall.position.sub(ghostPos).normalize();
      const cutCos = Math.max(-1, Math.min(1, rayDir.dot(normal)));
      const cutAngleDeg = Math.acos(cutCos) * (180 / Math.PI);
      return { ghostBall: ghostPos, targetBall: hitBall, cushionHit: null, cutAngleDeg };
    }

    const cushionHit = this.rayCastCushion(startPos, rayDir, maxDist, cue.radius);
    return {
      ghostBall: null,
      targetBall: null,
      cushionHit: cushionHit?.hitPoint ?? null,
      cutAngleDeg: 0,
    };
  }

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
   * Moves any ball cleanly on the table bed (used in Move Balls / Setup Mode).
   * Prevents moving outside rails or overlapping another active ball.
   */
  public moveBall(ballId: string, desiredPos: Vector2D): boolean {
    const ball = this.balls.find((b) => b.id === ballId);
    if (!ball) return false;

    const R = ball.radius;
    const clampedX = Math.max(R + 1, Math.min(SnookerTable.LENGTH - R - 1, desiredPos.x));
    const clampedY = Math.max(R + 1, Math.min(SnookerTable.WIDTH - R - 1, desiredPos.y));
    const candidate = new Vector2D(clampedX, clampedY);

    // Prevent overlap with other unpotted balls
    for (const other of this.balls) {
      if (other.id === ballId || other.potted) continue;
      if (other.position.distanceTo(candidate) < ball.radius + other.radius + 1) {
        return false;
      }
    }

    ball.position = candidate;
    ball.velocity = Vector2D.zero();
    ball.rollVel = Vector2D.zero();
    ball.spin = { pitch: 0, yaw: 0 };
    ball.swerveForce = 0;
    ball.potted = false;
    ball.pottedInPocket = null;
    this.invalidatePredictionCache();
    return true;
  }

  public setupPracticeRack(): void {
    this.balls = [
      new Ball('cue', 'cue', new Vector2D(737, SnookerTable.WIDTH / 2)),
      new Ball('red-1', 'red', new Vector2D(2200, SnookerTable.WIDTH / 2)),
      new Ball('red-2', 'red', new Vector2D(2700, SnookerTable.WIDTH / 2 + 250)),
      new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
      new Ball('blue', 'blue', SnookerTable.SPOTS.BLUE.clone()),
    ];
    this.isSimulating = false;
    this.invalidatePredictionCache();
  }

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
    this.invalidatePredictionCache();
  }

  public placeCueBall(position: Vector2D): void {
    let cue = this.cueBall;
    if (!cue) {
      cue = new Ball('cue', 'cue', position);
      this.balls.push(cue);
    } else {
      cue.position = position;
      cue.stop();
      cue.potted = false;
      cue.pottedInPocket = null;
    }
    this.invalidatePredictionCache();
  }
}
