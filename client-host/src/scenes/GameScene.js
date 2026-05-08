// GameScene — arena render, snakes, apples, scoreboard

import Phaser from 'phaser';
import socket from '../socket';
import SoundManager from '../SoundManager';

const CANVAS_W  = 1280;
const CANVAS_H  = 720;
const GRID_W    = 40;
const GRID_H    = 40;
const CELL      = 20;           // px per grid cell

// Arena starts at top-left of the centred grid
const ARENA_X   = Math.floor((CANVAS_W - GRID_W * CELL) / 2); // 240
const ARENA_Y   = Math.floor((CANVAS_H - GRID_H * CELL) / 2); // 60

const SIDEBAR_W = ARENA_X; // 240px each side

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.snakeGraphics = null;
    this.appleGraphics = null;
    this.appleTweens = [];
    this.scoreTexts = {};
    this.nameTexts = {};
    this.latestState = null;
    this._prevScores = {};
  }

  init(data) {
    this.latestState = data.initialState || null;
  }

  preload() {
    this.sound = this.sound; // already available, but reference for clarity
    this._sfx = new SoundManager(this);
    this._sfx.preload();
  }

  create() {
    this._drawBackground();
    this._drawArena();
    this._buildScoreboard();
    this._sfx.init();

    this.snakeGraphics = this.add.graphics();
    this.appleGraphics = this.add.graphics();

    // Particles container for death effects
    this.deathEmitterGroup = this.add.group();

    socket.on('game:state', (state) => {
      this.latestState = state;
      this._render(state);
    });

    // Round ends — go to RoundOverScene
    socket.on('round:over', (data) => {
      this.time.delayedCall(800, () => {
        this.scene.start('RoundOverScene', data);
      });
    });

    // game:over fallback (disconnect during last round etc.)
    socket.on('game:over', (data) => {
      this.time.delayedCall(600, () => {
        this.scene.start('GameOverScene', data);
      });
    });

    // Render initial state if passed from CountdownScene
    if (this.latestState) this._render(this.latestState);
  }

  _drawBackground() {
    // Black bg with subtle scanlines feel
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000);

    // Sidebar bg panels
    this.add.rectangle(SIDEBAR_W / 2, CANVAS_H / 2, SIDEBAR_W, CANVAS_H, 0x080810);
    this.add.rectangle(CANVAS_W - SIDEBAR_W / 2, CANVAS_H / 2, SIDEBAR_W, CANVAS_H, 0x080810);
  }

  _drawArena() {
    const gfx = this.add.graphics();

    // Grid lines
    gfx.lineStyle(1, 0x111122, 1);
    for (let x = 0; x <= GRID_W; x++) {
      gfx.lineBetween(ARENA_X + x * CELL, ARENA_Y, ARENA_X + x * CELL, ARENA_Y + GRID_H * CELL);
    }
    for (let y = 0; y <= GRID_H; y++) {
      gfx.lineBetween(ARENA_X, ARENA_Y + y * CELL, ARENA_X + GRID_W * CELL, ARENA_Y + y * CELL);
    }

    // Arena border glow
    gfx.lineStyle(3, 0x00ff88, 0.8);
    gfx.strokeRect(ARENA_X, ARENA_Y, GRID_W * CELL, GRID_H * CELL);
  }

  _buildScoreboard() {
    const colors  = ['#00ff88', '#ff4466'];
    const labels  = ['PLAYER 1', 'PLAYER 2'];
    const sideX   = [SIDEBAR_W / 2, CANVAS_W - SIDEBAR_W / 2];

    this.nameTexts  = {};
    this.scoreTexts = {};

    for (let i = 0; i < 2; i++) {
      this.add.text(sideX[i], 160, labels[i], {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: colors[i],
      }).setOrigin(0.5);

      this.nameTexts[i] = this.add.text(sideX[i], 200, '---', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.add.text(sideX[i], 270, 'SCORE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#666666',
      }).setOrigin(0.5);

      this.scoreTexts[i] = this.add.text(sideX[i], 310, '0', {
        fontFamily: 'monospace',
        fontSize: '60px',
        color: colors[i],
      }).setOrigin(0.5);
    }

    // Title + round indicator
    this.add.text(CANVAS_W / 2, 20, 'SNAKE DUEL', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.roundText = this.add.text(CANVAS_W / 2, 46, 'ROUND 1 / 5', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00ff88',
    }).setOrigin(0.5);
  }

  _render(state) {
    const { snakes, apples, scores, died } = state;

    // Update player names / scores
    snakes.forEach((snake, idx) => {
      if (this.scoreTexts[idx]) {
        this.scoreTexts[idx].setText(String(snake.score));
      }
      // Play eat sound when score increases
      const prev = this._prevScores[snake.id] ?? 0;
      if (snake.score > prev) this._sfx.play('eat');
      this._prevScores[snake.id] = snake.score;
    });

    // Update round HUD
    if (state.round && this.roundText) {
      this.roundText.setText(`ROUND ${state.round} / ${state.totalRounds}`);
    }

    // Death shake + sound
    if (died && died.length > 0) {
      this.cameras.main.shake(300, 0.012);
      this._sfx.play('death');
      died.forEach(id => {
        const snake = snakes.find(s => s.id === id);
        if (snake) this._spawnDeathParticles(snake.body[0], snake.color);
      });
    }

    // Draw snakes
    this.snakeGraphics.clear();
    for (const snake of snakes) {
      this._drawSnake(snake);
    }

    // Draw apples
    this.appleGraphics.clear();
    for (const apple of apples) {
      this._drawApple(apple);
    }
  }

  _drawSnake(snake) {
    const color = Phaser.Display.Color.HexStringToColor(snake.color).color;
    const alpha  = snake.alive ? 1 : 0.25;

    snake.body.forEach((cell, i) => {
      const px = ARENA_X + cell.x * CELL;
      const py = ARENA_Y + cell.y * CELL;
      const padding = 2;
      const size    = CELL - padding * 2;

      if (i === 0 && snake.alive) {
        // Head — slightly brighter fill
        this.snakeGraphics.fillStyle(0xffffff, alpha * 0.9);
        this.snakeGraphics.fillRect(px + padding, py + padding, size, size);
        this.snakeGraphics.fillStyle(color, alpha);
        this.snakeGraphics.fillRect(px + padding + 3, py + padding + 3, size - 6, size - 6);
      } else {
        // Body — glow layer then fill
        this.snakeGraphics.fillStyle(color, alpha * 0.3);
        this.snakeGraphics.fillRect(px + padding - 1, py + padding - 1, size + 2, size + 2);
        this.snakeGraphics.fillStyle(color, alpha * 0.9);
        this.snakeGraphics.fillRect(px + padding + 1, py + padding + 1, size - 2, size - 2);
      }
    });
  }

  _drawApple(apple) {
    const px = ARENA_X + apple.x * CELL + CELL / 2;
    const py = ARENA_Y + apple.y * CELL + CELL / 2;

    // Outer glow
    this.appleGraphics.fillStyle(0xff3300, 0.25);
    this.appleGraphics.fillCircle(px, py, CELL * 0.7);
    // Core
    this.appleGraphics.fillStyle(0xff5500, 1);
    this.appleGraphics.fillCircle(px, py, CELL * 0.4);
    // Highlight
    this.appleGraphics.fillStyle(0xffffff, 0.6);
    this.appleGraphics.fillCircle(px - 2, py - 2, CELL * 0.15);
  }

  _spawnDeathParticles(cell, colorHex) {
    if (!cell) return;
    const cx = ARENA_X + cell.x * CELL + CELL / 2;
    const cy = ARENA_Y + cell.y * CELL + CELL / 2;
    const color = Phaser.Display.Color.HexStringToColor(colorHex).color;

    for (let i = 0; i < 12; i++) {
      const rect = this.add.rectangle(cx, cy, 6, 6, color, 1);
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      this.tweens.add({
        targets: rect,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => rect.destroy(),
      });
    }
  }

  shutdown() {
    socket.off('game:state');
    socket.off('round:over');
    socket.off('game:over');
  }
}
