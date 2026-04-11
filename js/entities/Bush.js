const sharedSprite = new Image();
// sharedSprite.src = 'assets/art/tilemap_edited_packed.png';
sharedSprite.src = 'assets/art/bush.png';
// 

// const BUSH_SPRITE_CONFIG = {
//   sx: 18 * 17,      // Bush tile x coordinates (customize here)
//   sy: 18 * 0,      // Bush tile y coordinates (customize here)
//   sWidth: 18 * 3,
//   sHeight: 18 * 3
// };

const BUSH_SPRITE_CONFIG = {
  sx: 0,      // Bush tile x coordinates (customize here)
  sy: 0,      // Bush tile y coordinates (customize here)
  sWidth: 800,
  sHeight: 800
};

// const BUSH_OVERLAY_SPRITE_CONFIG = {
//   sx: 18 * 17,      // Bush overlay tile x coordinates (customize here)
//   sy: 18 * 0,      // Bush overlay tile y coordinates (customize here)
//   sWidth: 18 * 3,
//   sHeight: 18 * 3
// };

export class Bush {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.type = 'bush';
    this.isStatic = true; // No physics apply to the bush
    this.isDisabled = false;
    this.isDead = false;

    // Pop animation state
    this._popping = false;
    this._popTimer = 0;
    this._popDuration = 0.35;

    this.sprite = sharedSprite;
    this.spriteConfig = BUSH_SPRITE_CONFIG;
  }

  /** Trigger the pop animation — call when the player leaves this bush. */
  pop() {
    this.isDisabled = true;
    this._popping = true;
    this._popTimer = 0;
  }

  update(dt) {
    if (!this._popping) return;
    this._popTimer += dt;
    if (this._popTimer >= this._popDuration) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    if (this.isDead) return;
    if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;

    const drawSize = this.radius * 3;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this._popping) {
      const t = Math.min(this._popTimer / this._popDuration, 1);
      // Scale up from 1 → 1.6 as t goes 0 → 1
      const scale = 1 + t * 0.6;
      // Fade out: alpha 1 → 0
      const alpha = 1 - t;
      ctx.globalAlpha = alpha;
      ctx.scale(scale, scale);
    }

    ctx.drawImage(
      this.sprite,
      this.spriteConfig.sx,
      this.spriteConfig.sy,
      this.spriteConfig.sWidth,
      this.spriteConfig.sHeight,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize
    );

    ctx.restore();
  }
}
