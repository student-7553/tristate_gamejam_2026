export class SecurityCamera {
  /**
   * @param {number} x           - world-space X (placed on the wall edge)
   * @param {number} y           - world-space Y
   * @param {number} baseAngle   - facing direction: 0 for left-wall cam (→), Math.PI for right-wall (←)
   * @param {number} phaseOffset - initial sweep phase so cameras aren't synchronised
   */
  constructor(x, y, baseAngle, phaseOffset = 0) {
    this.x         = x;
    this.y         = y;
    this.baseAngle = baseAngle;
    this.isStatic  = true;

    // Sweep behaviour — randomised per camera so they feel independent
    this.sweepRange = Math.PI / 3 + Math.random() * (Math.PI / 6); // ±60°–±90°
    this.sweepSpeed = 0.8 + Math.random() * 0.7;                    // 0.8–1.5 rad/s
    this.sweepTime  = phaseOffset;

    // Vision cone
    this.fovAngle = Math.PI / 4; // 45° total (±22.5° from look direction)
    this.range    = 320;

    this.currentAngle = baseAngle;
  }

  update(dt) {
    this.sweepTime    += dt * this.sweepSpeed;
    this.currentAngle  = this.baseAngle + Math.sin(this.sweepTime) * this.sweepRange;
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

    // Vision cone (filled wedge)
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(
      this.x, this.y, this.range,
      this.currentAngle - this.fovAngle / 2,
      this.currentAngle + this.fovAngle / 2
    );
    ctx.closePath();
    ctx.fillStyle   = 'rgba(255, 220, 0, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Camera housing (small rectangle mounted on the wall)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(this.x - 7, this.y - 5, 14, 10);

    // Lens dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();

    ctx.restore();
  }
}
