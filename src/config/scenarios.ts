import { Vector2D } from '../engine/math/Vector2D';
import { Ball } from '../engine/physics/Ball';
import { SnookerTable } from '../engine/table/SnookerTable';

export interface ScenarioBallDef {
  id: string;
  type: Ball['type'];
  x: number;
  y: number;
}

export interface TrainingScenario {
  id: string;
  lectureSlug: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  objective: string;
  physicsTakeaway: string;
  recommendedAimDeg: number;
  recommendedPower: number;
  recommendedSpinX: number;
  recommendedSpinY: number;
  recommendedElevationDeg: number;
  balls: ScenarioBallDef[];
}

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: 'cue-ball-control',
    lectureSlug: 'cue-ball-control',
    title: 'The Dead Stop Stun',
    level: 'Beginner',
    objective: 'Pot the red into the top-right pocket and stop the cue ball near impact.',
    physicsTakeaway:
      'Dead-center / slight-low stun removes forward roll right at contact so all linear momentum transfers to the object ball.',
    recommendedAimDeg: 11.2,
    recommendedPower: 42,
    recommendedSpinX: 0,
    recommendedSpinY: -0.25,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1400, y: 520 },
      { id: 'red-1', type: 'red', x: 2500, y: 740 },
      { id: 'black', type: 'black', x: SnookerTable.SPOTS.BLACK.x, y: SnookerTable.SPOTS.BLACK.y },
    ],
  },
  {
    id: 'topspin-and-backspin',
    lectureSlug: 'topspin-and-backspin',
    title: 'Screw-Back for Black Position',
    level: 'Intermediate',
    objective: 'Pot the red into the top-right corner and draw the cue ball back toward the center.',
    physicsTakeaway:
      'Struck low (-0.75Y), backspin survives sliding friction until contact arrests forward velocity, then drives the cue ball backward.',
    recommendedAimDeg: 24.4,
    recommendedPower: 68,
    recommendedSpinX: 0,
    recommendedSpinY: -0.75,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1650, y: 889 },
      { id: 'red-1', type: 'red', x: 2550, y: 1295 },
      { id: 'black', type: 'black', x: 2100, y: 500 },
    ],
  },
  {
    id: 'topspin-follow',
    lectureSlug: 'topspin-and-backspin',
    title: 'Topspin Follow-Through Break',
    level: 'Intermediate',
    objective: 'Pot the red and follow smoothly through behind it toward the baulk/black line.',
    physicsTakeaway:
      'Struck high (+0.78Y), excess forward angular momentum accelerates the cue ball smoothly past the object ball after contact.',
    recommendedAimDeg: 0,
    recommendedPower: 55,
    recommendedSpinX: 0,
    recommendedSpinY: 0.78,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1100, y: 889 },
      { id: 'red-1', type: 'red', x: 2300, y: 889 },
      { id: 'black', type: 'black', x: 3245, y: 600 },
    ],
  },
  {
    id: 'side-spin-ballistics',
    lectureSlug: 'side-spin-ballistics',
    title: 'Running Side Cushion Drift',
    level: 'Master',
    objective: 'Strike off the bottom cushion with right running side to widen the rebound up-table.',
    physicsTakeaway:
      'Running English accelerates tangentially off the rubber rail, widening the exit angle compared to center ball.',
    recommendedAimDeg: 332,
    recommendedPower: 58,
    recommendedSpinX: 0.75,
    recommendedSpinY: 0.2,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 950, y: 520 },
      { id: 'red-1', type: 'red', x: 2650, y: 1350 },
      { id: 'blue', type: 'blue', x: SnookerTable.SPOTS.BLUE.x, y: SnookerTable.SPOTS.BLUE.y },
    ],
  },
  {
    id: 'cushion-rebounds',
    lectureSlug: 'cushion-rebounds',
    title: 'Two-Cushion Snooker Escape',
    level: 'Advanced',
    objective: 'Bypass the blocking blue & pink balls by rebounding off two rails to hit the red.',
    physicsTakeaway:
      'Multi-rail escapes obey normal cushion restitution (e ≈ 0.72), narrowing reflection angles slightly from ideal geometric symmetry.',
    recommendedAimDeg: 38,
    recommendedPower: 65,
    recommendedSpinX: 0.3,
    recommendedSpinY: 0,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 737, y: 420 },
      { id: 'blue', type: 'blue', x: 1500, y: 520 },
      { id: 'pink', type: 'pink', x: 1850, y: 580 },
      { id: 'red-1', type: 'red', x: 2800, y: 420 },
    ],
  },
  {
    id: 'collision-angles',
    lectureSlug: 'collision-angles',
    title: 'Thin Cut & 90° Tangent Separation',
    level: 'Intermediate',
    objective: 'Slice a thin 38° cut into the top middle pocket and observe the 90° cue deflection.',
    physicsTakeaway:
      'Under stun, cue and object balls always separate near 90° because all impulse transfers along the line of centers.',
    recommendedAimDeg: 331.5,
    recommendedPower: 48,
    recommendedSpinX: 0,
    recommendedSpinY: -0.1,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1200, y: 740 },
      { id: 'red-1', type: 'red', x: 1750, y: 440 },
      { id: 'yellow', type: 'yellow', x: SnookerTable.SPOTS.YELLOW.x, y: SnookerTable.SPOTS.YELLOW.y },
    ],
  },
  {
    id: 'speed-and-distance',
    lectureSlug: 'speed-and-distance',
    title: 'Featherweight Pace Control',
    level: 'Beginner',
    objective: 'Pot the red gently into the middle pocket and let the cue ball rest softly beside the blue.',
    physicsTakeaway:
      'Stopping distance scales quadratically with velocity (d = v² / 2μg): small changes in cue power yield huge changes in roll.',
    recommendedAimDeg: 325.2,
    recommendedPower: 22,
    recommendedSpinX: 0,
    recommendedSpinY: 0.2,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1320, y: 480 },
      { id: 'red-1', type: 'red', x: 1560, y: 310 },
      { id: 'blue', type: 'blue', x: SnookerTable.SPOTS.BLUE.x, y: SnookerTable.SPOTS.BLUE.y },
    ],
  },
  {
    id: 'masse-swerve',
    lectureSlug: 'side-spin-ballistics',
    title: 'Elevated Masse Swerve Around Ball',
    level: 'Master',
    objective: 'Elevate the cue butt 40° with heavy right English to bend around the blocking blue ball.',
    physicsTakeaway:
      'Elevating the cue directs spin axis downward, creating persistent lateral cloth friction that curves the cue ball mid-flight.',
    recommendedAimDeg: 345,
    recommendedPower: 52,
    recommendedSpinX: 0.78,
    recommendedSpinY: -0.35,
    recommendedElevationDeg: 40,
    balls: [
      { id: 'cue', type: 'cue', x: 900, y: 889 },
      { id: 'blue', type: 'blue', x: 1550, y: 870 },
      { id: 'red-1', type: 'red', x: 2400, y: 889 },
    ],
  },
];

export function getScenarioByIdOrSlug(idOrSlug: string): TrainingScenario | undefined {
  return (
    TRAINING_SCENARIOS.find((s) => s.id === idOrSlug) ||
    TRAINING_SCENARIOS.find((s) => s.lectureSlug === idOrSlug)
  );
}

export function buildBallsForScenario(scenario: TrainingScenario): Ball[] {
  return scenario.balls.map((b) => new Ball(b.id, b.type, new Vector2D(b.x, b.y)));
}
