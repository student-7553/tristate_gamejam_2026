export class SlingshotController {
  constructor(screenWidth, screenHeight) {
    this.screenWidth  = screenWidth;
    this.screenHeight = screenHeight;

    this.anchor  = { x: screenWidth / 2, y: screenHeight / 2 }; // world-space, set on drag start
    this.isDragging = false;

    // maxDragDistance is in SCREEN pixels — zoom-independent feel
    this.maxDragDistance    = 100;
    this.slingshotMultiplier = 12;

    // Drag offset stored in world-space (screen drag / zoom)
    this.dragDx = 0;
    this.dragDy = 0;
  }

  /**
   * @param {object} player
   * @param {number} dt
   * @param {object} screenMouse  - raw screen-space mouse {x, y, isDown, wasDown}
   * @param {{x,y}}  camera       - world-space camera centre
   * @param {number} zoom
   */
  update(player, dt, screenMouse, camera, zoom) {
    // Player centre in screen space — derived fresh each frame so it's always correct
    const cx_w = player.x + player.width  / 2;
    const cy_w = player.y + player.height / 2;
    const cx_s = (cx_w - camera.x) * zoom + this.screenWidth  / 2;
    const cy_s = (cy_w - camera.y) * zoom + this.screenHeight / 2;

    const updates = {};

    if (player.isStatic) {
      // Just started clicking?
      if (screenMouse && screenMouse.isDown && !screenMouse.wasDown) {
        const distToPlayer = Math.hypot(screenMouse.x - cx_s, screenMouse.y - cy_s);
        if (distToPlayer < 50) {
          this.isDragging = true;
          this.dragDx = 0;
          this.dragDy = 0;
          // Anchor is the player's world position at drag start
          this.anchor = { x: cx_w, y: cy_w };
        }
      }

      if (this.isDragging) {
        if (screenMouse.isDown) {
          // Drag in screen space — unaffected by zoom transitions
          let dx_s = screenMouse.x - cx_s;
          let dy_s = screenMouse.y - cy_s;
          const dist_s = Math.hypot(dx_s, dy_s);

          if (dist_s > this.maxDragDistance) {
            dx_s = (dx_s / dist_s) * this.maxDragDistance;
            dy_s = (dy_s / dist_s) * this.maxDragDistance;
          }

          // Store as world-space offset so draw() works correctly
          this.dragDx = dx_s / zoom;
          this.dragDy = dy_s / zoom;
        } else {
          // Released — shoot opposite to drag direction
          this.isDragging = false;
          updates.isStatic = false;
          updates.velocity = {
            x: -this.dragDx * this.slingshotMultiplier,
            y: -this.dragDy * this.slingshotMultiplier,
          };
          this.dragDx = 0;
          this.dragDy = 0;
        }
      }
    }

    return updates;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx  - already in world space
   * @param {object} player
   * @param {number} zoom
   * @param {number} gravity
   */
  draw(ctx, player, zoom, gravity = 980) {
    if (!this.isDragging) return;

    const cx = player.x + player.width  / 2;
    const cy = player.y + player.height / 2;

    const dragTipX = this.anchor.x + this.dragDx;
    const dragTipY = this.anchor.y + this.dragDy;

    // Rubber band
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(dragTipX, dragTipY);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Max-drag circle — radius in world units = screen pixels / zoom → constant screen size
    ctx.beginPath();
    ctx.arc(this.anchor.x, this.anchor.y, this.maxDragDistance / zoom, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trajectory preview (5 dots, 0.05 s apart)
    const vx = -this.dragDx * this.slingshotMultiplier;
    const vy = -this.dragDy * this.slingshotMultiplier;
    const STEP = 0.05;
    const STEPS = 5;

    for (let i = 1; i <= STEPS; i++) {
      const t     = i * STEP;
      const dotX  = cx + vx * t;
      const dotY  = cy + vy * t + 0.5 * gravity * t * t;
      const alpha = (1 - (i - 1) / STEPS) * 0.75;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }
}
