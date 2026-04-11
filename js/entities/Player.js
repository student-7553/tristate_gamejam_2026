import { SlingshotController } from '../components/SlingshotController.js';

const PLAYER_SPRITE_CONFIG = {
  sx: 24 * 6,      // Source x on tilemap
  sy: 24 * 0,      // Source y on tilemap
  sWidth: 24,      // Source width
  sHeight: 24      // Source height
};

export class Player {
  /**
   * @param {number} screenWidth
   * @param {number} screenHeight
   */
  constructor(screenWidth, screenHeight) {
    this.width = 32;
    this.height = 32;

    this.x = screenWidth / 2 - this.width / 2;
    this.y = screenHeight / 2 - this.height / 2;

    this.velocity = { x: 0, y: 0 };
    this.isStatic = true;
    this.isWallClinging = false;
    this.angle = 0; // 0 radians is facing right (upright)

    this.slingshot = new SlingshotController(screenWidth, screenHeight);

    this.color = '#000000';

    // Sprite
    this.sprite = new Image();
    this.sprite.src = 'assets/art/tilemap-characters_packed.png';
    this.spriteConfig = PLAYER_SPRITE_CONFIG;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.isStatic = true;
    this.isWallClinging = false;

    this.angle = 0;

    this.lastHookedBush = null;
    this.slingshot.isDragging = false;
    this.slingshot.dragDx = 0;
    this.slingshot.dragDy = 0;
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

    // Determine the angle the player should face
    if (!this.isStatic) {
      // If moving, face the direction of flight
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
      }
    } else if (this.slingshot.isDragging) {
      // If dragging, aim the player at the launch trajectory (opposite of drag)
      this.angle = Math.atan2(-this.slingshot.dragDy, -this.slingshot.dragDx);
    } else if (this.isWallClinging) {
      // When clinging to a wall, default to pointing essentially up
      this.angle = -Math.PI / 2;
    } else {
      // Default to upward trajectory angle when stationed perfectly on a bush
      this.angle = -Math.PI / 2;
    }
  }

  draw(ctx, gravity, zoom) {
    // Draw slingshot band
    this.slingshot.draw(ctx, this, zoom, gravity);

    ctx.save();

    // Rotate from the center of the player
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);
    
    // Add a 90-degree offset (+Math.PI / 2). 
    // Canvas 0 angle is RIGHT (+X), but the top of our character's head inherently points UP (-Y).
    ctx.rotate(this.angle + Math.PI / 2);

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(
        this.sprite,
        this.spriteConfig.sx,
        this.spriteConfig.sy,
        this.spriteConfig.sWidth,
        this.spriteConfig.sHeight,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }
}
