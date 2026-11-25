export interface CueSpec {
  id: string;
  name: string;
  material: string;
  squirtFactor: number; // 0.0 (zero deflection) to 1.0 (classic ash deflection)
  powerMultiplier: number; // 0.90 to 1.15
  shaftColor: string;
  buttColor: string;
  description: string;
  physicsEffect: string;
}

export interface CueTipSpec {
  id: string;
  name: string;
  hardness: 'Soft' | 'Medium' | 'Hard';
  maxSpinOffset: number; // Safe tip offset radius ratio before miscue (0.70 to 0.90)
  spinMultiplier: number; // Multiplier on pitch/yaw/swerve transfer
  speedEfficiency: number; // Energy transfer efficiency
  colorHex: string;
  description: string;
  physicsEffect: string;
}

export interface ClothSpec {
  id: string;
  name: string;
  slidingFriction: number; // mu_s
  rollingFriction: number; // mu_r
  spinDecay: number; // side spin decay per 1/120s
  feltHex2D: string;
  feltHex3D: number;
  description: string;
  physicsEffect: string;
}

export interface CushionSpec {
  id: string;
  name: string;
  restitution: number; // normal bounce efficiency (0.50 to 0.94)
  tangentialFriction: number; // rubber grip
  sideSpinBite: number; // yaw interaction strength
  description: string;
  physicsEffect: string;
}

export const CUE_CATALOG: CueSpec[] = [
  {
    id: 'ash-classic',
    name: 'Classic Ash Championship',
    material: 'Hand-spliced North American Ash',
    squirtFactor: 0.55,
    powerMultiplier: 1.0,
    shaftColor: '#D6B37C',
    buttColor: '#24140B',
    description: 'Traditional tournament snooker cue with authentic feel and balanced stiffness.',
    physicsEffect: 'Moderate cue squirt (deflection) on side-spin shots; balanced 1.00x energy transfer.',
  },
  {
    id: 'carbon-low-deflect',
    name: 'Carbon Fiber Pro (Low Deflection)',
    material: 'Hollow-Core Carbon Composite',
    squirtFactor: 0.12,
    powerMultiplier: 1.04,
    shaftColor: '#2B303A',
    buttColor: '#0F131A',
    description: 'Ultra-low end mass shaft engineered to minimize cue ball squirt during heavy side spin.',
    physicsEffect: 'Reduces side-spin deflection (squirt) by ~80%, letting you aim straighter with English.',
  },
  {
    id: 'heavy-break',
    name: 'Power Break / Heavy Maple',
    material: 'Dense Hard Rock Maple (20 oz)',
    squirtFactor: 0.78,
    powerMultiplier: 1.15,
    shaftColor: '#E5C99B',
    buttColor: '#4A1812',
    description: 'Heavier, stiffer shaft built to punch deep packs and generate maximum cue speed.',
    physicsEffect: '+15% velocity ceiling for deep screw & pack splits, but noticeably higher side-spin squirt.',
  },
  {
    id: 'finesse-touch',
    name: 'Finesse Tapered 9mm',
    material: 'Slim 9mm Tip Ash Taper',
    squirtFactor: 0.35,
    powerMultiplier: 0.94,
    shaftColor: '#DEC190',
    buttColor: '#1B241E',
    description: 'Fine tip profile for delicate touch shots, tight escapes, and subtle positional control.',
    physicsEffect: 'Slightly gentler velocity curve (0.94x) for superior touch accuracy in safety battles.',
  },
];

export const TIP_CATALOG: CueTipSpec[] = [
  {
    id: 'soft-elk',
    name: 'Soft Elk Leather',
    hardness: 'Soft',
    maxSpinOffset: 0.90,
    spinMultiplier: 1.18,
    speedEfficiency: 0.95,
    colorHex: '#2563EB',
    description: 'Supple, chalk-hungry leather tip that dwells longer on the cue ball face.',
    physicsEffect: 'Allows extreme spin offset (0.90R) & +18% rotational bite for massive screw/swerve; slightly softer hit.',
  },
  {
    id: 'medium-pro',
    name: 'Medium Laminated Pro',
    hardness: 'Medium',
    maxSpinOffset: 0.85,
    spinMultiplier: 1.0,
    speedEfficiency: 1.0,
    colorHex: '#1D4ED8',
    description: 'Layered pigskin tip offering tour-standard consistency across stun, draw, and follow.',
    physicsEffect: 'Baseline 1.00x spin and energy transfer up to 0.85R before miscue limit.',
  },
  {
    id: 'hard-phenolic',
    name: 'Hard Compressed / Phenolic',
    hardness: 'Hard',
    maxSpinOffset: 0.72,
    spinMultiplier: 0.82,
    speedEfficiency: 1.08,
    colorHex: '#0F766E',
    description: 'Rigid, low-compression tip favored for crisp stun shots and explosive breaks.',
    physicsEffect: '+8% linear speed transfer with less spin grip (-18% spin) and narrower safe tip zone (0.72R).',
  },
];

export const CLOTH_CATALOG: ClothSpec[] = [
  {
    id: 'tournament-fast',
    name: 'Crucible Worsted (Fast)',
    slidingFriction: 0.18,
    rollingFriction: 0.022,
    spinDecay: 0.989,
    feltHex2D: '#0E4F30',
    feltHex3D: 0x0f6a3d,
    description: 'Brand-new heated tournament Strachan cloth with razor-thin nap.',
    physicsEffect: 'Low rolling friction (μr=0.022): balls travel ~55% farther and hold side spin longer across cushions.',
  },
  {
    id: 'club-standard',
    name: 'Strachan Club (Standard)',
    slidingFriction: 0.22,
    rollingFriction: 0.035,
    spinDecay: 0.985,
    feltHex2D: '#0B2B1E',
    feltHex3D: 0x0e5d36,
    description: 'Balanced championship club baize with predictable sliding-to-rolling transition.',
    physicsEffect: 'Standard rolling resistance (μr=0.035) and cloth bite (μs=0.22) for realistic positional play.',
  },
  {
    id: 'heavy-nap',
    name: 'Heavy Napped Wool (Slow)',
    slidingFriction: 0.28,
    rollingFriction: 0.056,
    spinDecay: 0.976,
    feltHex2D: '#092217',
    feltHex3D: 0x0a4227,
    description: 'Thick woolen pub/club cloth with strong directional resistance.',
    physicsEffect: 'High friction (μr=0.056, μs=0.28): balls pull up quickly and high-angle swerve curves earlier.',
  },
  {
    id: 'tournament-blue',
    name: 'Simonis 860 Tour Blue',
    slidingFriction: 0.16,
    rollingFriction: 0.019,
    spinDecay: 0.991,
    feltHex2D: '#10497A',
    feltHex3D: 0x135995,
    description: 'Official 9-Ball championship worsted blue cloth calibrated for crisp break spreads.',
    physicsEffect: 'Ultra-fast worsted pool weave (μr=0.019): long rails and multi-cushion shapes glide smoothly.',
  },
  {
    id: 'crimson-tour',
    name: 'Burgundy Championship Cloth',
    slidingFriction: 0.19,
    rollingFriction: 0.025,
    spinDecay: 0.988,
    feltHex2D: '#591625',
    feltHex3D: 0x6b1b2d,
    description: 'High-contrast burgundy pool baize with brisk speed and predictable check-side bite.',
    physicsEffect: 'Brisk American pool speed (μr=0.025) tailored for tight 8-Ball clusters and bank shots.',
  },
];

export const CUSHION_CATALOG: CushionSpec[] = [
  {
    id: 'dead-rails',
    name: 'Soft / Dead Borders',
    restitution: 0.56,
    tangentialFriction: 0.26,
    sideSpinBite: 1.4,
    description: 'Aged or softer rubber cushions that absorb heavy impact energy.',
    physicsEffect: 'Restitution e=0.56: balls lose ~44% normal speed per bounce, rebounding tighter and dying near rails.',
  },
  {
    id: 'club-rails',
    name: 'Regulation Club Borders',
    restitution: 0.72,
    tangentialFriction: 0.20,
    sideSpinBite: 1.8,
    description: 'Standard vulcanized L-profile cushion blocks for authentic club play.',
    physicsEffect: 'Restitution e=0.72: true tournament rebound speed and balanced running/check side response.',
  },
  {
    id: 'lively-tournament',
    name: 'Lively Championship Borders',
    restitution: 0.84,
    tangentialFriction: 0.16,
    sideSpinBite: 2.2,
    description: 'Fresh, steel-backed tournament cushion blocks with energetic rebound.',
    physicsEffect: 'Restitution e=0.84: preserves speed across 3+ cushion escapes and amplifies running side widening.',
  },
  {
    id: 'super-elastic',
    name: 'High-Elasticity Lab Borders',
    restitution: 0.93,
    tangentialFriction: 0.10,
    sideSpinBite: 2.6,
    description: 'Near-elastic test boundaries for studying multi-cushion diamond geometry.',
    physicsEffect: 'Restitution e=0.93: minimal bounce loss so multi-rail geometric routes stand out clearly.',
  },
];
