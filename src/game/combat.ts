// 전투 공통: Actor 기반, 공격 판정(동일 hit ID 1회), 예고, 투사체, 장판
import Phaser from 'phaser';
import { WShape, hitTest, drawTelegraph, TeleStyle, shapeArea } from './shapes';
import type { World } from '../scenes/World';

export type Team = 'player' | 'enemy';
export interface HitInfo {
  src: Actor; coef: number; parryable?: boolean; poise?: number; eff?: string[]; status?: string; kb?: number;
  ang?: number; cap25?: boolean; name?: string; pen?: number; dmgMul?: number; critBonus?: number; isProj?: boolean;
  moveId?: string; ult?: number; tech?: string; fake?: boolean; elemental?: boolean; dot?: boolean; flat?: number; maxTargets?: number; noNet?: boolean;
}

export interface StatusMap {
  poison?: { stacks: number; until: number; next: number; src?: Actor };
  burn?: { stacks: number; until: number; next: number; src?: Actor };
  bleed?: { stacks: number; until: number; next: number; per: number };
  slow?: { until: number; amt: number };
  freeze?: { until: number };
  guardBreak?: { until: number; cd: number };
  defDown?: { until: number; amt: number };
  stun?: { until: number };
  launch?: { until: number };
}

export abstract class Actor {
  x = 0; y = 0; r = 14; facing = 0; team: Team = 'enemy';
  hp = 1; maxHp = 1; atk = 1; def = 0; level = 1; alive = true;
  poise = 50; maxPoise = 50; lastPoiseHit = 0; staggerUntil = 0;
  st: StatusMap = {}; chillHits: number[] = [];
  spr!: Phaser.GameObjects.Image; shadow!: Phaser.GameObjects.Image;
  baseScale = 3; bob = 0; offX = 0; offY = 0; flashUntil = 0; hopZ = 0; tint = 0xffffff; isBoss = false; isElite = false;
  kbx = 0; kby = 0; name = '';
  constructor(public W: World) {}

  abstract receive(h: HitInfo): boolean;

  get stunned() { const n = this.W.now; return (this.st.stun && this.st.stun.until > n) || (this.st.freeze && this.st.freeze.until > n) || (this.st.launch && this.st.launch.until > n) || this.staggerUntil > n; }
  slowFactor() { const n = this.W.now; let f = 1; if (this.st.slow && this.st.slow.until > n) f *= 1 - this.st.slow.amt; return f; }
  defMul() { const n = this.W.now; return this.st.defDown && this.st.defDown.until > n ? 1 - this.st.defDown.amt : 1; }

  applyStatus(kind: string, src?: Actor) {
    const n = this.W.now; const st = this.st;
    switch (kind) {
      case 'poison': { const p = st.poison && st.poison.until > n ? st.poison : (st.poison = { stacks: 0, until: 0, next: n + 1000, src }); p.stacks = Math.min(3, p.stacks + 1); p.until = n + 4000; p.src = src; break; }
      case 'burn': { const p = st.burn && st.burn.until > n ? st.burn : (st.burn = { stacks: 0, until: 0, next: n + 1000, src }); p.stacks = Math.min(3, p.stacks + 1); p.until = n + 5000; p.src = src; break; }
      case 'bleed': { const extra = (src as any)?.bleedExtra || 0; const p = st.bleed && st.bleed.until > n ? st.bleed : (st.bleed = { stacks: 0, until: 0, next: n + 1000, per: 0 }); p.stacks = Math.min(2, p.stacks + 1); p.until = n + 4000 + extra; p.per = ((src?.atk || 0) * 0.35) / 4; break; }
      case 'chill': {
        // 7초 내 동일 대상 2회부터 저항
        this.chillHits = this.chillHits.filter((t) => n - t < 7000); this.chillHits.push(n);
        const resist = this.chillHits.length > 2;
        if (this.team === 'player') st.slow = { until: n + 1500, amt: 0.35 };
        else if (this.isBoss) st.slow = { until: n + 1000, amt: 0.15 };
        else if (!resist) st.freeze = { until: n + 1200 + ((src as any)?.freezeExtra || 0) };
        else st.slow = { until: n + 1200, amt: 0.3 };
        break;
      }
      case 'slow': st.slow = { until: n + 1500, amt: 0.35 }; break;
    }
  }

  tickStatus(dt: number) {
    const n = this.W.now; const st = this.st;
    const dot = (key: 'poison' | 'burn') => {
      const p = st[key]; if (!p || p.until < n) return;
      if (n >= p.next) {
        p.next += 1000;
        let d: number;
        if (this.team === 'player') d = this.maxHp * (key === 'poison' ? 0.007 : 0.006) * p.stacks;
        else d = (p.src?.atk || 10) * (key === 'poison' ? 0.12 : 0.16) * p.stacks;
        if (this.isBoss) d = Math.min(d, this.maxHp * 0.004);
        this.receive({ src: p.src || this, coef: 0, flat: Math.max(1, Math.round(d)), dot: true, name: key === 'poison' ? '독' : '화상' });
      }
    };
    dot('poison'); dot('burn');
    if (st.bleed && st.bleed.until > n && n >= st.bleed.next) {
      st.bleed.next += 1000; let d = st.bleed.per * st.bleed.stacks; if (this.isBoss) d = Math.min(d, this.maxHp * 0.004);
      this.receive({ src: this, coef: 0, flat: Math.max(1, Math.round(d)), dot: true, name: '출혈' });
    }
    // 넉백 감쇠
    if (Math.abs(this.kbx) + Math.abs(this.kby) > 1) {
      this.W.moveActor(this, this.kbx * dt, this.kby * dt);
      const k = Math.pow(0.0005, dt); this.kbx *= k; this.kby *= k;
    }
    // Poise 회복: 3초 피격 없으면 초당 10%
    if (n - this.lastPoiseHit > 3000 && this.poise < this.maxPoise) this.poise = Math.min(this.maxPoise, this.poise + this.maxPoise * 0.1 * dt);
  }

  knock(ang: number, power: number) { this.kbx = Math.cos(ang) * power; this.kby = Math.sin(ang) * power; }

  makeSprite(tex: string, frame: number, scale: number, tint: number, originY = 0.86) {
    this.baseScale = scale; this.tint = tint;
    this.spr = this.W.add.image(this.x, this.y, tex, tex.startsWith('fx_') ? undefined : frame).setScale(scale).setOrigin(0.5, originY).setTint(tint);
    const k = (this.spr.width * scale) / 48; // 그림자는 화면상 너비 기준(16px×3 = 48 → 1)
    this.shadow = this.W.add.image(this.x, this.y, 'shadow').setAlpha(0.35).setScale(k * 0.9, k * 0.7);
    this.r = 6 * scale;
  }
  syncSprite() {
    const n = this.W.now;
    this.spr.setPosition(this.x + this.offX, this.y + this.offY - this.hopZ + this.bob);
    this.shadow.setPosition(this.x, this.y + 2);
    this.spr.setDepth(this.y); this.shadow.setDepth(this.y - 1000);
    if (this.flashUntil > n) this.spr.setTintFill(0xffffff);
    else if (this.st.freeze && this.st.freeze.until > n) this.spr.setTint(0x9fe8ff);
    else if (this.st.burn && this.st.burn.until > n && Math.floor(n / 150) % 2) this.spr.setTint(0xff9a60);
    else if (this.st.poison && this.st.poison.until > n && Math.floor(n / 150) % 2) this.spr.setTint(0x9aff70);
    else this.spr.setTint(this.tint);
  }
  destroySprite() { this.spr?.destroy(); this.shadow?.destroy(); }
}

let ATK_ID = 1;
export interface Atk {
  id: number; owner: Actor; team: Team; shape: WShape; end: number; info: Omit<HitInfo, 'src'>; maxTargets: number; hit: Set<Actor>;
  onHit?: (t: Actor) => void;
}
export interface Tele { shape: WShape; start: number; end: number; style: TeleStyle; g: Phaser.GameObjects.Graphics; then?: () => void; owner?: Actor; cancelled?: boolean; icon?: Phaser.GameObjects.Text }
export interface Proj {
  x: number; y: number; vx: number; vy: number; r: number; team: Team; owner: Actor; info: Omit<HitInfo, 'src'>; life: number;
  pierce: boolean; hit: Set<Actor>; img: Phaser.GameObjects.Image; explode?: number; onEnd?: (p: Proj) => void; dead?: boolean; trailT?: number; trail?: number;
}
export interface Zone {
  shape: WShape; team: Team; owner: Actor; until: number; next: number; tick: number; info: Omit<HitInfo, 'src'>; g: Phaser.GameObjects.Graphics; color: number; area: number; slowOnly?: boolean;
}

export class Combat {
  atks: Atk[] = []; teles: Tele[] = []; projs: Proj[] = []; zones: Zone[] = [];
  gTele: Phaser.GameObjects.Graphics; gZone: Phaser.GameObjects.Graphics;
  constructor(public W: World) {
    this.gZone = W.add.graphics().setDepth(-5000);
    this.gTele = W.add.graphics().setDepth(-4000);
  }
  targetsFor(team: Team): Actor[] { return team === 'player' ? this.W.enemies.filter((e) => e.alive) : this.W.player.alive ? [this.W.player] : []; }

  strike(owner: Actor, shape: WShape, info: Omit<HitInfo, 'src'>, activeMs = 100, maxTargets = 99, onHit?: (t: Actor) => void) {
    const a: Atk = { id: ATK_ID++, owner, team: owner.team, shape, end: this.W.now + activeMs, info, maxTargets, hit: new Set(), onHit };
    if (owner === this.W.player && !info.noNet) this.W.netStrike(shape, info);
    this.atks.push(a); this.resolveAtk(a); return a;
  }
  telegraph(shape: WShape, ms: number, style: TeleStyle, then?: () => void, owner?: Actor) {
    const t: Tele = { shape, start: this.W.now, end: this.W.now + ms, style, g: this.gTele, then, owner };
    if (!style.subtle && !style.fake) {
      const c = { x: (shape as any).x ?? 0, y: (shape as any).y ?? 0 };
      if (shape.k === 'rect' || shape.k === 'cone' || shape.k === 'circle') {
        t.icon = this.W.add.text(c.x, c.y - 4, style.parry ? '⚔' : '!', { fontFamily: 'Galmuri11', fontSize: '18px', color: style.parry ? '#30f0e0' : '#ff4058', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(150000);
        if (shape.k !== 'circle') { const ctr = { x: shape.x + Math.cos((shape as any).a) * 40, y: shape.y + Math.sin((shape as any).a) * 40 }; t.icon.setPosition(ctr.x, ctr.y); }
      }
    }
    this.teles.push(t); return t;
  }
  cancelOwner(owner: Actor) {
    for (const t of this.teles) if (t.owner === owner) { t.cancelled = true; t.icon?.destroy(); }
    this.teles = this.teles.filter((t) => !t.cancelled);
    this.atks = this.atks.filter((a) => a.owner !== owner);
  }
  projectile(owner: Actor, x: number, y: number, ang: number, speed: number, range: number, r: number, tex: string, tint: number, info: Omit<HitInfo, 'src'>, o: Partial<Proj> = {}) {
    const img = this.W.add.image(x, y, tex).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(Math.max(0.12, r / 40)).setRotation(ang).setDepth(100001);
    const p: Proj = { x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, team: owner.team, owner, info: { ...info, isProj: true }, life: range / speed, pierce: false, hit: new Set(), img, ...o };
    if (owner === this.W.player && !info.noNet) this.W.netProj({ x, y, ang, speed, range, r, tex, tint, pierce: !!o.pierce, explode: o.explode || 0 }, info);
    this.projs.push(p); return p;
  }
  zone(owner: Actor, shape: WShape, dur: number, info: Omit<HitInfo, 'src'>, color: number, tick = 500) {
    const z: Zone = { shape, team: owner.team, owner, until: this.W.now + dur, next: this.W.now + 250, tick, info, g: this.gZone, color, area: shapeArea(shape) };
    this.zones.push(z); return z;
  }
  zoneArea(team: Team = 'enemy') { const n = this.W.now; return this.zones.filter((z) => z.team === team && z.until > n).reduce((a, z) => a + z.area, 0); }

  resolveAtk(a: Atk) {
    for (const t of this.targetsFor(a.team)) {
      if (a.hit.size >= a.maxTargets) break;
      if (a.hit.has(t)) continue;
      if (hitTest(a.shape, t.x, t.y, t.r * 0.8)) {
        a.hit.add(t);
        const landed = t.receive({ ...a.info, src: a.owner, ang: a.info.ang ?? Math.atan2(t.y - a.owner.y, t.x - a.owner.x) });
        if (landed && a.onHit) a.onHit(t);
      }
    }
  }

  update(dt: number) {
    const n = this.W.now;
    // 예고
    this.gTele.clear();
    const done: Tele[] = [];
    for (const t of this.teles) {
      const prog = Math.min(1, (n - t.start) / Math.max(1, t.end - t.start));
      drawTelegraph(this.gTele, t.shape, prog, t.style);
      if (t.icon) t.icon.setAlpha(0.6 + 0.4 * Math.sin(n / 60));
      if (n >= t.end) done.push(t);
    }
    if (done.length) {
      this.teles = this.teles.filter((t) => !done.includes(t));
      for (const t of done) { t.icon?.destroy(); if (!t.cancelled && t.then) t.then(); }
    }
    // 활성 판정
    for (const a of this.atks) this.resolveAtk(a);
    this.atks = this.atks.filter((a) => a.end > n);
    // 투사체
    for (const p of this.projs) {
      if (p.dead) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.img.setPosition(p.x, p.y);
      if (p.trail) { p.trailT = (p.trailT || 0) - dt; if (p.trailT <= 0) { p.trailT = 0.03; this.W.fx.sprite(p.img.texture.key, p.x, p.y, { tint: p.img.tintTopLeft, scale: p.img.scaleX * 0.7, endScale: 0.01, dur: 180, rot: p.img.rotation }); } }
      if (this.W.shotBlocked(p.x, p.y)) { this.endProj(p); continue; }
      for (const t of this.targetsFor(p.team)) {
        if (p.hit.has(t)) continue;
        if (Math.hypot(t.x - p.x, t.y - (p.y + 8)) < p.r + t.r * 0.8) {
          p.hit.add(t);
          const landed = t.receive({ ...p.info, src: p.owner, ang: Math.atan2(p.vy, p.vx) });
          if ((t as any).lastParryAt === this.W.now) { this.endProj(p); break; }
          if (!p.pierce || p.explode) { this.endProj(p); break; }
          if (landed && p.info.maxTargets && p.hit.size >= (p.info as any).maxTargets) { this.endProj(p); break; }
        }
      }
      if (!p.dead && p.life <= 0) this.endProj(p);
    }
    this.projs = this.projs.filter((p) => !p.dead);
    // 장판
    this.gZone.clear();
    for (const z of this.zones) {
      const left = z.until - n; const a = Math.min(1, left / 400);
      drawTelegraph(this.gZone, z.shape, 1, { color: z.color, subtle: true });
      if (a < 1) this.gZone.setAlpha(1);
      if (n >= z.next) {
        z.next += z.tick;
        for (const t of this.targetsFor(z.team)) {
          if (hitTest(z.shape, t.x, t.y, t.r * 0.5)) t.receive({ ...z.info, src: z.owner, dot: true });
        }
      }
    }
    this.zones = this.zones.filter((z) => z.until > n);
  }
  endProj(p: Proj) {
    if (p.dead) return; p.dead = true;
    p.onEnd?.(p);
    this.W.tweens.add({ targets: p.img, alpha: 0, scale: p.img.scale * 1.6, duration: 120, onComplete: () => p.img.destroy() });
  }
  clearAll() {
    for (const t of this.teles) t.icon?.destroy();
    for (const p of this.projs) p.img.destroy();
    this.teles = []; this.atks = []; this.projs = []; this.zones = [];
    this.gTele.clear(); this.gZone.clear();
  }
  clearEnemy() {
    for (const t of this.teles) if (t.owner && t.owner.team === 'enemy') { t.cancelled = true; t.icon?.destroy(); }
    this.teles = this.teles.filter((t) => !t.cancelled);
    this.atks = this.atks.filter((a) => a.team !== 'enemy');
    for (const p of this.projs) if (p.team === 'enemy') { p.dead = true; p.img.destroy(); }
    this.projs = this.projs.filter((p) => !p.dead);
    this.zones = this.zones.filter((z) => z.team !== 'enemy');
  }
}
