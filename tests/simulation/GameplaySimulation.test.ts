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

    // Calculate maximum break points: 15 reds (1 pt each) + 15 blacks (7 pts each) + 2+3+4+5+6+7 = 147
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
    const cornerPocket = engine.table.pockets[0]; // Yellow corner pocket at (0, 0)
    
    // Position red ball 80mm from pocket moving directly into it
    const red = new Ball('red-test', 'red', new Vector2D(80, 80));
    red.velocity = new Vector2D(-600, -600); // Speed toward (0, 0)

    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(737, 889)),
      red,
    ];

    const pottedCallback = vi.fn();
    engine.onBallPotted = pottedCallback;

    // Simulate for 0.5s at 60 FPS
    for (let frame = 0; frame < 30; frame++) {
      engine.step(1 / 60);
      if (red.potted) break;
    }

    expect(red.potted).toBe(true);
    expect(red.velocity.length()).toBe(0);
    expect(pottedCallback).toHaveBeenCalledTimes(1);
    expect(pottedCallback).toHaveBeenCalledWith(red, expect.objectContaining({ id: cornerPocket.id }));
  });

  it('allows repositioning the cue ball in-hand anywhere on table', () => {
    const engine = new PhysicsEngine();
    const newPos = new Vector2D(737, 889); // Brown spot
    engine.placeCueBall(newPos);

    const cue = engine.cueBall!;
    expect(cue.position.x).toBe(737);
    expect(cue.position.y).toBe(889);
    expect(cue.velocity.length()).toBe(0);
    expect(cue.potted).toBe(false);
  });

  it('simulates a multi-cushion rebound path without losing containment', () => {
    const engine = new PhysicsEngine();
    // Launch cue ball at 45 degree angle across table at high speed
    const cue = new Ball('cue', 'cue', new Vector2D(1500, 889));
    cue.velocity = new Vector2D(3500, 3500); // Toward top-right cushion
    engine.balls = [cue];

    let cushionHits = 0;
    // Step simulation for 2 seconds
    for (let i = 0; i < 120; i++) {
      const prevVel = cue.velocity.clone();
      engine.step(1 / 60);

      // Check if velocity vector reflected (indicates cushion bounce)
      if (prevVel.dot(cue.velocity) < 0.5 * prevVel.lengthSq()) {
        cushionHits++;
      }
    }

    // Ball should have hit cushions multiple times and remained strictly inside table bounds
    expect(cushionHits).toBeGreaterThanOrEqual(2);
    expect(cue.position.x).toBeGreaterThanOrEqual(cue.radius);
    expect(cue.position.x).toBeLessThanOrEqual(SnookerTable.LENGTH - cue.radius);
    expect(cue.position.y).toBeGreaterThanOrEqual(cue.radius);
    expect(cue.position.y).toBeLessThanOrEqual(SnookerTable.WIDTH - cue.radius);
  });
});
