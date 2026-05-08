// Phaser host display entry point

import Phaser from 'phaser';
import LobbyScene from './scenes/LobbyScene';
import CountdownScene from './scenes/CountdownScene';
import GameScene from './scenes/GameScene';
import RoundOverScene from './scenes/RoundOverScene';
import GameOverScene from './scenes/GameOverScene';

const CANVAS_W = 1280;
const CANVAS_H = 720;

const config = {
  type: Phaser.AUTO,
  width: CANVAS_W,
  height: CANVAS_H,
  backgroundColor: '#000000',
  parent: 'game-container',
  scene: [LobbyScene, CountdownScene, GameScene, RoundOverScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
