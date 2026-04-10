export class GameManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} width        - screen / canvas width
   * @param {number} height       - screen / canvas height
   * @param {string} bgColor      - default background colour
   */
  constructor(canvas, width, height, bgColor = '#1a1a2e') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = width;
    this.height = height;
    this.bgColor = bgColor;

    // Apply dimensions to the canvas element
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Physics properties
    this.gravity = 980; // pixels per second squared

    /** @type {Array<{update:(dt:number)=>void, draw:(ctx:CanvasRenderingContext2D)=>void}>} */
    this.components = [];
    this.activePlayer = null;
  }

  /**
   * Register a component / entity so the manager will update & draw it.
   * @param {object} component – must expose update(dt) and draw(ctx)
   */
  addComponent(component) {
    this.components.push(component);
  }

  /**
   * Set the active player for the game.
   * @param {object} player
   */
  setPlayer(player) {
    this.activePlayer = player;
  }

  /** Applies physics including gravity to all non-static entities. */
  applyPhysics(dt) {
    const applyToEntity = (entity) => {
      // Skip if entity doesn't exist, is static, or lacks basic physics properties
      if (!entity || entity.isStatic || !entity.velocity) return;

      // Apply gravity to change vertical velocity
      entity.velocity.y += this.gravity * dt;

      // Update position based on velocity
      if (entity.x !== undefined && entity.y !== undefined) {
        entity.x += entity.velocity.x * dt;
        entity.y += entity.velocity.y * dt;
      }
    };

    applyToEntity(this.activePlayer);
    for (const component of this.components) {
      applyToEntity(component);
    }
  }

  /** Called every frame — delegates to every registered component. */
  update(dt, mouse) {
    // Compute all new locations before frame update logic
    this.applyPhysics(dt);

    if (this.activePlayer) {
      this.activePlayer.update(dt, mouse);
    }
    for (const component of this.components) {
      component.update(dt, mouse);
    }
  }

  /** Clears the screen, fills with bgColor, then draws every component. */
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Background
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Player
    if (this.activePlayer) {
      this.activePlayer.draw(this.ctx);
    }

    // Components
    for (const component of this.components) {
      component.draw(this.ctx);
    }
  }
}
