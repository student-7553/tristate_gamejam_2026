const cloudSprite = new Image();
cloudSprite.src = 'assets/art/clouds.png';

export class Cloud {
    constructor(screenW, screenH) {
        // Size variation
        this.scale = 0.2 + Math.random() * 0.8;
        
        // Window dimensions for wrapping (3x screen size ensures smooth off-screen wrapping)
        this.windowW = screenW * 3;
        this.windowH = screenH * 3;
        
        // Initial random position within the giant window
        this.x = Math.random() * this.windowW;
        this.y = Math.random() * this.windowH;

        // Speed depends on scale. Larger (closer) = faster.
        this.speedX = 15 + this.scale * 45; // 24 to 60 pixels/sec drift
        
        // Parallax depth calculation based on size
        this.parallaxFactor = 0.1 + this.scale * 0.3; // 0.16 to 0.4 parallax speed

        this.sprite = cloudSprite;
    }

    update(dt) {
        this.x += this.speedX * dt; 
        this.x %= this.windowW; // Keep math bounded
    }

    draw(ctx, camX, camY) {
        if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;

        const w = this.sprite.naturalWidth * this.scale;
        const h = this.sprite.naturalHeight * this.scale;

        // Apply Parallax for X and Y based on camera
        // Subtraction means as camera moves right/up, the clouds move left/down on screen
        const effectiveX = this.x - camX * this.parallaxFactor;
        const effectiveY = this.y - camY * this.parallaxFactor;

        let renderX = effectiveX % this.windowW;
        if (renderX < 0) renderX += this.windowW;
        
        let renderY = effectiveY % this.windowH;
        if (renderY < 0) renderY += this.windowH;

        // Convert back to world space offset from camera
        const drawX = camX - this.windowW / 2 + renderX;
        const drawY = camY - this.windowH / 2 + renderY;

        ctx.drawImage(
            this.sprite,
            Math.floor(drawX - w / 2),
            Math.floor(drawY - h / 2),
            Math.floor(w),
            Math.floor(h)
        );
    }
}
