// CountdownScene — animated 3 → 2 → 1 → GO!

import Phaser from 'phaser';
import socket from '../socket';
import SoundManager from '../SoundManager';

const CANVAS_W = 1280;
const CANVAS_H = 720;

export default class CountdownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CountdownScene' });
  }

  init(data) {
    this.currentCount = data.count ?? 3;
  }

  preload() {
    this._sfx = new SoundManager(this);
    this._sfx.preload();
  }

  create() {
    // Dark overlay
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.7);
    this._sfx.init();

    this.countText = this.add.text(CANVAS_W / 2, CANVAS_H / 2, String(this.currentCount), {
      fontFamily: 'monospace',
      fontSize: '200px',
      color: '#ffffff',
      stroke: '#00ff88',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    this._animateCount(this.currentCount);

    // Listen for subsequent countdown ticks
    socket.on('game:countdown', ({ count }) => {
      if (count > 0) this._animateCount(count);
    });

    // Transition when game starts broadcasting state
    socket.once('game:state', (data) => {
      this.scene.start('GameScene', { initialState: data });
    });
  }

  _animateCount(n) {
    const label = n === 0 ? 'GO!' : String(n);
    const color = n === 0 ? '#ffff00' : '#ffffff';

    this._sfx.play('countdown');
    this.countText.setText(label).setStyle({ color }).setScale(2).setAlpha(1);

    this.tweens.add({
      targets: this.countText,
      scale: { from: 2, to: 1 },
      alpha: { from: 1, to: n === 0 ? 0 : 0.8 },
      duration: 800,
      ease: 'Power2',
    });
  }

  shutdown() {
    socket.off('game:countdown');
    socket.off('game:state');
  }
}
