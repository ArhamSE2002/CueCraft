import { describe, it, expect, vi } from 'vitest';
import { PhysicsEngine } from '../../src/engine/physics/PhysicsEngine';
import { Vector2D } from '../../src/engine/math/Vector2D';
import { Ball } from '../../src/engine/physics/Ball';
import { SnookerTable } from '../../src/engine/table/SnookerTable';

describe('Gameplay Match & Shot Simulation', () => {
  it('correctly sets up championship 22-ball rack with maximum 147 points available', () => {
    const engine = new PhysicsEngine();
    engine.setupChampionshipRack();

    expect(engine.balls).toHaveLength(22);

    const cueBall = engine.cueBall;
    expect(cueBall).toBeDefined();
    expect(cueBall?.type).toBe('cue');

    const reds = engine.balls.filter((b) => b.type === 'red');
    expect(reds).toHaveLength(15);

    const redPoints = reds.reduce((sum, b) => sum + b.colorInfo.points, 0);
    expect(redPoints).toBe(15);

    const colorPoints = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'].reduce(
      (sum, type) => {
        const ball = engine.balls.find((b) => b.type === type);
        return sum + (ball?.colorInfo.points || 0);
      },
      0
    );
    expect(colorPoints).toBe(2 + 3 + 4 + 5 + 6 + 7); // 27 pts
    expect(15 * (1 + 7) + 27).toBe(147); // Standard 147 maximum break!
  });

  it('detects ball potting when a ball enters a pocket opening', () => {
    const engine = new PhysicsEngine();
    const cornerPocket = engine.table.pockets[0];
    
    const red = new Ball('red-test', 'red', new Vector2D(80, 80));
    red.velocity = new Vector2D(-600, -600);

    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(737, 889)),
      red,
    ];

    const pottedCallback = vi.fn();
    engine.onBallPotted = pottedCallback;

    for (let frame = 0; frame < 30; frame++) {
      engine.step(1 / 60);
      if (red.potted) break;
    }

    expect(red.potted).toBe(true);
    expect(red.velocity.length()).toBe(0);
    expect(pottedCallback).toHaveBeenCalledTimes(1);
    expect(pottedCallback).toHaveBeenCalledWith(red, expect.objectContaining({ id: cornerPocket.id }));
  });

  it('handles in-off cue ball foul by deducting penalty points and respawning in the "D"', () => {
    const engine = new PhysicsEngine();
    const cornerPocket = engine.table.pockets[0];

    // Cue ball moving into corner pocket
    const cue = new Ball('cue', 'cue', new Vector2D(80, 80));
    cue.velocity = new Vector2D(-500, -500);
    engine.balls = [cue];

    const foulCallback = vi.fn();
    engine.onFoul = foulCallback;

    for (let frame = 0; frame < 30; frame++) {
      engine.step(1 / 60);
    }

    // Foul must be called with penalty points = 4
    expect(foulCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'in-off',
        penalty: 4,
      })
    );

    // Cue ball must automatically respawn in the "D" on Brown spot (X = 737, Y = 889)
    const respawnedCue = engine.cueBall!;
    expect(respawnedCue.position.x).toBe(737);
    expect(respawnedCue.position.y).toBe(SnookerTable.WIDTH / 2);
    expect(respawnedCue.velocity.length()).toBe(0);
    expect(respawnedCue.potted).toBe(false);
  });

  it('scales trajectory prediction line lengths dynamically with cue power', () => {
    const engine = new PhysicsEngine();
    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(1000, 889)),
    ];

    // Low power shot (15%)
    const lowPowerPred = engine.calculateTrajectory(0, 15);
    const lowPowerLen = lowPowerPred.cuePath[0].start.distanceTo(lowPowerPred.cuePath[0].end);

    // High power shot (95%)
    const highPowerPred = engine.calculateTrajectory(0, 95);
    const highPowerLen = highPowerPred.cuePath[0].start.distanceTo(highPowerPred.cuePath[0].end);

    expect(highPowerLen).toBeGreaterThan(lowPowerLen * 2.5);
  });

  it('calculates curved swerve prediction when cue is elevated with side spin', () => {
    const engine = new PhysicsEngine();
    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(1000, 889)),
    ];

    // Elevated cue (35°) with right side spin (+0.6)
    const swervePred = engine.calculateTrajectory(0, 50, 0.6, 0, 35);
    expect(swervePred.isCurvedSwerve).toBe(true);
    // Multiple curved trajectory segments
    expect(swervePred.cuePath.length).toBeGreaterThan(5);
    expect(swervePred.cuePath[0].type).toBe('swerve');
  });

  it('allows repositioning the cue ball in-hand anywhere on table', () => {
    const engine = new PhysicsEngine();
    const newPos = new Vector2D(737, 889);
    engine.placeCueBall(newPos);

    const cue = engine.cueBall!;
    expect(cue.position.x).toBe(737);
    expect(cue.position.y).toBe(889);
    expect(cue.velocity.length()).toBe(0);
    expect(cue.potted).toBe(false);
  });

  it('simulates a multi-cushion rebound path without losing containment', () => {
    const engine = new PhysicsEngine();
    const cue = new Ball('cue', 'cue', new Vector2D(1500, 889));
    cue.velocity = new Vector2D(3500, 3500);
    engine.balls = [cue];

    let cushionHits = 0;
    for (let i = 0; i < 120; i++) {
      const prevVel = cue.velocity.clone();
      engine.step(1 / 60);

      if (prevVel.dot(cue.velocity) < 0.5 * prevVel.lengthSq()) {
        cushionHits++;
      }
    }

    expect(cushionHits).toBeGreaterThanOrEqual(2);
    expect(cue.position.x).toBeGreaterThanOrEqual(cue.radius);
    expect(cue.position.x).toBeLessThanOrEqual(SnookerTable.LENGTH - cue.radius);
    expect(cue.position.y).toBeGreaterThanOrEqual(cue.radius);
    expect(cue.position.y).toBeLessThanOrEqual(SnookerTable.WIDTH - cue.radius);
  });
});
