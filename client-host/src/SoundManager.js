// SoundManager — thin wrapper around Phaser audio
// Drop CC0 .ogg (or .mp3) files into client-host/src/assets/sounds/ with these names:
//   eat.ogg, countdown.ogg, death.ogg, victory.ogg

export default class SoundManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this._loaded = false;
  }

  /** Call from scene preload() */
  preload() {
    const base = 'assets/sounds/';
    this.scene.load.audio('eat',       `${base}eat.ogg`);
    this.scene.load.audio('countdown', `${base}countdown.ogg`);
    this.scene.load.audio('death',     `${base}death.ogg`);
    this.scene.load.audio('victory',   `${base}victory.ogg`);
  }

  /** Call from scene create() after assets are loaded */
  init() {
    const keys = ['eat', 'countdown', 'death', 'victory'];
    for (const key of keys) {
      if (this.scene.cache.audio.exists(key)) {
        this.sounds[key] = this.scene.sound.add(key, { volume: 0.6 });
      }
    }
    this._loaded = true;
  }

  play(key) {
    const s = this.sounds[key];
    if (s) s.play();
  }
}
