const sharedSprite = new Image();
sharedSprite.src = 'assets/art/tilemap_edited_packed.png';

const leftVariations = [
    { sx: 18 * 20, sy: 18 * 0, sWidth: 18, sHeight: 18 }, // Left Tile 1 (Original)
    { sx: 18 * 20, sy: 18 * 1, sWidth: 18, sHeight: 18 }, // Left Tile 2 (Customize here)
];

const rightVariations = [
    { sx: 18 * 20, sy: 18 * 2, sWidth: 18, sHeight: 18 }, // Right Tile 1 (Original)
    { sx: 18 * 20, sy: 18 * 3, sWidth: 18, sHeight: 18 }  // Right Tile 3 (Customize here)
];

export class BorderTile {
    constructor(x, y, size, isLeft) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.sprite = sharedSprite;
        this.isLeft = isLeft;

        // Sprite configuration for a border/wall tile
        if (this.isLeft) {
            const randomIndex = Math.floor(Math.random() * leftVariations.length);
            this.spriteConfig = leftVariations[randomIndex];
        } else {
            const randomIndex = Math.floor(Math.random() * rightVariations.length);
            this.spriteConfig = rightVariations[randomIndex];
        }
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
