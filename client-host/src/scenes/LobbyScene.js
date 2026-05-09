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

  init(data) {
    // Populated when returning from GameOverScene after a full match
    this._restoreCode    = data && data.roomCode      ? data.roomCode      : null;
    this._restoreQr      = data && data.qrDataUrl     ? data.qrDataUrl     : null;
    this._restorePlayers = data && data.players       ? data.players       : [];
    // WiFi QR is static — cache it on the class the first time and reuse
    this._restoreWifiQr  = data && data.wifiQrDataUrl ? data.wifiQrDataUrl : null;
    this._restoreWifiSsid= data && data.wifiSsid      ? data.wifiSsid      : null;
  }

  create() {
    this._buildUI();
    this._registerSocketEvents();

    if (this._restoreCode) {
      // Back from a completed match — reuse existing room, no new QR needed
      this.roomCode = this._restoreCode;
      this.roomCodeText.setText(this._restoreCode);
      this._renderQR(this._restoreQr);
      this._renderWifiQR(this._restoreWifiQr, this._restoreWifiSsid);
      this._updatePlayers(this._restorePlayers);
    } else {
      socket.emit('room:create');
    }
  }

  _buildUI() {
    const gfx = this.add.graphics();

    // Subtle grid bg
    gfx.lineStyle(1, 0x111111, 1);
    for (let x = 0; x <= CANVAS_W; x += 40) gfx.lineBetween(x, 0, x, CANVAS_H);
    for (let y = 0; y <= CANVAS_H; y += 40) gfx.lineBetween(0, y, CANVAS_W, y);

    // Title
    this.add.text(CANVAS_W / 2, 48, 'SNAKE DUEL', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: NEON_GREEN,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Center column: room code + player slots ───────────────────────────
    this.add.text(CANVAS_W / 2, 118, 'ROOM CODE', {
      fontFamily: 'monospace', fontSize: '16px', color: DIM_GREY,
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(CANVAS_W / 2, 162, '----', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: NEON_WHITE,
      stroke: '#000',
      strokeThickness: 6,
      letterSpacing: 20,
    }).setOrigin(0.5);

    this._buildPlayerSlots();

    this.startHint = this.add.text(CANVAS_W / 2, 668, '', {
      fontFamily: 'monospace', fontSize: '22px', color: NEON_GREEN,
    }).setOrigin(0.5).setAlpha(0);

    this.input.keyboard.on('keydown-SPACE', () => this._tryStart());
    this.input.on('pointerdown', () => this._tryStart());

    // ── Left column: WiFi QR ──────────────────────────────────────────────
    this.add.text(213, 255, '① CONNECT TO WIFI', {
      fontFamily: 'monospace', fontSize: '15px', color: '#aaaaff',
    }).setOrigin(0.5);

    this.wifiQrContainer = this.add.container(213, 435);
    this.wifiQrBg = this.add.rectangle(0, 0, 220, 220, 0xffffff, 1);
    this.wifiQrContainer.add(this.wifiQrBg);
    this.wifiQrHint = this.add.text(0, 0, 'No WiFi\nConfigured', {
      fontFamily: 'monospace', fontSize: '14px', color: '#000000', align: 'center',
    }).setOrigin(0.5);
    this.wifiQrContainer.add(this.wifiQrHint);

    this.wifiSsidText = this.add.text(213, 556, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaff', align: 'center', wordWrap: { width: 210 },
    }).setOrigin(0.5);

    // ── Right column: Game QR ─────────────────────────────────────────────
    this.add.text(1067, 255, '② SCAN TO JOIN', {
      fontFamily: 'monospace', fontSize: '15px', color: NEON_GREEN,
    }).setOrigin(0.5);

    this.qrContainer = this.add.container(1067, 435);
    this.qrBg = this.add.rectangle(0, 0, 220, 220, 0xffffff, 1);
    this.qrContainer.add(this.qrBg);
    this.qrHint = this.add.text(0, 0, 'Loading QR...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#000000',
    }).setOrigin(0.5);
    this.qrContainer.add(this.qrHint);

    this.add.text(1067, 556, 'Open camera app\nand point at code', {
      fontFamily: 'monospace', fontSize: '13px', color: DIM_GREY, align: 'center',
    }).setOrigin(0.5);
  }

  _buildPlayerSlots() {
    const colors = [NEON_GREEN, NEON_RED];
    const labels = ['PLAYER 1', 'PLAYER 2'];
    // Stacked vertically in the center column
    const slotY = [380, 480];

    this.slotTexts = slotY.map((y, i) => {
      this.add.text(CANVAS_W / 2, y - 28, labels[i], {
        fontFamily: 'monospace', fontSize: '15px', color: colors[i],
      }).setOrigin(0.5);

      return this.add.text(CANVAS_W / 2, y, 'Waiting...', {
        fontFamily: 'monospace', fontSize: '26px', color: DIM_GREY,
      }).setOrigin(0.5);
    });
  }

  _registerSocketEvents() {
    socket.on('room:created', ({ roomCode, qrDataUrl, wifiQrDataUrl, wifiSsid, players }) => {
      this.roomCode = roomCode;
      this.roomCodeText.setText(roomCode);
      this._renderQR(qrDataUrl);
      this._renderWifiQR(wifiQrDataUrl, wifiSsid);
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
    this.qrHint.setVisible(false);
    if (this.textures.exists('qr')) this.textures.remove('qr');
    this.textures.once('addtexture-qr', () => {
      const qrImg = this.add.image(0, 0, 'qr').setDisplaySize(210, 210);
      this.qrContainer.add(qrImg);
    });
    this.textures.addBase64('qr', dataUrl);
  }

  _renderWifiQR(dataUrl, ssid) {
    if (!dataUrl) {
      // No WiFi config — dim the placeholder box
      this.wifiQrBg.setFillStyle(0x222222, 1);
      return;
    }
    this.wifiQrHint.setVisible(false);
    if (this.textures.exists('qr-wifi')) this.textures.remove('qr-wifi');
    this.textures.once('addtexture-qr-wifi', () => {
      const img = this.add.image(0, 0, 'qr-wifi').setDisplaySize(210, 210);
      this.wifiQrContainer.add(img);
    });
    this.textures.addBase64('qr-wifi', dataUrl);
    if (ssid) this.wifiSsidText.setText(ssid);
  }

  shutdown() {
    socket.off('room:created');
    socket.off('player:joined');
    socket.off('game:countdown');
  }
}
