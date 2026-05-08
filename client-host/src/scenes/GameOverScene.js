// GameOverScene — winner announcement, scores, auto-reset

import Phaser from 'phaser';
import socket from '../socket';
import SoundManager from '../SoundManager';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const AUTO_RESET_MS = 8000;

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.winnerName = data.winnerName || null;
    this.winnerId   = data.winnerId   || null;
    this.roundWins  = data.roundWins  || {};
    this.names      = data.names      || {};
  }

  preload() {
    this._sfx = new SoundManager(this);
    this._sfx.preload();
  }

  create() {
    this._sfx.init();
    this._sfx.play('victory');
    // Dark overlay
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.85);

    // Animated winner text
    const headline = this.winnerName
      ? `${this.winnerName} WINS!`
      : 'DRAW!';

    const headlineColor = this.winnerName ? '#00ff88' : '#ffff00';

    const headText = this.add.text(CANVAS_W / 2, 240, headline, {
      fontFamily: 'monospace',
      fontSize: '80px',
      color: headlineColor,
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: headText,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out',
    });

    // Round wins per player
    const totalRounds = 5;
    const winEntries = Object.entries(this.names);
    winEntries.forEach(([id, name], i) => {
      const wins = this.roundWins[id] || 0;
      const isWinner = id === this.winnerId;
      const col  = isWinner ? '#ffff00' : '#888888';
      const dots = '● '.repeat(wins) + '○ '.repeat(totalRounds - wins);
      const yPos = 390 + i * 66;
      this.add.text(CANVAS_W / 2, yPos, `${name}   ${dots.trim()}`, {
        fontFamily: 'monospace', fontSize: '30px', color: col,
      }).setOrigin(0.5);
    });

    // Auto-reset countdown
    this.resetCountText = this.add.text(CANVAS_W / 2, 580, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#666666',
    }).setOrigin(0.5);

    this._startAutoReset();

    // Manual reset keys
    this.input.keyboard.on('keydown-SPACE', () => this._doReset());
    this.input.keyboard.on('keydown-R', () => this._doReset());
    this.input.on('pointerdown', () => this._doReset());

    // game:reset carries restored room data so LobbyScene doesn't create a new room
    socket.on('game:reset', (resetData) => {
      this.scene.start('LobbyScene', resetData || {});
    });
  }

  _startAutoReset() {
    let remaining = Math.ceil(AUTO_RESET_MS / 1000);
    this.resetCountText.setText(`Returning to lobby in ${remaining}s  (SPACE to reset now)`);

    this._resetTimer = this.time.addEvent({
      delay: 1000,
      repeat: remaining - 1,
      callback: () => {
        remaining--;
        if (remaining > 0) {
          this.resetCountText.setText(`Returning to lobby in ${remaining}s  (SPACE to reset now)`);
        } else {
          this._doReset();
        }
      },
    });
  }

  _doReset() {
    if (this._resetDone) return;
    this._resetDone = true;
    // Emit reset — server responds with game:reset event that carries room data
    socket.emit('host:reset');
    // Don't navigate yet; wait for game:reset socket event
  }

  shutdown() {
    socket.off('game:reset');
  }
}
