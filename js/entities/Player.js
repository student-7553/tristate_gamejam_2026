import { SlingshotController } from '../components/SlingshotController.js';

export class Player {
  /**
   * @param {number} screenWidth
   * @param {number} screenHeight
   */
  constructor(screenWidth, screenHeight) {
    this.width = 32;
    this.height = 32;

    // Spawn at the centre of the screen
    this.x = screenWidth / 2 - this.width / 2;
    this.y = screenHeight / 2 - this.height / 2;

    // Physics
    this.velocity = { x: 0, y: 0 };
    this.isStatic = true;

    // Slingshot Controller
    this.slingshot = new SlingshotController(screenWidth / 2, screenHeight / 2);

    this.color = '#000000';
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.isStatic = true;
    this.lastHookedBush = null;
    this.slingshot.isDragging = false;
  }

  update(dt, mouse) {
    const updates = this.slingshot.update(this, dt, mouse);

    if (updates) {
      if (updates.x !== undefined) this.x = updates.x;
      if (updates.y !== undefined) this.y = updates.y;
      if (updates.isStatic !== undefined) this.isStatic = updates.isStatic;
      if (updates.velocity) {
        this.velocity.x = updates.velocity.x;
        this.velocity.y = updates.velocity.y;
      }
    }
  }

  draw(ctx, gravity) {
    this.slingshot.draw(ctx, this, gravity);

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
