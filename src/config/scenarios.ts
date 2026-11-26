import { Vector2D } from '../engine/math/Vector2D';
import { Ball } from '../engine/physics/Ball';
import { SnookerTable } from '../engine/table/SnookerTable';

export interface ScenarioBallDef {
  id: string;
  type: Ball['type'];
  x: number;
  y: number;
}

export type ExpertiseTier = 'beginner' | 'intermediate' | 'expert';

export interface AutomatedDemoStep {
  phase: 'setup' | 'strike' | 'outcome';
  title: string;
  caption: string;
}

export interface TrainingScenario {
  id: string;
  lectureSlug: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  tier?: ExpertiseTier;
  objective: string;
  physicsTakeaway: string;
  demoSteps?: AutomatedDemoStep[];
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
  {
    id: 'straight-potting-fundamentals',
    lectureSlug: 'straight-potting-fundamentals',
    title: 'Junior Ghost-Ball Straight Pot',
    level: 'Beginner',
    tier: 'beginner',
    objective: 'Aim dead-center through the Ghost Ball line and pot the red smoothly into the top-right pocket without side spin.',
    physicsTakeaway:
      'Striking the exact center of the cue ball eliminates throw and deflection so the object ball travels purely along the line of centers.',
    demoSteps: [
      {
        phase: 'setup',
        title: '1 · Align Through the Ghost Ball',
        caption: 'Line the cue ball straight into the Ghost Ball marker behind the red—keep tip contact dead center (0, 0).',
      },
      {
        phase: 'strike',
        title: '2 · Smooth Medium Follow-Through',
        caption: 'Deliver a calm 38% center-ball stroke with zero unwanted side spin so the pot stays razor straight.',
      },
      {
        phase: 'outcome',
        title: '3 · Clean Center-Pocket Entry',
        caption: 'With no squirt or throw, the red drops cleanly into the right corner while the white settles predictably.',
      },
    ],
    recommendedAimDeg: 353,
    recommendedPower: 38,
    recommendedSpinX: 0,
    recommendedSpinY: 0,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1450, y: 510 },
      { id: 'red-1', type: 'red', x: 2420, y: 380 },
      { id: 'black', type: 'black', x: SnookerTable.SPOTS.BLACK.x, y: SnookerTable.SPOTS.BLACK.y },
    ],
  },
  {
    id: 'junior-safety-and-rules',
    lectureSlug: 'junior-safety-and-rules',
    title: 'Junior Baulk Safety & Contain',
    level: 'Beginner',
    tier: 'beginner',
    objective: 'Thin-clip off the open red with gentle speed and send the cue ball back safely behind the baulk colors.',
    physicsTakeaway:
      'Controlling shot speed first ensures that even after contact, the cue ball finishes in the safe baulk end rather than leaving an open pot.',
    demoSteps: [
      {
        phase: 'setup',
        title: '1 · Clip the Thin Safety Edge',
        caption: 'Target the outer edge of the red toward the top cushion so the cue ball glides toward the baulk rail.',
      },
      {
        phase: 'strike',
        title: '2 · Soft Touch Containment Speed',
        caption: 'Play at gentle 26% speed with mild check drag so both balls separate safely.',
      },
      {
        phase: 'outcome',
        title: '3 · Safe Return to Baulk Zone',
        caption: 'The cue ball parks near the baulk colors while the red drifts safely away from center pockets.',
      },
    ],
    recommendedAimDeg: 184,
    recommendedPower: 30,
    recommendedSpinX: 0,
    recommendedSpinY: -0.2,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 2450, y: 760 },
      { id: 'red-1', type: 'red', x: 1850, y: 690 },
      { id: 'brown', type: 'brown', x: SnookerTable.SPOTS.BROWN.x, y: SnookerTable.SPOTS.BROWN.y },
      { id: 'yellow', type: 'yellow', x: SnookerTable.SPOTS.YELLOW.x, y: SnookerTable.SPOTS.YELLOW.y },
    ],
  },
  {
    id: 'advanced-masse-and-escapes',
    lectureSlug: 'advanced-masse-and-escapes',
    title: 'Tournament Cushion Escape & Swerve',
    level: 'Advanced',
    tier: 'expert',
    objective: 'Use steep cue elevation and calibrated running English off the side cushion to escape a tight snooker onto the red.',
    physicsTakeaway:
      'Combining running English spin with rail restitution tightens the rebound angle out of the cushion to reach shielded target balls.',
    demoSteps: [
      {
        phase: 'setup',
        title: '1 · Measure Equal-Angle Escape + Spin',
        caption: 'Mirror the red off the top cushion and dial heavy running side English to bend tighter off the rubber.',
      },
      {
        phase: 'strike',
        title: '2 · Controlled 48% Spin Strike',
        caption: 'Medium-firm speed keeps the spin active into the rail without overpowering past the shielded target.',
      },
      {
        phase: 'outcome',
        title: '3 · Precision Legal Contact',
        caption: 'Side friction bites the top cushion and accelerates the cue ball cleanly onto the target red.',
      },
    ],
    recommendedAimDeg: 332,
    recommendedPower: 48,
    recommendedSpinX: 0.72,
    recommendedSpinY: 0.15,
    recommendedElevationDeg: 0,
    balls: [
      { id: 'cue', type: 'cue', x: 1120, y: 540 },
      { id: 'blue', type: 'blue', x: 1780, y: 540 },
      { id: 'red-1', type: 'red', x: 2480, y: 420 },
    ],
  },
];

export function getScenarioTier(scenario: TrainingScenario): ExpertiseTier {
  if (scenario.tier) return scenario.tier;
  if (scenario.level === 'Beginner') return 'beginner';
  if (scenario.level === 'Intermediate') return 'intermediate';
  return 'expert';
}

const DEFAULT_DEMO_BY_ID: Record<string, AutomatedDemoStep[]> = {
  'cue-ball-control': [
    {
      phase: 'setup',
      title: '1 · Dead-Center Stun Contact',
      caption: 'Set tip exactly on center-slightly-below (0, -0.25) and aim pure straight-on to the Ghost Ball.',
    },
    {
      phase: 'strike',
      title: '2 · Deliver Crisp Stun Impulse',
      caption: 'At 45% speed, forward rotation is neutralized right at collision, freezing the cue ball at contact.',
    },
    {
      phase: 'outcome',
      title: '3 · Instant Stop for Center Blue',
      caption: 'Momentum transfers cleanly into the red while the cue ball stops within millimeters for easy shape.',
    },
  ],
  'topspin-and-backspin': [
    {
      phase: 'setup',
      title: '1 · Deep Screw Draw Setup',
      caption: 'Drop tip contact low (-0.75 Y) for strong reverse spin while lining up a straight pocket pot.',
    },
    {
      phase: 'strike',
      title: '2 · Crisp 62% Acceleration',
      caption: 'Backspin survives cloth friction through contact, causing the white to grip the baize and reverse.',
    },
    {
      phase: 'outcome',
      title: '3 · Cue Ball Retreats Back to Baulk',
      caption: 'Notice the immediate reverse pull after potting—key for moving between baulk and black-spot ends.',
    },
  ],
  'side-spin-ballistics': [
    {
      phase: 'setup',
      title: '1 · Dial Heavy Running English',
      caption: 'Apply +0.85 right side spin and note the subtle squirt deflection offset along the aiming line.',
    },
    {
      phase: 'strike',
      title: '2 · Medium-Firm Strike into Top Cushion',
      caption: 'Spin stays stored mid-flight until tangential rail friction accelerates the ball laterally off the lip.',
    },
    {
      phase: 'outcome',
      title: '3 · Acute Speed-Boost Rebound',
      caption: 'Observe how running side widens the exit track downward toward position much further than center ball.',
    },
  ],
  'cushion-rebounds': [
    {
      phase: 'setup',
      title: '1 · Read Natural Mirror Line',
      caption: 'Strike cleanly near center-top so natural cushion restitution dominates over spin throw.',
    },
    {
      phase: 'strike',
      title: '2 · 55% Speed Into Side Rail',
      caption: 'Vertical velocity component reflects cleanly with ~0.82 restitution off the rubber nose.',
    },
    {
      phase: 'outcome',
      title: '3 · Predictable Natural Exit Track',
      caption: 'Use this baseline angle first before adding running or check English to adjust exits.',
    },
  ],
  'collision-angles': [
    {
      phase: 'setup',
      title: '1 · Find the 90° Tangent Line',
      caption: 'Watch the perpendicular dashed tangent ray—with stun speed, the white follows this 90° path.',
    },
    {
      phase: 'strike',
      title: '2 · Thin Half-Ball Cut at 42%',
      caption: 'Center-slightly-low strike eliminates topspin bend so the tangent line stays sharp at separation.',
    },
    {
      phase: 'outcome',
      title: '3 · Natural Separation Around the Spot',
      caption: 'Object ball drives into the pocket while the cue ball opens neatly off the tangent line.',
    },
  ],
  'speed-and-distance': [
    {
      phase: 'setup',
      title: '1 · Spot-to-Spot Feather Weight',
      caption: 'Compare the ghost path length and judge minimum sliding-to-rolling deceleration.',
    },
    {
      phase: 'strike',
      title: '2 · Soft 24% Touch Delivery',
      caption: 'Soft topspin settles early into pure rolling friction so distance estimation stays repeatable.',
    },
    {
      phase: 'outcome',
      title: '3 · Drop Dead Speed Into Corner',
      caption: 'Pockets accept slow shots at wider margins because the object ball enters cleanly without rattle.',
    },
  ],
};

export function getScenarioDemoSteps(scenario: TrainingScenario): AutomatedDemoStep[] {
  if (scenario.demoSteps && scenario.demoSteps.length > 0) return scenario.demoSteps;
  if (DEFAULT_DEMO_BY_ID[scenario.id]) return DEFAULT_DEMO_BY_ID[scenario.id];
  if (DEFAULT_DEMO_BY_ID[scenario.lectureSlug]) return DEFAULT_DEMO_BY_ID[scenario.lectureSlug];
  return [
    {
      phase: 'setup',
      title: '1 · Setup Tip Offset & Aim',
      caption: scenario.objective,
    },
    {
      phase: 'strike',
      title: `2 · Automated ${scenario.recommendedPower}% Execution`,
      caption: 'Observe the tip strike offset and early trajectory separation.',
    },
    {
      phase: 'outcome',
      title: '3 · Physics Takeaway',
      caption: scenario.physicsTakeaway,
    },
  ];
}

export function getScenarioByIdOrSlug(idOrSlug: string): TrainingScenario | undefined {
  return (
    TRAINING_SCENARIOS.find((s) => s.id === idOrSlug) ||
    TRAINING_SCENARIOS.find((s) => s.lectureSlug === idOrSlug)
  );
}

export function buildBallsForScenario(scenario: TrainingScenario): Ball[] {
  return scenario.balls.map((b) => new Ball(b.id, b.type, new Vector2D(b.x, b.y)));
}
