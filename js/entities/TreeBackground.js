const sharedSprite = new Image();
sharedSprite.src = 'assets/art/tilemap_edited_packed.png';

// List of 3 possible trees/background tiles to randomly choose from
const spriteVariations = [
    // { sx: 18 * 20 + 1, sy: 18 * 4 + 1, sWidth: 16, sHeight: 16 }, // Tile 1 (Original)
    // { sx: 18 * 20 + 1, sy: 18 * 5 + 1, sWidth: 16, sHeight: 16 }, // Tile 2 (Customize here)
    // { sx: 18 * 20 + 1, sy: 18 * 6 + 1, sWidth: 16, sHeight: 16 }  // Tile 3 (Customize here)
    { sx: 18 * 20 + 1, sy: 18 * 4 + 1, sWidth: 16, sHeight: 16 }, // Tile 1 (Original)
];

export class TreeBackground {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.sprite = sharedSprite;

        // Randomly pick one of the 3 sprites
        const randomIndex = Math.floor(Math.random() * spriteVariations.length);
        this.spriteConfig = spriteVariations[randomIndex];
    }

    draw(ctx) {
        if (this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(
                this.sprite,
                this.spriteConfig.sx,
                this.spriteConfig.sy,
                this.spriteConfig.sWidth,
                this.spriteConfig.sHeight,
                Math.floor(this.x),
                Math.floor(this.y),
                this.size + 1,
                this.size + 1
            );
        }
    }
}
