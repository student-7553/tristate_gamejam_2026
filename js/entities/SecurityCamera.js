export class SecurityCamera {
  /**
   * @param {number} x           - world-space X (placed on the wall edge)
   * @param {number} y           - world-space Y
   * @param {number} baseAngle   - facing direction: 0 for left-wall cam (→), Math.PI for right-wall (←)
   * @param {number} phaseOffset - initial sweep phase so cameras aren't synchronised
   */
  /**
   * @param {number} difficulty  - 0 (easy) to 1 (hard); scales sweep speed, FOV, and range
   */
  constructor(x, y, baseAngle, phaseOffset = 0, difficulty = 0) {
    this.x         = x;
    this.y         = y;
    this.baseAngle = baseAngle;
    this.isStatic  = true;

    // Sweep — faster and wider at higher difficulty
    this.sweepRange = Math.PI / 3 + Math.random() * (Math.PI / 6) + difficulty * (Math.PI / 8);
    this.sweepSpeed = (0.8 + Math.random() * 0.7) * (1 + difficulty * 1.5); // up to 2.75× faster
    this.sweepTime  = phaseOffset;

    // Vision cone — wider FOV and longer range at higher difficulty
    this.fovAngle = Math.PI / 4 + difficulty * (Math.PI / 9); // 45° → ~65°
    this.range    = 320 + Math.round(difficulty * 110);        // 320 → 430 px

    this.currentAngle = baseAngle;

    // Set by GameManager._checkDetection() each frame
    this.isDetecting = false;
  }

  update(dt, px = null, py = null) {
    if (this.isDetecting && px !== null) {
      // Chase the player — smoothly rotate currentAngle towards them
      const targetAngle = Math.atan2(py - this.y, px - this.x);
      let diff = targetAngle - this.currentAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.currentAngle += diff * Math.min(1, 5 * dt);
      // Keep sweepTime ticking so the sweep resumes naturally when the player hides
      this.sweepTime += dt * this.sweepSpeed;
    } else {
      this.sweepTime    += dt * this.sweepSpeed;
      this.currentAngle  = this.baseAngle + Math.sin(this.sweepTime) * this.sweepRange;
    }
  }

  /** Returns true if world-space point (px, py) is inside the vision cone. */
  isPointInCone(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    if (Math.hypot(dx, dy) > this.range) return false;

    let diff = Math.atan2(dy, dx) - this.currentAngle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    return Math.abs(diff) < this.fovAngle / 2;
  }

  draw(ctx) {
    ctx.save();

    const alert = this.isDetecting;

    // Vision cone — yellow when sweeping, red when detecting
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(
      this.x, this.y, this.range,
      this.currentAngle - this.fovAngle / 2,
      this.currentAngle + this.fovAngle / 2
    );
    ctx.closePath();
    ctx.fillStyle   = alert ? 'rgba(255, 40, 0, 0.30)' : 'rgba(255, 220, 0, 0.12)';
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255, 60, 0, 0.75)' : 'rgba(255, 200, 0, 0.35)';
    ctx.lineWidth   = alert ? 2.5 : 1.5;
    ctx.stroke();

    // Camera housing
    ctx.fillStyle = alert ? '#991100' : '#1a1a1a';
    ctx.fillRect(this.x - 7, this.y - 5, 14, 10);

    // Lens dot — red when detecting, yellow when idle
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = alert ? '#ff2200' : '#ffcc00';
    ctx.fill();

    // "!" alert bubble above the camera when detecting
    if (alert) {
      const bob  = Math.sin(Date.now() * 0.01) * 2;
      const bubX = this.x;
      const bubY = this.y - 24 + bob;

      ctx.beginPath();
      ctx.arc(bubX, bubY, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 20, 0, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bubX, bubY);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }
}
