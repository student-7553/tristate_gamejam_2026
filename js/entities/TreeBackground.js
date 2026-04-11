const sharedSprite = new Image();
sharedSprite.src = 'assets/art/treeBarkSmall.png';

// List of 3 possible trees/background tiles to randomly choose from
const spriteVariations = [
    { sx: 18 * 0, sy: 18 * 0, sWidth: 9, sHeight: 9 }, // Tile 1 (Original) 
    { sx: 18 * 1, sy: 18 * 0, sWidth: 9, sHeight: 9 }, // Tile 1 (Original)
    { sx: 18 * 2, sy: 18 * 0, sWidth: 9, sHeight: 9 }, // Tile 1 (Original)
    { sx: 18 * 3, sy: 18 * 0, sWidth: 9, sHeight: 9 }, // Tile 1 (Original)
    { sx: 18 * 0, sy: 18 * 1, sWidth: 9, sHeight: 9 }, // Tile 1 (Original)
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
