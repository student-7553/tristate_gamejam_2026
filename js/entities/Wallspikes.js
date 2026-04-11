export class WallSpikes {

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} isLeftWall
   * @param {number} count - number of spikes in this vertical series
   */

  constructor(x, y, isLeftWall = true, count = 3) {
    this.x = x;
    this.y = y;

    this.isLeftWall = isLeftWall;
    this.isStatic = true;

    // Each spike is uniform size (NO randomness per spike)
    this.spikeHeight = 18;
    this.length = 18;

    // how many spikes in this vertical chain
    this.count = count;

    // spacing between spikes in the series
    this.spacing = this.spikeHeight + 1;
  }

  update(dt) {}

  isPointTouching(px, py) {
    const dir = this.isLeftWall ? 1 : -1;

    for (let i = 0; i < this.count; i++) {
      const spikeY = this.y + i * this.spacing;

      const tipX = this.x + dir * this.length;

      const minX = Math.min(this.x, tipX);
      const maxX = Math.max(this.x, tipX);

      const minY = spikeY - this.spikeHeight / 2;
      const maxY = spikeY + this.spikeHeight / 2;

      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        return true;
      }
    }

    return false;
  }

  draw(ctx) {
    ctx.save();

    const dir = this.isLeftWall ? 1 : -1;

    for (let i = 0; i < this.count; i++) {
      const y = this.y + i * this.spacing;
      const tipX = this.x + dir * this.length;

      ctx.beginPath();
      ctx.moveTo(this.x, y - this.spikeHeight / 2);
      ctx.lineTo(this.x, y + this.spikeHeight / 2);
      ctx.lineTo(tipX, y);
      ctx.closePath();

      ctx.fillStyle = "#cfcfcf";
      ctx.fill();

      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}