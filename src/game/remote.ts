// PvP 상대 플레이어: 서버 중계 상태를 100ms 지연 보간해 그린다. 판정은 피격자 쪽에서 한다.
import Phaser from 'phaser';
import { Actor, HitInfo } from './combat';
import { CLASSES } from '../data/classes';
import type { Snap } from '../net/pvp';
import { resolveBody, Body } from './look';
import type { World } from '../scenes/World';

export const PVP_HP = 2, PVP_ATK = 0.7;

export class Remote extends Actor {
  buf: { t: number; x: number; y: number; f: number; s: string; mv: boolean }[] = [];
  weapon: Phaser.GameObjects.Image | null = null; tag: Phaser.GameObjects.Text; body: Body; st2 = 'idle'; mv = false; cls: string;
  constructor(W: World, public snap: Snap, x: number, y: number) {
    super(W); this.team = 'enemy'; this.x = x; this.y = y; this.name = snap.name; this.cls = snap.classId;
    this.maxHp = this.hp = Math.round(snap.maxHp * PVP_HP); this.atk = Math.round(snap.atk * PVP_ATK); this.def = snap.def; this.level = snap.level;
    this.body = resolveBody(W, snap.look, snap.classId);
    this.makeSprite(this.body.tex, this.body.frame, this.body.scale, this.body.tint, this.body.originY); this.r = 14;
    const c = CLASSES[snap.classId]; if (c?.weapon && this.body.weapon) this.weapon = W.add.image(x, y, c.weapon.sheet, c.weapon.frame).setScale(2.4).setOrigin(0.5, 0.85);
    this.tag = W.add.text(x, y, `${snap.name} Lv${snap.level}`, { fontFamily: 'Galmuri11', fontSize: '12px', color: '#ff9aa8', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
  }
  push(d: any) { this.buf.push({ t: performance.now(), x: d.x, y: d.y, f: d.f, s: d.s, mv: !!d.mv }); if (this.buf.length > 30) this.buf.shift(); if (typeof d.hp === 'number') { this.hp = d.hp; this.maxHp = d.mhp || this.maxHp; } }
  receive(_h: HitInfo) { return false; } // 피격 판정은 상대 클라이언트가 함
  onParried(_pow: number) { this.W.netSend({ t: 'parried' }); }
  update(_dt: number) {
    const rt = performance.now() - 100; const b = this.buf;
    if (b.length >= 2) {
      let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
      const a = b[Math.max(0, i - 1)], c = b[i]; const k = c.t === a.t ? 1 : Phaser.Math.Clamp((rt - a.t) / (c.t - a.t), 0, 1);
      this.x = a.x + (c.x - a.x) * k; this.y = a.y + (c.y - a.y) * k; this.facing = c.f; this.st2 = c.s; this.mv = c.mv;
    } else if (b.length === 1) { this.x = b[0].x; this.y = b[0].y; this.facing = b[0].f; }
    const n = this.W.now;
    this.bob = this.mv ? -Math.abs(Math.sin(n / 85)) * 3 : Math.sin(n / 400) * 0.6;
    const flip = Math.cos(this.facing) < 0; this.spr.setFlipX(flip);
    const atk = this.st2 === 'attack' || this.st2 === 'ult';
    this.spr.setScale(this.baseScale * (atk ? 1.1 : this.st2 === 'dash' ? 1.15 : 1), this.baseScale * (atk ? 0.93 : this.st2 === 'dash' ? 0.88 : 1)).setRotation(this.st2 === 'hit' ? 0.25 * (flip ? 1 : -1) : this.mv ? Math.sin(n / 85) * 0.07 : 0);
    this.spr.setAlpha(this.st2 === 'dash' ? 0.6 : 1);
    if (this.st2 === 'dash' && Math.random() < 0.5) this.W.fx.afterimage(this.spr, 0xff8090);
    this.syncSprite();
    if (this.weapon) {
      const side = flip ? -1 : 1;
      const wa = atk ? this.facing + Math.PI / 2 + Math.sin(n / 40) * 0.6 : side * 0.5;
      this.weapon.setPosition(this.x + side * this.body.hand.x, this.y + this.body.hand.y + this.bob).setRotation(wa).setDepth(this.y + 1);
    }
    this.tag.setPosition(this.x, this.y - Math.max(66, this.body.height + 8)).setDepth(this.y + 2);
  }
  destroyAll() { this.destroySprite(); this.weapon?.destroy(); this.tag.destroy(); }
}
