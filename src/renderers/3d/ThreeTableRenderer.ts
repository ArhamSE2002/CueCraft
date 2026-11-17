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
  private animId: number = 0;

  // Ball meshes keyed by ball id
  private ballMeshes: Map<string, THREE.Mesh> = new Map();
  private cueStickGroup: THREE.Group;
  private trajectoryLine: THREE.Line;
  private ghostBallMesh: THREE.Mesh;

  public viewMode: CameraViewMode = 'tactical';
  public zoom: number = 1.0;

  // Orbit controls state
  private isPointerDown: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private orbitAngles = { theta: 0, phi: Math.PI / 4 }; // Horizontal and vertical angles
  private orbitDistance: number = 3.6;

  constructor(container: HTMLDivElement) {
    this.container = container;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 650;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080b0f);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.updateCameraPosition();

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Table geometry setup
    this.setupTableMesh();

    // 6. Trajectory line and Ghost ball setup
    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineBasicMaterial({
      color: 0x2dd4bf,
      linewidth: 2,
    });
    this.trajectoryLine = new THREE.Line(trajGeo, trajMat);
    this.scene.add(this.trajectoryLine);

    const ghostGeo = new THREE.RingGeometry(0.024, 0.027, 32);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    this.ghostBallMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostBallMesh.rotation.x = -Math.PI / 2;
    this.ghostBallMesh.position.y = 0.001;
    this.ghostBallMesh.visible = false;
    this.scene.add(this.ghostBallMesh);

    // 7. 3D Cue Stick Mesh
    this.cueStickGroup = this.createCueStick();
    this.scene.add(this.cueStickGroup);

    // 8. Bind interactions
    this.bindEvents();

    // 9. Start render loop
    this.startLoop();
  }

  private setupLighting(): void {
    // Subtle ambient light
    const ambient = new THREE.AmbientLight(0x2d3748, 0.7);
    this.scene.add(ambient);

    // 4 Championship Overhead Canopy Spotlights
    const lightPositions = [
      new THREE.Vector3(-0.9, 2.2, -0.3),
      new THREE.Vector3(-0.9, 2.2, 0.3),
      new THREE.Vector3(0.9, 2.2, -0.3),
      new THREE.Vector3(0.9, 2.2, 0.3),
    ];

    lightPositions.forEach((pos) => {
      const spot = new THREE.SpotLight(0xfff7ed, 1.8);
      spot.position.copy(pos);
      spot.angle = Math.PI / 4;
      spot.penumbra = 0.5;
      spot.decay = 1.4;
      spot.distance = 6;
      spot.castShadow = true;
      spot.shadow.mapSize.width = 1024;
      spot.shadow.mapSize.height = 1024;
      spot.shadow.camera.near = 0.5;
      spot.shadow.camera.far = 4;
      spot.shadow.bias = -0.001;
      this.scene.add(spot);
    });
  }

  private setupTableMesh(): void {
    // Dimensions in meters (1 mm = 0.001 m)
    const L = SnookerTable.LENGTH * 0.001; // 3.569 m
    const W = SnookerTable.WIDTH * 0.001;  // 1.778 m
    const railThick = 0.07; // 7cm outer rails

    // Table Playing Surface (Strachan No. 10 Green Felt)
    const bedGeo = new THREE.BoxGeometry(L, 0.05, W);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x0b2b1e,
      roughness: 0.85,
      metalness: 0.05,
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.025;
    bed.receiveShadow = true;
    this.scene.add(bed);

    // Mahogany Rails (4 sides)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3d1e0e,
      roughness: 0.35,
      metalness: 0.1,
    });

    // Top / Baulk rails (Longitudinal ends)
    const endRailGeo = new THREE.BoxGeometry(railThick, 0.06, W + railThick * 2);
    const baulkRail = new THREE.Mesh(endRailGeo, railMat);
    baulkRail.position.set(-L / 2 - railThick / 2, 0.01, 0);
    baulkRail.castShadow = true;
    this.scene.add(baulkRail);

    const topRail = new THREE.Mesh(endRailGeo, railMat);
    topRail.position.set(L / 2 + railThick / 2, 0.01, 0);
    topRail.castShadow = true;
    this.scene.add(topRail);

    // Side rails (Left / Right)
    const sideRailGeo = new THREE.BoxGeometry(L, 0.06, railThick);
    const leftRail = new THREE.Mesh(sideRailGeo, railMat);
    leftRail.position.set(0, 0.01, -W / 2 - railThick / 2);
    leftRail.castShadow = true;
    this.scene.add(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, railMat);
    rightRail.position.set(0, 0.01, W / 2 + railThick / 2);
    rightRail.castShadow = true;
    this.scene.add(rightRail);

    // Brass Corner Plates & Drop Pockets
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.85,
      roughness: 0.25,
    });
    const pocketMat = new THREE.MeshBasicMaterial({ color: 0x050709 });

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
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16), pocketMat);
      hole.position.set(px, 0.005, pz);
      this.scene.add(hole);

      // Brass bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.062, 0.06), brassMat);
      bracket.position.set(px * 1.02, 0.015, pz * 1.02);
      this.scene.add(bracket);
    });
  }

  private createCueStick(): THREE.Group {
    const group = new THREE.Group();

    // Cue shaft (Tapered cylinder)
    const shaftGeo = new THREE.CylinderGeometry(0.005, 0.014, 1.4, 16);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xc49e65,
      roughness: 0.5,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.z = 0.7;
    group.add(shaft);

    // Brass ferrule & blue tip
    const ferruleGeo = new THREE.CylinderGeometry(0.0052, 0.0052, 0.02, 16);
    ferruleGeo.rotateX(Math.PI / 2);
    const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.9, roughness: 0.2 });
    const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
    ferrule.position.z = 0.01;
    group.add(ferrule);

    const tipGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.005, 16);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = -0.0025;
    group.add(tip);

    return group;
  }

  private toThreeCoords(posMm: { x: number; y: number }): THREE.Vector3 {
    // Center table at origin (0, 0, 0)
    // Table Length along X-axis, Width along Z-axis, Y is up
    const x = (posMm.x - SnookerTable.LENGTH / 2) * 0.001;
    const z = (posMm.y - SnookerTable.WIDTH / 2) * 0.001;
    const y = SnookerTable.BALL_RADIUS * 0.001; // ball center on felt
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
          roughness: 0.15,
          metalness: 0.05,
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

    // 2. Trajectory prediction ray in 3D
    if (prediction && isAiming && prediction.cuePath.length > 0) {
      const points: THREE.Vector3[] = [];
      prediction.cuePath.forEach((seg, idx) => {
        if (idx === 0) points.push(this.toThreeCoords(seg.start));
        points.push(this.toThreeCoords(seg.end));
      });
      // Raise slightly above felt
      points.forEach((p) => (p.y = 0.002));
      this.trajectoryLine.geometry.setFromPoints(points);
      this.trajectoryLine.visible = true;

      if (prediction.ghostBall) {
        const gPos = this.toThreeCoords(prediction.ghostBall);
        this.ghostBallMesh.position.set(gPos.x, 0.002, gPos.z);
        this.ghostBallMesh.visible = true;
      } else {
        this.ghostBallMesh.visible = false;
      }
    } else {
      this.trajectoryLine.visible = false;
      this.ghostBallMesh.visible = false;
    }

    // 3. Cue Stick alignment in 3D
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined) {
      const cuePos = this.toThreeCoords(cueBall.position);
      const pullback = 0.05 + (cuePower / 100) * 0.15;

      this.cueStickGroup.position.set(
        cuePos.x - Math.cos(aimAngleRad) * pullback,
        cuePos.y + 0.015,
        cuePos.z - Math.sin(aimAngleRad) * pullback
      );
      this.cueStickGroup.rotation.y = -aimAngleRad + Math.PI / 2;
      this.cueStickGroup.visible = true;
    } else {
      this.cueStickGroup.visible = false;
    }

    // 4. Update Camera View
    this.updateCameraPosition(cueBall, aimAngleRad);

    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraPosition(cueBall?: Ball, aimAngleRad?: number): void {
    const dist = this.orbitDistance / this.zoom;

    if (this.viewMode === 'tactical' && cueBall && aimAngleRad !== undefined) {
      // Tactical aiming cam directly behind cue ball along shot line
      const cuePos = this.toThreeCoords(cueBall.position);
      const camX = cuePos.x - Math.cos(aimAngleRad) * (1.1 / this.zoom);
      const camZ = cuePos.z - Math.sin(aimAngleRad) * (1.1 / this.zoom);
      const camY = 0.35 / this.zoom;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(
        cuePos.x + Math.cos(aimAngleRad) * 1.5,
        0.02,
        cuePos.z + Math.sin(aimAngleRad) * 1.5
      );
    } else if (this.viewMode === 'overhead') {
      // Clean top-down view
      this.camera.position.set(0, dist, 0);
      this.camera.lookAt(0, 0, 0);
    } else {
      // Free orbit view around table
      const x = dist * Math.sin(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
      const y = dist * Math.cos(this.orbitAngles.phi);
      const z = dist * Math.sin(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);

      this.camera.position.set(x, Math.max(0.4, y), z);
      this.camera.lookAt(0, 0.02, 0);
    }
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
          0.1,
          Math.min(Math.PI / 2.1, this.orbitAngles.phi + deltaY * 0.008)
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

  private startLoop(): void {
    const tick = () => {
      this.animId = requestAnimationFrame(tick);
    };
    tick();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
