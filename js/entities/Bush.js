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

    this.sprite = sharedSprite;
    this.spriteConfig = BUSH_SPRITE_CONFIG;
    // this.overlaySpriteConfig = BUSH_OVERLAY_SPRITE_CONFIG;
  }

  update(dt, mouse) {
    // Bush logic (static, does nothing right now)
  }

  draw(ctx) {
    if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;

    ctx.save();
    const drawSize = this.radius * 3; // roughly 44px
    const dx = this.x - drawSize / 2;
    const dy = this.y - drawSize / 2;

    const drawSize2 = this.radius * 1.5;
    const dx2 = this.x - drawSize2 / 2;
    const dy2 = this.y - drawSize2 / 2;

    if (this.isDisabled) {
      // Flattened, squished look when used
      ctx.translate(this.x, this.y + this.radius / 2);
      // ctx.scale(1, 0.4);
      ctx.drawImage(
        this.sprite,
        this.spriteConfig.sx,
        this.spriteConfig.sy,
        this.spriteConfig.sWidth,
        this.spriteConfig.sHeight,
        -drawSize / 2,
        -drawSize / 2 - this.radius / 2,
        drawSize,
        drawSize
      );
      // ctx.drawImage(
      //   this.sprite,
      //   this.overlaySpriteConfig.sx,
      //   this.overlaySpriteConfig.sy,
      //   this.overlaySpriteConfig.sWidth,
      //   this.overlaySpriteConfig.sHeight,
      //   -drawSize2 / 2,
      //   -drawSize2 / 2 - this.radius / 2,
      //   drawSize2,
      //   drawSize2
      // );
    } else {
      ctx.drawImage(
        this.sprite,
        this.spriteConfig.sx,
        this.spriteConfig.sy,
        this.spriteConfig.sWidth,
        this.spriteConfig.sHeight,
        dx,
        dy,
        drawSize,
        drawSize
      );
      // ctx.drawImage(
      //   this.sprite,
      //   this.overlaySpriteConfig.sx,
      //   this.overlaySpriteConfig.sy,
      //   this.overlaySpriteConfig.sWidth,
      //   this.overlaySpriteConfig.sHeight,
      //   dx2,
      //   dy2,
      //   drawSize2,
      //   drawSize2
      // );
    }

    ctx.restore();
  }
}
