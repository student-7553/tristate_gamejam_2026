export class Bush {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.type = 'bush';
    this.isStatic = true; // No physics apply to the bush
    this.color = '#ffffff';
    this.isDisabled = false;
  }

  update(dt, mouse) {
    // Bush logic (static, does nothing right now)
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isDisabled ? '#555555' : this.color;
    ctx.fill();
    
    // Outline to make it pop against any bright background
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
