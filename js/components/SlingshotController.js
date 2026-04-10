export class SlingshotController {
  constructor(anchorX, anchorY) {
    this.anchor = { x: anchorX, y: anchorY };
    this.isDragging = false;
    this.maxDragDistance = 100;
    this.slingshotMultiplier = 12;
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
          // Set anchor to where the player currently is so we slingshot from here
          this.anchor = { x: cx, y: cy };
        }
      }

      if (this.isDragging) {
        if (mouse.isDown) {
          // Drag logic
          let dx = mouse.x - this.anchor.x;
          let dy = mouse.y - this.anchor.y;
          const distToAnchor = Math.hypot(dx, dy);

          // Constrain distance to the maximum drag circle
          if (distToAnchor > this.maxDragDistance) {
            dx = (dx / distToAnchor) * this.maxDragDistance;
            dy = (dy / distToAnchor) * this.maxDragDistance;
          }

          updates.x = this.anchor.x + dx - player.width / 2;
          updates.y = this.anchor.y + dy - player.height / 2;
        } else {
          // Released!
          this.isDragging = false;
          updates.isStatic = false; // Give in to gravity and physics!

          // Calculate velocity based on vector from current pos to anchor
          const shootDx = this.anchor.x - (player.x + player.width / 2);
          const shootDy = this.anchor.y - (player.y + player.height / 2);

          updates.velocity = {
            x: shootDx * this.slingshotMultiplier,
            y: shootDy * this.slingshotMultiplier
          };
        }
      }
    }

    return updates;
  }

  draw(ctx, player, gravity = 980) {
    if (this.isDragging) {
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;

      // Draw slingshot band
      ctx.beginPath();
      ctx.moveTo(this.anchor.x, this.anchor.y);
      ctx.lineTo(cx, cy);
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
      const vx = (this.anchor.x - cx) * this.slingshotMultiplier;
      const vy = (this.anchor.y - cy) * this.slingshotMultiplier;
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
