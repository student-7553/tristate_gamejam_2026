import { SlingshotController } from '../components/SlingshotController.js';

const PLAYER_SPRITE_CONFIG = {
  sx: 18 * 5,      // Source x on tilemap
  sy: 18 * 7,      // Source y on tilemap
  sWidth: 18,      // Source width
  sHeight: 18      // Source height
};

export class Player {
  /**
   * @param {number} screenWidth
   * @param {number} screenHeight
   */
  constructor(screenWidth, screenHeight) {
    this.width  = 32;
    this.height = 32;

    this.x = screenWidth  / 2 - this.width  / 2;
    this.y = screenHeight / 2 - this.height / 2;

    this.velocity = { x: 0, y: 0 };
    this.isStatic      = true;
    this.isWallClinging = false;

    this.slingshot = new SlingshotController(screenWidth, screenHeight);

    this.color = '#000000';

    // Sprite
    this.sprite = new Image();
    this.sprite.src = 'assets/art/tilemap_packed.png';
    this.spriteConfig = PLAYER_SPRITE_CONFIG;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.velocity.x   = 0;
    this.velocity.y   = 0;
    this.isStatic       = true;
    this.isWallClinging = false;
    this.lastHookedBush = null;
    this.slingshot.isDragging = false;
    this.slingshot.dragDx     = 0;
    this.slingshot.dragDy     = 0;
  }

  /**
   * @param {number} dt
   * @param {object} screenMouse  - raw screen-space mouse
   * @param {{x,y}}  camera       - world-space camera centre
   * @param {number} zoom
   */
  update(dt, screenMouse, camera, zoom) {
    const updates = this.slingshot.update(this, dt, screenMouse, camera, zoom);

    if (updates) {
      if (updates.isStatic !== undefined) {
        this.isStatic = updates.isStatic;
        if (!updates.isStatic) this.isWallClinging = false; // launch clears wall cling
      }
      if (updates.velocity) {
        this.velocity.x = updates.velocity.x;
        this.velocity.y = updates.velocity.y;
      }
    }
  }

  draw(ctx, gravity, zoom) {
    this.slingshot.draw(ctx, this, zoom, gravity);

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(
        this.sprite,
        this.spriteConfig.sx,
        this.spriteConfig.sy,
        this.spriteConfig.sWidth,
        this.spriteConfig.sHeight,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}
