// LobbyScene — room code, QR code, player status

import Phaser from 'phaser';
import socket from '../socket';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const NEON_GREEN = '#00ff88';
const NEON_RED   = '#ff4466';
const NEON_WHITE = '#ffffff';
const DIM_GREY   = '#888888';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.roomCode = null;
    this.qrDataUrl = null;
    this.players = [];
  }

  create() {
    this._buildUI();
    this._registerSocketEvents();
    socket.emit('room:create');
  }

  _buildUI() {
    const gfx = this.add.graphics();

    // Subtle grid bg
    gfx.lineStyle(1, 0x111111, 1);
    for (let x = 0; x <= CANVAS_W; x += 40) gfx.lineBetween(x, 0, x, CANVAS_H);
    for (let y = 0; y <= CANVAS_H; y += 40) gfx.lineBetween(0, y, CANVAS_W, y);

    // Title
    this.add.text(CANVAS_W / 2, 60, 'SNAKE DUEL', {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: NEON_GREEN,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Room code label
    this.add.text(CANVAS_W / 2, 140, 'ROOM CODE', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: DIM_GREY,
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(CANVAS_W / 2, 185, '----', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: NEON_WHITE,
      stroke: '#000',
      strokeThickness: 6,
      letterSpacing: 24,
    }).setOrigin(0.5);

    // QR placeholder container
    this.qrContainer = this.add.container(CANVAS_W / 2, 440);
    this.qrBg = this.add.rectangle(0, 0, 260, 260, 0xffffff, 1);
    this.qrContainer.add(this.qrBg);
    this.qrHint = this.add.text(0, 0, 'Loading QR...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5);
    this.qrContainer.add(this.qrHint);

    // Scan hint
    this.add.text(CANVAS_W / 2, 590, 'Scan to join on your phone', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: DIM_GREY,
    }).setOrigin(0.5);

    // Player slots
    this._buildPlayerSlots();

    // Start button hint (shown when 2 players ready)
    this.startHint = this.add.text(CANVAS_W / 2, 650, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: NEON_GREEN,
    }).setOrigin(0.5).setAlpha(0);

    // Listen for spacebar / click to start
    this.input.keyboard.on('keydown-SPACE', () => this._tryStart());
    this.input.on('pointerdown', () => this._tryStart());
  }

  _buildPlayerSlots() {
    const slotX = [280, CANVAS_W - 280];
    const colors = [NEON_GREEN, NEON_RED];
    const labels = ['PLAYER 1', 'PLAYER 2'];

    this.slotTexts = slotX.map((x, i) => {
      this.add.text(x, 330, labels[i], {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: colors[i],
      }).setOrigin(0.5);

      return this.add.text(x, 380, 'Waiting...', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: DIM_GREY,
      }).setOrigin(0.5);
    });
  }

  _registerSocketEvents() {
    socket.on('room:created', ({ roomCode, qrDataUrl, players }) => {
      this.roomCode = roomCode;
      this.roomCodeText.setText(roomCode);
      this._renderQR(qrDataUrl);
      this._updatePlayers(players);
    });

    socket.on('player:joined', ({ players }) => {
      this._updatePlayers(players);
    });

    socket.on('game:countdown', ({ count }) => {
      this.scene.start('CountdownScene', { count });
    });
  }

  _updatePlayers(players) {
    this.players = players || [];

    // Reset slots
    this.slotTexts[0].setText('Waiting...').setStyle({ color: '#888888' });
    this.slotTexts[1].setText('Waiting...').setStyle({ color: '#888888' });

    const colors = ['#00ff88', '#ff4466'];
    for (const p of this.players) {
      if (p.slotIndex === 0 || p.slotIndex === 1) {
        this.slotTexts[p.slotIndex].setText(p.name).setStyle({ color: colors[p.slotIndex] });
      }
    }

    if (this.players.length === 2) {
      this.startHint.setText('PRESS SPACE or TAP to Start').setAlpha(1);
      this.tweens.add({
        targets: this.startHint,
        alpha: { from: 0.4, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.startHint.setAlpha(0);
    }
  }

  _tryStart() {
    if (this.players.length === 2) {
      socket.emit('host:start');
    }
  }

  _renderQR(dataUrl) {
    if (!dataUrl) return;
    // Remove placeholder text
    this.qrHint.setVisible(false);

    // Add QR image texture from base64
    if (this.textures.exists('qr')) this.textures.remove('qr');

    this.textures.once('addtexture-qr', () => {
      const qrImg = this.add.image(0, 0, 'qr').setDisplaySize(240, 240);
      this.qrContainer.add(qrImg);
    });
    this.textures.addBase64('qr', dataUrl);
  }

  shutdown() {
    socket.off('room:created');
    socket.off('player:joined');
    socket.off('game:countdown');
  }
}
