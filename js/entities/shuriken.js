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

  ctx.fillStyle = "#292929";

  const spikeLength = this.size;
  const spikeWidth = this.size / 2;

  ctx.beginPath();

  for (let i = 0; i < 4; i++) {
    ctx.moveTo(0, -spikeLength);
    ctx.lineTo(spikeWidth, 0);
    ctx.lineTo(0, spikeWidth);
    ctx.lineTo(-spikeWidth, 0);
    ctx.closePath();

    ctx.rotate(Math.PI / 2); // rotate 90° for next spike
  }

  ctx.fill();

  // center circle
  ctx.beginPath();
  ctx.arc(0, 0, this.size / 4, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  ctx.restore();
}
  }
