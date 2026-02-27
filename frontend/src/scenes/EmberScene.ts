import Phaser from 'phaser';

export class EmberScene extends Phaser.Scene {
  private corruptionParticles: Phaser.GameObjects.Group | null = null;
  private playerSprite: Phaser.GameObjects.Text | null = null;
  private groundTiles: Phaser.GameObjects.Rectangle[] = [];
  private isSuccess = false;

  constructor() {
    super({ key: 'EmberScene' });
  }

  preload(): void {
    // Pixel art generation within Phaser (no external assets required)
    // Custom assets can be loaded here:
    // this.load.image('player', '/assets/player.png');
    // this.load.image('background', '/assets/background.png');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Sky gradient background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0a0a1f, 0x0a0a1f, 0x1a0a28, 0x1a0a28, 1);
    sky.fillRect(0, 0, W, H);

    // Stars (pixel dots)
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xf0f0ff, 0.8);
    for (let i = 0; i < 40; i++) {
      const size = Math.random() > 0.8 ? 3 : 2;
      starGfx.fillRect(
        Math.random() * W,
        Math.random() * (H * 0.6),
        size,
        size
      );
    }

    // Ground tiles (pixel art style)
    const tileW = 32;
    const numTiles = Math.ceil(W / tileW) + 1;
    for (let i = 0; i < numTiles; i++) {
      const tile = this.add.rectangle(
        i * tileW + tileW / 2,
        H - 20,
        tileW - 2,
        32,
        0x2a3a1a
      );
      tile.setStrokeStyle(1, 0x3a5a2a);
      this.groundTiles.push(tile);
    }

    // Ground highlight strip
    this.add.rectangle(W / 2, H - 34, W, 4, 0x3a5a2a);

    // Tree silhouettes (pixel rectangles)
    this.drawPixelTrees(W, H);

    // Corruption effect (red pixel particles at edges)
    this.createCorruptionEffect(W, H);

    // Player character (emoji rendered as Phaser text = pixel look)
    this.playerSprite = this.add.text(80, H - 60, '🧙‍♀️', {
      fontSize: '32px',
    });
    this.playerSprite.setOrigin(0.5, 1);

    // Idle bobbing animation
    this.tweens.add({
      targets: this.playerSprite,
      y: H - 65,
      duration: 800,
      ease: 'Stepped',
      yoyo: true,
      repeat: -1,
    });

    // Ambient glow orbs floating
    this.createAmbientOrbs(W, H);

    // Listen for external success/failure events
    this.events.on('submission_success', this.playSuccessAnimation, this);
    this.events.on('submission_failure', this.playFailureAnimation, this);
  }

  private drawPixelTrees(W: number, H: number): void {
    const treePositions = [0.15, 0.25, 0.7, 0.85];
    for (const posX of treePositions) {
      const x = W * posX;
      const treeH = 60 + Math.random() * 40;

      // Trunk
      this.add.rectangle(x, H - 36 - treeH / 2, 10, treeH, 0x4a2a0a);

      // Canopy (layered squares = pixel tree)
      this.add.rectangle(x, H - 36 - treeH - 10, 36, 30, 0x1a4a1a);
      this.add.rectangle(x, H - 36 - treeH - 30, 28, 24, 0x204a20);
      this.add.rectangle(x, H - 36 - treeH - 48, 18, 18, 0x2a5a2a);
    }
  }

  private createCorruptionEffect(W: number, H: number): void {
    const corruptGfx = this.add.graphics();
    corruptGfx.fillStyle(0xe04040, 0.06);
    corruptGfx.fillRect(0, 0, 20, H);
    corruptGfx.fillRect(W - 20, 0, 20, H);

    // Animating corruption tiles (pixel flickering)
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        corruptGfx.clear();
        corruptGfx.fillStyle(0xe04040, 0.04 + Math.random() * 0.08);
        corruptGfx.fillRect(0, 0, 20, H);
        corruptGfx.fillRect(W - 20, 0, 20, H);

        // Random corruption pixel flickers
        if (Math.random() > 0.6) {
          corruptGfx.fillStyle(0xe04040, 0.3);
          const rx = Math.random() > 0.5 ? Math.random() * 30 : W - 30 + Math.random() * 30;
          corruptGfx.fillRect(rx, Math.random() * H, 4, 4);
        }
      },
    });
  }

  private createAmbientOrbs(W: number, H: number): void {
    const orbColors = [0xf0c040, 0x4080f0, 0x40e080];
    for (let i = 0; i < 3; i++) {
      const orb = this.add.graphics();
      const color = orbColors[i];
      orb.fillStyle(color, 0.5);
      orb.fillRect(0, 0, 6, 6);
      orb.x = 100 + Math.random() * (W - 200);
      orb.y = 60 + Math.random() * (H * 0.5);

      this.tweens.add({
        targets: orb,
        x: orb.x + (Math.random() - 0.5) * 60,
        y: orb.y + (Math.random() - 0.5) * 40,
        alpha: { from: 0.5, to: 0.1 },
        duration: 2000 + Math.random() * 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  playSuccessAnimation(): void {
    if (this.isSuccess) return;
    this.isSuccess = true;

    const W = this.scale.width;
    const H = this.scale.height;

    // Gold particle burst
    const burstGfx = this.add.graphics();
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 50, () => {
        burstGfx.fillStyle(0xf0c040, 0.9);
        burstGfx.fillRect(
          W * 0.5 + (Math.random() - 0.5) * 200,
          H * 0.4 + (Math.random() - 0.5) * 100,
          6,
          6
        );
      });
    }

    // Player jump
    if (this.playerSprite) {
      this.tweens.add({
        targets: this.playerSprite,
        y: H - 120,
        duration: 300,
        ease: 'Power2',
        yoyo: true,
      });
    }

    // Flash the scene green briefly
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0x40e040, 0.15);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    // Clean up after delay
    this.time.delayedCall(2000, () => {
      burstGfx.destroy();
      this.isSuccess = false;
    });
  }

  playFailureAnimation(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Red flash
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xe04040, 0.2);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Screen shake (pixel style = step shake)
    this.cameras.main.shake(300, 0.008);
  }

  update(): void {
    // Future: character movement, enemy animations, etc.
  }
}