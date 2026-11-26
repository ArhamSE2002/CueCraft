import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { Ball } from '../../engine/physics/Ball';
import { Vector2D } from '../../engine/math/Vector2D';
import { CLOTH_CATALOG } from '../../engine/equipment/Equipment';
import { ArrowRight, Play, Sparkles, Sliders, ChevronDown, GraduationCap } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FrameBallSnapshot {
  id: string;
  x: number;
  y: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  potted: boolean;
}

const GAME_DISCIPLINES = [
  {
    id: 'snooker',
    badge: '12ft × 6ft · 22 Balls',
    title: 'Championship Snooker',
    clothHex: '#0B4D30',
    clothHexNum: 0x0b4d30,
    railColor: '#3D1C0B',
    summary:
      'Regulation 3569 × 1778 mm tournament cloth, brass corner jaws, D-zone baulk lines, and 15-red match rack.',
    href: '/play?game=snooker',
    cta: 'Open Snooker',
  },
  {
    id: '9ball',
    badge: '9ft · Diamond Rotation',
    title: '9-Ball Pro Pool',
    clothHex: '#115693',
    clothHexNum: 0x115693,
    railColor: '#18222F',
    summary:
      'Ultra-fast Simonis worsted blue baize, pearl diamond rail sights, 57.15 mm balls, and diamond rotation rack.',
    href: '/play?game=9ball',
    cta: 'Open 9-Ball',
  },
  {
    id: '8ball',
    badge: '8ft · Solids & Stripes',
    title: 'American 8-Ball',
    clothHex: '#6B1B2D',
    clothHexNum: 0x6b1b2d,
    railColor: '#2C1412',
    summary:
      'Compact 8-foot table tuned for dense cluster breakups, bank geometry, and numbered 1–15 solid/stripe balls.',
    href: '/play?game=8ball',
    cta: 'Open 8-Ball',
  },
];

const CURRICULUM_ROWS = [
  {
    title: 'Dead-Stop Stun & 90° Tangent',
    formula: 'v_n = 0',
    summary: 'Kill forward roll at impact so linear momentum drives strictly along the contact axis.',
    learnHref: '/learn/cue-ball-control',
    playHref: '/play?scenario=cue-ball-control',
  },
  {
    title: 'Screw-Back Draw & Topspin',
    formula: 'F_slip = −μs mg (v − u)',
    summary: '2D surface slip physics generates parabolic draw backs and sweeping follow arcs.',
    learnHref: '/learn/topspin-and-backspin',
    playHref: '/play?scenario=topspin-and-backspin',
  },
  {
    title: 'Running Side, Check & Swerve',
    formula: 'e_yaw + Squirt',
    summary: 'Balance tip deflection squirt, cushion bite angle widening, and steep masse curves.',
    learnHref: '/learn/side-spin-ballistics',
    playHref: '/play?scenario=side-spin-ballistics',
  },
  {
    title: 'Multi-Cushion Escapes',
    formula: 'e = 0.56 – 0.93',
    summary: 'Trace multi-rail positional routes adjusted live for rubber border elasticity and cloth speed.',
    learnHref: '/learn/cushion-rebounds',
    playHref: '/play?scenario=cushion-rebounds',
  },
  {
    title: 'Cut-Induced Throw & Contact',
    formula: '2R Axis',
    summary: 'Fine-tune cut angles down to 0.05° micrometer steps with ghost-ball contact overlays.',
    learnHref: '/learn/collision-angles',
    playHref: '/play?scenario=collision-angles',
  },
  {
    title: 'Pace Control & Cloth Nap',
    formula: 'd = v² / (2 μr g)',
    summary: 'Compare stopping distances across Crucible Worsted, Club Standard, and Heavy Nap wool.',
    learnHref: '/learn/speed-and-distance',
    playHref: '/play?scenario=speed-and-distance',
  },
];

export const HeroThreeScrollExperience: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const learnMenuRef = useRef<HTMLDivElement>(null);
  const clothTargetColorRef = useRef<THREE.Color | null>(null);
  const clothOverrideRef = useRef<THREE.Color | null>(null);
  const [learnMenuOpen, setLearnMenuOpen] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState({
    phase: 'PRE-STRIKE ALIGNMENT',
    cueSpeed: '0.0 km/h',
    spinState: '-0.85Y SCREW',
    scrollPct: 0,
  });

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (learnMenuRef.current && !learnMenuRef.current.contains(e.target as Node)) {
        setLearnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    const wrapper = wrapperRef.current;
    if (!host || !wrapper) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── 1. Pre-record deterministic 240Hz snooker showcase shot ──────────────
    const eng = new PhysicsEngine('snooker');
    eng.clothConfig = CLOTH_CATALOG[1];
    const R = eng.table.ballRadius;

    const targetRedPos = new Vector2D(3040, 440);
    const cornerPocket = new Vector2D(3569, 0);
    const toPocket = cornerPocket.sub(targetRedPos).normalize();
    const ghostPos = targetRedPos.sub(toPocket.scale(R * 2));
    const cueStartPos = new Vector2D(2140, 1070);
    const aimAngle = ghostPos.sub(cueStartPos).angle();

    eng.balls = [
      new Ball('cue', 'cue', cueStartPos.clone(), R),
      new Ball('red-target', 'red', targetRedPos.clone(), R),
      new Ball('black', 'black', eng.table.spots.BLACK.clone(), R),
      new Ball('pink', 'pink', eng.table.spots.PINK.clone(), R),
      new Ball('blue', 'blue', eng.table.spots.BLUE.clone(), R),
      new Ball('brown', 'brown', eng.table.spots.BROWN.clone(), R),
      new Ball('yellow', 'yellow', eng.table.spots.YELLOW.clone(), R),
      new Ball('green', 'green', eng.table.spots.GREEN.clone(), R),
      new Ball('red-pack-1', 'red', new Vector2D(2740, 889), R),
      new Ball('red-pack-2', 'red', new Vector2D(2790, 920), R),
      new Ball('red-pack-3', 'red', new Vector2D(2790, 858), R),
      new Ball('red-pack-4', 'red', new Vector2D(2840, 889), R),
    ];

    const shotPred = eng.calculateTrajectory(aimAngle, 66, 0, -0.85, 0, true);
    const baseBalls = eng.balls.map((b) => b.clone());

    const takeSnap = (): FrameBallSnapshot[] =>
      eng.balls.map((b) => ({
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        rotX: b.rotation.x,
        rotY: b.rotation.y,
        rotZ: b.rotation.z,
        potted: b.potted,
      }));

    const frames: FrameBallSnapshot[][] = [takeSnap()];
    eng.strikeCueBall(66, aimAngle, 0, -0.85, 0, false);
    for (let f = 0; f < 135 && eng.isSimulating; f++) {
      eng.stepFixed(PhysicsEngine.FIXED_DT, 4, false);
      frames.push(takeSnap());
    }

    // ── 2. Build High-Craft 3D Three.js Studio Scene ────────────────────────
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080c);
    scene.fog = new THREE.FogExp2(0x05080c, 0.12);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 40);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    // Studio Lighting (Crucible canopy warm spots + subtle rim light)
    scene.add(new THREE.AmbientLight(0x283546, 1.35));
    const hemi = new THREE.HemisphereLight(0xfef3c7, 0x090d14, 0.75);
    scene.add(hemi);

    [-0.95, 0.05, 1.05].forEach((lx) => {
      const spot = new THREE.SpotLight(0xfff9e6, 3.8);
      spot.position.set(lx, 1.55, 0);
      spot.target.position.set(lx, 0, 0);
      scene.add(spot.target);
      spot.angle = Math.PI / 2.6;
      spot.penumbra = 0.65;
      spot.decay = 1.1;
      spot.distance = 6;
      spot.castShadow = true;
      spot.shadow.mapSize.width = 1024;
      spot.shadow.mapSize.height = 1024;
      spot.shadow.bias = -0.0005;
      scene.add(spot);
    });

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-2.2, 1.4, -2.5);
    scene.add(rimLight);

    const L = eng.table.length * 0.001;
    const W = eng.table.width * 0.001;
    const to3D = (xMm: number, yMm: number, yUp: number = R * 0.001) =>
      new THREE.Vector3((xMm - eng.table.length / 2) * 0.001, yUp, (yMm - eng.table.width / 2) * 0.001);

    // Studio floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: 0x06090e, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.78;
    floor.receiveShadow = true;
    scene.add(floor);

    // Bed Cloth
    const baseClothColor = new THREE.Color(0x0b4d30);
    const bedMat = new THREE.MeshStandardMaterial({
      color: baseClothColor.clone(),
      roughness: 0.85,
      metalness: 0.03,
    });
    clothTargetColorRef.current = baseClothColor.clone();

    const cushionDepth = 0.044;
    const railThick = 0.084;
    const railHeight = 0.048;

    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(L + cushionDepth * 2, 0.05, W + cushionDepth * 2),
      bedMat
    );
    bed.position.y = -0.025;
    bed.receiveShadow = true;
    scene.add(bed);

    // Baulk & D markings
    const baulkX = (eng.table.baulkDist - eng.table.length / 2) * 0.001;
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf8fafc, opacity: 0.42, transparent: true });
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(baulkX, 0.0012, -W / 2 + 0.01),
          new THREE.Vector3(baulkX, 0.0012, W / 2 - 0.01),
        ]),
        lineMat
      )
    );
    const dRadius = eng.table.dRadius * 0.001;
    const dPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 36;
      dPts.push(new THREE.Vector3(baulkX - Math.cos(a) * dRadius, 0.0012, Math.sin(a) * dRadius));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(dPts), lineMat));

    // Segmented Cushions (all 6 clearly sculpted & beveled)
    const cushionMat = new THREE.MeshStandardMaterial({
      color: baseClothColor.clone().multiplyScalar(1.22),
      roughness: 0.56,
      metalness: 0.05,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xd1fae5,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.72,
    });

    eng.table.cushions.forEach((c) => {
      const s = to3D(c.start.x, c.start.y);
      const e = to3D(c.end.x, c.end.y);
      const segLen = Math.hypot(e.x - s.x, e.z - s.z);
      const cx = (s.x + e.x) / 2;
      const cz = (s.z + e.z) / 2;
      const isAlongX = Math.abs(e.x - s.x) >= Math.abs(e.z - s.z);

      const cush = new THREE.Mesh(
        new THREE.BoxGeometry(isAlongX ? segLen : cushionDepth, 0.036, isAlongX ? cushionDepth : segLen),
        cushionMat
      );
      cush.position.set(cx - c.normal.x * (cushionDepth / 2), 0.018, cz - c.normal.y * (cushionDepth / 2));
      cush.castShadow = true;
      cush.receiveShadow = true;
      scene.add(cush);

      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(isAlongX ? segLen : 0.0045, 0.005, isAlongX ? 0.0045 : segLen),
        noseMat
      );
      lip.position.set(cx - c.normal.x * 0.002, 0.0355, cz - c.normal.y * 0.002);
      scene.add(lip);
    });

    // Hardwood Rails + Brass Pocket Plates + Leather Drops
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x32170a, roughness: 0.28, metalness: 0.14 });
    const endRailGeo = new THREE.BoxGeometry(railThick, railHeight, W + (cushionDepth + railThick) * 2);
    [-L / 2 - cushionDepth - railThick / 2, L / 2 + cushionDepth + railThick / 2].forEach((rx) => {
      const rMesh = new THREE.Mesh(endRailGeo, woodMat);
      rMesh.position.set(rx, railHeight / 2 - 0.004, 0);
      rMesh.castShadow = true;
      scene.add(rMesh);
    });
    const sideRailGeo = new THREE.BoxGeometry(L + cushionDepth * 2, railHeight, railThick);
    [-W / 2 - cushionDepth - railThick / 2, W / 2 + cushionDepth + railThick / 2].forEach((rz) => {
      const rMesh = new THREE.Mesh(sideRailGeo, woodMat);
      rMesh.position.set(0, railHeight / 2 - 0.004, rz);
      rMesh.castShadow = true;
      scene.add(rMesh);
    });

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af63, metalness: 0.9, roughness: 0.18 });
    const pocketDarkMat = new THREE.MeshBasicMaterial({ color: 0x030507 });
    eng.table.pockets.forEach((p) => {
      const pos = to3D(p.position.x, p.position.y, 0.002);
      const pr = p.radius * 0.001;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.06, 22), pocketDarkMat);
      hole.position.copy(pos);
      scene.add(hole);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(pr * 1.45, 0.038, pr * 1.45), brassMat);
      plate.position.set(pos.x * 1.015, 0.02, pos.z * 1.015);
      plate.castShadow = true;
      scene.add(plate);
    });

    // Pool Rail Diamonds (fade opacity seamlessly when morphing to 9-Ball/8-Ball!)
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.3,
      transparent: true,
      opacity: 0,
    });
    const dGeo = new THREE.BoxGeometry(0.014, 0.005, 0.014);
    for (const f of [0.125, 0.25, 0.375, 0.625, 0.75, 0.875]) {
      const x = (f - 0.5) * L;
      [-W / 2 - cushionDepth - railThick / 2, W / 2 + cushionDepth + railThick / 2].forEach((z) => {
        const d = new THREE.Mesh(dGeo, diamondMat);
        d.rotation.y = Math.PI / 4;
        d.position.set(x, railHeight - 0.001, z);
        scene.add(d);
      });
    }

    // Glossy Clearcoat Phenolic Balls
    const ballR3D = R * 0.001;
    const sphereGeo = new THREE.SphereGeometry(ballR3D, 36, 36);
    const ballMeshes = new Map<string, THREE.Mesh>();
    baseBalls.forEach((b) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(b.colorInfo.hex),
        roughness: 0.06,
        metalness: 0.04,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      ballMeshes.set(b.id, mesh);
    });

    // Spliced 3D Cue Stick
    const cueGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0046, 0.0112, 0.94, 24).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe2c38e, roughness: 0.28 })
    );
    shaft.position.z = -0.47;
    shaft.castShadow = true;
    cueGroup.add(shaft);

    const butt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0112, 0.0155, 0.50, 24).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x24130a, roughness: 0.24 })
    );
    butt.position.z = -1.19;
    butt.castShadow = true;
    cueGroup.add(butt);

    const joint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0115, 0.0115, 0.022, 24).rotateX(-Math.PI / 2),
      brassMat
    );
    joint.position.z = -0.94;
    cueGroup.add(joint);

    const tipDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0048, 0.0048, 0.006, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    tipDome.position.z = 0.003;
    cueGroup.add(tipDome);
    scene.add(cueGroup);

    // 3D Trajectory Laser Lines & Ghost Ring
    const ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(ballR3D * 0.9, ballR3D * 1.12, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ghostRing.rotation.x = -Math.PI / 2;
    const gPos3 = to3D(ghostPos.x, ghostPos.y, 0.003);
    ghostRing.position.copy(gPos3);
    scene.add(ghostRing);

    const aimLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const objLineMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9 });
    const screwLineMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });

    const aimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        to3D(cueStartPos.x, cueStartPos.y, 0.0035),
        to3D(ghostPos.x, ghostPos.y, 0.0035),
      ]),
      aimLineMat
    );
    scene.add(aimLine);

    const objLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        to3D(targetRedPos.x, targetRedPos.y, 0.0035),
        to3D(cornerPocket.x, cornerPocket.y, 0.0035),
      ]),
      objLineMat
    );
    scene.add(objLine);

    const screwPts = shotPred.cueDeflectionPath.flatMap((seg) => [
      to3D(seg.start.x, seg.start.y, 0.0035),
      to3D(seg.end.x, seg.end.y, 0.0035),
    ]);
    const screwLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(screwPts.length ? screwPts : [gPos3, gPos3]),
      screwLineMat
    );
    scene.add(screwLine);

    // ── 3. Catmull-Rom Smooth Camera Pos & LookAt Splines ──────────────────
    const camPosCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.25, 0.82), // Act 1: Player-level dramatic opening behind cue
      new THREE.Vector3(-0.08, 0.42, 1.05), // Act 2: Pulling up during drawback
      new THREE.Vector3(0.68, 0.56, 1.15),  // Act 3: Sweeping alongside corner pot
      new THREE.Vector3(0.18, 0.24, 1.18),  // Act 4: Close glide beside segmented cushion lip
      new THREE.Vector3(-0.22, 2.05, 1.95), // Act 5: High 3/4 table switch (Emerald -> Blue -> Crimson)
      new THREE.Vector3(0.0, 3.05, 0.55),   // Act 6: Clean architectural overhead settle
    ]);

    const camLookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.95, 0.03, -0.18),
      new THREE.Vector3(0.88, 0.03, -0.22),
      new THREE.Vector3(1.26, 0.02, -0.52),
      new THREE.Vector3(1.15, 0.02, -0.78),
      new THREE.Vector3(0.08, 0.0, 0.0),
      new THREE.Vector3(0.0, -0.05, 0.0),
    ]);

    // Scrub state mutated gently via GSAP / Lenis loop
    const scrubState = {
      progress: 0,
      targetProgress: 0,
      lastLabelTick: -1,
    };

    const currentLook = new THREE.Vector3();
    const emeraldColor = new THREE.Color(0x0b4d30);
    const blueColor = new THREE.Color(0x115693);
    const crimsonColor = new THREE.Color(0x6b1b2d);
    const workingCloth = new THREE.Color();

    const applySceneAt = (uRaw: number) => {
      const u = Math.max(0, Math.min(1, uRaw));
      const posPt = camPosCurve.getPointAt(u);
      const lookPt = camLookCurve.getPointAt(u);
      camera.position.lerp(posPt, 0.16);
      currentLook.lerp(lookPt, 0.16);
      camera.lookAt(currentLook);

      // Compute physics timeline & cue stroke (u: 0 -> 0.18 pullback, 0.18 -> 0.44 strike & screw-back)
      let frameT = 0;
      let cuePull = 0.04;
      let showGuides = true;

      if (u < 0.16) {
        const p = u / 0.16;
        cuePull = 0.035 + p * 0.15;
        frameT = 0;
        aimLineMat.opacity = 0.35 + p * 0.55;
        objLineMat.opacity = 0.35 + p * 0.55;
        screwLineMat.opacity = p * 0.85;
      } else if (u < 0.44) {
        const p = (u - 0.16) / 0.28;
        if (p < 0.12) {
          // Cue forward strike stroke!
          cuePull = 0.185 * (1 - p / 0.12) + 0.022;
          frameT = 0;
        } else {
          frameT = (p - 0.12) / 0.88;
          cuePull = 0.025 + frameT * 0.2;
          showGuides = frameT < 0.05;
        }
      } else {
        frameT = 1;
        showGuides = false;
      }

      aimLine.visible = showGuides;
      objLine.visible = showGuides;
      screwLine.visible = showGuides;
      ghostRing.visible = showGuides;
      cueGroup.visible = u < 0.42;

      // Interpolate balls from recorded deterministic frames
      const maxIdx = frames.length - 1;
      const fFloat = Math.max(0, Math.min(1, frameT)) * maxIdx;
      const idxA = Math.floor(fFloat);
      const idxB = Math.min(maxIdx, idxA + 1);
      const frac = fFloat - idxA;
      const snapA = frames[idxA];
      const snapB = frames[idxB];

      snapA.forEach((a, i) => {
        const b = snapB[i];
        const mesh = ballMeshes.get(a.id);
        if (!mesh || !b) return;
        const bx = a.x + (b.x - a.x) * frac;
        const by = a.y + (b.y - a.y) * frac;
        const potted = frac > 0.5 ? b.potted : a.potted;
        mesh.visible = !potted;
        if (!potted) {
          mesh.position.copy(to3D(bx, by));
          mesh.rotation.set(
            a.rotX + (b.rotX - a.rotX) * frac,
            a.rotY + (b.rotY - a.rotY) * frac,
            a.rotZ + (b.rotZ - a.rotZ) * frac
          );
        }
      });

      // Cue stick transform anchored cleanly behind cue ball
      const cueMesh = ballMeshes.get('cue');
      if (cueGroup.visible && cueMesh) {
        const dirX = Math.cos(aimAngle);
        const dirZ = Math.sin(aimAngle);
        cueGroup.position.set(
          cueMesh.position.x - dirX * cuePull,
          cueMesh.position.y + 0.005,
          cueMesh.position.z - dirZ * cuePull
        );
        cueGroup.lookAt(
          cueMesh.position.x + dirX * 2,
          cueMesh.position.y + 0.005 - Math.sin((3 * Math.PI) / 180) * 2,
          cueMesh.position.z + dirZ * 2
        );
      }

      // Morph table felt smoothly during Multi-Table chapter (u: 0.62 -> 0.88), or obey hover override
      if (clothOverrideRef.current) {
        workingCloth.copy(clothOverrideRef.current);
        diamondMat.opacity = workingCloth.equals(emeraldColor) ? 0 : 0.9;
      } else if (u >= 0.60 && u < 0.76) {
        const m = (u - 0.60) / 0.16;
        workingCloth.copy(emeraldColor).lerp(blueColor, m);
        diamondMat.opacity = m;
      } else if (u >= 0.76 && u < 0.88) {
        const m = (u - 0.76) / 0.12;
        workingCloth.copy(blueColor).lerp(crimsonColor, m);
        diamondMat.opacity = 1;
      } else if (u >= 0.88) {
        const m = Math.min(1, (u - 0.88) / 0.12);
        workingCloth.copy(crimsonColor).lerp(emeraldColor, m);
        diamondMat.opacity = 1 - m;
      } else {
        workingCloth.copy(emeraldColor);
        diamondMat.opacity = 0;
      }
      bedMat.color.lerp(workingCloth, 0.15);
      cushionMat.color.copy(bedMat.color).multiplyScalar(1.22);

      // Update lightweight DOM HUD badge ~10Hz max without thrashing React
      const pct = Math.round(u * 100);
      if (Math.abs(pct - scrubState.lastLabelTick) >= 2) {
        scrubState.lastLabelTick = pct;
        let phase = 'PRE-STRIKE ALIGNMENT';
        let cueSpeed = '0.0 km/h';
        if (u >= 0.16 && u < 0.44) {
          phase = frameT < 0.15 ? 'STRIKING CUE BALL' : frameT < 0.48 ? 'CORNER POT & SCREW' : 'POST-IMPACT DRAW';
          cueSpeed = frameT > 0.05 && frameT < 0.65 ? '18.4 km/h' : '0.0 km/h';
        } else if (u >= 0.44 && u < 0.62) {
          phase = 'CUSHION ELASTICITY';
        } else if (u >= 0.62 && u < 0.88) {
          phase = 'MULTI-TABLE ENGINE';
        } else if (u >= 0.88) {
          phase = 'OVERHEAD LAB READY';
        }
        setLiveTelemetry({
          phase,
          cueSpeed,
          spinState: u < 0.6 ? '-0.85Y SCREW' : '9-BALL / 8-BALL',
          scrollPct: pct,
        });
      }

      renderer.render(scene, camera);
    };

    // Snap initial camera cleanly to frame 0 before Lenis ticks
    camera.position.copy(camPosCurve.getPointAt(0));
    currentLook.copy(camLookCurve.getPointAt(0));
    camera.lookAt(currentLook);
    applySceneAt(0);

    // ── 4. Lenis Smooth Scroll + GSAP ScrollTrigger Single-Loop Sync ─────────
    let lenis: Lenis | null = null;
    const gsCtx = gsap.context(() => {
      if (!prefersReduced) {
        lenis = new Lenis({
          lerp: 0.08,
          smoothWheel: true,
        });
        lenis.on('scroll', ScrollTrigger.update);

        ScrollTrigger.create({
          trigger: wrapper,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            scrubState.targetProgress = self.progress;
          },
        });

        // Staggered editorial entrances across acts
        gsap.from('.hero-kinetic', {
          y: 36,
          opacity: 0,
          duration: 0.85,
          stagger: 0.09,
          ease: 'power3.out',
        });

        gsap.utils.toArray<HTMLElement>('.scroll-card-reveal').forEach((card) => {
          gsap.from(card, {
            y: 44,
            opacity: 0,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          });
        });

        gsap.from('.discipline-card', {
          y: 36,
          opacity: 0,
          duration: 0.65,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.disciplines-grid',
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, wrapper);

    const tickerFn = (time: number) => {
      if (lenis) lenis.raf(time * 1000);
      scrubState.progress += (scrubState.targetProgress - scrubState.progress) * 0.14;
      applySceneAt(prefersReduced ? 0.08 : scrubState.progress);
    };

    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    const handleResize = () => {
      const nw = window.innerWidth || 1280;
      const nh = window.innerHeight || 720;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gsap.ticker.remove(tickerFn);
      gsCtx.revert();
      if (lenis) lenis.destroy();
      sphereGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative text-white">
      {/* FIXED FULL-VIEWPORT 3D WEBGL STAGE (THE CANVAS SANDWICH) */}
      <div
        ref={canvasHostRef}
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle top/left readability gradient vignette over the 3D scene */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 75% 50%, transparent 15%, rgba(5, 8, 12, 0.58) 78%, rgba(5, 8, 12, 0.86) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Floating Fixed Scroll Telemetry Pill (Bottom Left corner cleanly out of way) */}
      <div className="fixed bottom-5 left-5 z-30 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-[#090D13]/75 backdrop-blur-xl border border-white/10 text-[10px] font-mono shadow-xl pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-bright animate-pulse" />
        <span className="text-emerald-bright font-bold">{liveTelemetry.phase}</span>
        <span className="text-white/25">|</span>
        <span className="text-slate-300 tabular-nums">{liveTelemetry.cueSpeed}</span>
        <span className="text-white/25">|</span>
        <span className="text-sky-400">{liveTelemetry.scrollPct}%</span>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ACT 1: HERO OPENING OVER LOW-ANGLE 3D CUE & BALLS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col justify-center px-4 sm:px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <div className="hero-kinetic inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.12] text-[11px] font-mono text-emerald-bright mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>240 Hz 3D Physics Studio · Snooker · 9-Ball · 8-Ball</span>
            </div>

            <h1 className="hero-kinetic font-display text-5xl sm:text-6xl lg:text-[4.85rem] font-bold tracking-tight leading-[0.98] text-white mb-6">
              Step behind <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-bright via-teal-300 to-sky-400">
                every shot.
              </span>
            </h1>

            <p className="hero-kinetic text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mb-9">
              Scroll to sweep down the felt, watch 240Hz screw-back and cushion rebounds unfold in real time, and take full control inside the interactive 2D/3D table simulator.
            </p>

            <div className="hero-kinetic relative z-30 flex flex-wrap items-center gap-3.5 mb-14">
              <a
                href="/play"
                className="px-7 py-3.5 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-brass-glow active:scale-95 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Simulator</span>
              </a>

              <div ref={learnMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setLearnMenuOpen((v) => !v)}
                  aria-expanded={learnMenuOpen}
                  className={`px-6 py-3.5 rounded-full font-semibold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-2 border ${
                    learnMenuOpen
                      ? 'bg-sky-400 text-[#05080C] border-sky-300 font-bold shadow-lg'
                      : 'bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur-md border-white/[0.16] text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Learn</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${learnMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {learnMenuOpen && (
                  <div className="absolute left-0 top-full mt-3 w-72 sm:w-80 rounded-3xl bg-[#080D14]/96 backdrop-blur-2xl border border-white/[0.16] shadow-2xl p-3 z-50">
                    <div className="px-2 pt-1 pb-2 border-b border-white/[0.08] mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-bright font-bold">
                        Select Expertise Path
                      </span>
                      <a
                        href="/learn"
                        className="text-[10px] font-mono text-sky-400 hover:text-white transition-colors"
                      >
                        All 9 Lectures &rarr;
                      </a>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <a
                        href="/learn?level=beginner"
                        className="group flex items-start justify-between gap-2.5 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-emerald-500/15 border border-transparent hover:border-emerald-400/35 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-white group-hover:text-emerald-bright">
                              Beginner
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-bright">
                              Juniors
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            Ghost-ball aim, straight potting, stun &amp; baulk safety.
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-bright shrink-0 mt-1" />
                      </a>

                      <a
                        href="/learn?level=intermediate"
                        className="group flex items-start justify-between gap-2.5 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-sky-500/15 border border-transparent hover:border-sky-400/35 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-white group-hover:text-sky-300">
                              Intermediate
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
                              Club Play
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            Topspin follow, deep screw-back &amp; cushion rebounds.
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-300 shrink-0 mt-1" />
                      </a>

                      <a
                        href="/learn?level=expert"
                        className="group flex items-start justify-between gap-2.5 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-amber-500/15 border border-transparent hover:border-amber-400/35 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-white group-hover:text-amber-300">
                              Expert
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                              Mastery
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            Side English, squirt offset, 90° cuts &amp; masse escapes.
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 shrink-0 mt-1" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <a
                href="/play?mode=3d"
                className="px-6 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur-md border border-white/[0.16] text-white font-semibold text-xs sm:text-sm tracking-wide transition-colors"
              >
                Open 3D Arena
              </a>
            </div>

            <div className="hero-kinetic inline-flex items-center gap-2 text-xs font-mono text-slate-400">
              <ChevronDown className="w-4 h-4 text-emerald-bright animate-bounce" />
              <span>Scroll down to execute shot &amp; fly around the table</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          ACT 2: DRAWBACK, CORNER POT & SCREW-BACK PHYSICS (RIGHT CARD)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[105vh] flex items-center px-4 sm:px-6 py-20">
        <div className="max-w-7xl mx-auto w-full flex justify-end">
          <div className="scroll-card-reveal max-w-md rounded-3xl bg-[#080C12]/78 backdrop-blur-xl border border-white/[0.12] p-7 shadow-2xl">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-sky-400 font-bold">
              01 · Spin &amp; Trajectory Preview
            </span>
            <h2 className="font-display text-3xl font-bold text-white mt-2 mb-3">
              Predict Every Millimeter Before Impact.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              As the cue strikes low at <span className="text-white font-mono">-0.85Y</span>, linear momentum drives the Red clean into the corner pocket while 2D surface slip pulls the white ball back onto position.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-[10px] text-slate-400">AIM STEP</div>
                <div className="text-base font-bold text-emerald-bright">0.05°</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-[10px] text-slate-400">ROUTE TRACE</div>
                <div className="text-base font-bold text-sky-400">Full Sim</div>
              </div>
            </div>
            <a
              href="/play?scenario=topspin-and-backspin"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-bright hover:text-white transition-colors"
            >
              <span>Load Screw-Back Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          ACT 3: VISIBLE SEGMENTED CUSHIONS & POCKET JAWS (LEFT CARD)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[100vh] flex items-center px-4 sm:px-6 py-20">
        <div className="max-w-7xl mx-auto w-full flex justify-start">
          <div className="scroll-card-reveal max-w-md rounded-3xl bg-[#080C12]/78 backdrop-blur-xl border border-white/[0.12] p-7 shadow-2xl">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-bright font-bold">
              02 · Cushions &amp; Hardware Lab
            </span>
            <h2 className="font-display text-3xl font-bold text-white mt-2 mb-3">
              Sculpted Cushions. Authentic Rebounds.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Six visibly beveled rubber rails with radial pocket knuckle geometry ensure pot-aimed shots funnel smoothly instead of bouncing off flat walls. Tune restitution (<span className="text-white font-mono">e = 0.56–0.93</span>), cloth nap, cue shafts, and tips live.
            </p>
            <a
              href="/play"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.15] text-xs font-semibold text-white transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-bright" />
              <span>Customize Table &amp; Cue</span>
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          ACT 4: THREE TABLES (SNOOKER -> 9-BALL BLUE -> 8-BALL CRIMSON)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[100vh] flex items-center px-4 sm:px-6 py-20">
        <div className="max-w-7xl mx-auto w-full">
          <div className="scroll-card-reveal max-w-2xl mb-10 rounded-3xl bg-[#080C12]/68 backdrop-blur-lg border border-white/[0.1] p-6">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-bright font-bold">
              03 · Three Tables, One Engine
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1.5 mb-2">
              Switch Rulesets &amp; Reshape the Table
            </h2>
            <p className="text-sm text-slate-300">
              Hover a game card to preview its cloth live in the 3D arena behind, or click to launch straight into the rack.
            </p>
          </div>

          <div className="disciplines-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {GAME_DISCIPLINES.map((game) => (
              <a
                key={game.id}
                href={game.href}
                onMouseEnter={() => {
                  clothOverrideRef.current = new THREE.Color(game.clothHexNum);
                }}
                onMouseLeave={() => {
                  clothOverrideRef.current = null;
                }}
                className="discipline-card group rounded-3xl bg-[#080C12]/80 backdrop-blur-xl border border-white/[0.12] hover:border-emerald-bright/70 p-6 transition-all hover:-translate-y-1 flex flex-col justify-between shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: game.clothHex }}
                    />
                    <span className="px-3 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-slate-200">
                      {game.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white group-hover:text-emerald-bright transition-colors mb-2">
                    {game.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {game.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-emerald-bright font-bold">
                  <span>{game.cta}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          ACT 5: INTERACTIVE CURRICULUM LEDGER OVER OVERHEAD FINALE
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-4 sm:px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="scroll-card-reveal rounded-3xl bg-[#080C12]/86 backdrop-blur-2xl border border-white/[0.12] p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-sky-400 font-bold">
                  04 · Guided Learning &amp; Drills
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1.5">
                  From Theory to Table Control
                </h2>
              </div>
              <a
                href="/learn"
                className="text-xs font-mono font-bold text-emerald-bright hover:underline shrink-0"
              >
                Explore All Lectures &rarr;
              </a>
            </div>

            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {CURRICULUM_ROWS.map((row) => (
                <div
                  key={row.title}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="max-w-xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-base font-bold text-white">
                        {row.title}
                      </h3>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-bright/15 text-emerald-bright border border-emerald-bright/25">
                        {row.formula}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{row.summary}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={row.learnHref}
                      className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[11px] font-medium text-slate-200 transition-colors"
                    >
                      Read
                    </a>
                    <a
                      href={row.playHref}
                      className="px-4 py-1.5 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold text-[11px] transition-colors"
                    >
                      Play Drill
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Ready to Rack Up?
                </h3>
                <p className="text-xs text-slate-300">
                  Place or add any ball freely in Practice mode, or play full Snooker, 9-Ball, and 8-Ball.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/play?game=snooker"
                  className="px-6 py-3 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Play Snooker
                </a>
                <a
                  href="/play?game=9ball"
                  className="px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Play 9-Ball
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
