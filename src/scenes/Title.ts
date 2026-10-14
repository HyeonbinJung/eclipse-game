// 타이틀: 숲 배경 위로 일식 링과 영웅·몬스터 실루엣이 흐른다
import Phaser from 'phaser';
import { UI } from '../ui/ui';
import { onInstallChange } from '../pwa';

export class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const W = 1280, H = 720;
    this.cameras.main.setBackgroundColor(0x0b0f1c);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 28; x++) {
      const f = [0, 0, 1, 2][Math.floor(Math.random() * 4)];
      this.add.image(x * 48, y * 48, 'town', f).setOrigin(0).setScale(3).setTint(0x3a5a48).setAlpha(0.55);
    }
    for (let i = 0; i < 40; i++) { const x = Math.random() * W, y = 300 + Math.random() * 440; this.add.image(x, y, 'town', [16, 28, 4, 15][i % 4]).setScale(3).setOrigin(0.5, 0.9).setTint(0x2a4038).setDepth(y); }
    const ring = this.add.image(W / 2, 220, 'corona').setBlendMode(Phaser.BlendModes.ADD).setScale(1.0).setAlpha(0.95);
    const disc = this.add.circle(W / 2 + 5, 216, 100, 0x0b0f1c);
    this.tweens.add({ targets: ring, scale: 1.06, alpha: 0.75, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.InOut' });
    void disc;
    const heroes = [96, 86, 84];
    heroes.forEach((f, i) => {
      const im = this.add.image(W / 2 - 120 + i * 120, 600, 'dun', f).setScale(5).setOrigin(0.5, 1).setDepth(1000);
      this.tweens.add({ targets: im, y: 594, yoyo: true, repeat: -1, duration: 600 + i * 120, ease: 'Sine.InOut' });
    });
    const foes = [124, 109, 111, 121, 110];
    this.time.addEvent({ delay: 1400, loop: true, callback: () => {
      const f = foes[Math.floor(Math.random() * foes.length)]; const y = 640 + Math.random() * 60; const right = Math.random() < 0.5;
      const im = this.add.image(right ? W + 40 : -40, y, 'dun', f).setScale(3).setTint(0x704a90).setAlpha(0.6).setFlipX(right).setDepth(y);
      this.tweens.add({ targets: im, x: right ? -40 : W + 40, duration: 9000, onComplete: () => im.destroy() });
    } });
    this.add.particles(0, 0, 'fx_spark', { x: { min: 0, max: W }, y: H + 10, speedY: { min: -40, max: -90 }, speedX: { min: -10, max: 10 }, scale: { start: 0.08, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffa040, 0xb98cff], lifespan: 9000, frequency: 160, blendMode: 'ADD' });
    UI.open('title');
    onInstallChange(() => UI.refresh());
  }
}
