// RoundOverScene — displayed between rounds

import Phaser from 'phaser';
import socket from '../socket';

const CANVAS_W = 1280;
const CANVAS_H = 720;

export default class RoundOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RoundOverScene' });
  }

  init(data) {
    this.data = data;
  }

  create() {
    const { round, totalRounds, roundWinnerName, roundWins, names } = this.data;

    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.92);

    // Round label
    this.add.text(CANVAS_W / 2, 130, `ROUND ${round} / ${totalRounds}`, {
      fontFamily: 'monospace', fontSize: '28px', color: '#666666',
    }).setOrigin(0.5);

    // Headline
    const headline = roundWinnerName ? `${roundWinnerName} wins the round!` : 'DRAW!';
    const headColor = roundWinnerName ? '#00ff88' : '#ffff00';
    const headText = this.add.text(CANVAS_W / 2, 220, headline, {
      fontFamily: 'monospace', fontSize: '58px', color: headColor,
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: headText, scale: 1, duration: 400, ease: 'Back.Out' });

    // Round wins progress per player
    let y = 360;
    for (const [id, name] of Object.entries(names)) {
      const wins  = roundWins[id] || 0;
      const dots  = '● '.repeat(wins) + '○ '.repeat(totalRounds - wins);
      this.add.text(CANVAS_W / 2, y, `${name}   ${dots.trim()}`, {
        fontFamily: 'monospace', fontSize: '26px', color: '#ffffff',
      }).setOrigin(0.5);
      y += 56;
    }

    // Status line
    const statusMsg = round < totalRounds ? 'Next round starting soon...' : 'Final results coming...';
    this.add.text(CANVAS_W / 2, 550, statusMsg, {
      fontFamily: 'monospace', fontSize: '20px', color: '#444444',
    }).setOrigin(0.5);

    // Transition: next round countdown
    socket.once('game:countdown', ({ count }) => {
      this.scene.start('CountdownScene', { count });
    });

    // Transition: final game:over (last round)
    socket.once('game:over', (gameOverData) => {
      this.scene.start('GameOverScene', gameOverData);
    });
  }

  shutdown() {
    socket.off('game:countdown');
    socket.off('game:over');
  }
}
