import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from '../../src/engine/physics/PhysicsEngine';
import { Vector2D } from '../../src/engine/math/Vector2D';
import { Ball } from '../../src/engine/physics/Ball';
import { Collisions } from '../../src/engine/physics/Collisions';
import { SnookerTable } from '../../src/engine/table/SnookerTable';
import { Cloth } from '../../src/engine/physics/Cloth';

describe('CueCraft Deterministic Physics Engine', () => {
  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine();
  });

  it('preserves linear momentum in head-on elastic ball collisions', () => {
    const ballA = new Ball('ballA', 'cue', new Vector2D(1000, 1000));
    const ballB = new Ball('ballB', 'red', new Vector2D(1050, 1000));

    // Ball A moving right at 2000 mm/s, Ball B stationary
    ballA.velocity = new Vector2D(2000, 0);
    ballB.velocity = new Vector2D(0, 0);

    const initialTotalMomentumX = ballA.mass * ballA.velocity.x + ballB.mass * ballB.velocity.x;

    // Resolve collision
    const event = Collisions.resolveBallCollision(ballA, ballB);
    expect(event).not.toBeNull();

    const finalTotalMomentumX = ballA.mass * ballA.velocity.x + ballB.mass * ballB.velocity.x;

    // Head-on collision with restitution e = 0.96 should conserve momentum within 1%
    expect(Math.abs(finalTotalMomentumX - initialTotalMomentumX)).toBeLessThan(5);
    // Ball B should now have received the majority of the velocity
    expect(ballB.velocity.x).toBeGreaterThan(1800);
    expect(ballA.velocity.x).toBeLessThan(200);
  });

  it('obeys 90-degree tangent separation rule in cut shot collisions', () => {
    const ballA = new Ball('ballA', 'cue', new Vector2D(1000, 1000));
    // Ball B placed at a 45 degree cut angle
    const offset = 50 / Math.SQRT2;
    const ballB = new Ball('ballB', 'red', new Vector2D(1000 + offset, 1000 + offset));

    ballA.velocity = new Vector2D(1500, 0); // moving purely horizontally
    ballB.velocity = Vector2D.zero();

    Collisions.resolveBallCollision(ballA, ballB);

    // After collision, ballA and ballB velocities should be nearly perpendicular (dot product near 0)
    const dotProduct = ballA.velocity.normalize().dot(ballB.velocity.normalize());
    expect(Math.abs(dotProduct)).toBeLessThan(0.15); // near 90 degrees
  });

  it('decelerates rolling balls to a complete stop according to friction laws', () => {
    const ball = new Ball('cue', 'cue', new Vector2D(1500, 800));
    const initialSpeed = 1000; // mm/s
    ball.velocity = new Vector2D(initialSpeed, 0);
    // Set pure rolling spin (v / R)
    ball.spin.pitch = initialSpeed / ball.radius;

    // Simulate for 8 seconds at 60 FPS (stopping time = 1000 / 147.15 ≈ 6.79s)
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 8; i++) {
      Cloth.applyFriction(ball, dt);
    }

    // Ball should come to complete rest
    expect(ball.velocity.length()).toBe(0);
    expect(ball.isStationary()).toBe(true);
  });

  it('demonstrates screw-back (draw shot) behavior when struck low', () => {
    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(1500, 889)),
      new Ball('red', 'red', new Vector2D(1800, 889)), // 300 mm away
    ];

    // Strike cue ball with high power and strong backspin (spinY = -1.0)
    engine.strikeCueBall(60, 0, 0, -1.0);

    const cue = engine.cueBall!;
    expect(cue.velocity.x).toBeGreaterThan(0);
    expect(cue.spin.pitch).toBeLessThan(0); // negative pitch = backspin

    // Step simulation until collision with object ball
    for (let frame = 0; frame < 60; frame++) {
      engine.step(1 / 60);
      if (cue.velocity.x < 0) {
        // Cue ball has reversed direction!
        break;
      }
    }

    // The cue ball must reverse direction (negative X velocity) due to screw-back action
    expect(cue.velocity.x).toBeLessThan(0);
  });

  it('calculates trajectory prediction with ghost ball positioned at 2R distance', () => {
    engine.balls = [
      new Ball('cue', 'cue', new Vector2D(1000, 889)),
      new Ball('red', 'red', new Vector2D(2000, 889)),
    ];

    // Aim directly along X axis (0 radians)
    const prediction = engine.calculateTrajectory(0);

    expect(prediction.ghostBall).not.toBeNull();
    expect(prediction.targetBall).not.toBeNull();
    expect(prediction.targetBall?.id).toBe('red');

    // Ghost ball should be positioned at distance 2 * radius (52.5 mm) directly in front of object ball
    const targetPos = engine.balls[1].position;
    const ghostPos = prediction.ghostBall!;
    const dist = targetPos.distanceTo(ghostPos);
    expect(dist).toBeCloseTo(SnookerTable.BALL_DIAMETER, 1);
  });

  it('correctly detects cushion rebound and dampens normal speed', () => {
    const cue = new Ball('cue', 'cue', new Vector2D(3500, 889));
    cue.velocity = new Vector2D(1000, 0); // Moving directly toward top cushion (at X = 3569)
    engine.balls = [cue];

    // Step simulation into cushion
    for (let i = 0; i < 20; i++) {
      engine.step(1 / 60);
      if (cue.velocity.x < 0) break;
    }

    // Rebounded off top cushion: velocity.x must now be negative
    expect(cue.velocity.x).toBeLessThan(0);
    // Speed should be reduced by cushion restitution
    expect(Math.abs(cue.velocity.x)).toBeLessThan(1000);
  });

  it('traces full multi-cushion route when fullRoute is enabled', () => {
    // Empty table with cue ball shooting at an angle into a cushion
    const cue = new Ball('cue', 'cue', new Vector2D(1000, 500));
    engine.balls = [cue];

    // High power shot towards top cushion at 30 degrees
    const angleRad = (30 * Math.PI) / 180;
    const singleLeg = engine.calculateTrajectory(angleRad, 80, 0, 0, 0, false);
    const multiLeg = engine.calculateTrajectory(angleRad, 80, 0, 0, 0, true);

    expect(singleLeg.fullRoute).toBe(false);
    expect(multiLeg.fullRoute).toBe(true);

    // Multi-cushion trace should produce multiple segments (at least 2 bounces across cushions)
    expect(multiLeg.cuePath.length).toBeGreaterThanOrEqual(2);
    // The bounce indices should increment sequentially
    expect(multiLeg.cuePath[0].bounce).toBe(0);
    expect(multiLeg.cuePath[1].bounce).toBe(1);
  });
});
