import { Vector2D } from '../math/Vector2D';

export type TableVariant = 'snooker' | '9ball' | '8ball';

export interface TableSpec {
  variant: TableVariant;
  name: string;
  length: number;
  width: number;
  ballRadius: number;
  cornerRadius: number;
  middleRadius: number;
  cornerInset: number;
  middleInset: number;
  hasBaulkAndD: boolean;
  hasDiamonds: boolean;
  defaultClothId: string;
  railHex: string;
  railColor3D: number;
}

export const TABLE_SPECS: Record<TableVariant, TableSpec> = {
  snooker: {
    variant: 'snooker',
    name: '12ft Championship Snooker',
    length: 3569,
    width: 1778,
    ballRadius: 26.25,
    cornerRadius: 50,
    middleRadius: 48,
    cornerInset: 65,
    middleInset: 50,
    hasBaulkAndD: true,
    hasDiamonds: false,
    defaultClothId: 'club-standard',
    railHex: '#3D1C0B',
    railColor3D: 0x3d1c0b,
  },
  '9ball': {
    variant: '9ball',
    name: '9ft Pro 9-Ball Pool',
    length: 2540,
    width: 1270,
    ballRadius: 28.575,
    cornerRadius: 62,
    middleRadius: 58,
    cornerInset: 78,
    middleInset: 60,
    hasBaulkAndD: false,
    hasDiamonds: true,
    defaultClothId: 'tournament-blue',
    railHex: '#18222F',
    railColor3D: 0x18222f,
  },
  '8ball': {
    variant: '8ball',
    name: '8ft American 8-Ball',
    length: 2240,
    width: 1120,
    ballRadius: 28.575,
    cornerRadius: 60,
    middleRadius: 56,
    cornerInset: 75,
    middleInset: 58,
    hasBaulkAndD: false,
    hasDiamonds: true,
    defaultClothId: 'crimson-tour',
    railHex: '#2C1412',
    railColor3D: 0x2c1412,
  },
};

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

  public readonly variant: TableVariant;
  public readonly spec: TableSpec;
  public readonly length: number;
  public readonly width: number;
  public readonly ballRadius: number;
  public readonly baulkDist: number;
  public readonly dRadius: number;
  public readonly hasBaulkAndD: boolean;
  public readonly hasDiamonds: boolean;
  public readonly railHex: string;
  public readonly railColor3D: number;
  public readonly spots: {
    BROWN: Vector2D;
    YELLOW: Vector2D;
    GREEN: Vector2D;
    BLUE: Vector2D;
    PINK: Vector2D;
    BLACK: Vector2D;
  };

  public readonly pockets: Pocket[];
  public readonly cushions: CushionSegment[];

  constructor(variant: TableVariant = 'snooker') {
    const spec = TABLE_SPECS[variant];
    this.variant = variant;
    this.spec = spec;
    this.length = spec.length;
    this.width = spec.width;
    this.ballRadius = spec.ballRadius;
    this.baulkDist = spec.hasBaulkAndD ? 737 : Math.round(spec.length * 0.25);
    this.dRadius = spec.hasBaulkAndD ? 292 : 0;
    this.hasBaulkAndD = spec.hasBaulkAndD;
    this.hasDiamonds = spec.hasDiamonds;
    this.railHex = spec.railHex;
    this.railColor3D = spec.railColor3D;

    const W = spec.width;
    const L = spec.length;
    const cornerR = spec.cornerRadius;
    const middleR = spec.middleRadius;

    this.spots = {
      BROWN: new Vector2D(this.baulkDist, W / 2),
      YELLOW: new Vector2D(this.baulkDist, W / 2 - (spec.hasBaulkAndD ? 292 : W * 0.16)),
      GREEN: new Vector2D(this.baulkDist, W / 2 + (spec.hasBaulkAndD ? 292 : W * 0.16)),
      BLUE: new Vector2D(L / 2, W / 2),
      PINK: new Vector2D(L * 0.75, W / 2),
      BLACK: new Vector2D(L - Math.round(L * 0.091), W / 2),
    };

    // 6 Pockets
    this.pockets = [
      { id: 'corner-bottom-left', name: 'Bottom Left', position: new Vector2D(0, 0), radius: cornerR },
      { id: 'corner-bottom-right', name: 'Bottom Right', position: new Vector2D(0, W), radius: cornerR },
      { id: 'middle-left', name: 'Middle Left', position: new Vector2D(L / 2, 0), radius: middleR },
      { id: 'middle-right', name: 'Middle Right', position: new Vector2D(L / 2, W), radius: middleR },
      { id: 'corner-top-left', name: 'Top Left', position: new Vector2D(L, 0), radius: cornerR },
      { id: 'corner-top-right', name: 'Top Right', position: new Vector2D(L, W), radius: cornerR },
    ];

    // Cushion segments (with inset clearance for pocket openings)
    const cornerInset = spec.cornerInset;
    const middleInset = spec.middleInset;

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
