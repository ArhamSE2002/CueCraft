import { Vector2D } from '../../engine/math/Vector2D';
import { SnookerTable } from '../../engine/table/SnookerTable';
import { Ball } from '../../engine/physics/Ball';
import type { TrajectoryPrediction } from '../../engine/physics/PhysicsEngine';
import {
  CLOTH_CATALOG,
  CUE_CATALOG,
  TIP_CATALOG,
  type ClothSpec,
  type CueSpec,
  type CueTipSpec,
} from '../../engine/equipment/Equipment';

export interface ReplayComparisonOverlay {
  predictedCuePath: Vector2D[];
  actualCuePath: Vector2D[];
  show: boolean;
}

export interface RendererOptions {
  showTrajectories: boolean;
  showGhostBall: boolean;
  showAimLine: boolean;
  tableColor?: string;
  clothSpec?: ClothSpec;
  cueSpec?: CueSpec;
  tipSpec?: CueTipSpec;
  selectedMoveBallId?: string | null;
  calledPocketId?: string | null;
  replayComparison?: ReplayComparisonOverlay | null;
}

export class CanvasTableRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  // Viewport transforms
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private activeTableLength: number = SnookerTable.LENGTH;
  private activeTableWidth: number = SnookerTable.WIDTH;

  public options: RendererOptions = {
    showTrajectories: true,
    showGhostBall: true,
    showAimLine: true,
    clothSpec: CLOTH_CATALOG[1],
    cueSpec: CUE_CATALOG[0],
    tipSpec: TIP_CATALOG[1],
    selectedMoveBallId: null,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.updateDpi();
  }

  public updateDpi(
    zoom: number = 1.0,
    panX: number = 0,
    panY: number = 0,
    table?: SnookerTable
  ): void {
    if (table) {
      this.activeTableLength = table.length;
      this.activeTableWidth = table.width;
    }
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 1200;
    const h = rect.height || 650;

    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    this.updateScaleAndOffset(w, h, zoom, panX, panY);
  }

  private updateScaleAndOffset(
    w: number,
    h: number,
    zoom: number,
    panX: number,
    panY: number
  ): void {
    const totalTableW = this.activeTableLength + 140;
    const totalTableH = this.activeTableWidth + 140;

    const scaleX = w / totalTableW;
    const scaleY = h / totalTableH;
    const baseScale = Math.min(scaleX, scaleY);
    this.scale = baseScale * zoom;

    this.offsetX = (w - this.activeTableLength * this.scale) / 2 + panX;
    this.offsetY = (h - this.activeTableWidth * this.scale) / 2 + panY;
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
   * Returns outer wooden-rail screen-space rectangle of the rendered table.
   */
  public getTableScreenBounds(table?: SnookerTable): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    railMarginPx: number;
  } {
    const len = table ? table.length : this.activeTableLength;
    const wid = table ? table.width : this.activeTableWidth;
    const ballRadius = table ? table.ballRadius : 26.25;
    const railMarginPx = Math.max(46, ballRadius * 2.1) * this.scale;
    return {
      left: this.offsetX - railMarginPx,
      top: this.offsetY - railMarginPx,
      right: this.offsetX + len * this.scale + railMarginPx,
      bottom: this.offsetY + wid * this.scale + railMarginPx,
      railMarginPx,
    };
  }

  /**
   * Returns true only when client pointer coordinates land inside the table rails/surface.
   */
  public isScreenPointOnTable(
    clientX: number,
    clientY: number,
    table?: SnookerTable
  ): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const bounds = this.getTableScreenBounds(table);
    return (
      localX >= bounds.left &&
      localX <= bounds.right &&
      localY >= bounds.top &&
      localY <= bounds.bottom
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

    if (
      table.length !== this.activeTableLength ||
      table.width !== this.activeTableWidth
    ) {
      this.activeTableLength = table.length;
      this.activeTableWidth = table.width;
      this.updateScaleAndOffset(width, height, zoomLevel, panOffset.x, panOffset.y);
    }

    ctx.clearRect(0, 0, width, height);

    // 0. Studio Arena Crucible Lighting Backdrop
    this.drawArenaBackdrop(width, height, table);

    // 1. Draw Outer Wood Rail & Brass Accents
    this.drawTableRails(table);

    // 2. Draw Baize Cloth & Variant Markings
    this.drawBaize(table);

    // 3. Draw Visible Segmented Cushions & Pocket Jaws
    this.drawCushions(table);

    // 4. Draw Pocket Mouths & Drops
    this.drawPockets(table);

    // 4. Draw Trajectory Guides & Ghost Ball
    if (this.options.showTrajectories && prediction && isAiming) {
      this.drawTrajectories(prediction, table);
    }

    // 4b. Ghost Predicted vs Actual Shot Path Comparison Overlay
    if (this.options.replayComparison?.show) {
      this.drawReplayComparison(this.options.replayComparison);
    }

    // 5. Draw Balls
    for (const ball of balls) {
      if (!ball.potted) {
        this.drawBall(ball);
        if (this.options.selectedMoveBallId === ball.id) {
          const p = this.toScreen(ball.position);
          const r = ball.radius * this.scale;
          ctx.strokeStyle = '#2DD4BF';
          ctx.lineWidth = 2.5 * this.scale;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 1.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 6. Draw Interactive Cue Stick
    const cueBall = balls.find((b) => b.type === 'cue' && !b.potted);
    if (cueBall && isAiming && aimAngleRad !== undefined && !this.options.selectedMoveBallId) {
      this.drawCueStick(cueBall, aimAngleRad, cuePowerPercent);
    }
  }

  private drawArenaBackdrop(width: number, height: number, table: SnookerTable): void {
    const ctx = this.ctx;
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85
    );
    bgGrad.addColorStop(0, '#0D151D');
    bgGrad.addColorStop(0.55, '#070B10');
    bgGrad.addColorStop(1, '#040609');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle overhead canopy ambient halo centered directly over table bounds
    const bounds = this.getTableScreenBounds(table);
    const cx = (bounds.left + bounds.right) * 0.5;
    const cy = (bounds.top + bounds.bottom) * 0.5;
    const haloRadius = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.7;
    const halo = ctx.createRadialGradient(cx, cy, haloRadius * 0.12, cx, cy, haloRadius);
    halo.addColorStop(0, 'rgba(16, 185, 129, 0.10)');
    halo.addColorStop(0.55, 'rgba(56, 189, 248, 0.04)');
    halo.addColorStop(1, 'rgba(4, 6, 9, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
  }

  private drawTableRails(table: SnookerTable): void {
    const ctx = this.ctx;
    const margin = Math.max(46, table.ballRadius * 2.1) * this.scale;
    const x0 = this.offsetX - margin;
    const y0 = this.offsetY - margin;
    const railW = table.length * this.scale + margin * 2;
    const railH = table.width * this.scale + margin * 2;
    const radius = Math.max(6, 16 * this.scale);

    // Table chassis depth shadow onto studio floor
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
    ctx.shadowBlur = Math.max(12, 28 * this.scale);
    ctx.shadowOffsetY = Math.max(4, 9 * this.scale);

    // Outer hardwood rail adapted per game table
    const woodGrad = ctx.createLinearGradient(x0, y0, x0 + railW, y0 + railH);
    woodGrad.addColorStop(0, table.railHex);
    woodGrad.addColorStop(0.45, table.variant === 'snooker' ? '#562B14' : '#2E3A4A');
    woodGrad.addColorStop(1, '#100907');

    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(x0, y0, railW, railH, radius);
    ctx.fill();
    ctx.restore();

    // Specular outer rim bevel
    ctx.strokeStyle = table.variant === 'snooker' ? 'rgba(214, 178, 101, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = Math.max(1.2, 2 * this.scale);
    ctx.beginPath();
    ctx.roundRect(x0, y0, railW, railH, radius);
    ctx.stroke();

    // Brushed Brass Corner Plates & Middle Pocket Bevels
    const cornerSize = margin * 0.86;
    const brassPlateGrad = ctx.createLinearGradient(x0, y0, x0 + cornerSize, y0 + cornerSize);
    brassPlateGrad.addColorStop(0, '#E3C57E');
    brassPlateGrad.addColorStop(0.5, '#B68F40');
    brassPlateGrad.addColorStop(1, '#785A22');
    ctx.fillStyle = table.variant === 'snooker' ? brassPlateGrad : 'rgba(148, 163, 184, 0.32)';

    const drawCornerBracket = (cx: number, cy: number, sx: number, sy: number) => {
      ctx.beginPath();
      ctx.roundRect(cx, cy, cornerSize, cornerSize, radius * 0.45);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = Math.max(0.8, 1.2 * this.scale);
      ctx.stroke();
      void sx;
      void sy;
    };
    drawCornerBracket(x0 + 2 * this.scale, y0 + 2 * this.scale, 1, 1);
    drawCornerBracket(x0 + railW - cornerSize - 2 * this.scale, y0 + 2 * this.scale, -1, 1);
    drawCornerBracket(x0 + 2 * this.scale, y0 + railH - cornerSize - 2 * this.scale, 1, -1);
    drawCornerBracket(x0 + railW - cornerSize - 2 * this.scale, y0 + railH - cornerSize - 2 * this.scale, -1, -1);

    // Side center pocket brass plates
    const midX = this.offsetX + (table.length * this.scale) * 0.5;
    const plateW = margin * 0.92;
    const plateH = margin * 0.42;
    ctx.beginPath();
    ctx.roundRect(midX - plateW * 0.5, y0 + 2 * this.scale, plateW, plateH, 4 * this.scale);
    ctx.roundRect(midX - plateW * 0.5, y0 + railH - plateH - 2 * this.scale, plateW, plateH, 4 * this.scale);
    ctx.fill();

    // Pool Rail Diamond Sights (9-Ball / 8-Ball)
    if (table.hasDiamonds) {
      const topRailY = this.offsetY - margin * 0.52;
      const botRailY = this.offsetY + table.width * this.scale + margin * 0.52;
      const leftRailX = this.offsetX - margin * 0.52;
      const rightRailX = this.offsetX + table.length * this.scale + margin * 0.52;
      const dSize = Math.max(2.5, 8 * this.scale);

      const drawDiamond = (cx: number, cy: number) => {
        ctx.fillStyle = '#E6D6AD';
        ctx.beginPath();
        ctx.moveTo(cx, cy - dSize);
        ctx.lineTo(cx + dSize * 0.65, cy);
        ctx.lineTo(cx, cy + dSize);
        ctx.lineTo(cx - dSize * 0.65, cy);
        ctx.closePath();
        ctx.fill();
      };

      for (const f of [0.125, 0.25, 0.375, 0.625, 0.75, 0.875]) {
        const dx = this.offsetX + table.length * f * this.scale;
        drawDiamond(dx, topRailY);
        drawDiamond(dx, botRailY);
      }
      for (const f of [0.25, 0.5, 0.75]) {
        const dy = this.offsetY + table.width * f * this.scale;
        drawDiamond(leftRailX, dy);
        drawDiamond(rightRailX, dy);
      }
    }

    // Inner cushion liner (under pocket lips & wood bezel)
    const cushionDepth = Math.max(22, table.ballRadius * 1.15);
    const cushionX = this.offsetX - cushionDepth * this.scale;
    const cushionY = this.offsetY - cushionDepth * this.scale;
    const cushionW = table.length * this.scale + cushionDepth * 2 * this.scale;
    const cushionH = table.width * this.scale + cushionDepth * 2 * this.scale;

    ctx.fillStyle = '#070E12';
    ctx.fillRect(cushionX, cushionY, cushionW, cushionH);
  }

  private drawCushions(table: SnookerTable): void {
    const ctx = this.ctx;
    const clothBase = this.options.clothSpec?.feltHex2D ?? '#0B2B1E';
    const cushionDepth = Math.max(22, table.ballRadius * 1.15);

    for (const c of table.cushions) {
      const s = this.toScreen(c.start);
      const e = this.toScreen(c.end);

      // Outward vector points away from playing surface into the wooden rail
      const outX = -c.normal.x * cushionDepth * this.scale;
      const outY = -c.normal.y * cushionDepth * this.scale;

      // Tangent direction along cushion segment (chamfer back outer corners toward pockets)
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = (dx / len) * 14 * this.scale;
      const uy = (dy / len) * 14 * this.scale;

      const sOut = { x: s.x + outX - ux * 0.45, y: s.y + outY - uy * 0.45 };
      const eOut = { x: e.x + outX + ux * 0.45, y: e.y + outY + uy * 0.45 };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.lineTo(eOut.x, eOut.y);
      ctx.lineTo(sOut.x, sOut.y);
      ctx.closePath();

      // Gradient from bright crisp cushion nose into deep rail shadow
      const midIn = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      const midOut = { x: (sOut.x + eOut.x) / 2, y: (sOut.y + eOut.y) / 2 };
      const cushGrad = ctx.createLinearGradient(midIn.x, midIn.y, midOut.x, midOut.y);
      cushGrad.addColorStop(0, clothBase);
      cushGrad.addColorStop(0.35, clothBase);
      cushGrad.addColorStop(1, 'rgba(4, 9, 12, 0.92)');

      ctx.fillStyle = cushGrad;
      ctx.fill();

      // Crisp illuminated cushion nose border (distinct separation between cloth bed & rubber bumper!)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.lineWidth = Math.max(1.5, 3.2 * this.scale);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      // Subtle jaw outline so pocket entrances read clearly
      ctx.strokeStyle = 'rgba(226, 184, 87, 0.35)';
      ctx.lineWidth = Math.max(1, 1.5 * this.scale);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(sOut.x, sOut.y);
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(eOut.x, eOut.y);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawBaize(table: SnookerTable): void {
    const ctx = this.ctx;
    const x = this.offsetX;
    const y = this.offsetY;
    const w = table.length * this.scale;
    const h = table.width * this.scale;

    const clothBase = this.options.clothSpec?.feltHex2D ?? '#0B2B1E';
    const baizeGrad = ctx.createRadialGradient(
      x + w * 0.5,
      y + h * 0.5,
      h * 0.14,
      x + w * 0.5,
      y + h * 0.5,
      w * 0.72
    );
    baizeGrad.addColorStop(0, clothBase);
    baizeGrad.addColorStop(0.76, clothBase);
    baizeGrad.addColorStop(1, '#070E12');

    ctx.fillStyle = baizeGrad;
    ctx.fillRect(x, y, w, h);

    // Subtle overhead studio light bloom in center of felt
    const centerLight = ctx.createRadialGradient(
      x + w * 0.5,
      y + h * 0.5,
      h * 0.05,
      x + w * 0.5,
      y + h * 0.5,
      w * 0.52
    );
    centerLight.addColorStop(0, 'rgba(255, 255, 255, 0.065)');
    centerLight.addColorStop(0.6, 'rgba(255, 255, 255, 0.015)');
    centerLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerLight;
    ctx.fillRect(x, y, w, h);

    // Inner cushion ambient occlusion shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = Math.max(2, 4.5 * this.scale);
    ctx.strokeRect(x, y, w, h);

    // Baulk / Head String Line
    const baulkScreenX = this.offsetX + table.baulkDist * this.scale;
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.42)';
    ctx.lineWidth = Math.max(1, 1.5 * this.scale);
    ctx.beginPath();
    ctx.moveTo(baulkScreenX, y);
    ctx.lineTo(baulkScreenX, y + h);
    ctx.stroke();

    // Snooker "D" Semicircle
    if (table.hasBaulkAndD && table.dRadius > 0) {
      const dCenter = this.toScreen(table.spots.BROWN);
      const dRadius = table.dRadius * this.scale;
      ctx.beginPath();
      ctx.arc(dCenter.x, dCenter.y, dRadius, Math.PI * 0.5, Math.PI * 1.5, false);
      ctx.stroke();
    }

    // Spot markings (Snooker all spots; Pool center + foot spot)
    ctx.fillStyle = 'rgba(245, 242, 235, 0.62)';
    const spotList = table.hasBaulkAndD
      ? Object.values(table.spots)
      : [table.spots.BLUE, table.spots.PINK];
    for (const sp of spotList) {
      const spotPos = this.toScreen(sp);
      ctx.beginPath();
      ctx.arc(spotPos.x, spotPos.y, Math.max(1.8, 3.1 * this.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPockets(table: SnookerTable): void {
    const ctx = this.ctx;

    for (const pocket of table.pockets) {
      const p = this.toScreen(pocket.position);
      const r = pocket.radius * this.scale;

      // Dark leather drop opening with recessed shadow
      const pocketGrad = ctx.createRadialGradient(p.x, p.y, r * 0.18, p.x, p.y, r);
      pocketGrad.addColorStop(0, '#010203');
      pocketGrad.addColorStop(0.76, '#090C0F');
      pocketGrad.addColorStop(1, '#1E1B18');

      ctx.fillStyle = pocketGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner leather pocket rim
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.lineWidth = Math.max(1, 2 * this.scale);
      ctx.stroke();

      // Brushed brass pocket plate trim
      ctx.strokeStyle = this.options.calledPocketId === pocket.id ? '#38BDF8' : '#C9A45A';
      ctx.lineWidth =
        this.options.calledPocketId === pocket.id
          ? Math.max(2.5, 4.5 * this.scale)
          : Math.max(1.5, 2.5 * this.scale);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.06, 0, Math.PI * 2);
      ctx.stroke();

      if (this.options.calledPocketId === pocket.id) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = Math.max(1.5, 3 * this.scale);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.38, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawReplayComparison(comparison: ReplayComparisonOverlay): void {
    const ctx = this.ctx;
    const drawPoly = (
      pts: Vector2D[],
      stroke: string,
      dashed: boolean,
      endHollow: boolean
    ) => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2.2, 6 * this.scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dashed) {
        ctx.setLineDash([Math.max(8, 18 * this.scale), Math.max(5, 10 * this.scale)]);
      }
      ctx.beginPath();
      const p0 = this.toScreen(pts[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const pi = this.toScreen(pts[i]);
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const last = this.toScreen(pts[pts.length - 1]);
      ctx.beginPath();
      ctx.arc(last.x, last.y, Math.max(4, 14 * this.scale), 0, Math.PI * 2);
      if (endHollow) {
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = stroke;
        ctx.fill();
      }
      ctx.restore();
    };

    drawPoly(comparison.predictedCuePath, 'rgba(56, 189, 248, 0.88)', true, true);
    drawPoly(comparison.actualCuePath, 'rgba(251, 146, 60, 0.95)', false, false);
  }

  private drawTrajectories(prediction: TrajectoryPrediction, table: SnookerTable): void {
    const ctx = this.ctx;
    const sPx = (logicalMm: number, minPx: number) => Math.max(minPx, logicalMm * this.scale);

    // 1. Cue Ball Aim Line (or Curved Swerve Line) with high-contrast halo + core
    for (const segment of prediction.cuePath) {
      const s = this.toScreen(segment.start);
      const e = this.toScreen(segment.end);
      const bounce = (segment as any).bounce ?? 0;
      const alpha = Math.max(0.45, Math.pow(0.75, bounce));

      // Subtle dark contrast under-stroke so lines always stand out cleanly against felt
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.strokeStyle = `rgba(3, 12, 8, ${(0.55 * alpha).toFixed(2)})`;
      ctx.lineWidth = sPx(11, 4.2);
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);

      if (segment.type === 'swerve') {
        ctx.strokeStyle = `rgba(45, 212, 191, ${Math.min(1, alpha + 0.1).toFixed(2)})`;
        ctx.lineWidth = sPx(7, 2.8);
        ctx.setLineDash([]);
        ctx.stroke();
      } else if (segment.type === 'cushion-reflection') {
        ctx.strokeStyle = `rgba(245, 196, 81, ${alpha.toFixed(2)})`;
        ctx.setLineDash([sPx(18, 8), sPx(10, 5)]);
        ctx.lineWidth = sPx(6, 2.3);
        ctx.stroke();
        ctx.setLineDash([]);
        if (bounce > 0) {
          ctx.fillStyle = `rgba(245, 196, 81, ${alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, sPx(8, 3.5), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Crisp bright ivory primary aim ray
        ctx.strokeStyle = `rgba(255, 253, 245, 0.96)`;
        ctx.setLineDash([sPx(22, 10), sPx(11, 5)]);
        ctx.lineWidth = sPx(6.5, 2.5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 2. Ghost Ball with crisp contact reticle
    if (this.options.showGhostBall && prediction.ghostBall) {
      const gp = this.toScreen(prediction.ghostBall);
      const r = table.ballRadius * this.scale;

      ctx.save();
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = sPx(6, 2.4);
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(45, 212, 191, 0.24)';
      ctx.fill();

      // Center precision dot
      ctx.fillStyle = '#2DD4BF';
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, Math.max(2, r * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. ALL Object Ball Projected Paths (including post-border cushion rebounds & secondary balls!)
    const objPaths = prediction.objectBallPaths ?? [];
    if (objPaths.length > 0) {
      objPaths.forEach((obj, objIdx) => {
        const strokeHex = objIdx === 0 ? '#FF5757' : '#FBBF24';
        const segs = obj.segments;
        segs.forEach((segment, segIdx) => {
          const s = this.toScreen(segment.start);
          const e = this.toScreen(segment.end);
          const bounce = segment.bounce ?? 0;
          const alpha = Math.max(0.45, Math.pow(0.76, bounce));

          ctx.save();
          ctx.globalAlpha = alpha;
          // Under-stroke contrast
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = sPx(10, 4.0);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();

          ctx.strokeStyle = strokeHex;
          ctx.lineWidth = sPx(6.5, 2.5);
          if (bounce > 0) {
            ctx.setLineDash([sPx(18, 8), sPx(10, 5)]);
          }
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
          ctx.setLineDash([]);

          if (bounce > 0) {
            ctx.fillStyle = strokeHex;
            ctx.beginPath();
            ctx.arc(s.x, s.y, sPx(8, 3.5), 0, Math.PI * 2);
            ctx.fill();
          }

          if (segIdx === segs.length - 1) {
            this.drawArrowHead(s, e, strokeHex);
          }
          ctx.restore();
        });

        const endScreen = this.toScreen(obj.endPos);
        const r = table.ballRadius * this.scale;
        ctx.save();
        ctx.strokeStyle = strokeHex;
        ctx.lineWidth = Math.max(1.8, 4 * this.scale);
        ctx.setLineDash([Math.max(4, 9 * this.scale), Math.max(3, 6 * this.scale)]);
        ctx.beginPath();
        ctx.arc(endScreen.x, endScreen.y, r * 0.92, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    } else {
      for (const segment of prediction.targetPath) {
        const s = this.toScreen(segment.start);
        const e = this.toScreen(segment.end);

        ctx.save();
        ctx.strokeStyle = '#FF5757';
        ctx.lineWidth = sPx(6.5, 2.5);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        this.drawArrowHead(s, e, '#FF5757');
        ctx.restore();
      }
    }

    // 4. Cue Ball Post-Impact Deflection Path (Multi-cushion curved/rebound path)
    for (const segment of prediction.cueDeflectionPath) {
      const s = this.toScreen(segment.start);
      const e = this.toScreen(segment.end);
      const bounce = segment.bounce ?? 0;
      const alpha = Math.max(0.45, Math.pow(0.76, bounce));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = sPx(9, 3.8);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      ctx.strokeStyle = bounce > 0 ? '#60A5FA' : '#38BDF8';
      ctx.lineWidth = sPx(6, 2.3);
      ctx.setLineDash([sPx(12, 6), sPx(8, 4)]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (bounce > 0) {
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(s.x, s.y, sPx(7, 3.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Predicted Cue Final Resting Position Ring (when fullRoute is active)
    if (prediction.fullRoute && prediction.cueFinalPos) {
      const fp = this.toScreen(prediction.cueFinalPos);
      const r = table.ballRadius * this.scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 253, 245, 0.78)';
      ctx.lineWidth = Math.max(1.8, 4 * this.scale);
      ctx.setLineDash([Math.max(4, 9 * this.scale), Math.max(3, 6 * this.scale)]);
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBall(ball: Ball): void {
    const ctx = this.ctx;
    const p = this.toScreen(ball.position);
    const r = ball.radius * this.scale;
    const info = ball.colorInfo;

    // Drop shadow
    ctx.fillStyle = 'rgba(2, 8, 4, 0.48)';
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.25, p.y + r * 0.3, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ball.isStripe) {
      // Ivory spherical base + crisp color stripe band
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.clip();

      const ivoryGrad = ctx.createRadialGradient(
        p.x - r * 0.35,
        p.y - r * 0.35,
        r * 0.08,
        p.x,
        p.y,
        r
      );
      ivoryGrad.addColorStop(0, '#FFFFFF');
      ivoryGrad.addColorStop(0.6, '#F4EFE4');
      ivoryGrad.addColorStop(1, '#4B473E');
      ctx.fillStyle = ivoryGrad;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);

      // Colored center belt with spherical shading
      const bandGrad = ctx.createLinearGradient(p.x - r, p.y - r * 0.52, p.x + r, p.y + r * 0.52);
      bandGrad.addColorStop(0, info.specularHex);
      bandGrad.addColorStop(0.45, info.hex);
      bandGrad.addColorStop(1, '#090C10');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(p.x - r, p.y - r * 0.54, r * 2, r * 1.08);
      ctx.restore();
    } else {
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
      ballGrad.addColorStop(0.42, info.hex);
      ballGrad.addColorStop(1, '#050709');

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pool ball crisp number badge
    if (ball.number !== undefined) {
      ctx.fillStyle = '#FAF8F2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F141A';
      ctx.font = `700 ${Math.max(7, r * 0.62).toFixed(1)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ball.number), p.x, p.y + 0.5);
    }

    // Specular highlight spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cue ball spin indicator dot
    if (ball.type === 'cue' && (Math.abs(ball.spin.pitch) > 1 || Math.abs(ball.spin.yaw) > 1)) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCueStick(cueBall: Ball, aimAngleRad: number, powerPercent: number): void {
    const ctx = this.ctx;
    const p = this.toScreen(cueBall.position);
    const r = cueBall.radius * this.scale;

    // Regulation 57-inch (1450 mm) slender championship cue proportions
    const pullback = (10 + (powerPercent / 100) * 85) * this.scale;
    const cueLength = 1380 * this.scale;
    const tipHalfW = Math.max(1.4, 4.6 * this.scale);
    const jointHalfW = Math.max(2.6, 10.0 * this.scale);
    const buttHalfW = Math.max(3.6, 14.5 * this.scale);

    const backAngle = aimAngleRad + Math.PI;
    const dirX = Math.cos(backAngle);
    const dirY = Math.sin(backAngle);
    const nx = -dirY;
    const ny = dirX;

    const tipDist = r + pullback;
    const pt = (d: number) => ({ x: p.x + dirX * d, y: p.y + dirY * d });

    const tipFaceDist = tipDist;
    const ferruleStartDist = tipDist + 4.5 * this.scale;
    const shaftStartDist = tipDist + 14 * this.scale;
    const jointDist = tipDist + cueLength * 0.72; // 3/4 championship joint split
    const buttEndDist = tipDist + cueLength;

    const chalkFace = pt(tipFaceDist);
    const ferruleStart = pt(ferruleStartDist);
    const shaftStart = pt(shaftStartDist);
    const jointPos = pt(jointDist);
    const buttEnd = pt(buttEndDist);

    const isCarbon = this.options.cueSpec?.id === 'carbon-low-deflect';
    const shaftCol = this.options.cueSpec?.shaftColor ?? '#E8CC99';
    const buttCol = this.options.cueSpec?.buttColor ?? '#1E110A';
    const tipCol = this.options.tipSpec?.colorHex ?? '#1D4ED8';

    ctx.save();

    // Helper for tapered 3D-shaded cylinder section
    const drawTaperSection = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      rA: number,
      rB: number,
      cDark: string,
      cHighlight: string,
      cBase: string
    ) => {
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const midW = (rA + rB) / 2;
      const crossGrad = ctx.createLinearGradient(
        midX - nx * midW,
        midY - ny * midW,
        midX + nx * midW,
        midY + ny * midW
      );
      crossGrad.addColorStop(0, cDark);
      crossGrad.addColorStop(0.25, cHighlight);
      crossGrad.addColorStop(0.6, cBase);
      crossGrad.addColorStop(1, cDark);

      ctx.fillStyle = crossGrad;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * rA, a.y + ny * rA);
      ctx.lineTo(b.x + nx * rB, b.y + ny * rB);
      ctx.lineTo(b.x - nx * rB, b.y - ny * rB);
      ctx.lineTo(a.x - nx * rA, a.y - ny * rA);
      ctx.closePath();
      ctx.fill();
    };

    // 1. Sleek tapered cast cloth shadow (grounded, proportional)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.moveTo(ferruleStart.x + 5 * this.scale + nx * tipHalfW, ferruleStart.y + 8 * this.scale + ny * tipHalfW);
    ctx.lineTo(buttEnd.x + 12 * this.scale + nx * buttHalfW, buttEnd.y + 18 * this.scale + ny * buttHalfW);
    ctx.lineTo(buttEnd.x + 12 * this.scale - nx * buttHalfW, buttEnd.y + 18 * this.scale - ny * buttHalfW);
    ctx.lineTo(ferruleStart.x + 5 * this.scale - nx * tipHalfW, ferruleStart.y + 8 * this.scale - ny * tipHalfW);
    ctx.closePath();
    ctx.fill();

    // 2. Main Playing Shaft (Ash grain or Carbon weave)
    drawTaperSection(
      shaftStart,
      jointPos,
      tipHalfW * 1.02,
      jointHalfW,
      isCarbon ? '#12151B' : '#8B683A',
      isCarbon ? '#4B5563' : '#FAF0DC',
      shaftCol
    );

    // Feathered North American Ash chevron grain striations (or subtle carbon sheen ticks)
    ctx.strokeStyle = isCarbon ? 'rgba(255, 255, 255, 0.08)' : 'rgba(110, 74, 30, 0.19)';
    ctx.lineWidth = Math.max(0.7, 1.3 * this.scale);
    for (let i = 1; i <= 14; i++) {
      const f = i / 16;
      const dist = shaftStartDist + (jointDist - shaftStartDist) * f;
      const cPt = pt(dist);
      const localHalfW = (tipHalfW * 1.02 + (jointHalfW - tipHalfW * 1.02) * f) * 0.85;
      const vBack = pt(dist + 22 * this.scale);
      ctx.beginPath();
      ctx.moveTo(vBack.x + nx * localHalfW, vBack.y + ny * localHalfW);
      ctx.lineTo(cPt.x, cPt.y);
      ctx.lineTo(vBack.x - nx * localHalfW, vBack.y - ny * localHalfW);
      ctx.stroke();
    }

    // 3. Hand-Spliced Hardwood Butt Handle + Twin Decorative Veneer Splice Points
    drawTaperSection(
      jointPos,
      buttEnd,
      jointHalfW,
      buttHalfW,
      '#080605',
      '#5A3925',
      buttCol
    );

    // Two sharp rosewood/gold veneer splice chevrons projecting cleanly past the butt collar
    const drawVeneerDart = (startFrac: number, peakFrac: number, widthRatio: number, fillHex: string) => {
      const a = pt(tipDist + cueLength * startFrac);
      const peak = pt(tipDist + cueLength * peakFrac);
      const tail = pt(tipDist + cueLength * 0.96);
      const wSpan = (jointHalfW + (buttHalfW - jointHalfW) * ((startFrac - 0.72) / 0.28)) * widthRatio;
      ctx.fillStyle = fillHex;
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y);
      ctx.lineTo(a.x + nx * wSpan, a.y + ny * wSpan);
      ctx.lineTo(tail.x + nx * wSpan * 0.9, tail.y + ny * wSpan * 0.9);
      ctx.lineTo(tail.x - nx * wSpan * 0.9, tail.y - ny * wSpan * 0.9);
      ctx.lineTo(a.x - nx * wSpan, a.y - ny * wSpan);
      ctx.closePath();
      ctx.fill();
    };
    drawVeneerDart(0.84, 0.75, 0.88, '#D97706'); // Outer maple/amber veneer trim
    drawVeneerDart(0.86, 0.77, 0.72, '#10B981'); // Emerald accent pinstripe
    drawVeneerDart(0.875, 0.79, 0.56, '#0D0B0A'); // Ebony core heartwood

    // Minimalist Brass Maker Nameplate on Butt Handle
    const plateA = pt(tipDist + cueLength * 0.905);
    const plateB = pt(tipDist + cueLength * 0.945);
    drawTaperSection(plateA, plateB, buttHalfW * 0.42, buttHalfW * 0.42, '#785A28', '#F6DF9F', '#C5A059');

    // 4. 3/4 Brass Quick-Release Joint Collar with Dark Phenolic Flanks
    const jointRimA = pt(jointDist - 12 * this.scale);
    const jointRimB = pt(jointDist + 14 * this.scale);
    drawTaperSection(jointRimA, jointRimB, jointHalfW * 0.99, jointHalfW * 1.03, '#111317', '#333A45', '#1C2026');
    const brassCoreA = pt(jointDist - 6 * this.scale);
    const brassCoreB = pt(jointDist + 8 * this.scale);
    drawTaperSection(brassCoreA, brassCoreB, jointHalfW * 1.01, jointHalfW * 1.03, '#7C5E28', '#FCE6A4', '#D4B06A');

    // 5. Machined Butt Collar + Black Rubber Bumper Cap
    const bumperStart = pt(tipDist + cueLength * 0.978);
    drawTaperSection(
      pt(tipDist + cueLength * 0.968),
      bumperStart,
      buttHalfW * 0.99,
      buttHalfW * 0.99,
      '#7C5E28',
      '#FCE6A4',
      '#D4B06A'
    );
    drawTaperSection(bumperStart, buttEnd, buttHalfW * 0.96, buttHalfW * 0.78, '#050608', '#333A45', '#15181E');

    // 6. Precision Machined Brass Ferrule + Fiber Pad
    drawTaperSection(
      ferruleStart,
      shaftStart,
      tipHalfW * 1.01,
      tipHalfW * 1.02,
      '#7C5E28',
      '#FCE6A4',
      '#D4B06A'
    );

    // 7. Domed Multi-Layered Chalked Tip (Elk / Phenolic)
    ctx.fillStyle = tipCol;
    ctx.beginPath();
    ctx.arc(
      chalkFace.x + dirX * (2 * this.scale),
      chalkFace.y + dirY * (2 * this.scale),
      tipHalfW,
      backAngle - Math.PI / 2,
      backAngle + Math.PI / 2,
      true
    );
    ctx.lineTo(ferruleStart.x - nx * tipHalfW, ferruleStart.y - ny * tipHalfW);
    ctx.lineTo(ferruleStart.x + nx * tipHalfW, ferruleStart.y + ny * tipHalfW);
    ctx.closePath();
    ctx.fill();

    // Subtle chalk-dust rim highlight on tip crown
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = Math.max(0.8, 1.2 * this.scale);
    ctx.beginPath();
    ctx.arc(
      chalkFace.x + dirX * (2 * this.scale),
      chalkFace.y + dirY * (2 * this.scale),
      tipHalfW * 0.85,
      backAngle + Math.PI * 0.65,
      backAngle + Math.PI * 1.35
    );
    ctx.stroke();

    ctx.restore();
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
