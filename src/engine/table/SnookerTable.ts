import { Vector2D } from '../math/Vector2D';

export interface Pocket {
  id: string;
  name: string;
  position: Vector2D;
  radius: number;
}

export interface CushionSegment {
  id: string;
  start: Vector2D;
  end: Vector2D;
  normal: Vector2D; // Inward pointing normal into table
}

export class SnookerTable {
  // Championship Snooker Table dimensions in millimeters (mm)
  public static readonly LENGTH = 3569; // 11 ft 8.5 in
  public static readonly WIDTH = 1778;  // 5 ft 10 in
  public static readonly BALL_RADIUS = 26.25; // 52.5 mm diameter
  public static readonly BALL_DIAMETER = 52.5;

  // Baulk & D-zone specs
  public static readonly BAULK_DIST = 737; // mm from bottom cushion
  public static readonly D_RADIUS = 292;   // mm radius of "D"

  // Spots (measured from X = 0 (bottom/baulk cushion) to X = 3569 (top cushion))
  public static readonly SPOTS = {
    BROWN: new Vector2D(737, 1778 / 2),
    YELLOW: new Vector2D(737, 1778 / 2 - 292),
    GREEN: new Vector2D(737, 1778 / 2 + 292),
    BLUE: new Vector2D(3569 / 2, 1778 / 2),
    PINK: new Vector2D(3569 * 0.75, 1778 / 2),
    BLACK: new Vector2D(3569 - 324, 1778 / 2),
  };

  public readonly pockets: Pocket[];
  public readonly cushions: CushionSegment[];

  constructor() {
    const W = SnookerTable.WIDTH;
    const L = SnookerTable.LENGTH;
    const cornerR = 50; // Pocket mouth capture radius
    const middleR = 48;

    // 6 Championship Pockets
    this.pockets = [
      { id: 'corner-bottom-left', name: 'Yellow Pocket', position: new Vector2D(0, 0), radius: cornerR },
      { id: 'corner-bottom-right', name: 'Green Pocket', position: new Vector2D(0, W), radius: cornerR },
      { id: 'middle-left', name: 'Middle Left', position: new Vector2D(L / 2, 0), radius: middleR },
      { id: 'middle-right', name: 'Middle Right', position: new Vector2D(L / 2, W), radius: middleR },
      { id: 'corner-top-left', name: 'Top Left (Black)', position: new Vector2D(L, 0), radius: cornerR },
      { id: 'corner-top-right', name: 'Top Right (Black)', position: new Vector2D(L, W), radius: cornerR },
    ];

    // Cushion segments (with inset clearance for pocket openings)
    const cornerInset = 65;
    const middleInset = 50;

    this.cushions = [
      // Baulk (Bottom) cushion
      {
        id: 'cushion-baulk',
        start: new Vector2D(0, cornerInset),
        end: new Vector2D(0, W - cornerInset),
        normal: new Vector2D(1, 0),
      },
      // Top (Black) cushion
      {
        id: 'cushion-top',
        start: new Vector2D(L, cornerInset),
        end: new Vector2D(L, W - cornerInset),
        normal: new Vector2D(-1, 0),
      },
      // Left bottom side cushion
      {
        id: 'cushion-left-bottom',
        start: new Vector2D(cornerInset, 0),
        end: new Vector2D(L / 2 - middleInset, 0),
        normal: new Vector2D(0, 1),
      },
      // Left top side cushion
      {
        id: 'cushion-left-top',
        start: new Vector2D(L / 2 + middleInset, 0),
        end: new Vector2D(L - cornerInset, 0),
        normal: new Vector2D(0, 1),
      },
      // Right bottom side cushion
      {
        id: 'cushion-right-bottom',
        start: new Vector2D(cornerInset, W),
        end: new Vector2D(L / 2 - middleInset, W),
        normal: new Vector2D(0, -1),
      },
      // Right top side cushion
      {
        id: 'cushion-right-top',
        start: new Vector2D(L / 2 + middleInset, W),
        end: new Vector2D(L - cornerInset, W),
        normal: new Vector2D(0, -1),
      },
    ];
  }
}
