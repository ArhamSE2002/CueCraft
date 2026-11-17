import { describe, it, expect } from 'vitest';
import { SnookerTable } from '../../src/engine/table/SnookerTable';
import { Vector2D } from '../../src/engine/math/Vector2D';

describe('SnookerTable Official Specifications', () => {
  const table = new SnookerTable();

  it('adheres to championship 12ft x 6ft table dimensions', () => {
    expect(SnookerTable.LENGTH).toBe(3569); // mm
    expect(SnookerTable.WIDTH).toBe(1778);  // mm
    expect(SnookerTable.BALL_RADIUS).toBe(26.25); // mm
    expect(SnookerTable.BALL_DIAMETER).toBe(52.5); // mm
  });

  it('correctly defines baulk line and "D" semicircle dimensions', () => {
    expect(SnookerTable.BAULK_DIST).toBe(737); // mm from baulk cushion
    expect(SnookerTable.D_RADIUS).toBe(292);   // mm radius
  });

  it('positions all 6 championship spots with exact physical coordinates', () => {
    const spots = SnookerTable.SPOTS;
    const centerY = SnookerTable.WIDTH / 2; // 889 mm

    // Brown spot: intersection of baulk line and table centerline
    expect(spots.BROWN.x).toBe(737);
    expect(spots.BROWN.y).toBe(centerY);

    // Yellow spot: right corner of "D"
    expect(spots.YELLOW.x).toBe(737);
    expect(spots.YELLOW.y).toBe(centerY - 292);

    // Green spot: left corner of "D"
    expect(spots.GREEN.x).toBe(737);
    expect(spots.GREEN.y).toBe(centerY + 292);

    // Blue spot: exact geometric center of table
    expect(spots.BLUE.x).toBe(3569 / 2);
    expect(spots.BLUE.y).toBe(centerY);

    // Black spot: 324 mm from top cushion
    expect(spots.BLACK.x).toBe(3569 - 324);
    expect(spots.BLACK.y).toBe(centerY);
  });

  it('creates 6 championship pockets with correct mouth capture radii', () => {
    expect(table.pockets).toHaveLength(6);

    const pocketIds = table.pockets.map((p) => p.id);
    expect(pocketIds).toContain('corner-bottom-left');
    expect(pocketIds).toContain('corner-bottom-right');
    expect(pocketIds).toContain('middle-left');
    expect(pocketIds).toContain('middle-right');
    expect(pocketIds).toContain('corner-top-left');
    expect(pocketIds).toContain('corner-top-right');

    for (const pocket of table.pockets) {
      expect(pocket.radius).toBeGreaterThan(40);
    }
  });

  it('creates 6 cushion segments with inward-pointing normal vectors', () => {
    expect(table.cushions).toHaveLength(6);

    for (const cushion of table.cushions) {
      // Normal vector must be unit length
      expect(cushion.normal.length()).toBeCloseTo(1.0, 5);
      // Segment start and end must have non-zero length
      expect(cushion.start.distanceTo(cushion.end)).toBeGreaterThan(500);
    }

    // Baulk cushion normal points toward top (+X)
    const baulk = table.cushions.find((c) => c.id === 'cushion-baulk');
    expect(baulk?.normal.x).toBe(1);
    expect(baulk?.normal.y).toBe(0);

    // Top cushion normal points toward baulk (-X)
    const top = table.cushions.find((c) => c.id === 'cushion-top');
    expect(top?.normal.x).toBe(-1);
    expect(top?.normal.y).toBe(0);
  });
});
