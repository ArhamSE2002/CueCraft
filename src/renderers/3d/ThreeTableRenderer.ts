import * as THREE from 'three';
import { SnookerTable } from '../../engine/table/SnookerTable';
import { Ball } from '../../engine/physics/Ball';
import type { TrajectoryPrediction } from '../../engine/physics/PhysicsEngine';

export type CameraViewMode = 'tactical' | 'overhead' | 'orbit';

export class ThreeTableRenderer {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Meshes
  private ballMeshes: Map<string, THREE.Mesh> = new Map();
  private cueStickGroup: THREE.Group;
  private trajectoryGroup: THREE.Group;
  private ghostBallMesh: THREE.Mesh;
  private lampsGroup: THREE.Group;

  public viewMode: CameraViewMode = 'tactical';
  public zoom: number = 1.0;
  public onAimAdjust?: (deltaRad: number) => void;

  // Camera lerp targets
  private targetCameraPos = new THREE.Vector3(0, 1.2, 1.8);
  private targetLookAt = new THREE.Vector3(0, 0.026, 0);
  private currentLookAt = new THREE.Vector3(0, 0.026, 0);

  // Orbit parameters
  private isPointerDown: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
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
    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Overhead Snooker Canopy Lamps
    this.lampsGroup = this.createOverheadLamps();
    this.scene.add(this.lampsGroup);

    // 6. Table Geometry & Materials
    this.setupTableMesh();

    // 7. Trajectories & Ghost Ball
    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    const ghostGeo = new THREE.RingGeometry(0.025, 0.028, 36);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.ghostBallMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostBallMesh.rotation.x = -Math.PI / 2;
    this.ghostBallMesh.position.y = 0.001;
    this.ghostBallMesh.visible = false;
    this.scene.add(this.ghostBallMesh);

    // 8. 3D Cue Stick
    this.cueStickGroup = this.createCueStick();
    this.scene.add(this.cueStickGroup);

    // 9. Event bindings
    this.bindEvents();
  }

  private setupLighting(): void {
    // Balanced ambient light
    const ambient = new THREE.AmbientLight(0x2d3a4f, 1.2);
    this.scene.add(ambient);

    // Warm hemisphere light (sky fill vs dark floor bounce)
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x111827, 0.85);
    this.scene.add(hemiLight);

    // 3 Primary Overhead Canopy Downlights with soft shadows
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

    // Subtle side fill lights to highlight wood rails and brass plates
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
      color: 0x09301e, // Traditional British racing green shade exterior
      roughness: 0.35,
      metalness: 0.15,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });

    // Long brass horizontal mounting bar above table
    const barGeo = new THREE.CylinderGeometry(0.01, 0.01, 2.4, 16);
    barGeo.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeo, brassMat);
    bar.position.set(0, 1.6, 0);
    group.add(bar);

    // 2 ceiling hanging rods
    [-0.8, 0.8].forEach((rx) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 12), brassMat);
      rod.position.set(rx, 1.9, 0);
      group.add(rod);
    });

    // 3 Classic Snooker Conical Lamp Shades
    const lampXCoords = [-0.95, 0, 0.95];
    lampXCoords.forEach((xPos) => {
      // Shade cone
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 24, 1, true), shadeMat);
      shade.position.set(xPos, 1.48, 0);
      group.add(shade);

      // Brass top cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 16), brassMat);
      cap.position.set(xPos, 1.58, 0);
      group.add(cap);

      // Glowing bulb sphere
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), bulbMat);
      bulb.position.set(xPos, 1.44, 0);
      group.add(bulb);
    });

    return group;
  }

  private setupTableMesh(): void {
    const L = SnookerTable.LENGTH * 0.001; // 3.569 m
    const W = SnookerTable.WIDTH * 0.001;  // 1.778 m
    const railThick = 0.08;
    const railHeight = 0.042;

    // 1. Polished Hardwood Parquet Floor
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

    // 1b. Championship Club Room Background Walls
    this.setupRoomEnvironment();

    // 2. Strachan No. 10 Championship Green Baize
    const bedGeo = new THREE.BoxGeometry(L, 0.05, W);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x0e5d36,
      roughness: 0.84,
      metalness: 0.02,
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.025;
    bed.receiveShadow = true;
    this.scene.add(bed);

    // 3. Cloth Markings: Baulk Line & The "D"
    this.setupClothMarkings(L, W);

    // 4. Polished Mahogany Rails
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x421e0e,
      roughness: 0.28,
      metalness: 0.14,
    });

    // Baulk and Top end rails
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

    // Side rails
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

    // Inner cushion nose rubbers (dark green felt over rubber)
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x072b18, roughness: 0.75 });
    const cNorth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.026, 0.016), cushionMat);
    cNorth.position.set(0, 0.009, -W / 2 + 0.008);
    this.scene.add(cNorth);

    const cSouth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.026, 0.016), cushionMat);
    cSouth.position.set(0, 0.009, W / 2 - 0.008);
    this.scene.add(cSouth);

    // Mahogany Apron Skirts (Vertical side panels below rails)
    const skirtHeight = 0.16;
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x241108, roughness: 0.4 });
    const skirtN = new THREE.Mesh(new THREE.BoxGeometry(L + railThick * 2, skirtHeight, 0.02), skirtMat);
    skirtN.position.set(0, -0.05 - skirtHeight / 2, -W / 2 - railThick);
    this.scene.add(skirtN);

    const skirtS = new THREE.Mesh(new THREE.BoxGeometry(L + railThick * 2, skirtHeight, 0.02), skirtMat);
    skirtS.position.set(0, -0.05 - skirtHeight / 2, W / 2 + railThick);
    this.scene.add(skirtS);

    // 5. Eight Championship Turned Mahogany Legs
    this.setupTableLegs(L, W);

    // 6. Brass Corner Pocket Plates & Drop Holes
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
      color: 0x221208, // Dark British club mahogany wainscoting
      roughness: 0.55,
      metalness: 0.12,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });

    // North wall (beyond top cushion, at +X)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    backWall.position.set(roomDepth / 2, roomHeight / 2 - 0.78, 0);
    backWall.rotation.y = -Math.PI / 2;
    this.scene.add(backWall);

    // Wainscoting panel on back wall
    const backWainscot = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, 1.2), wainscotMat);
    backWainscot.position.set(roomDepth / 2 - 0.01, 1.2 / 2 - 0.78, 0);
    backWainscot.rotation.y = -Math.PI / 2;
    this.scene.add(backWainscot);

    // South wall (behind player, at -X)
    const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    southWall.position.set(-roomDepth / 2, roomHeight / 2 - 0.78, 0);
    southWall.rotation.y = Math.PI / 2;
    this.scene.add(southWall);

    // Side walls
    const sideWallE = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    sideWallE.position.set(0, roomHeight / 2 - 0.78, -roomWidth / 2);
    this.scene.add(sideWallE);

    const sideWallW = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    sideWallW.position.set(0, roomHeight / 2 - 0.78, roomWidth / 2);
    sideWallW.rotation.y = Math.PI;
    this.scene.add(sideWallW);

    // 2 Warm Brass Wall Sconces on back wall to create luxury arena depth
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
    const baulkX = -1.0475; // 737mm from baulk end in table coordinates
    const markingMat = new THREE.LineBasicMaterial({
      color: 0xf5f2eb,
      opacity: 0.55,
      transparent: true,
      linewidth: 1.5,
    });

    // Baulk line
    const baulkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baulkX, 0.001, -W / 2 + 0.01),
      new THREE.Vector3(baulkX, 0.001, W / 2 - 0.01),
    ]);
    this.scene.add(new THREE.Line(baulkGeo, markingMat));

    // The "D" (semicircle radius 292mm)
    const dRadius = SnookerTable.D_RADIUS * 0.001; // 0.292 m
    const dPoints: THREE.Vector3[] = [];
    const segments = 36;
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / segments;
      dPoints.push(new THREE.Vector3(baulkX - Math.cos(angle) * dRadius, 0.001, Math.sin(angle) * dRadius));
    }
    const dGeo = new THREE.BufferGeometry().setFromPoints(dPoints);
    this.scene.add(new THREE.Line(dGeo, markingMat));

    // Spots (Black, Pink, Blue, Brown, Green, Yellow)
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xf5f2eb, opacity: 0.65, transparent: true });
    const spotPositions = [
      new THREE.Vector3(1.4605, 0.001, 0),       // Black
      new THREE.Vector3(0.8923, 0.001, 0),       // Pink
      new THREE.Vector3(0, 0.001, 0),            // Blue (center)
      new THREE.Vector3(baulkX, 0.001, 0),       // Brown
      new THREE.Vector3(baulkX, 0.001, -dRadius),// Green
      new THREE.Vector3(baulkX, 0.001, dRadius), // Yellow
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
      // Dark leather drop hole
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.065, 20), leatherMat);
      hole.position.set(px, 0.003, pz);
      this.scene.add(hole);

      // Polished brass pocket plate
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.038, 0.075), brassMat);
      cap.position.set(px * 1.012, 0.02, pz * 1.012);
      cap.castShadow = true;
      this.scene.add(cap);
    });
  }

  /**
   * Builds the 3D cue stick with tip at local (0, 0, 0)
   * and shaft extending backwards along local -Z towards the butt.
   * This guarantees that when cueStickGroup looks at the forward shot target,
   * the shaft naturally extends backwards behind the cue ball.
   */
  private createCueStick(): THREE.Group {
    const group = new THREE.Group();

    const ashMat = new THREE.MeshStandardMaterial({
      color: 0xd6b37c, // North American Ash forward shaft
      roughness: 0.4,
    });
    const ebonyMat = new THREE.MeshStandardMaterial({
      color: 0x1f140d, // Dark ebony butt handle
      roughness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.9,
      roughness: 0.2,
    });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x2563eb }); // Chalked blue tip

    // Forward shaft: length 0.95m, tapered from radius 0.0048m at tip to 0.011m
    const shaftGeo = new THREE.CylinderGeometry(0.0048, 0.011, 0.95, 20);
    shaftGeo.rotateX(-Math.PI / 2);
    const shaft = new THREE.Mesh(shaftGeo, ashMat);
    shaft.position.z = -0.475; // from z=0 to z=-0.95
    shaft.castShadow = true;
    group.add(shaft);

    // Ebony butt handle: length 0.48m, radius 0.011m to 0.015m
    const buttGeo = new THREE.CylinderGeometry(0.011, 0.015, 0.48, 20);
    buttGeo.rotateX(-Math.PI / 2);
    const butt = new THREE.Mesh(buttGeo, ebonyMat);
    butt.position.z = -1.19; // from z=-0.95 to z=-1.43
    butt.castShadow = true;
    group.add(butt);

    // Brass joint ring
    const jointGeo = new THREE.CylinderGeometry(0.0112, 0.0112, 0.015, 20);
    jointGeo.rotateX(-Math.PI / 2);
    const joint = new THREE.Mesh(jointGeo, brassMat);
    joint.position.z = -0.95;
    group.add(joint);

    // Brass ferrule right behind tip
    const ferruleGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.012, 16);
    ferruleGeo.rotateX(-Math.PI / 2);
    const ferrule = new THREE.Mesh(ferruleGeo, brassMat);
    ferrule.position.z = -0.006;
    group.add(ferrule);

    // Blue leather tip
    const tipGeo = new THREE.CylinderGeometry(0.0048, 0.0048, 0.005, 16);
    tipGeo.rotateX(-Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = 0.0025;
    group.add(tip);

    return group;
  }

  private toThreeCoords(posMm: { x: number; y: number }): THREE.Vector3 {
    const x = (posMm.x - SnookerTable.LENGTH / 2) * 0.001;
    const z = (posMm.y - SnookerTable.WIDTH / 2) * 0.001;
    const y = SnookerTable.BALL_RADIUS * 0.001; // ball center
    return new THREE.Vector3(x, y, z);
  }

  public render(
    balls: Ball[],
    prediction?: TrajectoryPrediction | null,
    aimAngleRad?: number,
    cuePower: number = 35,
    isAiming: boolean = true
  ): void {
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

        // Apply physical roll rotation
        mesh.rotation.x = ball.rotation.x;
        mesh.rotation.y = ball.rotation.y;
        mesh.rotation.z = ball.rotation.z;
      }
    });

    // 2. Trajectories in 3D
    this.update3DTrajectories(prediction, isAiming);

    // 3. Cue Stick alignment in 3D
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined) {
      const cuePos = this.toThreeCoords(cueBall.position);
      const dirX = Math.cos(aimAngleRad);
      const dirZ = Math.sin(aimAngleRad);
      const pullback = 0.035 + (cuePower / 100) * 0.14;

      // Position tip behind the cue ball surface
      const tipPos = new THREE.Vector3(
        cuePos.x - dirX * pullback,
        cuePos.y + 0.004,
        cuePos.z - dirZ * pullback
      );
      // Forward target along aiming line
      const forwardTarget = new THREE.Vector3(
        cuePos.x + dirX * 2,
        cuePos.y + 0.004,
        cuePos.z + dirZ * 2
      );

      this.cueStickGroup.position.copy(tipPos);
      this.cueStickGroup.lookAt(forwardTarget);
      this.cueStickGroup.visible = true;
    } else {
      this.cueStickGroup.visible = false;
    }

    // 4. Update Camera View with smooth lerp
    this.updateCameraPosition(cueBall, aimAngleRad);

    this.renderer.render(this.scene, this.camera);
  }

  private update3DTrajectories(prediction?: TrajectoryPrediction | null, isAiming: boolean = true): void {
    while (this.trajectoryGroup.children.length > 0) {
      const child = this.trajectoryGroup.children[0];
      this.trajectoryGroup.remove(child);
      if (child instanceof THREE.Line) child.geometry.dispose();
    }

    if (!prediction || !isAiming) {
      this.ghostBallMesh.visible = false;
      return;
    }

    // Cue Path (multi-bounce with opacity decay)
    if (prediction.cuePath.length > 0) {
      prediction.cuePath.forEach((seg, idx) => {
        const p1 = this.toThreeCoords(seg.start);
        const p2 = this.toThreeCoords(seg.end);
        p1.y = 0.002;
        p2.y = 0.002;

        const isReflection = seg.type === 'cushion-reflection';
        const bounce = seg.bounce ?? idx;
        const mat = new THREE.LineBasicMaterial({
          color: isReflection ? 0xc5a059 : 0xf7f5ee,
          opacity: Math.max(0.2, Math.pow(0.68, bounce)),
          transparent: true,
        });
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.trajectoryGroup.add(new THREE.Line(geo, mat));
      });
    }

    // Target Ball Path (Red)
    if (prediction.targetPath.length > 0) {
      prediction.targetPath.forEach((seg) => {
        const p1 = this.toThreeCoords(seg.start);
        const p2 = this.toThreeCoords(seg.end);
        p1.y = 0.002;
        p2.y = 0.002;

        const mat = new THREE.LineBasicMaterial({ color: 0xef4444 });
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.trajectoryGroup.add(new THREE.Line(geo, mat));
      });
    }

    // Cue Ball Deflection (Cyan)
    if (prediction.cueDeflectionPath.length > 0) {
      prediction.cueDeflectionPath.forEach((seg) => {
        const p1 = this.toThreeCoords(seg.start);
        const p2 = this.toThreeCoords(seg.end);
        p1.y = 0.002;
        p2.y = 0.002;

        const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.trajectoryGroup.add(new THREE.Line(geo, mat));
      });
    }

    // Ghost Ball ring
    if (prediction.ghostBall) {
      const gPos = this.toThreeCoords(prediction.ghostBall);
      this.ghostBallMesh.position.set(gPos.x, 0.002, gPos.z);
      this.ghostBallMesh.visible = true;
    } else {
      this.ghostBallMesh.visible = false;
    }
  }

  private updateCameraPosition(cueBall?: Ball, aimAngleRad?: number): void {
    if (this.viewMode === 'tactical' && cueBall && aimAngleRad !== undefined) {
      // ── TACTICAL AIMING CAM ────────────────────────────────────────────────
      // Leaning over the table directly behind the cue ball along shot line
      const cuePos = this.toThreeCoords(cueBall.position);
      const dirX = Math.cos(aimAngleRad);
      const dirZ = Math.sin(aimAngleRad);

      const camDist = 0.75 / this.zoom;
      const camHeight = 0.22 / this.zoom;

      this.targetCameraPos.set(
        cuePos.x - dirX * camDist,
        camHeight,
        cuePos.z - dirZ * camDist
      );
      this.targetLookAt.set(
        cuePos.x + dirX * 1.8,
        0.026,
        cuePos.z + dirZ * 1.8
      );
      this.camera.up.set(0, 1, 0);
    } else if (this.viewMode === 'overhead') {
      // ── BIRD'S EYE TOP-DOWN ────────────────────────────────────────────────
      const dist = (3.4 / this.zoom);
      this.targetCameraPos.set(0, dist, 0.001);
      this.targetLookAt.set(0, 0, 0);
      this.camera.up.set(0, 0, -1); // Up is north across table width
    } else {
      // ── 360° ORBIT BEAUTY CAM ──────────────────────────────────────────────
      const dist = this.orbitDistance / this.zoom;
      const x = dist * Math.sin(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
      const y = dist * Math.cos(this.orbitAngles.phi);
      const z = dist * Math.sin(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);

      this.targetCameraPos.set(x, Math.max(0.35, y), z);
      this.targetLookAt.set(0, 0.026, 0);
      this.camera.up.set(0, 1, 0);
    }

    // Smooth lerp (18% per frame)
    this.camera.position.lerp(this.targetCameraPos, 0.18);
    this.currentLookAt.lerp(this.targetLookAt, 0.18);
    this.camera.lookAt(this.currentLookAt);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isPointerDown = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerDown) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.viewMode === 'orbit') {
        this.orbitAngles.theta -= deltaX * 0.007;
        this.orbitAngles.phi = Math.max(
          0.14,
          Math.min(Math.PI / 2.05, this.orbitAngles.phi + deltaY * 0.007)
        );
      } else if (this.viewMode === 'tactical' && this.onAimAdjust) {
        // Dragging in tactical mode smoothly rotates the player's aim angle!
        this.onAimAdjust(-deltaX * 0.0035);
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });

    // Mouse wheel zoom
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.0015;
        this.zoom = Math.max(0.65, Math.min(2.8, this.zoom + delta));
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
