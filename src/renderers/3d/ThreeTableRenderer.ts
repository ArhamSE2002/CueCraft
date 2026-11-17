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

  // Ball meshes keyed by ball id
  private ballMeshes: Map<string, THREE.Mesh> = new Map();
  private cueStickGroup: THREE.Group;
  private trajectoryGroup: THREE.Group;
  private ghostBallMesh: THREE.Mesh;

  public viewMode: CameraViewMode = 'overhead';
  public zoom: number = 1.0;

  // Smooth camera interpolation targets
  private targetCameraPos = new THREE.Vector3(0, 3.6, 0);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private currentLookAt = new THREE.Vector3(0, 0, 0);

  // Orbit controls state
  private isPointerDown: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private orbitAngles = { theta: 0, phi: Math.PI / 4.2 };
  private orbitDistance: number = 3.8;

  constructor(container: HTMLDivElement) {
    this.container = container;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 650;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080b);
    this.scene.fog = new THREE.FogExp2(0x06080b, 0.08);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 50);
    this.camera.position.set(0, 3.8, 0.01);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Table geometry setup (bed, rails, cushions, pockets, markings, legs, floor)
    this.setupTableMesh();

    // 6. Trajectory line and Ghost ball setup
    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    const ghostGeo = new THREE.RingGeometry(0.025, 0.0275, 36);
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

    // 7. 3D Cue Stick Mesh
    this.cueStickGroup = this.createCueStick();
    this.scene.add(this.cueStickGroup);

    // 8. Bind user interactions
    this.bindEvents();
  }

  private setupLighting(): void {
    // Ambient fill
    const ambient = new THREE.AmbientLight(0x1c2333, 0.9);
    this.scene.add(ambient);

    // 4 Championship Overhead Canopy Spotlights positioned above table quarters
    const lightPositions = [
      new THREE.Vector3(-0.95, 2.3, -0.35),
      new THREE.Vector3(-0.95, 2.3, 0.35),
      new THREE.Vector3(0.95, 2.3, -0.35),
      new THREE.Vector3(0.95, 2.3, 0.35),
    ];

    lightPositions.forEach((pos) => {
      const spot = new THREE.SpotLight(0xfff5ea, 2.4);
      spot.position.copy(pos);
      spot.angle = Math.PI / 3.8;
      spot.penumbra = 0.65;
      spot.decay = 1.3;
      spot.distance = 6;
      spot.castShadow = true;
      spot.shadow.mapSize.width = 1024;
      spot.shadow.mapSize.height = 1024;
      spot.shadow.camera.near = 0.3;
      spot.shadow.camera.far = 4.5;
      spot.shadow.bias = -0.0008;
      this.scene.add(spot);
    });

    // Warm perimeter rim light
    const rimLight = new THREE.DirectionalLight(0xc5a059, 0.35);
    rimLight.position.set(0, 1.5, -3);
    this.scene.add(rimLight);
  }

  private setupTableMesh(): void {
    const L = SnookerTable.LENGTH * 0.001; // 3.569 m
    const W = SnookerTable.WIDTH * 0.001;  // 1.778 m
    const railThick = 0.075; // 7.5cm outer rails
    const railHeight = 0.045;

    // 1. Dark floor plane with subtle grid
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 0.95,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.78;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Table Playing Surface (Strachan No. 10 Green Baize)
    const bedGeo = new THREE.BoxGeometry(L, 0.05, W);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x0b2b1e,
      roughness: 0.88,
      metalness: 0.02,
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.025;
    bed.receiveShadow = true;
    this.scene.add(bed);

    // 3. Cloth Markings: Baulk line and the "D"
    this.setupClothMarkings(L, W);

    // 4. Mahogany Rails & Apron Frame
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x2b1408,
      roughness: 0.28,
      metalness: 0.12,
    });

    // End rails (Baulk & Top)
    const endRailGeo = new THREE.BoxGeometry(railThick, railHeight, W + railThick * 2);
    const baulkRail = new THREE.Mesh(endRailGeo, woodMat);
    baulkRail.position.set(-L / 2 - railThick / 2, railHeight / 2 - 0.005, 0);
    baulkRail.castShadow = true;
    baulkRail.receiveShadow = true;
    this.scene.add(baulkRail);

    const topRail = new THREE.Mesh(endRailGeo, woodMat);
    topRail.position.set(L / 2 + railThick / 2, railHeight / 2 - 0.005, 0);
    topRail.castShadow = true;
    topRail.receiveShadow = true;
    this.scene.add(topRail);

    // Side rails (Left & Right)
    const sideRailGeo = new THREE.BoxGeometry(L, railHeight, railThick);
    const leftRail = new THREE.Mesh(sideRailGeo, woodMat);
    leftRail.position.set(0, railHeight / 2 - 0.005, -W / 2 - railThick / 2);
    leftRail.castShadow = true;
    leftRail.receiveShadow = true;
    this.scene.add(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, woodMat);
    rightRail.position.set(0, railHeight / 2 - 0.005, W / 2 + railThick / 2);
    rightRail.castShadow = true;
    rightRail.receiveShadow = true;
    this.scene.add(rightRail);

    // Under-rail dark green rubber cushion noses
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x071e14,
      roughness: 0.9,
    });
    const cushionThick = 0.015;
    const cNorth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, cushionThick), cushionMat);
    cNorth.position.set(0, 0.01, -W / 2 + cushionThick / 2);
    this.scene.add(cNorth);
    const cSouth = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, cushionThick), cushionMat);
    cSouth.position.set(0, 0.01, W / 2 - cushionThick / 2);
    this.scene.add(cSouth);

    // Under-table apron skirting (vertical mahogany skirt)
    const skirtHeight = 0.18;
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1f0e06, roughness: 0.4 });
    const skirtGeoX = new THREE.BoxGeometry(L + railThick * 2, skirtHeight, 0.02);
    const skirtGeoZ = new THREE.BoxGeometry(0.02, skirtHeight, W + railThick * 2);

    const skirtN = new THREE.Mesh(skirtGeoX, skirtMat);
    skirtN.position.set(0, -0.05 - skirtHeight / 2, -W / 2 - railThick);
    this.scene.add(skirtN);
    const skirtS = new THREE.Mesh(skirtGeoX, skirtMat);
    skirtS.position.set(0, -0.05 - skirtHeight / 2, W / 2 + railThick);
    this.scene.add(skirtS);
    const skirtW = new THREE.Mesh(skirtGeoZ, skirtMat);
    skirtW.position.set(-L / 2 - railThick, -0.05 - skirtHeight / 2, 0);
    this.scene.add(skirtW);
    const skirtE = new THREE.Mesh(skirtGeoZ, skirtMat);
    skirtE.position.set(L / 2 + railThick, -0.05 - skirtHeight / 2, 0);
    this.scene.add(skirtE);

    // 5. 8 Turned Championship Table Legs
    this.setupTableLegs(L, W);

    // 6. Brass Pocket Brackets & Drops
    this.setupPockets(L, W);
  }

  private setupClothMarkings(L: number, W: number): void {
    // Baulk Line at X = 737 mm from baulk end
    // Table center = (1784.5, 889) mm
    // Three coords: baulkX = (737 - 1784.5) * 0.001 = -1.0475 m
    const baulkX = -1.0475;
    const markingMat = new THREE.LineBasicMaterial({ color: 0xf5f2eb, opacity: 0.45, transparent: true });

    const baulkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baulkX, 0.001, -W / 2),
      new THREE.Vector3(baulkX, 0.001, W / 2),
    ]);
    this.scene.add(new THREE.Line(baulkGeo, markingMat));

    // The "D" (semicircle facing away from baulk cushion)
    const dRadius = SnookerTable.D_RADIUS * 0.001; // 0.292 m
    const dPoints: THREE.Vector3[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / segments;
      // Curves towards negative X (towards baulk cushion)
      dPoints.push(new THREE.Vector3(baulkX - Math.cos(angle) * dRadius, 0.001, Math.sin(angle) * dRadius));
    }
    const dGeo = new THREE.BufferGeometry().setFromPoints(dPoints);
    this.scene.add(new THREE.Line(dGeo, markingMat));

    // Spot markings (small subtle discs)
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xf5f2eb, opacity: 0.5, transparent: true });
    const spotPositions = [
      new THREE.Vector3(1.4605, 0.001, 0),    // Black spot
      new THREE.Vector3(0.8923, 0.001, 0),    // Pink spot
      new THREE.Vector3(0, 0.001, 0),         // Blue spot (center)
      new THREE.Vector3(baulkX, 0.001, 0),    // Brown spot
      new THREE.Vector3(baulkX, 0.001, -dRadius), // Green spot
      new THREE.Vector3(baulkX, 0.001, dRadius),  // Yellow spot
    ];

    spotPositions.forEach((pos) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.006, 16), spotMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(pos);
      this.scene.add(disc);
    });
  }

  private setupTableLegs(L: number, W: number): void {
    const legGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.72, 16);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x221006,
      roughness: 0.35,
      metalness: 0.1,
    });
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      roughness: 0.2,
      metalness: 0.85,
    });

    const legPositions = [
      // 4 corners
      [-L / 2 + 0.12, -W / 2 + 0.1],
      [-L / 2 + 0.12, W / 2 - 0.1],
      [L / 2 - 0.12, -W / 2 + 0.1],
      [L / 2 - 0.12, W / 2 - 0.1],
      // 4 side midpoints
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

      // Brass adjustable foot disc
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), footMat);
      foot.position.set(lx, -0.765, lz);
      this.scene.add(foot);
    });
  }

  private setupPockets(L: number, W: number): void {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.88,
      roughness: 0.22,
    });
    const leatherMat = new THREE.MeshBasicMaterial({ color: 0x020304 });

    const pocketCoords = [
      [-L / 2, -W / 2],
      [-L / 2, W / 2],
      [0, -W / 2],
      [0, W / 2],
      [L / 2, -W / 2],
      [L / 2, W / 2],
    ];

    pocketCoords.forEach(([px, pz]) => {
      // Leather drop hole
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.065, 20), leatherMat);
      hole.position.set(px, 0.003, pz);
      this.scene.add(hole);

      // Polished brass pocket plate cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.07), brassMat);
      cap.position.set(px * 1.015, 0.02, pz * 1.015);
      cap.castShadow = true;
      this.scene.add(cap);
    });
  }

  private createCueStick(): THREE.Group {
    const group = new THREE.Group();

    // Cue shaft (Tapered North American Ash wood)
    const shaftGeo = new THREE.CylinderGeometry(0.005, 0.015, 1.45, 20);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xc49e65,
      roughness: 0.45,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.z = 0.725;
    shaft.castShadow = true;
    group.add(shaft);

    // Brass ferrule
    const ferruleGeo = new THREE.CylinderGeometry(0.0053, 0.0053, 0.02, 16);
    ferruleGeo.rotateX(Math.PI / 2);
    const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.9, roughness: 0.2 });
    const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
    ferrule.position.z = 0.01;
    group.add(ferrule);

    // Blue chalked leather tip
    const tipGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.006, 16);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = -0.003;
    group.add(tip);

    return group;
  }

  private toThreeCoords(posMm: { x: number; y: number }): THREE.Vector3 {
    const x = (posMm.x - SnookerTable.LENGTH / 2) * 0.001;
    const z = (posMm.y - SnookerTable.WIDTH / 2) * 0.001;
    const y = SnookerTable.BALL_RADIUS * 0.001;
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
          roughness: 0.08,
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

    // 2. Trajectories in 3D (Cue line, Target ball path, Deflection)
    this.update3DTrajectories(prediction, isAiming);

    // 3. Cue Stick alignment in 3D
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined) {
      const cuePos = this.toThreeCoords(cueBall.position);
      const pullback = 0.05 + (cuePower / 100) * 0.16;

      this.cueStickGroup.position.set(
        cuePos.x - Math.cos(aimAngleRad) * pullback,
        cuePos.y + 0.016,
        cuePos.z - Math.sin(aimAngleRad) * pullback
      );
      this.cueStickGroup.rotation.y = -aimAngleRad + Math.PI / 2;
      this.cueStickGroup.visible = true;
    } else {
      this.cueStickGroup.visible = false;
    }

    // 4. Update Camera View with smooth lerp
    this.updateCameraPosition(cueBall, aimAngleRad);

    this.renderer.render(this.scene, this.camera);
  }

  private update3DTrajectories(prediction?: TrajectoryPrediction | null, isAiming: boolean = true): void {
    // Clear old trajectory lines
    while (this.trajectoryGroup.children.length > 0) {
      const child = this.trajectoryGroup.children[0];
      this.trajectoryGroup.remove(child);
      if (child instanceof THREE.Line) child.geometry.dispose();
    }

    if (!prediction || !isAiming) {
      this.ghostBallMesh.visible = false;
      return;
    }

    // Cue Path (multi-segment)
    if (prediction.cuePath.length > 0) {
      prediction.cuePath.forEach((seg, idx) => {
        const p1 = this.toThreeCoords(seg.start);
        const p2 = this.toThreeCoords(seg.end);
        p1.y = 0.002;
        p2.y = 0.002;

        const isReflection = seg.type === 'cushion-reflection';
        const mat = new THREE.LineBasicMaterial({
          color: isReflection ? 0xc5a059 : 0xf7f5ee,
          opacity: Math.max(0.2, Math.pow(0.7, seg.bounce ?? idx)),
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
    const dist = this.orbitDistance / this.zoom;

    if (this.viewMode === 'tactical' && cueBall && aimAngleRad !== undefined) {
      // Tactical cam placed directly behind cue ball along aiming direction
      const cuePos = this.toThreeCoords(cueBall.position);
      const camX = cuePos.x - Math.cos(aimAngleRad) * (1.1 / this.zoom);
      const camZ = cuePos.z - Math.sin(aimAngleRad) * (1.1 / this.zoom);
      const camY = 0.32 / this.zoom;

      this.targetCameraPos.set(camX, camY, camZ);
      this.targetLookAt.set(
        cuePos.x + Math.cos(aimAngleRad) * 1.5,
        0.02,
        cuePos.z + Math.sin(aimAngleRad) * 1.5
      );
    } else if (this.viewMode === 'overhead') {
      // Clean top-down view
      this.targetCameraPos.set(0, dist, 0.001);
      this.targetLookAt.set(0, 0, 0);
    } else {
      // Free 360° orbit view around table
      const x = dist * Math.sin(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
      const y = dist * Math.cos(this.orbitAngles.phi);
      const z = dist * Math.sin(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);

      this.targetCameraPos.set(x, Math.max(0.4, y), z);
      this.targetLookAt.set(0, 0.02, 0);
    }

    // Smooth lerp (15% per frame)
    this.camera.position.lerp(this.targetCameraPos, 0.15);
    this.currentLookAt.lerp(this.targetLookAt, 0.15);
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
        this.orbitAngles.theta -= deltaX * 0.008;
        this.orbitAngles.phi = Math.max(
          0.12,
          Math.min(Math.PI / 2.05, this.orbitAngles.phi + deltaY * 0.008)
        );
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
