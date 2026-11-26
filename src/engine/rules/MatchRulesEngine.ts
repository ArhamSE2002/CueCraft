import type { Ball, BallType } from '../physics/Ball';
import { BALL_COLORS } from '../physics/Ball';
import { SnookerTable } from '../table/SnookerTable';
import { Vector2D } from '../math/Vector2D';

export type MatchRuleVariant = 'snooker' | '9ball' | '8ball';

export interface ShotOutcomeInput {
  ballsAfter: Ball[];
  firstHitBall: { id: string; type: BallType; number?: number } | null;
  pottedBalls: Array<{ id: string; type: BallType; number?: number; pocketId: string | null }>;
  cueInOff: boolean;
  cushionHitAfterFirstContact: boolean;
  shotNumber: number;
}

export interface ReSpotInstruction {
  ballId: string;
  type: BallType;
  number?: number;
  position: Vector2D;
}

export interface MatchResolution {
  foul: boolean;
  foulReason: string | null;
  penaltyPoints: number;
  pointsScored: number;
  switchTurn: boolean;
  frameOver: boolean;
  winnerPlayer: 0 | 1 | null;
  reSpots: ReSpotInstruction[];
  ballInHand: boolean;
  replayedShotRecommended: boolean;
  notice: string;
}

export const SNOOKER_CLEARANCE_ORDER: BallType[] = [
  'yellow',
  'green',
  'brown',
  'blue',
  'pink',
  'black',
];

const SNOOKER_SPOT_PRIORITY: Array<{ key: keyof SnookerTable['spots']; type: BallType }> = [
  { key: 'BLACK', type: 'black' },
  { key: 'PINK', type: 'pink' },
  { key: 'BLUE', type: 'blue' },
  { key: 'BROWN', type: 'brown' },
  { key: 'GREEN', type: 'green' },
  { key: 'YELLOW', type: 'yellow' },
];

export interface MatchRulesSnapshot {
  variant: MatchRuleVariant;
  scores: [number, number];
  activePlayer: 0 | 1;
  currentBreak: number;
  highBreaks: [number, number];
  shotNumber: number;
  frameOver: boolean;
  winnerPlayer: 0 | 1 | null;
  ballInHand: boolean;
  // Snooker state
  snookerPhase: 'red' | 'color' | 'colors-clearance';
  nominatedColor: BallType | null;
  clearanceIndex: number;
  isFreeBall: boolean;
  missAvailable: boolean;
  lastFoulPoints: number;
  // 9-Ball state
  lowestBallNumber: number | null;
  pushOutAvailable: boolean;
  pushOutDeclared: boolean;
  pushOutDecisionPending: boolean;
  consecutiveFouls: [number, number];
  // 8-Ball state
  eightBallOpen: boolean;
  playerGroups: [null | 'solids' | 'stripes', null | 'solids' | 'stripes'];
  onEightBall: [boolean, boolean];
  calledPocketId: string | null;
  statusBanner: string;
}

export class MatchRulesEngine {
  private table: SnookerTable;
  public state: MatchRulesSnapshot;
  private preShotBallsBackup: Array<{
    id: string;
    type: BallType;
    x: number;
    y: number;
    potted: boolean;
    number?: number;
  }> | null = null;
  private preShotStateBackup: MatchRulesSnapshot | null = null;

  constructor(variant: MatchRuleVariant, table?: SnookerTable) {
    this.table = table ?? new SnookerTable(variant);
    this.state = this.createInitialState(variant);
  }

  private createInitialState(variant: MatchRuleVariant): MatchRulesSnapshot {
    return {
      variant,
      scores: [0, 0],
      activePlayer: 0,
      currentBreak: 0,
      highBreaks: [0, 0],
      shotNumber: 0,
      frameOver: false,
      winnerPlayer: null,
      ballInHand: false,
      snookerPhase: 'red',
      nominatedColor: null,
      clearanceIndex: 0,
      isFreeBall: false,
      missAvailable: false,
      lastFoulPoints: 0,
      lowestBallNumber: variant === '9ball' ? 1 : null,
      pushOutAvailable: false,
      pushOutDeclared: false,
      pushOutDecisionPending: false,
      consecutiveFouls: [0, 0],
      eightBallOpen: variant === '8ball',
      playerGroups: [null, null],
      onEightBall: [false, false],
      calledPocketId: null,
      statusBanner:
        variant === 'snooker'
          ? 'Player 1 Break · Target: Red (1 pt)'
          : variant === '9ball'
            ? 'Player 1 Break · Target: Lowest (#1)'
            : 'Player 1 Break · Open Table',
    };
  }

  public reset(variant: MatchRuleVariant, table?: SnookerTable): void {
    if (table) this.table = table;
    this.preShotBallsBackup = null;
    this.preShotStateBackup = null;
    this.state = this.createInitialState(variant);
  }

  public setTable(table: SnookerTable): void {
    this.table = table;
  }

  public capturePreShot(balls: Ball[]): void {
    this.preShotBallsBackup = balls.map((b) => ({
      id: b.id,
      type: b.type,
      x: b.position.x,
      y: b.position.y,
      potted: b.potted,
      number: b.number,
    }));
    this.preShotStateBackup = {
      ...this.state,
      scores: [...this.state.scores] as [number, number],
      highBreaks: [...this.state.highBreaks] as [number, number],
      consecutiveFouls: [...this.state.consecutiveFouls] as [number, number],
      playerGroups: [...this.state.playerGroups] as [null | 'solids' | 'stripes', null | 'solids' | 'stripes'],
      onEightBall: [...this.state.onEightBall] as [boolean, boolean],
    };
  }

  public nominateSnookerColor(color: BallType): void {
    if (this.state.variant !== 'snooker') return;
    if (this.state.snookerPhase !== 'color' && !this.state.isFreeBall) return;
    this.state.nominatedColor = color;
    this.updateStatusBanner();
  }

  public setCalledPocket(pocketId: string | null): void {
    this.state.calledPocketId = pocketId;
    this.updateStatusBanner();
  }

  public declareNineBallPushOut(): void {
    if (this.state.variant !== '9ball' || !this.state.pushOutAvailable) return;
    this.state.pushOutDeclared = true;
    this.state.pushOutAvailable = false;
    this.updateStatusBanner('Push-Out active — hit anywhere without lowest-ball foul.');
  }

  public resolveNineBallPushOutPassBack(): void {
    if (this.state.variant !== '9ball' || !this.state.pushOutDecisionPending) return;
    this.state.pushOutDecisionPending = false;
    this.state.activePlayer = this.state.activePlayer === 0 ? 1 : 0;
    this.updateStatusBanner('Opponent passed shot back — play from current lie.');
  }

  public acceptNineBallPushOut(): void {
    if (this.state.variant !== '9ball' || !this.state.pushOutDecisionPending) return;
    this.state.pushOutDecisionPending = false;
    this.updateStatusBanner();
  }

  public callMissAndReplay(): Array<{
    id: string;
    type: BallType;
    x: number;
    y: number;
    potted: boolean;
    number?: number;
  }> | null {
    if (this.state.variant !== 'snooker' || !this.state.missAvailable || !this.preShotBallsBackup || !this.preShotStateBackup) {
      return null;
    }
    const offender: 0 | 1 = this.state.activePlayer === 0 ? 1 : 0;
    const currentScores = [...this.state.scores] as [number, number];
    const restored = this.preShotStateBackup;
    this.state = {
      ...restored,
      scores: currentScores,
      activePlayer: offender,
      currentBreak: 0,
      missAvailable: false,
      isFreeBall: false,
      ballInHand: false,
    };
    this.updateStatusBanner(`Miss called! Player ${offender + 1} must replay previous stroke.`);
    return this.preShotBallsBackup.map((b) => ({ ...b }));
  }

  public clearBallInHand(): void {
    this.state.ballInHand = false;
  }

  public getSnookerTargetBalls(balls: Ball[]): Ball[] {
    if (this.state.snookerPhase === 'red') {
      return balls.filter((b) => !b.potted && b.type === 'red');
    }
    if (this.state.snookerPhase === 'colors-clearance') {
      const targetType = SNOOKER_CLEARANCE_ORDER[this.state.clearanceIndex] ?? 'black';
      return balls.filter((b) => !b.potted && b.type === targetType);
    }
    if (this.state.nominatedColor) {
      return balls.filter((b) => !b.potted && b.type === this.state.nominatedColor);
    }
    return balls.filter((b) => !b.potted && b.type !== 'red' && b.type !== 'cue');
  }

  /**
   * Geometric edge-to-edge snooker detection: returns true when cue ball cannot touch
   * BOTH extreme edges of ANY legal target ball on a direct straight path.
   */
  public checkIsSnookered(balls: Ball[]): boolean {
    const cue = balls.find((b) => b.type === 'cue' && !b.potted);
    if (!cue) return false;
    const targets = this.getSnookerTargetBalls(balls);
    if (targets.length === 0) return false;

    const obstacles = balls.filter(
      (b) => !b.potted && b.type !== 'cue' && !targets.some((t) => t.id === b.id)
    );

    for (const target of targets) {
      const toTarget = target.position.sub(cue.position);
      const dist = toTarget.length();
      if (dist < 1e-3) continue;
      const dir = toTarget.normalize();
      const perp = dir.perpendicular();
      // Test extreme left edge, center, and extreme right edge paths (0.98R)
      const edgeOffsets = [-target.radius * 0.96, 0, target.radius * 0.96];
      const anyEdgeBlocked = edgeOffsets.some((off) => {
        const endPt = target.position.add(perp.scale(off));
        const seg = endPt.sub(cue.position);
        const segLen = seg.length();
        const segDir = seg.scale(1 / segLen);
        for (const obs of obstacles) {
          const toObs = obs.position.sub(cue.position);
          const proj = toObs.dot(segDir);
          if (proj <= 0 || proj >= segLen) continue;
          const perpSq = toObs.lengthSq() - proj * proj;
          const minClear = cue.radius + obs.radius - 0.8;
          if (perpSq < minClear * minClear) {
            return true;
          }
        }
        return false;
      });

      if (!anyEdgeBlocked) {
        return false; // Clear full view of at least one on-ball!
      }
    }

    return true;
  }

  public evaluateShot(input: ShotOutcomeInput): MatchResolution {
    this.state.shotNumber = input.shotNumber;
    if (this.state.variant === 'snooker') {
      return this.evaluateSnookerShot(input);
    }
    if (this.state.variant === '9ball') {
      return this.evaluateNineBallShot(input);
    }
    return this.evaluateEightBallShot(input);
  }

  private findSafeRespotPosition(desired: Vector2D, balls: Ball[], ignoreId: string): Vector2D {
    const R = this.table.ballRadius;
    const margin = R + 2;
    const fits = (pt: Vector2D): boolean => {
      if (
        pt.x < margin ||
        pt.x > this.table.length - margin ||
        pt.y < margin ||
        pt.y > this.table.width - margin
      ) {
        return false;
      }
      return balls.every((b) => {
        if (b.potted || b.id === ignoreId) return true;
        return b.position.distanceTo(pt) >= R * 2 + 1.5;
      });
    };

    if (fits(desired)) return desired.clone();

    // Try standard color spots from highest value downward
    for (const sp of SNOOKER_SPOT_PRIORITY) {
      const candidate = this.table.spots[sp.key];
      if (fits(candidate)) return candidate.clone();
    }

    // Fallback: march back along centerline near spot
    for (let dx = -40; dx >= -900; dx -= 32) {
      const cand = new Vector2D(desired.x + dx, desired.y);
      if (fits(cand)) return cand;
    }
    return new Vector2D(this.table.length * 0.5, this.table.width * 0.5);
  }

  private evaluateSnookerShot(input: ShotOutcomeInput): MatchResolution {
    const pIdx = this.state.activePlayer;
    const oppIdx: 0 | 1 = pIdx === 0 ? 1 : 0;
    const remainingReds = input.ballsAfter.filter((b) => !b.potted && b.type === 'red').length;
    const expectedClearanceType = SNOOKER_CLEARANCE_ORDER[this.state.clearanceIndex] ?? 'black';

    const onBallValue = (): number => {
      if (this.state.snookerPhase === 'red') return 1;
      if (this.state.snookerPhase === 'colors-clearance') return BALL_COLORS[expectedClearanceType].points;
      if (this.state.nominatedColor) return BALL_COLORS[this.state.nominatedColor].points;
      return 4;
    };

    let foul = false;
    let foulReason: string | null = null;
    let maxFoulVal = Math.max(4, onBallValue());

    if (input.cueInOff) {
      foul = true;
      foulReason = 'In-off (cue ball potted)';
    } else if (!input.firstHitBall) {
      foul = true;
      foulReason = 'Miss — failed to strike any ball';
    } else if (!this.state.isFreeBall) {
      const hitType = input.firstHitBall.type;
      if (this.state.snookerPhase === 'red' && hitType !== 'red') {
        foul = true;
        foulReason = `Foul: struck ${hitType.toUpperCase()} first when RED was on`;
        maxFoulVal = Math.max(maxFoulVal, BALL_COLORS[hitType].points);
      } else if (this.state.snookerPhase === 'color') {
        if (hitType === 'red') {
          foul = true;
          foulReason = 'Foul: struck RED when a COLOR was on';
        } else if (this.state.nominatedColor && hitType !== this.state.nominatedColor) {
          foul = true;
          foulReason = `Foul: nominated ${this.state.nominatedColor.toUpperCase()}, hit ${hitType.toUpperCase()}`;
          maxFoulVal = Math.max(maxFoulVal, BALL_COLORS[hitType].points);
        }
      } else if (this.state.snookerPhase === 'colors-clearance' && hitType !== expectedClearanceType) {
        foul = true;
        foulReason = `Foul: must hit ${expectedClearanceType.toUpperCase()} next`;
        maxFoulVal = Math.max(maxFoulVal, BALL_COLORS[hitType].points);
      }
    }

    // Validate potted balls legality
    const reSpots: ReSpotInstruction[] = [];
    for (const pb of input.pottedBalls) {
      maxFoulVal = Math.max(maxFoulVal, BALL_COLORS[pb.type].points);
      if (this.state.isFreeBall) {
        // Free ball or color gets respotted cleanly
        if (pb.type !== 'red') {
          const spot = this.findSnookerSpotForColor(pb.type, input.ballsAfter, pb.id);
          reSpots.push({ ballId: pb.id, type: pb.type, position: spot });
        }
        continue;
      }

      if (this.state.snookerPhase === 'red') {
        if (pb.type !== 'red') {
          foul = true;
          foulReason = foulReason ?? `Foul: potted ${pb.type.toUpperCase()} while RED was on`;
        }
      } else if (this.state.snookerPhase === 'color') {
        if (pb.type === 'red') {
          foul = true;
          foulReason = foulReason ?? 'Foul: potted RED on color turn';
        } else if (this.state.nominatedColor && pb.type !== this.state.nominatedColor) {
          foul = true;
          foulReason = foulReason ?? `Foul: potted ${pb.type.toUpperCase()} instead of ${this.state.nominatedColor.toUpperCase()}`;
        }
      } else if (this.state.snookerPhase === 'colors-clearance') {
        if (pb.type !== expectedClearanceType) {
          foul = true;
          foulReason = foulReason ?? `Foul: potted ${pb.type.toUpperCase()} out of clearance order`;
        }
      }

      // Colors always respot during red/color phase or if foul occurred on clearance
      if (pb.type !== 'red' && (remainingReds > 0 || this.state.snookerPhase !== 'colors-clearance' || foul)) {
        reSpots.push({
          ballId: pb.id,
          type: pb.type,
          position: this.findSnookerSpotForColor(pb.type, input.ballsAfter, pb.id),
        });
      }
    }

    // Also respot color even on last-red follow-up color shot if phase === 'color' and foul wasn't clearance
    if (this.state.snookerPhase === 'color') {
      for (const pb of input.pottedBalls) {
        if (pb.type !== 'red' && !reSpots.some((r) => r.ballId === pb.id)) {
          reSpots.push({
            ballId: pb.id,
            type: pb.type,
            position: this.findSnookerSpotForColor(pb.type, input.ballsAfter, pb.id),
          });
        }
      }
    }

    this.state.missAvailable = false;

    if (foul) {
      this.state.scores[oppIdx] += maxFoulVal;
      this.state.currentBreak = 0;
      this.state.nominatedColor = null;
      this.state.activePlayer = oppIdx;
      this.state.ballInHand = input.cueInOff;
      this.state.lastFoulPoints = maxFoulVal;

      // Advance phase appropriately if all reds were potted accidentally
      if (remainingReds === 0 && this.state.snookerPhase !== 'colors-clearance') {
        this.state.snookerPhase = 'colors-clearance';
        this.syncClearanceIndex(input.ballsAfter, reSpots);
      } else if (remainingReds > 0) {
        this.state.snookerPhase = 'red';
      }

      const snookeredNow = this.checkIsSnookered(input.ballsAfter);
      this.state.isFreeBall = snookeredNow;
      this.state.missAvailable = !input.firstHitBall || !input.cueInOff;

      const notice = `${foulReason} (+${maxFoulVal} to P${oppIdx + 1})${
        snookeredNow ? ' · FREE BALL AWARDED!' : ''
      }`;
      this.updateStatusBanner(notice);

      return {
        foul: true,
        foulReason,
        penaltyPoints: maxFoulVal,
        pointsScored: 0,
        switchTurn: true,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: input.cueInOff,
        replayedShotRecommended: this.state.missAvailable,
        notice,
      };
    }

    // Legal stroke!
    const wasFreeBall = this.state.isFreeBall;
    const freeBallPts = onBallValue();
    this.state.isFreeBall = false;
    let pts = 0;
    if (input.pottedBalls.length > 0) {
      for (const pb of input.pottedBalls) {
        pts += wasFreeBall ? freeBallPts : BALL_COLORS[pb.type].points;
      }
      this.state.scores[pIdx] += pts;
      this.state.currentBreak += pts;
      if (this.state.currentBreak > this.state.highBreaks[pIdx]) {
        this.state.highBreaks[pIdx] = this.state.currentBreak;
      }

      // Transition phase cleanly
      if (this.state.snookerPhase === 'red') {
        this.state.snookerPhase = 'color';
        this.state.nominatedColor = null;
      } else if (this.state.snookerPhase === 'color') {
        this.state.nominatedColor = null;
        if (remainingReds > 0) {
          this.state.snookerPhase = 'red';
        } else {
          this.state.snookerPhase = 'colors-clearance';
          this.syncClearanceIndex(input.ballsAfter, reSpots);
        }
      } else {
        this.syncClearanceIndex(input.ballsAfter, reSpots);
      }

      // Check end of frame (all colors cleared!)
      const remainingColors = input.ballsAfter.filter(
        (b) => !b.potted && b.type !== 'cue' && !reSpots.some((r) => r.ballId === b.id)
      );
      if (remainingColors.length === 0) {
        // Check tie -> respot black!
        if (this.state.scores[0] === this.state.scores[1]) {
          const black = input.ballsAfter.find((b) => b.type === 'black');
          if (black) {
            reSpots.push({
              ballId: black.id,
              type: 'black',
              position: this.findSnookerSpotForColor('black', input.ballsAfter, black.id),
            });
            this.state.snookerPhase = 'colors-clearance';
            this.state.clearanceIndex = SNOOKER_CLEARANCE_ORDER.indexOf('black');
            this.updateStatusBanner('Scores tied on Black! Re-spotted Black sudden death.');
            return {
              foul: false,
              foulReason: null,
              penaltyPoints: 0,
              pointsScored: pts,
              switchTurn: false,
              frameOver: false,
              winnerPlayer: null,
              reSpots,
              ballInHand: false,
              replayedShotRecommended: false,
              notice: 'Re-spotted Black sudden death!',
            };
          }
        }

        const winner: 0 | 1 = this.state.scores[0] > this.state.scores[1] ? 0 : 1;
        this.state.frameOver = true;
        this.state.winnerPlayer = winner;
        const msg = `Frame won by Player ${winner + 1} (${this.state.scores[0]}–${this.state.scores[1]})!`;
        this.updateStatusBanner(msg);
        return {
          foul: false,
          foulReason: null,
          penaltyPoints: 0,
          pointsScored: pts,
          switchTurn: false,
          frameOver: true,
          winnerPlayer: winner,
          reSpots,
          ballInHand: false,
          replayedShotRecommended: false,
          notice: msg,
        };
      }

      const msg = `P${pIdx + 1} potted +${pts} (Break ${this.state.currentBreak})`;
      this.updateStatusBanner();
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: pts,
        switchTurn: false,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    // Legal safety / no pot -> pass turn
    this.state.currentBreak = 0;
    this.state.nominatedColor = null;
    this.state.activePlayer = oppIdx;
    if (remainingReds === 0) {
      this.state.snookerPhase = 'colors-clearance';
      this.syncClearanceIndex(input.ballsAfter, reSpots);
    } else {
      this.state.snookerPhase = 'red';
    }
    this.updateStatusBanner();
    return {
      foul: false,
      foulReason: null,
      penaltyPoints: 0,
      pointsScored: 0,
      switchTurn: true,
      frameOver: false,
      winnerPlayer: null,
      reSpots,
      ballInHand: false,
      replayedShotRecommended: false,
      notice: `Turn switches to Player ${oppIdx + 1}.`,
    };
  }

  private findSnookerSpotForColor(type: BallType, balls: Ball[], ignoreId: string): Vector2D {
    const map: Partial<Record<BallType, keyof SnookerTable['spots']>> = {
      yellow: 'YELLOW',
      green: 'GREEN',
      brown: 'BROWN',
      blue: 'BLUE',
      pink: 'PINK',
      black: 'BLACK',
    };
    const key = map[type] ?? 'BLUE';
    return this.findSafeRespotPosition(this.table.spots[key], balls, ignoreId);
  }

  private syncClearanceIndex(balls: Ball[], reSpots: ReSpotInstruction[]): void {
    for (let i = 0; i < SNOOKER_CLEARANCE_ORDER.length; i++) {
      const t = SNOOKER_CLEARANCE_ORDER[i];
      const alive = balls.some(
        (b) => (!b.potted && b.type === t) || reSpots.some((r) => r.type === t)
      );
      if (alive) {
        this.state.clearanceIndex = i;
        return;
      }
    }
    this.state.clearanceIndex = SNOOKER_CLEARANCE_ORDER.length - 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9-BALL RULES ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  private evaluateNineBallShot(input: ShotOutcomeInput): MatchResolution {
    const pIdx = this.state.activePlayer;
    const oppIdx: 0 | 1 = pIdx === 0 ? 1 : 0;

    // Lowest remaining ball BEFORE/AT this shot (include balls just potted)
    const remainingNumsBefore = input.ballsAfter
      .filter((b) => !b.potted || input.pottedBalls.some((p) => p.id === b.id))
      .filter((b) => b.type !== 'cue' && typeof b.number === 'number')
      .map((b) => b.number as number);
    const lowestOn = remainingNumsBefore.length > 0 ? Math.min(...remainingNumsBefore) : 9;

    const remainingAfter = input.ballsAfter
      .filter((b) => !b.potted && b.type !== 'cue' && typeof b.number === 'number')
      .map((b) => b.number as number);
    const nextLowest = remainingAfter.length > 0 ? Math.min(...remainingAfter) : null;
    this.state.lowestBallNumber = nextLowest;

    // Handle Push-Out resolution
    const wasPushOut = this.state.pushOutDeclared;
    this.state.pushOutDeclared = false;
    this.state.pushOutAvailable = false;

    let foul = false;
    let foulReason: string | null = null;

    if (input.cueInOff) {
      foul = true;
      foulReason = 'Scratch (Cue ball potted)';
    } else if (!wasPushOut) {
      if (!input.firstHitBall) {
        foul = true;
        foulReason = `Foul: missed target #${lowestOn}`;
      } else if (input.firstHitBall.number !== lowestOn) {
        foul = true;
        foulReason = `Foul: hit #${input.firstHitBall.number} instead of lowest #${lowestOn}`;
      } else if (input.pottedBalls.length === 0 && !input.cushionHitAfterFirstContact) {
        foul = true;
        foulReason = 'Foul: no ball potted or cushion hit after contact';
      }
    }

    const reSpots: ReSpotInstruction[] = [];
    const pottedNine = input.pottedBalls.find((b) => b.number === 9);

    if (foul) {
      this.state.consecutiveFouls[pIdx] += 1;
      if (pottedNine) {
        reSpots.push({
          ballId: pottedNine.id,
          type: pottedNine.type,
          number: 9,
          position: this.findSafeRespotPosition(this.table.spots.PINK, input.ballsAfter, pottedNine.id),
        });
        this.state.lowestBallNumber = Math.min(nextLowest ?? 9, 9);
      }

      if (this.state.consecutiveFouls[pIdx] >= 3) {
        this.state.frameOver = true;
        this.state.winnerPlayer = oppIdx;
        this.state.scores[oppIdx] += 1;
        const msg = `3-Foul Rule! Player ${pIdx + 1} committed 3 consecutive fouls — Player ${oppIdx + 1} wins rack.`;
        this.updateStatusBanner(msg);
        return {
          foul: true,
          foulReason,
          penaltyPoints: 0,
          pointsScored: 0,
          switchTurn: true,
          frameOver: true,
          winnerPlayer: oppIdx,
          reSpots,
          ballInHand: false,
          replayedShotRecommended: false,
          notice: msg,
        };
      }

      this.state.activePlayer = oppIdx;
      this.state.ballInHand = true;
      const warn = this.state.consecutiveFouls[pIdx] === 2 ? ' (ON TWO FOULS!)' : '';
      const msg = `${foulReason}${warn} · Ball-in-Hand for Player ${oppIdx + 1}.`;
      this.updateStatusBanner(msg);
      return {
        foul: true,
        foulReason,
        penaltyPoints: 0,
        pointsScored: 0,
        switchTurn: true,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: true,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    // Legal 9-ball shot
    this.state.consecutiveFouls[pIdx] = 0;
    this.state.ballInHand = false;

    if (wasPushOut) {
      if (pottedNine) {
        reSpots.push({
          ballId: pottedNine.id,
          type: pottedNine.type,
          number: 9,
          position: this.findSafeRespotPosition(this.table.spots.PINK, input.ballsAfter, pottedNine.id),
        });
      }
      this.state.activePlayer = oppIdx;
      this.state.pushOutDecisionPending = true;
      const msg = `Push-Out executed. Player ${oppIdx + 1}: Play this lie or Pass Back?`;
      this.updateStatusBanner(msg);
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: 0,
        switchTurn: true,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    if (pottedNine) {
      this.state.frameOver = true;
      this.state.winnerPlayer = pIdx;
      this.state.scores[pIdx] += 1;
      const msg = `9-Ball potted legally! Player ${pIdx + 1} wins the rack!`;
      this.updateStatusBanner(msg);
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: 1,
        switchTurn: false,
        frameOver: true,
        winnerPlayer: pIdx,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    // Offer Push-Out right after legal break shot (shotNumber === 1)
    if (input.shotNumber === 1 && input.pottedBalls.length === 0) {
      this.state.activePlayer = oppIdx;
      this.state.pushOutAvailable = true;
      this.updateStatusBanner(`Player ${oppIdx + 1}: Shoot lowest #${this.state.lowestBallNumber} or Declare Push-Out.`);
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: 0,
        switchTurn: true,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: `Legal break — Push-Out available for Player ${oppIdx + 1}.`,
      };
    }

    if (input.pottedBalls.length > 0) {
      if (input.shotNumber === 1) {
        this.state.pushOutAvailable = true;
      }
      this.updateStatusBanner();
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: input.pottedBalls.length,
        switchTurn: false,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: `P${pIdx + 1} stays at table · Next lowest: #${this.state.lowestBallNumber}.`,
      };
    }

    this.state.activePlayer = oppIdx;
    this.updateStatusBanner();
    return {
      foul: false,
      foulReason: null,
      penaltyPoints: 0,
      pointsScored: 0,
      switchTurn: true,
      frameOver: false,
      winnerPlayer: null,
      reSpots,
      ballInHand: false,
      replayedShotRecommended: false,
      notice: `Turn switches to Player ${oppIdx + 1} (#${this.state.lowestBallNumber}).`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8-BALL RULES ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  private evaluateEightBallShot(input: ShotOutcomeInput): MatchResolution {
    const pIdx = this.state.activePlayer;
    const oppIdx: 0 | 1 = pIdx === 0 ? 1 : 0;
    const isBreak = input.shotNumber === 1;

    const myGroup = this.state.playerGroups[pIdx];
    const remainingSolids = input.ballsAfter.filter(
      (b) => !b.potted && b.type === 'pool-solid'
    ).length;
    const remainingStripes = input.ballsAfter.filter(
      (b) => !b.potted && b.type === 'pool-stripe'
    ).length;
    const isOnEight =
      myGroup === 'solids'
        ? remainingSolids === 0
        : myGroup === 'stripes'
          ? remainingStripes === 0
          : false;

    const pottedEight = input.pottedBalls.find((b) => b.type === 'pool-8' || b.number === 8);
    const reSpots: ReSpotInstruction[] = [];

    // Scratch / loss on 8-ball
    if (pottedEight) {
      if (isBreak) {
        if (input.cueInOff) {
          this.state.activePlayer = oppIdx;
          this.state.ballInHand = true;
          reSpots.push({
            ballId: pottedEight.id,
            type: 'pool-8',
            number: 8,
            position: this.findSafeRespotPosition(this.table.spots.PINK, input.ballsAfter, pottedEight.id),
          });
          return {
            foul: true,
            foulReason: 'Scratch with 8-ball on break',
            penaltyPoints: 0,
            pointsScored: 0,
            switchTurn: true,
            frameOver: false,
            winnerPlayer: null,
            reSpots,
            ballInHand: true,
            replayedShotRecommended: false,
            notice: '8-Ball spotted after break scratch — Ball-in-Hand.',
          };
        }
        // Legal 8-on-the-break wins!
        this.state.frameOver = true;
        this.state.winnerPlayer = pIdx;
        this.state.scores[pIdx] += 1;
        this.updateStatusBanner(`8-Ball on the Break! Player ${pIdx + 1} wins!`);
        return {
          foul: false,
          foulReason: null,
          penaltyPoints: 0,
          pointsScored: 1,
          switchTurn: false,
          frameOver: true,
          winnerPlayer: pIdx,
          reSpots,
          ballInHand: false,
          replayedShotRecommended: false,
          notice: `Player ${pIdx + 1} wins with an 8-on-the-break!`,
        };
      }

      // Non-break 8-ball potted
      const illegalEarly = !isOnEight;
      const scratched = input.cueInOff;
      const missedCalledPocket =
        this.state.calledPocketId !== null && pottedEight.pocketId !== this.state.calledPocketId;

      if (illegalEarly || scratched || missedCalledPocket) {
        const reason = scratched
          ? 'Scratched while potting the 8-ball'
          : illegalEarly
            ? 'Potted 8-ball early before clearing group'
            : '8-ball dropped in uncalled pocket';
        this.state.frameOver = true;
        this.state.winnerPlayer = oppIdx;
        this.state.scores[oppIdx] += 1;
        this.updateStatusBanner(`${reason} — Player ${oppIdx + 1} wins!`);
        return {
          foul: true,
          foulReason: reason,
          penaltyPoints: 0,
          pointsScored: 0,
          switchTurn: true,
          frameOver: true,
          winnerPlayer: oppIdx,
          reSpots,
          ballInHand: false,
          replayedShotRecommended: false,
          notice: `${reason} — Player ${oppIdx + 1} wins rack!`,
        };
      }

      // Clean legal 8-ball pot in called pocket!
      this.state.frameOver = true;
      this.state.winnerPlayer = pIdx;
      this.state.scores[pIdx] += 1;
      const msg = `8-Ball cleanly called & potted! Player ${pIdx + 1} wins!`;
      this.updateStatusBanner(msg);
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: 1,
        switchTurn: false,
        frameOver: true,
        winnerPlayer: pIdx,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    // Standard foul evaluation
    let foul = false;
    let foulReason: string | null = null;

    if (input.cueInOff) {
      foul = true;
      foulReason = 'Scratch (Cue ball potted)';
    } else if (!input.firstHitBall) {
      foul = true;
      foulReason = 'Foul: failed to hit any object ball';
    } else if (!isBreak && !this.state.eightBallOpen) {
      const hitType = input.firstHitBall.type;
      if (isOnEight) {
        if (hitType !== 'pool-8') {
          foul = true;
          foulReason = 'Foul: must strike 8-Ball first';
        }
      } else if (myGroup === 'solids' && hitType !== 'pool-solid') {
        foul = true;
        foulReason = 'Foul: must strike a Solid (1–7) first';
      } else if (myGroup === 'stripes' && hitType !== 'pool-stripe') {
        foul = true;
        foulReason = 'Foul: must strike a Stripe (9–15) first';
      }
    } else if (!input.cushionHitAfterFirstContact && input.pottedBalls.length === 0) {
      foul = true;
      foulReason = 'Foul: no rail contact or pocketed ball';
    }

    if (foul) {
      this.state.activePlayer = oppIdx;
      this.state.ballInHand = true;
      this.state.calledPocketId = null;
      this.refreshEightBallEligibility(input.ballsAfter);
      const msg = `${foulReason} · Ball-in-Hand for Player ${oppIdx + 1}.`;
      this.updateStatusBanner(msg);
      return {
        foul: true,
        foulReason,
        penaltyPoints: 0,
        pointsScored: 0,
        switchTurn: true,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: true,
        replayedShotRecommended: false,
        notice: msg,
      };
    }

    this.state.ballInHand = false;
    this.state.calledPocketId = null;

    // Assign Solids / Stripes on first non-break legal group pot when table is Open
    if (!isBreak && this.state.eightBallOpen) {
      const firstGroupPot = input.pottedBalls.find(
        (b) => b.type === 'pool-solid' || b.type === 'pool-stripe'
      );
      if (firstGroupPot) {
        const claimed: 'solids' | 'stripes' =
          firstGroupPot.type === 'pool-solid' ? 'solids' : 'stripes';
        this.state.playerGroups[pIdx] = claimed;
        this.state.playerGroups[oppIdx] = claimed === 'solids' ? 'stripes' : 'solids';
        this.state.eightBallOpen = false;
      }
    }

    this.refreshEightBallEligibility(input.ballsAfter);

    const effectiveGroup = this.state.playerGroups[pIdx];
    const pottedOwn = input.pottedBalls.some((b) =>
      effectiveGroup === 'solids'
        ? b.type === 'pool-solid'
        : effectiveGroup === 'stripes'
          ? b.type === 'pool-stripe'
          : b.type !== 'pool-8'
    );

    if (input.pottedBalls.length > 0 && (isBreak || pottedOwn)) {
      this.updateStatusBanner();
      return {
        foul: false,
        foulReason: null,
        penaltyPoints: 0,
        pointsScored: input.pottedBalls.length,
        switchTurn: false,
        frameOver: false,
        winnerPlayer: null,
        reSpots,
        ballInHand: false,
        replayedShotRecommended: false,
        notice: `Player ${pIdx + 1} continues at the table.`,
      };
    }

    this.state.activePlayer = oppIdx;
    this.updateStatusBanner();
    return {
      foul: false,
      foulReason: null,
      penaltyPoints: 0,
      pointsScored: 0,
      switchTurn: true,
      frameOver: false,
      winnerPlayer: null,
      reSpots,
      ballInHand: false,
      replayedShotRecommended: false,
      notice: `Turn switches to Player ${oppIdx + 1}.`,
    };
  }

  private refreshEightBallEligibility(balls: Ball[]): void {
    const solidsLeft = balls.some((b) => !b.potted && b.type === 'pool-solid');
    const stripesLeft = balls.some((b) => !b.potted && b.type === 'pool-stripe');
    ([0, 1] as const).forEach((idx) => {
      const grp = this.state.playerGroups[idx];
      this.state.onEightBall[idx] =
        grp === 'solids' ? !solidsLeft : grp === 'stripes' ? !stripesLeft : false;
    });
  }

  private updateStatusBanner(override?: string): void {
    if (override) {
      this.state.statusBanner = override;
      return;
    }
    const pNum = this.state.activePlayer + 1;
    if (this.state.variant === 'snooker') {
      const target =
        this.state.snookerPhase === 'red'
          ? 'Red (1 pt)'
          : this.state.snookerPhase === 'colors-clearance'
            ? `${(SNOOKER_CLEARANCE_ORDER[this.state.clearanceIndex] ?? 'black').toUpperCase()} (Clearance)`
            : this.state.nominatedColor
              ? `${this.state.nominatedColor.toUpperCase()} (${BALL_COLORS[this.state.nominatedColor].points} pts)`
              : 'Pick Any Color';
      this.state.statusBanner = `P${pNum} Turn${this.state.isFreeBall ? ' [FREE BALL]' : ''} · Target: ${target}`;
    } else if (this.state.variant === '9ball') {
      this.state.statusBanner = `P${pNum} Turn · Target: #${this.state.lowestBallNumber ?? 9}${
        this.state.ballInHand ? ' · Ball-in-Hand' : ''
      }`;
    } else {
      const grp = this.state.playerGroups[this.state.activePlayer];
      const on8 = this.state.onEightBall[this.state.activePlayer];
      const target = on8
        ? `8-Ball (${this.state.calledPocketId ? 'Pocket Called' : 'Call Pocket'})`
        : this.state.eightBallOpen
          ? 'Open Table'
          : grp === 'solids'
            ? 'Solids (1–7)'
            : 'Stripes (9–15)';
      this.state.statusBanner = `P${pNum} Turn · ${target}`;
    }
  }
}
