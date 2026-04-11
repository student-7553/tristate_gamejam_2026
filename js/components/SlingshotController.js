export class SlingshotController {
  constructor(anchorX, anchorY) {
    this.anchor = { x: anchorX, y: anchorY };
    this.isDragging = false;
    this.maxDragDistance = 100;
    this.slingshotMultiplier = 12;
    // Current constrained drag offset from anchor (world space)
    this.dragDx = 0;
    this.dragDy = 0;
  }

  update(player, dt, mouse) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const updates = {};

    if (player.isStatic) {
      // Just started clicking?
      if (mouse && mouse.isDown && !mouse.wasDown) {
        // Check if mouse is over or near the player
        const distToPlayer = Math.hypot(mouse.x - cx, mouse.y - cy);
        if (distToPlayer < 50) {
          this.isDragging = true;
          this.dragDx = 0;
          this.dragDy = 0;
          // Set anchor to where the player currently is so we slingshot from here
          this.anchor = { x: cx, y: cy };
        }
      }

      if (this.isDragging) {
        if (mouse.isDown) {
          // Drag logic — track direction but do NOT move the player
          let dx = mouse.x - this.anchor.x;
          let dy = mouse.y - this.anchor.y;
          const distToAnchor = Math.hypot(dx, dy);

          // Constrain distance to the maximum drag circle
          if (distToAnchor > this.maxDragDistance) {
            dx = (dx / distToAnchor) * this.maxDragDistance;
            dy = (dy / distToAnchor) * this.maxDragDistance;
          }

          this.dragDx = dx;
          this.dragDy = dy;
        } else {
          // Released!
          this.isDragging = false;
          updates.isStatic = false; // Give in to gravity and physics!

          // Shoot in the opposite direction of the drag
          updates.velocity = {
            x: -this.dragDx * this.slingshotMultiplier,
            y: -this.dragDy * this.slingshotMultiplier
          };

          this.dragDx = 0;
          this.dragDy = 0;
        }
      }
    }

    return updates;
  }

  draw(ctx, player, gravity = 980) {
    if (this.isDragging) {
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;

      // Draw slingshot band from player centre to drag tip
      const dragTipX = this.anchor.x + this.dragDx;
      const dragTipY = this.anchor.y + this.dragDy;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(dragTipX, dragTipY);
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw the maximum drag circle
      ctx.beginPath();
      ctx.arc(this.anchor.x, this.anchor.y, this.maxDragDistance, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Trajectory preview — short dotted arc (5 steps, 0.05 s each = 0.25 s total)
      const vx = -this.dragDx * this.slingshotMultiplier;
      const vy = -this.dragDy * this.slingshotMultiplier;
      const STEP = 0.05;
      const STEPS = 5;

      for (let i = 1; i <= STEPS; i++) {
        const t = i * STEP;
        const dotX = cx + vx * t;
        const dotY = cy + vy * t + 0.5 * gravity * t * t;
        const alpha = (1 - (i - 1) / STEPS) * 0.75; // fades toward the tip
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    }
  }
}
