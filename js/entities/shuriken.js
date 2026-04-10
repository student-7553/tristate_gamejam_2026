export class shuriken {
  constructor(x, y, speed = 200) {
    this.x = x;
    this.y = y;

    this.speed = speed;
    this.size = 12;
    this.isStatic = true;
    this.rotation = 0;
    this.rotationSpeed = 10;
  }

  update(dt) {
    this.x += this.speed * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  draw(ctx) {
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = "#ff0000";

    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size, this.size);
    ctx.lineTo(-this.size, this.size);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}