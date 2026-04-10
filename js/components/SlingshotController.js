export class SlingshotController {
  constructor(anchorX, anchorY) {
    this.anchor = { x: anchorX, y: anchorY };
    this.isDragging = false;
    this.maxDragDistance = 150;
    this.slingshotMultiplier = 10;
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

  draw(ctx, player) {
    if (this.isDragging) {
      // Draw slingshot band
      ctx.beginPath();
      ctx.moveTo(this.anchor.x, this.anchor.y);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw the maximum drag circle
      ctx.beginPath();
      ctx.arc(this.anchor.x, this.anchor.y, this.maxDragDistance, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
