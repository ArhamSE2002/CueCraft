import * as THREE from 'three';
import { SnookerTable } from '../../engine/table/SnookerTable';
import { Ball } from '../../engine/physics/Ball';
import type { TrajectoryPrediction } from '../../engine/physics/PhysicsEngine';
import type { CameraViewMode, CameraFollowMode, InteractionMode } from '../../stores/gameStore';
import type { ClothSpec, CueSpec, CueTipSpec } from '../../engine/equipment/Equipment';

export type { CameraViewMode };

export class ThreeTableRenderer {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Meshes & dynamic materials
  private ballMeshes: Map<string, THREE.Mesh> = new Map();
  private bedMaterial!: THREE.MeshStandardMaterial;
  private cueShaftMaterial!: THREE.MeshStandardMaterial;
  private cueButtMaterial!: THREE.MeshStandardMaterial;
  private cueTipMaterial!: THREE.MeshBasicMaterial;
  private cueStickGroup: THREE.Group;
  private trajectoryGroup: THREE.Group;
  private ghostBallMesh: THREE.Mesh;
  private selectRingMesh: THREE.Mesh;
  private lampsGroup: THREE.Group;

  // Raycaster for table-plane aiming & ball movement in 3D
  private raycaster = new THREE.Raycaster();
  private tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SnookerTable.BALL_RADIUS * 0.001);

  public viewMode: CameraViewMode = 'tactical';
  public followMode: CameraFollowMode = 'stiff';
  public interactionMode: InteractionMode = 'aim';
  public zoom: number = 1.0;
  public tacticalElevation: 'low' | 'med' | 'high' = 'med';
  public showTrajectories: boolean = true;
  public showGhostBall: boolean = true;
  public selectedMoveBallId: string | null = null;

  // Callbacks to GameShell / Store
  public onAimAdjust?: (deltaRad: number) => void;
  public onTableAim?: (tablePosMm: { x: number; y: number }) => void;
  public onMoveBallStart?: (tablePosMm: { x: number; y: number }) => string | null;
  public onMoveBallDrag?: (ballId: string, tablePosMm: { x: number; y: number }) => void;
  public onMoveBallEnd?: () => void;

  // Camera lerp & locked state
  private targetCameraPos = new THREE.Vector3(-1.8, 0.85, 0);
  private targetLookAt = new THREE.Vector3(0, 0.026, 0);
  private currentLookAt = new THREE.Vector3(0, 0.026, 0);
  private wasSimulating: boolean = false;
  private lockedCameraPos = new THREE.Vector3();
  private lockedLookAt = new THREE.Vector3();

  // Pointer & Orbit state
  private isPointerDown: boolean = false;
  private draggingBallId: string | null = null;
  private previousMousePosition = { x: 0, y: 0 };
  private dragStartPos = { x: 0, y: 0 };
  private orbitAngles = { theta: -0.85, phi: Math.PI / 3.4 };
  private orbitDistance: number = 3.2;

  constructor(container: HTMLDivElement) {
    this.container = container;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 650;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a0e);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.05, 50);
    this.camera.position.set(-1.8, 0.85, 0);
    this.camera.lookAt(0, 0.026, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Overhead Snooker Canopy Lamps
    this.lampsGroup = this.createOverheadLamps();
    this.scene.add(this.lampsGroup);

    // 6. Table Geometry & Materials
    this.setupTableMesh();

    // 7. Trajectories & Ghost Ball & Move Selection Ring
    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    const ghostGeo = new THREE.RingGeometry(0.025, 0.0285, 36);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.ghostBallMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostBallMesh.rotation.x = -Math.PI / 2;
    this.ghostBallMesh.position.y = 0.002;
    this.ghostBallMesh.visible = false;
    this.scene.add(this.ghostBallMesh);

    const selGeo = new THREE.RingGeometry(0.032, 0.038, 36);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.selectRingMesh = new THREE.Mesh(selGeo, selMat);
    this.selectRingMesh.rotation.x = -Math.PI / 2;
    this.selectRingMesh.position.y = 0.0025;
    this.selectRingMesh.visible = false;
    this.scene.add(this.selectRingMesh);

    // 8. 3D Cue Stick
    this.cueStickGroup = this.createCueStick();
    this.scene.add(this.cueStickGroup);

    // 9. Event bindings
    this.bindEvents();
  }

  public setClothSpec(cloth: ClothSpec): void {
    if (this.bedMaterial) {
      this.bedMaterial.color.setHex(cloth.feltHex3D);
    }
  }

  public setCueAndTipSpec(cue: CueSpec, tip: CueTipSpec): void {
    if (this.cueShaftMaterial) this.cueShaftMaterial.color.set(cue.shaftColor);
    if (this.cueButtMaterial) this.cueButtMaterial.color.set(cue.buttColor);
    if (this.cueTipMaterial) this.cueTipMaterial.color.set(tip.colorHex);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x2d3a4f, 1.2);
    this.scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x111827, 0.85);
    this.scene.add(hemiLight);

    const lampXCoords = [-0.95, 0, 0.95];
    lampXCoords.forEach((xPos) => {
      const spot = new THREE.SpotLight(0xfffaea, 3.2);
      spot.position.set(xPos, 1.45, 0);
      spot.target.position.set(xPos, 0, 0);
      this.scene.add(spot.target);

      spot.angle = Math.PI / 2.8;
      spot.penumbra = 0.55;
      spot.decay = 1.1;
      spot.distance = 5;
      spot.castShadow = true;
      spot.shadow.mapSize.width = 1024;
      spot.shadow.mapSize.height = 1024;
      spot.shadow.camera.near = 0.2;
      spot.shadow.camera.far = 3.5;
      spot.shadow.bias = -0.0006;
      this.scene.add(spot);
    });

    const fillNorth = new THREE.DirectionalLight(0xc5a059, 0.4);
    fillNorth.position.set(0, 1.2, -2.5);
    this.scene.add(fillNorth);

    const fillSouth = new THREE.DirectionalLight(0xc5a059, 0.4);
    fillSouth.position.set(0, 1.2, 2.5);
    this.scene.add(fillSouth);
  }

  private createOverheadLamps(): THREE.Group {
    const group = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x09301e,
      roughness: 0.35,
      metalness: 0.15,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });

    const barGeo = new THREE.CylinderGeometry(0.01, 0.01, 2.4, 16);
    barGeo.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeo, brassMat);
    bar.position.set(0, 1.6, 0);
    group.add(bar);

    [-0.8, 0.8].forEach((rx) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 12), brassMat);
      rod.position.set(rx, 1.9, 0);
      group.add(rod);
    });

    const lampXCoords = [-0.95, 0, 0.95];
    lampXCoords.forEach((xPos) => {
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 24, 1, true), shadeMat);
      shade.position.set(xPos, 1.48, 0);
      group.add(shade);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 16), brassMat);
      cap.position.set(xPos, 1.58, 0);
      group.add(cap);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), bulbMat);
      bulb.position.set(xPos, 1.44, 0);
      group.add(bulb);
    });

    return group;
  }

  private setupTableMesh(): void {
    const L = SnookerTable.LENGTH * 0.001;
    const W = SnookerTable.WIDTH * 0.001;
    const railThick = 0.08;
    const railHeight = 0.042;

    const floorGeo = new THREE.PlaneGeometry(14, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.78;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.setupRoomEnvironment();

    const bedGeo = new THREE.BoxGeometry(L, 0.05, W);
    this.bedMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e5d36,
      roughness: 0.84,
      metalness: 0.02,
    });
    const bed = new THREE.Mesh(bedGeo, this.bedMaterial);
    bed.position.y = -0.025;
    bed.receiveShadow = true;
    this.scene.add(bed);

    this.setupClothMarkings(L, W);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x421e0e,
      roughness: 0.28,
      metalness: 0.14,
    });

    const endRailGeo = new THREE.BoxGeometry(railThick, railHeight, W + railThick * 2);
    const baulkRail = new THREE.Mesh(endRailGeo, woodMat);
    baulkRail.position.set(-L / 2 - railThick / 2, railHeight / 2 - 0.004, 0);
    baulkRail.castShadow = true;
    baulkRail.receiveShadow = true;
    this.scene.add(baulkRail);

    const topRail = new THREE.Mesh(endRailGeo, woodMat);
    topRail.position.set(L / 2 + railThick / 2, railHeight / 2 - 0.004, 0);
    topRail.castShadow = true;
    topRail.receiveShadow = true;
    this.scene.add(topRail);

    const sideRailGeo = new THREE.BoxGeometry(L, railHeight, railThick);
    const leftRail = new THREE.Mesh(sideRailGeo, woodMat);
    leftRail.position.set(0, railHeight / 2 - 0.004, -W / 2 - railThick / 2);
    leftRail.castShadow = true;
    leftRail.receiveShadow = true;
    this.scene.add(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, woodMat);
    rightRail.position.set(0, railHeight / 2 - 0.004, W / 2 + railThick / 2);
    rightRail.castShadow = true;
    rightRail.receiveShadow = true;
    this.scene.add(rightRail);

    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x072b18, roughness: 0.75 });
    const cNorth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.026, 0.016), cushionMat);
    cNorth.position.set(0, 0.009, -W / 2 + 0.008);
    this.scene.add(cNorth);

    const cSouth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.026, 0.016), cushionMat);
    cSouth.position.set(0, 0.009, W / 2 - 0.008);
    this.scene.add(cSouth);

    const skirtHeight = 0.16;
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x241108, roughness: 0.4 });
    const skirtN = new THREE.Mesh(new THREE.BoxGeometry(L + railThick * 2, skirtHeight, 0.02), skirtMat);
    skirtN.position.set(0, -0.05 - skirtHeight / 2, -W / 2 - railThick);
    this.scene.add(skirtN);

    const skirtS = new THREE.Mesh(new THREE.BoxGeometry(L + railThick * 2, skirtHeight, 0.02), skirtMat);
    skirtS.position.set(0, -0.05 - skirtHeight / 2, W / 2 + railThick);
    this.scene.add(skirtS);

    this.setupTableLegs(L, W);
    this.setupPockets(L, W);
  }

  private setupRoomEnvironment(): void {
    const roomWidth = 14;
    const roomHeight = 4.5;
    const roomDepth = 14;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f16,
      roughness: 0.92,
      metalness: 0.05,
    });
    const wainscotMat = new THREE.MeshStandardMaterial({
      color: 0x221208,
      roughness: 0.55,
      metalness: 0.12,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    backWall.position.set(roomDepth / 2, roomHeight / 2 - 0.78, 0);
    backWall.rotation.y = -Math.PI / 2;
    this.scene.add(backWall);

    const backWainscot = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, 1.2), wainscotMat);
    backWainscot.position.set(roomDepth / 2 - 0.01, 1.2 / 2 - 0.78, 0);
    backWainscot.rotation.y = -Math.PI / 2;
    this.scene.add(backWainscot);

    const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    southWall.position.set(-roomDepth / 2, roomHeight / 2 - 0.78, 0);
    southWall.rotation.y = Math.PI / 2;
    this.scene.add(southWall);

    const sideWallE = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    sideWallE.position.set(0, roomHeight / 2 - 0.78, -roomWidth / 2);
    this.scene.add(sideWallE);

    const sideWallW = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    sideWallW.position.set(0, roomHeight / 2 - 0.78, roomWidth / 2);
    sideWallW.rotation.y = Math.PI;
    this.scene.add(sideWallW);

    [-2.2, 2.2].forEach((zPos) => {
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.16, 16), brassMat);
      sconce.position.set(roomDepth / 2 - 0.08, 0.85, zPos);
      sconce.rotation.z = Math.PI / 2;
      this.scene.add(sconce);

      const sconceLight = new THREE.PointLight(0xffecd2, 0.75, 5, 2);
      sconceLight.position.set(roomDepth / 2 - 0.25, 0.95, zPos);
      this.scene.add(sconceLight);
    });
  }

  private setupClothMarkings(L: number, W: number): void {
    const baulkX = -1.0475;
    const markingMat = new THREE.LineBasicMaterial({
      color: 0xf5f2eb,
      opacity: 0.55,
      transparent: true,
    });

    const baulkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baulkX, 0.001, -W / 2 + 0.01),
      new THREE.Vector3(baulkX, 0.001, W / 2 - 0.01),
    ]);
    this.scene.add(new THREE.Line(baulkGeo, markingMat));

    const dRadius = SnookerTable.D_RADIUS * 0.001;
    const dPoints: THREE.Vector3[] = [];
    const segments = 36;
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / segments;
      dPoints.push(new THREE.Vector3(baulkX - Math.cos(angle) * dRadius, 0.001, Math.sin(angle) * dRadius));
    }
    const dGeo = new THREE.BufferGeometry().setFromPoints(dPoints);
    this.scene.add(new THREE.Line(dGeo, markingMat));

    const spotMat = new THREE.MeshBasicMaterial({ color: 0xf5f2eb, opacity: 0.65, transparent: true });
    const spotPositions = [
      new THREE.Vector3(1.4605, 0.001, 0),
      new THREE.Vector3(0.8923, 0.001, 0),
      new THREE.Vector3(0, 0.001, 0),
      new THREE.Vector3(baulkX, 0.001, 0),
      new THREE.Vector3(baulkX, 0.001, -dRadius),
      new THREE.Vector3(baulkX, 0.001, dRadius),
    ];

    spotPositions.forEach((pos) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.007, 16), spotMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(pos);
      this.scene.add(disc);
    });
  }

  private setupTableLegs(L: number, W: number): void {
    const legGeo = new THREE.CylinderGeometry(0.062, 0.046, 0.72, 16);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x2a1308,
      roughness: 0.35,
      metalness: 0.1,
    });
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      roughness: 0.2,
      metalness: 0.88,
    });

    const legPositions = [
      [-L / 2 + 0.14, -W / 2 + 0.1],
      [-L / 2 + 0.14, W / 2 - 0.1],
      [L / 2 - 0.14, -W / 2 + 0.1],
      [L / 2 - 0.14, W / 2 - 0.1],
      [-L / 6, -W / 2 + 0.1],
      [-L / 6, W / 2 - 0.1],
      [L / 6, -W / 2 + 0.1],
      [L / 6, W / 2 - 0.1],
    ];

    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, -0.42, lz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16), footMat);
      foot.position.set(lx, -0.762, lz);
      this.scene.add(foot);
    });
  }

  private setupPockets(L: number, W: number): void {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });
    const leatherMat = new THREE.MeshBasicMaterial({ color: 0x05070a });

    const pocketCoords = [
      [-L / 2, -W / 2],
      [-L / 2, W / 2],
      [0, -W / 2],
      [0, W / 2],
      [L / 2, -W / 2],
      [L / 2, W / 2],
    ];

    pocketCoords.forEach(([px, pz]) => {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.065, 20), leatherMat);
      hole.position.set(px, 0.003, pz);
      this.scene.add(hole);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.038, 0.075), brassMat);
      cap.position.set(px * 1.012, 0.02, pz * 1.012);
      cap.castShadow = true;
      this.scene.add(cap);
    });
  }

  private createCueStick(): THREE.Group {
    const group = new THREE.Group();

    this.cueShaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6b37c,
      roughness: 0.4,
    });
    this.cueButtMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f140d,
      roughness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.cueTipMaterial = new THREE.MeshBasicMaterial({ color: 0x2563eb });

    const shaftGeo = new THREE.CylinderGeometry(0.0048, 0.011, 0.95, 20);
    shaftGeo.rotateX(-Math.PI / 2);
    const shaft = new THREE.Mesh(shaftGeo, this.cueShaftMaterial);
    shaft.position.z = -0.475;
    shaft.castShadow = true;
    group.add(shaft);

    const buttGeo = new THREE.CylinderGeometry(0.011, 0.015, 0.48, 20);
    buttGeo.rotateX(-Math.PI / 2);
    const butt = new THREE.Mesh(buttGeo, this.cueButtMaterial);
    butt.position.z = -1.19;
    butt.castShadow = true;
    group.add(butt);

    const jointGeo = new THREE.CylinderGeometry(0.0112, 0.0112, 0.015, 20);
    jointGeo.rotateX(-Math.PI / 2);
    const joint = new THREE.Mesh(jointGeo, brassMat);
    joint.position.z = -0.95;
    group.add(joint);

    const ferruleGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.012, 16);
    ferruleGeo.rotateX(-Math.PI / 2);
    const ferrule = new THREE.Mesh(ferruleGeo, brassMat);
    ferrule.position.z = -0.006;
    group.add(ferrule);

    const tipGeo = new THREE.CylinderGeometry(0.0048, 0.0048, 0.005, 16);
    tipGeo.rotateX(-Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, this.cueTipMaterial);
    tip.position.z = 0.0025;
    group.add(tip);

    return group;
  }

  private toThreeCoords(posMm: { x: number; y: number }): THREE.Vector3 {
    const x = (posMm.x - SnookerTable.LENGTH / 2) * 0.001;
    const z = (posMm.y - SnookerTable.WIDTH / 2) * 0.001;
    const y = SnookerTable.BALL_RADIUS * 0.001;
    return new THREE.Vector3(x, y, z);
  }

  private toTableMm(vec3: THREE.Vector3): { x: number; y: number } {
    return {
      x: vec3.x * 1000 + SnookerTable.LENGTH / 2,
      y: vec3.z * 1000 + SnookerTable.WIDTH / 2,
    };
  }

  private raycastTableMm(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const intersectPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.tablePlane, intersectPoint)) {
      return this.toTableMm(intersectPoint);
    }
    return null;
  }

  public render(
    balls: Ball[],
    prediction?: TrajectoryPrediction | null,
    aimAngleRad?: number,
    cuePower: number = 35,
    isAiming: boolean = true,
    cueElevationDeg: number = 0
  ): void {
    // Auto-match container size when visible
    if (
      this.container.clientWidth > 0 &&
      this.container.clientHeight > 0 &&
      (this.container.clientWidth !== this.renderer.domElement.clientWidth ||
        this.container.clientHeight !== this.renderer.domElement.clientHeight)
    ) {
      this.resize();
    }

    const R = SnookerTable.BALL_RADIUS * 0.001;

    // 1. Synchronize Ball Meshes
    balls.forEach((ball) => {
      let mesh = this.ballMeshes.get(ball.id);
      if (!mesh) {
        const geo = new THREE.SphereGeometry(R, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(ball.colorInfo.hex),
          roughness: 0.05,
          metalness: 0.06,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.ballMeshes.set(ball.id, mesh);
      }

      if (ball.potted) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        const pos3D = this.toThreeCoords(ball.position);
        mesh.position.copy(pos3D);

        mesh.rotation.x = ball.rotation.x;
        mesh.rotation.y = ball.rotation.y;
        mesh.rotation.z = ball.rotation.z;
      }
    });

    // Selection highlight ring in Move Balls mode
    const selBall = this.selectedMoveBallId
      ? balls.find((b) => b.id === this.selectedMoveBallId && !b.potted)
      : null;
    if (selBall) {
      const sPos = this.toThreeCoords(selBall.position);
      this.selectRingMesh.position.set(sPos.x, 0.0025, sPos.z);
      this.selectRingMesh.visible = true;
    } else {
      this.selectRingMesh.visible = false;
    }

    // 2. Trajectories in 3D
    this.update3DTrajectories(prediction, isAiming);

    // 3. Cue Stick alignment + visual elevation angle in 3D
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined && this.interactionMode === 'aim') {
      const cuePos = this.toThreeCoords(cueBall.position);
      const dirX = Math.cos(aimAngleRad);
      const dirZ = Math.sin(aimAngleRad);
      const pullback = 0.035 + (cuePower / 100) * 0.14;

      const tipPos = new THREE.Vector3(
        cuePos.x - dirX * pullback,
        cuePos.y + 0.005,
        cuePos.z - dirZ * pullback
      );
      const elevRad = (Math.max(2, cueElevationDeg) * Math.PI) / 180;
      const forwardTarget = new THREE.Vector3(
        cuePos.x + dirX * 2,
        cuePos.y + 0.005 - Math.sin(elevRad) * 2, // Tip points slightly down toward cloth as butt rises!
        cuePos.z + dirZ * 2
      );

      this.cueStickGroup.position.copy(tipPos);
      this.cueStickGroup.lookAt(forwardTarget);
      this.cueStickGroup.visible = true;
    } else {
      this.cueStickGroup.visible = false;
    }

    // 4. Camera View Update (supports locked/stiff vs follow mode during simulation)
    const isSimulatingNow = !isAiming;
    if (isSimulatingNow && !this.wasSimulating && this.followMode === 'stiff') {
      // Snapshot camera right when shot strikes so it stays completely stiff!
      this.lockedCameraPos.copy(this.camera.position);
      this.lockedLookAt.copy(this.currentLookAt);
    }
    this.wasSimulating = isSimulatingNow;

    this.updateCameraPosition(cueBall, aimAngleRad, prediction, isSimulatingNow);

    this.renderer.render(this.scene, this.camera);
  }

  private update3DTrajectories(prediction?: TrajectoryPrediction | null, isAiming: boolean = true): void {
    while (this.trajectoryGroup.children.length > 0) {
      const child = this.trajectoryGroup.children[0];
      this.trajectoryGroup.remove(child);
      if (child instanceof THREE.Line) child.geometry.dispose();
    }

    if (!this.showTrajectories || !prediction || !isAiming) {
      this.ghostBallMesh.visible = false;
      return;
    }

    // Cue Path (initial + swerve + cushion rebounds)
    prediction.cuePath.forEach((seg, idx) => {
      const p1 = this.toThreeCoords(seg.start);
      const p2 = this.toThreeCoords(seg.end);
      p1.y = 0.0025;
      p2.y = 0.0025;

      const isSwerve = seg.type === 'swerve';
      const isReflection = seg.type === 'cushion-reflection';
      const bounce = seg.bounce ?? idx;
      const mat = new THREE.LineBasicMaterial({
        color: isSwerve ? 0x2dd4bf : isReflection ? 0xc5a059 : 0xf7f5ee,
        opacity: Math.max(0.25, Math.pow(0.7, bounce)),
        transparent: true,
      });
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      this.trajectoryGroup.add(new THREE.Line(geo, mat));
    });

    // Cue Ball Deflection Path (Cyan, including post-impact cushion rebounds)
    prediction.cueDeflectionPath.forEach((seg, idx) => {
      const p1 = this.toThreeCoords(seg.start);
      const p2 = this.toThreeCoords(seg.end);
      p1.y = 0.0025;
      p2.y = 0.0025;

      const bounce = seg.bounce ?? idx;
      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        opacity: Math.max(0.3, Math.pow(0.72, bounce)),
        transparent: true,
      });
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      this.trajectoryGroup.add(new THREE.Line(geo, mat));
    });

    // ALL Object Ball Paths (multi-cushion rebounds & secondary hits)
    const objPaths = prediction.objectBallPaths ?? [];
    if (objPaths.length > 0) {
      objPaths.forEach((obj, objIdx) => {
        const hex = objIdx === 0 ? 0xef4444 : 0xf59e0b;
        obj.segments.forEach((seg) => {
          const p1 = this.toThreeCoords(seg.start);
          const p2 = this.toThreeCoords(seg.end);
          p1.y = 0.0025;
          p2.y = 0.0025;

          const bounce = seg.bounce ?? 0;
          const mat = new THREE.LineBasicMaterial({
            color: hex,
            opacity: Math.max(0.3, Math.pow(0.72, bounce)),
            transparent: true,
          });
          const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          this.trajectoryGroup.add(new THREE.Line(geo, mat));
        });
      });
    } else {
      prediction.targetPath.forEach((seg) => {
        const p1 = this.toThreeCoords(seg.start);
        const p2 = this.toThreeCoords(seg.end);
        p1.y = 0.0025;
        p2.y = 0.0025;
        const mat = new THREE.LineBasicMaterial({ color: 0xef4444 });
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.trajectoryGroup.add(new THREE.Line(geo, mat));
      });
    }

    // Ghost Ball ring
    if (this.showGhostBall && prediction.ghostBall) {
      const gPos = this.toThreeCoords(prediction.ghostBall);
      this.ghostBallMesh.position.set(gPos.x, 0.0025, gPos.z);
      this.ghostBallMesh.visible = true;
    } else {
      this.ghostBallMesh.visible = false;
    }
  }

  private updateCameraPosition(
    cueBall?: Ball,
    aimAngleRad?: number,
    prediction?: TrajectoryPrediction | null,
    isSimulatingNow: boolean = false
  ): void {
    // Only show ceiling lamp fixture in free Orbit view so it never blocks overhead/aim views
    this.lampsGroup.visible = this.viewMode === 'orbit';

    // If simulation is running AND followMode === 'stiff' (except manual Orbit dragging), hold camera stationary!
    if (isSimulatingNow && this.followMode === 'stiff' && this.viewMode !== 'orbit') {
      this.targetCameraPos.copy(this.lockedCameraPos);
      this.targetLookAt.copy(this.lockedLookAt);
      this.camera.position.lerp(this.targetCameraPos, 0.25);
      this.currentLookAt.lerp(this.targetLookAt, 0.25);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    if (this.viewMode === 'tactical' && cueBall && aimAngleRad !== undefined) {
      const cuePos = this.toThreeCoords(cueBall.position);
      const dirX = Math.cos(aimAngleRad);
      const dirZ = Math.sin(aimAngleRad);

      let distMult = 1.0;
      let heightMult = 1.0;
      if (this.tacticalElevation === 'low') {
        distMult = 0.72;
        heightMult = 0.65;
      } else if (this.tacticalElevation === 'high') {
        distMult = 1.65;
        heightMult = 2.6;
      }

      const camDist = (0.78 * distMult) / this.zoom;
      const camHeight = (0.24 * heightMult) / this.zoom;

      this.targetCameraPos.set(cuePos.x - dirX * camDist, camHeight, cuePos.z - dirZ * camDist);
      this.targetLookAt.set(cuePos.x + dirX * 1.8, 0.026, cuePos.z + dirZ * 1.8);
      this.camera.up.set(0, 1, 0);
    } else if (this.viewMode === 'target' && cueBall && aimAngleRad !== undefined) {
      // Look BACK along the cut angle from behind the target ball / ghost ball
      const focusPos = prediction?.targetBall
        ? this.toThreeCoords(prediction.targetBall.position)
        : this.toThreeCoords(cueBall.position).add(
            new THREE.Vector3(Math.cos(aimAngleRad) * 1.4, 0, Math.sin(aimAngleRad) * 1.4)
          );
      const cuePos = this.toThreeCoords(cueBall.position);
      const dirX = Math.cos(aimAngleRad);
      const dirZ = Math.sin(aimAngleRad);

      const camDist = 0.85 / this.zoom;
      this.targetCameraPos.set(
        focusPos.x + dirX * camDist,
        0.34 / this.zoom,
        focusPos.z + dirZ * camDist
      );
      this.targetLookAt.set(cuePos.x, 0.026, cuePos.z);
      this.camera.up.set(0, 1, 0);
    } else if (this.viewMode === 'side' && cueBall && aimAngleRad !== undefined) {
      // Side profile view perpendicular to shot line — great for viewing cue elevation & curves
      const cuePos = this.toThreeCoords(cueBall.position);
      const perpX = -Math.sin(aimAngleRad);
      const perpZ = Math.cos(aimAngleRad);
      const sideDist = 1.25 / this.zoom;

      this.targetCameraPos.set(
        cuePos.x + perpX * sideDist + Math.cos(aimAngleRad) * 0.35,
        0.38 / this.zoom,
        cuePos.z + perpZ * sideDist + Math.sin(aimAngleRad) * 0.35
      );
      this.targetLookAt.set(
        cuePos.x + Math.cos(aimAngleRad) * 0.45,
        0.05,
        cuePos.z + Math.sin(aimAngleRad) * 0.45
      );
      this.camera.up.set(0, 1, 0);
    } else if (this.viewMode === 'overhead') {
      const dist = 3.4 / this.zoom;
      this.targetCameraPos.set(0, dist, 0.001);
      this.targetLookAt.set(0, 0, 0);
      this.camera.up.set(0, 0, -1);
    } else {
      // 360 Orbit View (can follow cueBall if followMode === 'follow' during simulation!)
      const dist = this.orbitDistance / this.zoom;
      const focusCenter =
        isSimulatingNow && this.followMode === 'follow' && cueBall
          ? this.toThreeCoords(cueBall.position)
          : new THREE.Vector3(0, 0.026, 0);

      const x = focusCenter.x + dist * Math.sin(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
      const y = dist * Math.cos(this.orbitAngles.phi);
      const z = focusCenter.z + dist * Math.sin(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);

      this.targetCameraPos.set(x, Math.max(0.35, y), z);
      this.targetLookAt.copy(focusCenter);
      this.camera.up.set(0, 1, 0);
    }

    this.camera.position.lerp(this.targetCameraPos, 0.18);
    this.currentLookAt.lerp(this.targetLookAt, 0.18);
    this.camera.lookAt(this.currentLookAt);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isPointerDown = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.dragStartPos = { x: e.clientX, y: e.clientY };

      const hitMm = this.raycastTableMm(e.clientX, e.clientY);
      if (hitMm && this.interactionMode === 'move' && this.onMoveBallStart) {
        this.draggingBallId = this.onMoveBallStart(hitMm);
      } else if (
        hitMm &&
        this.interactionMode === 'aim' &&
        (this.viewMode === 'overhead' || this.viewMode === 'target' || this.viewMode === 'side') &&
        this.onTableAim
      ) {
        this.onTableAim(hitMm);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerDown) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.interactionMode === 'move' && this.draggingBallId && this.onMoveBallDrag) {
        const hitMm = this.raycastTableMm(e.clientX, e.clientY);
        if (hitMm) this.onMoveBallDrag(this.draggingBallId, hitMm);
      } else if (this.interactionMode === 'aim') {
        if (this.viewMode === 'orbit') {
          this.orbitAngles.theta -= deltaX * 0.007;
          this.orbitAngles.phi = Math.max(
            0.14,
            Math.min(Math.PI / 2.05, this.orbitAngles.phi + deltaY * 0.007)
          );
        } else if (this.viewMode === 'tactical' && this.onAimAdjust) {
          this.onAimAdjust(-deltaX * 0.0035);
        } else if (
          (this.viewMode === 'overhead' || this.viewMode === 'target' || this.viewMode === 'side') &&
          this.onTableAim
        ) {
          const hitMm = this.raycastTableMm(e.clientX, e.clientY);
          if (hitMm) this.onTableAim(hitMm);
        }
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.draggingBallId && this.onMoveBallEnd) {
        this.onMoveBallEnd();
      }
      this.draggingBallId = null;

      // In Orbit view, a clean click without dragging aims directly toward the clicked point!
      const moveDist = Math.hypot(e.clientX - this.dragStartPos.x, e.clientY - this.dragStartPos.y);
      if (
        this.interactionMode === 'aim' &&
        this.viewMode === 'orbit' &&
        moveDist < 5 &&
        e.target === dom &&
        this.onTableAim
      ) {
        const hitMm = this.raycastTableMm(e.clientX, e.clientY);
        if (hitMm) this.onTableAim(hitMm);
      }
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.0015;
        this.zoom = Math.max(0.55, Math.min(2.8, this.zoom + delta));
      },
      { passive: false }
    );
  }

  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  public dispose(): void {
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
