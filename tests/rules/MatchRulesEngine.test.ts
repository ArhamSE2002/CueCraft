import { describe, it, expect } from 'vitest';
import { MatchRulesEngine } from '../../src/engine/rules/MatchRulesEngine';
import { PhysicsEngine } from '../../src/engine/physics/PhysicsEngine';
import { Ball } from '../../src/engine/physics/Ball';
import { Vector2D } from '../../src/engine/math/Vector2D';

describe('MatchRulesEngine — Snooker, 9-Ball, and 8-Ball State Machines', () => {
  it('enforces Snooker red -> color nomination, color respotting, and miss replay', () => {
    const eng = new PhysicsEngine('snooker');
    eng.setupChampionshipRack();
    const rules = new MatchRulesEngine('snooker', eng.table);

    rules.capturePreShot(eng.balls);

    // 1. Pot a Red legally
    const red1 = eng.balls.find((b) => b.type === 'red')!;
    red1.potted = true;
    const res1 = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: red1.id, type: 'red' },
      pottedBalls: [{ id: red1.id, type: 'red', pocketId: 'corner-top-left' }],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 1,
    });

    expect(res1.foul).toBe(false);
    expect(res1.pointsScored).toBe(1);
    expect(rules.state.snookerPhase).toBe('color');
    expect(rules.state.scores[0]).toBe(1);

    // 2. Nominate Blue and pot it -> must re-spot Blue and switch back to red
    rules.nominateSnookerColor('blue');
    const blue = eng.balls.find((b) => b.type === 'blue')!;
    blue.potted = true;
    const res2 = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: blue.id, type: 'blue' },
      pottedBalls: [{ id: blue.id, type: 'blue', pocketId: 'middle-left' }],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 2,
    });

    expect(res2.foul).toBe(false);
    expect(res2.pointsScored).toBe(5);
    expect(res2.reSpots.some((r) => r.ballId === blue.id)).toBe(true);
    expect(rules.state.snookerPhase).toBe('red');
    expect(rules.state.currentBreak).toBe(6);

    // 3. Miss without hitting any ball -> offers Miss & Replay
    rules.capturePreShot(eng.balls);
    const res3 = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: null,
      pottedBalls: [],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 3,
    });

    expect(res3.foul).toBe(true);
    expect(res3.penaltyPoints).toBe(4);
    expect(rules.state.missAvailable).toBe(true);
    expect(rules.callMissAndReplay()).not.toBeNull();
  });

  it('detects Snooker Free Ball when target edge is obstructed after a foul', () => {
    const eng = new PhysicsEngine('snooker');
    eng.balls = [
      new Ball('cue', 'cue', new Vector2D(600, 889), eng.table.ballRadius),
      new Ball('brown', 'brown', new Vector2D(1200, 889), eng.table.ballRadius), // Directly blocks line!
      new Ball('red-1', 'red', new Vector2D(1900, 889), eng.table.ballRadius),
    ];
    const rules = new MatchRulesEngine('snooker', eng.table);

    expect(rules.checkIsSnookered(eng.balls)).toBe(true);

    const res = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: 'brown', type: 'brown' },
      pottedBalls: [],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 1,
    });

    expect(res.foul).toBe(true);
    expect(rules.state.isFreeBall).toBe(true);
  });

  it('enforces 9-Ball Push-Out, Ball-in-Hand, and 3-Foul Loss Rule', () => {
    const eng = new PhysicsEngine('9ball');
    eng.setupNineBallRack();
    const rules = new MatchRulesEngine('9ball', eng.table);

    // Break shot with no balls potted offers Push-Out
    const breakRes = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: 'pool-1', type: 'pool-solid', number: 1 },
      pottedBalls: [],
      cueInOff: false,
      cushionHitAfterFirstContact: true,
      shotNumber: 1,
    });

    expect(breakRes.foul).toBe(false);
    expect(rules.state.pushOutAvailable).toBe(true);

    // 3 consecutive fouls for Player 2 loses the rack
    for (let f = 1; f <= 3; f++) {
      rules.state.activePlayer = 1;
      const foulRes = rules.evaluateShot({
        ballsAfter: eng.balls,
        firstHitBall: null,
        pottedBalls: [],
        cueInOff: false,
        cushionHitAfterFirstContact: false,
        shotNumber: f + 1,
      });
      if (f < 3) {
        expect(foulRes.ballInHand).toBe(true);
        expect(foulRes.frameOver).toBe(false);
      } else {
        expect(foulRes.frameOver).toBe(true);
        expect(foulRes.winnerPlayer).toBe(0);
      }
    }
  });

  it('enforces 8-Ball Open Table -> Group Assignment -> Called Pocket 8-Ball Win', () => {
    const eng = new PhysicsEngine('8ball');
    eng.setupEightBallRack();
    const rules = new MatchRulesEngine('8ball', eng.table);

    // Break stays open
    rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: 'pool-1', type: 'pool-solid', number: 1 },
      pottedBalls: [],
      cueInOff: false,
      cushionHitAfterFirstContact: true,
      shotNumber: 1,
    });
    expect(rules.state.eightBallOpen).toBe(true);
    // Dry break passes turn cleanly to Player 2
    expect(rules.state.activePlayer).toBe(1);

    // Non-break pot of #3 solid claims Solids for active player (Player 2)
    const solid3 = eng.balls.find((b) => b.number === 3)!;
    solid3.potted = true;
    rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: 'pool-3', type: 'pool-solid', number: 3 },
      pottedBalls: [{ id: 'pool-3', type: 'pool-solid', number: 3, pocketId: 'corner-top-left' }],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 2,
    });
    expect(rules.state.eightBallOpen).toBe(false);
    expect(rules.state.playerGroups[1]).toBe('solids');
    expect(rules.state.playerGroups[0]).toBe('stripes');

    // Clear remaining solids, then call pocket for 8-Ball
    eng.balls.forEach((b) => {
      if (b.type === 'pool-solid') b.potted = true;
    });
    rules.setCalledPocket('corner-top-right');
    const ball8 = eng.balls.find((b) => b.number === 8)!;
    ball8.potted = true;

    const winRes = rules.evaluateShot({
      ballsAfter: eng.balls,
      firstHitBall: { id: 'pool-8', type: 'pool-8', number: 8 },
      pottedBalls: [{ id: 'pool-8', type: 'pool-8', number: 8, pocketId: 'corner-top-right' }],
      cueInOff: false,
      cushionHitAfterFirstContact: false,
      shotNumber: 3,
    });

    expect(winRes.foul).toBe(false);
    expect(winRes.frameOver).toBe(true);
    expect(winRes.winnerPlayer).toBe(1);
  });
});
