export class Bush {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.type = 'bush';
    this.isStatic = true; // No physics apply to the bush
    this.isDisabled = false;
  }

  update(dt, mouse) {
    // Bush logic (static, does nothing right now)
  }

  draw(ctx) {
    ctx.save();

    if (this.isDisabled) {
      // Flattened, used-up look
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Multi-blob bushy look — overlapping circles in dark greens
      const blobs = [
        { ox: 0,                    oy:  this.radius * 0.1,   r: this.radius,        color: '#1f5c1f' },
        { ox: -this.radius * 0.55,  oy:  this.radius * 0.15,  r: this.radius * 0.78, color: '#256b25' },
        { ox:  this.radius * 0.55,  oy:  this.radius * 0.15,  r: this.radius * 0.78, color: '#256b25' },
        { ox: -this.radius * 0.25,  oy: -this.radius * 0.45,  r: this.radius * 0.65, color: '#2d7a2d' },
        { ox:  this.radius * 0.25,  oy: -this.radius * 0.50,  r: this.radius * 0.6,  color: '#2d7a2d' },
      ];

      for (const b of blobs) {
        ctx.beginPath();
        ctx.arc(this.x + b.ox, this.y + b.oy, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      }

      // Subtle dark outline to distinguish from the background
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}
