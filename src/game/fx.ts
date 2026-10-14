// 이펙트: Kenney Particle Pack(CC0) 텍스처를 틴트해서 사용
import Phaser from 'phaser';
import { S } from '../core/state';

export class FX {
  constructor(public sc: Phaser.Scene) {}
  get photo() { return S?.settings.photosensitive; }

  sprite(tex: string, x: number, y: number, o: { tint?: number; scale?: number; endScale?: number; alpha?: number; rot?: number; dur?: number; add?: boolean; depth?: number; spin?: number; dx?: number; dy?: number } = {}) {
    const im = this.sc.add.image(x, y, tex).setTint(o.tint ?? 0xffffff).setScale(o.scale ?? 0.5).setAlpha(o.alpha ?? 1).setRotation(o.rot ?? 0);
    if (o.add !== false) im.setBlendMode(Phaser.BlendModes.ADD);
    im.setDepth(o.depth ?? 100000);
    this.sc.tweens.add({ targets: im, alpha: 0, scale: o.endScale ?? (o.scale ?? 0.5) * 1.4, rotation: (o.rot ?? 0) + (o.spin ?? 0), x: x + (o.dx || 0), y: y + (o.dy || 0), duration: o.dur ?? 260, ease: 'Cubic.Out', onComplete: () => im.destroy() });
    return im;
  }
  slash(x: number, y: number, ang: number, r: number, tint = 0xffffff, big = false) {
    // slash_02 텍스처는 아래쪽이 볼록한 호 — 공격 방향으로 회전
    const s = (r / 64) * (big ? 1.25 : 1.0);
    this.sprite('fx_slash', x + Math.cos(ang) * r * 0.45, y + Math.sin(ang) * r * 0.45, { tint, scale: s, endScale: s * 1.15, rot: ang - Math.PI / 2, dur: big ? 240 : 170, spin: 0.35, alpha: 0.95 });
  }
  sparks(x: number, y: number, tint = 0xfff0b0, n = 5, spread = 40) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = spread * (0.4 + Math.random() * 0.6);
      this.sprite('fx_spark', x, y, { tint, scale: 0.12 + Math.random() * 0.1, endScale: 0.02, dx: Math.cos(a) * d, dy: Math.sin(a) * d, dur: 240 + Math.random() * 160, rot: a });
    }
  }
  burst(x: number, y: number, tint: number, r = 60, tex = 'fx_circle') {
    this.sprite(tex, x, y, { tint, scale: (r / 64) * 0.4, endScale: r / 64, dur: 320, alpha: this.photo ? 0.4 : 0.85 });
  }
  smoke(x: number, y: number, tint = 0xbbbbbb, n = 3) {
    for (let i = 0; i < n; i++) this.sprite('fx_smoke', x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 10, { tint, scale: 0.2, endScale: 0.45, dur: 500, alpha: 0.5, add: false, dy: -20, depth: 99990 });
  }
  dmgText(x: number, y: number, txt: string, color: string, big = false) {
    if (!S?.settings.dmgNumbers) return;
    const t = this.sc.add.text(x + (Math.random() - 0.5) * 18, y - 20, txt, {
      fontFamily: 'Galmuri11', fontSize: big ? '22px' : '15px', color, stroke: '#000', strokeThickness: 4, fontStyle: big ? 'bold' : 'normal',
    }).setOrigin(0.5).setDepth(200000);
    this.sc.tweens.add({ targets: t, y: y - (big ? 62 : 48), alpha: { from: 1, to: 0 }, scale: { from: big ? 1.4 : 1.1, to: 1 }, duration: big ? 900 : 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }
  label(x: number, y: number, txt: string, color = '#ffffff', size = 16, dur = 1100) {
    const t = this.sc.add.text(x, y, txt, { fontFamily: 'Galmuri11', fontSize: size + 'px', color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200001);
    this.sc.tweens.add({ targets: t, y: y - 30, alpha: { from: 1, to: 0 }, duration: dur, ease: 'Quad.In', onComplete: () => t.destroy() });
  }
  shake(dur = 90, int = 0.004) { if (S?.settings.shake && !this.photo) this.sc.cameras.main.shake(dur, int); }
  flashScreen(color = 0xffffff, dur = 120) { if (this.photo) return; const c = Phaser.Display.Color.IntegerToColor(color); this.sc.cameras.main.flash(dur, c.red, c.green, c.blue); }
  afterimage(src: Phaser.GameObjects.Image, tint = 0x88ccff) {
    const im = this.sc.add.image(src.x, src.y, src.texture.key, src.frame.name).setScale(src.scaleX, src.scaleY).setFlipX(src.flipX).setTintFill(tint).setAlpha(0.5).setDepth(src.depth - 1).setRotation(src.rotation);
    this.sc.tweens.add({ targets: im, alpha: 0, duration: 260, onComplete: () => im.destroy() });
  }
}
