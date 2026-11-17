import { describe, it, expect } from 'vitest';
import { CanvasTableRenderer } from '../../src/renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../src/engine/math/Vector2D';
import { SnookerTable } from '../../src/engine/table/SnookerTable';

describe('CanvasTableRenderer Coordinate Space & Transforms', () => {
  // Mock HTML5 Canvas element
  const createMockCanvas = (width: number, height: number): HTMLCanvasElement => {
    const mockCtx = {
      resetTransform: () => {},
      scale: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      ellipse: () => {},
      roundRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    } as unknown as CanvasRenderingContext2D;

    return {
      width,
      height,
      getBoundingClientRect: () => ({
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
      }),
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement;
  };

  it('preserves exact inverse mapping between table coords and screen pixels', () => {
    const canvas = createMockCanvas(1200, 600);
    const renderer = new CanvasTableRenderer(canvas);

    // Test multiple physical table points
    const testPoints = [
      new Vector2D(0, 0),
      new Vector2D(737, 889), // Brown spot
      new Vector2D(3569 / 2, 1778 / 2), // Blue center spot
      new Vector2D(3569 - 324, 889), // Black spot
      new Vector2D(3569, 1778),
    ];

    for (const point of testPoints) {
      const screenPos = renderer.toScreen(point);
      const recoveredTablePos = renderer.toTable(screenPos);

      expect(recoveredTablePos.x).toBeCloseTo(point.x, 2);
      expect(recoveredTablePos.y).toBeCloseTo(point.y, 2);
    }
  });

  it('keeps the 2:1 snooker table aspect ratio centered on screen', () => {
    // Ultra-wide container: 2400 x 600
    const canvas = createMockCanvas(2400, 600);
    const renderer = new CanvasTableRenderer(canvas);

    const corner1 = renderer.toScreen(new Vector2D(0, 0));
    const corner2 = renderer.toScreen(new Vector2D(SnookerTable.LENGTH, SnookerTable.WIDTH));

    const renderedWidth = corner2.x - corner1.x;
    const renderedHeight = corner2.y - corner1.y;

    // Aspect ratio W / H must be exactly equal to 3569 / 1778 ≈ 2.007
    expect(renderedWidth / renderedHeight).toBeCloseTo(SnookerTable.LENGTH / SnookerTable.WIDTH, 2);
  });
});
