import { Vector2D } from '../../engine/math/Vector2D';
import { SnookerTable } from '../../engine/table/SnookerTable';
import { Ball } from '../../engine/physics/Ball';
import type { TrajectoryPrediction } from '../../engine/physics/PhysicsEngine';

export interface RendererOptions {
  showTrajectories: boolean;
  showGhostBall: boolean;
  showAimLine: boolean;
  tableColor?: string;
}

export class CanvasTableRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  // Viewport transforms
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private currentZoom: number = 1;

  public options: RendererOptions = {
    showTrajectories: true,
    showGhostBall: true,
    showAimLine: true,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.updateDpi();
  }

  public updateDpi(zoom: number = 1.0, panX: number = 0, panY: number = 0): void {
    this.currentZoom = zoom;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 1200;
    const h = rect.height || 650;

    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    // Calculate base scale factor and centering offsets to fit 3569 x 1778 mm table
    const totalTableW = SnookerTable.LENGTH + 120;
    const totalTableH = SnookerTable.WIDTH + 120;

    const scaleX = w / totalTableW;
    const scaleY = h / totalTableH;
    const baseScale = Math.min(scaleX, scaleY);
    this.scale = baseScale * zoom;

    this.offsetX = (w - SnookerTable.LENGTH * this.scale) / 2 + panX;
    this.offsetY = (h - SnookerTable.WIDTH * this.scale) / 2 + panY;
  }

  /**
   * Transforms table physical coordinates (mm) to canvas screen pixels.
   */
  public toScreen(tablePos: Vector2D): Vector2D {
    return new Vector2D(
      this.offsetX + tablePos.x * this.scale,
      this.offsetY + tablePos.y * this.scale
    );
  }

  /**
   * Transforms screen click coordinates to table physical coordinates (mm).
   */
  public toTable(screenPos: Vector2D): Vector2D {
    return new Vector2D(
      (screenPos.x - this.offsetX) / this.scale,
      (screenPos.y - this.offsetY) / this.scale
    );
  }

  /**
   * Main render pass.
   */
  public render(
    table: SnookerTable,
    balls: Ball[],
    prediction?: TrajectoryPrediction | null,
    aimAngleRad?: number,
    cuePowerPercent: number = 30,
    isAiming: boolean = true,
    zoomLevel: number = 1.0,
    panOffset: { x: number; y: number } = { x: 0, y: 0 }
  ): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 650;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Outer Mahogany Wood Rail & Brass Accents
    this.drawTableRails(table);

    // 2. Draw Green Baize Cloth & Markings
    this.drawBaize(table);

    // 3. Draw Pocket Mouths & Drops
    this.drawPockets(table);

    // 4. Draw Trajectory Guides & Ghost Ball
    if (this.options.showTrajectories && prediction && isAiming) {
      this.drawTrajectories(prediction);
    }

    // 5. Draw Balls
    for (const ball of balls) {
      if (!ball.potted) {
        this.drawBall(ball);
      }
    }

    // 6. Draw Interactive Cue Stick
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined) {
      this.drawCueStick(cueBall, aimAngleRad, cuePowerPercent);
    }
  }

  private drawTableRails(table: SnookerTable): void {
    const ctx = this.ctx;
    const margin = 50 * this.scale;
    const x0 = this.offsetX - margin;
    const y0 = this.offsetY - margin;
    const railW = SnookerTable.LENGTH * this.scale + margin * 2;
    const railH = SnookerTable.WIDTH * this.scale + margin * 2;

    // Rich mahogany outer wood rail
    const woodGrad = ctx.createLinearGradient(x0, y0, x0 + railW, y0 + railH);
    woodGrad.addColorStop(0, '#2D1609');
    woodGrad.addColorStop(0.5, '#40200E');
    woodGrad.addColorStop(1, '#220F05');

    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(x0, y0, railW, railH, 14 * this.scale);
    ctx.fill();

    // Wood bevel edge
    ctx.strokeStyle = '#5A2E16';
    ctx.lineWidth = 2 * this.scale;
    ctx.stroke();

    // Inner rubber cushion frame
    const cushionX = this.offsetX - 10 * this.scale;
    const cushionY = this.offsetY - 10 * this.scale;
    const cushionW = SnookerTable.LENGTH * this.scale + 20 * this.scale;
    const cushionH = SnookerTable.WIDTH * this.scale + 20 * this.scale;

    ctx.fillStyle = '#06170E';
    ctx.fillRect(cushionX, cushionY, cushionW, cushionH);
  }

  private drawBaize(table: SnookerTable): void {
    const ctx = this.ctx;
    const x = this.offsetX;
    const y = this.offsetY;
    const w = SnookerTable.LENGTH * this.scale;
    const h = SnookerTable.WIDTH * this.scale;

    // Authentic Strachan No. 10 cloth baize with subtle canopy overhead spotlight
    const baizeGrad = ctx.createRadialGradient(
      x + w * 0.5,
      y + h * 0.5,
      h * 0.2,
      x + w * 0.5,
      y + h * 0.5,
      w * 0.7
    );
    baizeGrad.addColorStop(0, '#11442B');
    baizeGrad.addColorStop(0.7, '#0B2B1E');
    baizeGrad.addColorStop(1, '#071F15');

    ctx.fillStyle = baizeGrad;
    ctx.fillRect(x, y, w, h);

    // Inner cushion shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 4 * this.scale;
    ctx.strokeRect(x, y, w, h);

    // Baulk Line (White cloth marking at X = 737 mm)
    const baulkScreenX = this.offsetX + SnookerTable.BAULK_DIST * this.scale;
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.45)';
    ctx.lineWidth = 1.5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(baulkScreenX, y);
    ctx.lineTo(baulkScreenX, y + h);
    ctx.stroke();

    // The "D" (Semicircle facing away from baulk cushion, radius 292 mm)
    const dCenter = this.toScreen(SnookerTable.SPOTS.BROWN);
    const dRadius = SnookerTable.D_RADIUS * this.scale;
    ctx.beginPath();
    ctx.arc(dCenter.x, dCenter.y, dRadius, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.stroke();

    // Spot markings (subtle dots)
    ctx.fillStyle = 'rgba(245, 242, 235, 0.6)';
    const spotKeys = Object.keys(SnookerTable.SPOTS) as (keyof typeof SnookerTable.SPOTS)[];
    for (const key of spotKeys) {
      const spotPos = this.toScreen(SnookerTable.SPOTS[key]);
      ctx.beginPath();
      ctx.arc(spotPos.x, spotPos.y, 2 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPockets(table: SnookerTable): void {
    const ctx = this.ctx;

    for (const pocket of table.pockets) {
      const p = this.toScreen(pocket.position);
      const r = pocket.radius * this.scale;

      // Dark leather drop opening
      const pocketGrad = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
      pocketGrad.addColorStop(0, '#020304');
      pocketGrad.addColorStop(0.8, '#0A0C0E');
      pocketGrad.addColorStop(1, '#1A1816');

      ctx.fillStyle = pocketGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Brass pocket plate trim
      ctx.strokeStyle = '#C5A059';
      ctx.lineWidth = 2.5 * this.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.05, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawTrajectories(prediction: TrajectoryPrediction): void {
    const ctx = this.ctx;

    // 1. Cue Ball Aim Line (or Curved Swerve Line) with multi-bounce opacity fading
    for (const segment of prediction.cuePath) {
      const s = this.toScreen(segment.start);
      const e = this.toScreen(segment.end);
      const bounce = (segment as any).bounce ?? 0;
      // Each cushion bounce fades the line: bounce 0 = full, bounce 1 = 65%, bounce 2 = 42%, etc.
      const alpha = Math.pow(0.65, bounce);

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);

      if (segment.type === 'swerve') {
        // Glowing cyan curved swerve trail
        ctx.strokeStyle = `rgba(45, 212, 191, ${(0.9 * alpha).toFixed(2)})`;
        ctx.lineWidth = 2.2 * this.scale;
        ctx.setLineDash([]);
        ctx.stroke();
      } else if (segment.type === 'cushion-reflection') {
        // Each cushion bounce: brass-tinted dashed, progressively more transparent
        const dashLen = 4 * this.scale;
        ctx.strokeStyle = `rgba(197, 160, 89, ${(0.8 * alpha).toFixed(2)})`;
        ctx.setLineDash([dashLen, dashLen]);
        ctx.lineWidth = 1.6 * this.scale;
        ctx.stroke();
        ctx.setLineDash([]);
        // Draw bounce count indicator dot at the start of each reflected segment
        if (bounce > 0) {
          ctx.fillStyle = `rgba(197, 160, 89, ${(0.9 * alpha).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 3 * this.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Primary cue path: white/ivory dashed
        ctx.strokeStyle = `rgba(247, 245, 238, ${(0.82 * alpha).toFixed(2)})`;
        ctx.setLineDash([6 * this.scale, 3 * this.scale]);
        ctx.lineWidth = 1.6 * this.scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Ghost Ball
    if (this.options.showGhostBall && prediction.ghostBall) {
      const gp = this.toScreen(prediction.ghostBall);
      const r = SnookerTable.BALL_RADIUS * this.scale;

      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 1.8 * this.scale;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(45, 212, 191, 0.15)';
      ctx.fill();
    }

    // 3. Target Ball Projected Path
    for (const segment of prediction.targetPath) {
      const s = this.toScreen(segment.start);
      const e = this.toScreen(segment.end);

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2 * this.scale;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      this.drawArrowHead(s, e, '#EF4444');
    }

    // 4. Cue Ball Deflection Path (Tangent line)
    for (const segment of prediction.cueDeflectionPath) {
      const s = this.toScreen(segment.start);
      const e = this.toScreen(segment.end);

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.8 * this.scale;
      ctx.setLineDash([3 * this.scale, 3 * this.scale]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawBall(ball: Ball): void {
    const ctx = this.ctx;
    const p = this.toScreen(ball.position);
    const r = ball.radius * this.scale;
    const info = ball.colorInfo;

    // Drop shadow
    ctx.fillStyle = 'rgba(2, 8, 4, 0.45)';
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.25, p.y + r * 0.3, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Sphere Spherical Gradient
    const ballGrad = ctx.createRadialGradient(
      p.x - r * 0.35,
      p.y - r * 0.35,
      r * 0.1,
      p.x,
      p.y,
      r
    );
    ballGrad.addColorStop(0, info.specularHex);
    ballGrad.addColorStop(0.4, info.hex);
    ballGrad.addColorStop(1, '#050709');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Cue ball spin indicator dot
    if (ball.type === 'cue' && (Math.abs(ball.spin.pitch) > 1 || Math.abs(ball.spin.yaw) > 1)) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCueStick(cueBall: Ball, aimAngleRad: number, powerPercent: number): void {
    const ctx = this.ctx;
    const p = this.toScreen(cueBall.position);
    const r = cueBall.radius * this.scale;

    // Pullback offset based on shot power
    const pullback = (12 + (powerPercent / 100) * 65) * this.scale;
    const cueLength = 480 * this.scale;
    const tipWidth = 5 * this.scale;
    const buttWidth = 14 * this.scale;

    const backAngle = aimAngleRad + Math.PI;
    const tipX = p.x + Math.cos(backAngle) * (r + pullback);
    const tipY = p.y + Math.sin(backAngle) * (r + pullback);

    const buttX = tipX + Math.cos(backAngle) * cueLength;
    const buttY = tipY + Math.sin(backAngle) * cueLength;

    const normal = new Vector2D(-Math.sin(backAngle), Math.cos(backAngle));

    ctx.beginPath();
    ctx.moveTo(tipX + normal.x * (tipWidth / 2), tipY + normal.y * (tipWidth / 2));
    ctx.lineTo(buttX + normal.x * (buttWidth / 2), buttY + normal.y * (buttWidth / 2));
    ctx.lineTo(buttX - normal.x * (buttWidth / 2), buttY - normal.y * (buttWidth / 2));
    ctx.lineTo(tipX - normal.x * (tipWidth / 2), tipY - normal.y * (tipWidth / 2));
    ctx.closePath();

    const cueGrad = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
    cueGrad.addColorStop(0, '#E6D3AC');
    cueGrad.addColorStop(0.3, '#C49E65');
    cueGrad.addColorStop(0.75, '#522E14');
    cueGrad.addColorStop(1, '#1A0E06');

    ctx.fillStyle = cueGrad;
    ctx.fill();

    // Brass ferrule & blue chalk tip
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(tipX + normal.x * (tipWidth / 2), tipY + normal.y * (tipWidth / 2));
    ctx.lineTo(tipX - normal.x * (tipWidth / 2), tipY - normal.y * (tipWidth / 2));
    ctx.stroke();

    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2 * this.scale;
    const chalkX = tipX - Math.cos(backAngle) * (2 * this.scale);
    const chalkY = tipY - Math.sin(backAngle) * (2 * this.scale);
    ctx.beginPath();
    ctx.moveTo(chalkX + normal.x * (tipWidth / 2), chalkY + normal.y * (tipWidth / 2));
    ctx.lineTo(chalkX - normal.x * (tipWidth / 2), chalkY - normal.y * (tipWidth / 2));
    ctx.stroke();
  }

  private drawArrowHead(from: Vector2D, to: Vector2D, color: string): void {
    const ctx = this.ctx;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLen = 10 * this.scale;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }
}
