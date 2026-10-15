// 플레이어: 입력 버퍼 130ms, 콤보 체인 700ms, 대시 i-frame 70~190ms, 패링 120ms (기획서 3.1 / 4.3)
import Phaser from 'phaser';
import { Actor, HitInfo } from './combat';
import { ClassDef, Move } from '../data/classes';
import { S, cls, hasTrait, bus } from '../core/state';
import { computeStats, Stats } from '../core/stats';
import { calcDamage } from '../data/formulas';
import { WShape } from './shapes';
import { sfx } from '../audio/audio';
import type { World } from '../scenes/World';
import { resolveBody, Body } from './look';

// a→b 최단 각도로 보간
const lerpAng = (a: number, b: number, t: number) => a + Phaser.Math.Angle.Wrap(b - a) * t;

export type Act = 'L' | 'H' | 'D' | 'F' | 'Q' | 'E' | 'R' | 'POT';
export interface InputState { mx: number; my: number; aimX: number; aimY: number; pressed: Act[] }

const RANKS = [{ r: 'S', min: 500, ult: 0.2 }, { r: 'A', min: 320, ult: 0.15 }, { r: 'B', min: 180, ult: 0.1 }, { r: 'C', min: 80, ult: 0.05 }, { r: 'D', min: 0, ult: 0 }];
export class ComboMeter {
  score = 0; lastHit = 0; techs: string[] = []; best = 'D'; keepReadyAt = 0;
  add(pts: number, tech: string, now: number, mul = 1) {
    const n = this.techs.length; const rep = n >= 2 && this.techs[n - 1] === tech && this.techs[n - 2] === tech;
    this.score = Math.min(700, this.score + pts * (rep ? 0.5 : 1) * mul); this.techs.push(tech); if (this.techs.length > 4) this.techs.shift(); this.lastHit = now;
    const r = this.rank(); if ('DCBAS'.indexOf(r) > 'DCBAS'.indexOf(this.best)) this.best = r;
  }
  update(dt: number, now: number) { if (now - this.lastHit > 2500) this.score = Math.max(0, this.score - 25 * dt); }
  onHurt(now: number, keep: boolean) { if (keep && now >= this.keepReadyAt) { this.keepReadyAt = now + 20000; return; } this.score *= 0.65; }
  rank() { return RANKS.find((x) => this.score >= x.min)!.r; }
  ultBonus() { return RANKS.find((x) => this.score >= x.min)!.ult; }
  reset() { this.score = 0; this.best = 'D'; this.techs = []; }
}

let KEY = 1;
export class Player extends Actor {
  c: ClassDef; stats!: Stats; mp = 0; res = 50; ult = 0;
  state: 'idle' | 'attack' | 'dash' | 'parry' | 'parryFail' | 'hit' | 'potion' | 'ult' | 'dead' = 'idle';
  stateStart = 0; stateEnd = 0; cancelAt = 0; curMove: Move | null = null; hitConfirmed = false;
  pending: { t: number; fn: () => void }[] = [];
  buffer: { act: Act; t: number } | null = null;
  chain: string[] = []; chainCoefs: number[] = []; chainUntil = 0; prefix: 'D' | 'F' | null = null; prefixUntil = 0;
  counterUntil = 0; cds: Record<string, number> = {}; cdDur: Record<string, number> = {};
  iframeFrom = 0; iframeTo = 0; dashVx = 0; dashVy = 0; dashMoveUntil = 0; dodgedThisDash = false;
  parryTo = 0; lastParryAt = -1; superArmor = false; invulnUntil = 0;
  combo = new ComboMeter(); aim = 0; weapon: Phaser.GameObjects.Image | null = null; body!: Body; swingSide = 1;
  lastHitBy = ''; buffs: Record<string, number> = {}; awarded = new Set<string>(); crownUsed = false; sealUsed = false;
  bleedExtra = 0; freezeExtra = 0; potionBelt = 3; lastCombatAt = -99999; moving = false; stepT = 0;
  seenAt: Record<string, number> = {}; weaponPush = 0; hpMul = 1;
  // PvP: 상대에게 패링당함
  getParried() { this.pending = []; this.state = 'hit'; this.stateEnd = this.now + 650; this.curMove = null; this.superArmor = false; this.W.fx.label(this.x, this.y - 70, '패링당함!', '#ff7090', 15, 700); sfx('parry', 0.8); }

  constructor(W: World, x: number, y: number) {
    super(W); this.team = 'player'; this.x = x; this.y = y; this.c = cls();
    this.body = resolveBody(W, S.look, this.c.id);
    this.makeSprite(this.body.tex, this.body.frame, this.body.scale, this.body.tint, this.body.originY); this.r = 14;
    if (this.c.weapon && this.body.weapon) this.weapon = W.add.image(x, y, 'dun', this.c.weapon.frame).setScale(this.body.weaponScale).setOrigin(0.5, 0.85);
    this.refreshStats(true); this.mp = this.stats.mpMax; this.name = S.name || '플레이어';
    this.bleedExtra = hasTrait('redmoon') ? 1000 : 0; this.freezeExtra = hasTrait('deepfreeze') ? 300 : 0;
  }
  refreshStats(full = false) {
    const ratio = this.maxHp > 1 ? this.hp / this.maxHp : 1;
    this.stats = computeStats(); this.maxHp = Math.round(this.stats.maxHp * this.hpMul); this.atk = this.stats.atk; this.def = this.stats.def; this.level = S.level;
    this.hp = full ? this.maxHp : Math.max(1, Math.round(this.maxHp * ratio));
  }
  get now() { return this.W.now; }
  get inCombat() { return this.now - this.lastCombatAt < 4000; }
  atkSpeed() { let s = this.stats.atkSpd; if ((this.buffs.evaderush || 0) > this.now) s += 0.15; if (this.stats.uniques.has('sSpeed') && this.combo.rank() === 'S') s += 0.1; return Math.min(1.4, s); }
  cdReady(k: string) { return (this.cds[k] || 0) <= this.now; }
  setCd(k: string, sec: number, reducible = true) { const d = sec * 1000 * (reducible ? 1 - this.stats.cdr : 1); this.cds[k] = this.now + d; this.cdDur[k] = d; }
  unlocked(m: Move) { return !m.unlock || S.level >= m.unlock; }
  sched(ms: number, fn: () => void) { this.pending.push({ t: this.now + ms, fn }); }

  update(dt: number, inp: InputState) {
    if (!this.alive) { this.syncSprite(); return; }
    const now = this.now;
    this.aim = Math.atan2(inp.aimY - this.y, inp.aimX - this.x);
    this.tickStatus(dt);
    this.combo.update(dt, now);
    // 자원 회복 (마법사 MP: 비전투 6/s, 전투 3/s)
    if (this.c.id === 'mage') this.mp = Math.min(this.stats.mpMax, this.mp + (this.inCombat ? 3 : 6) * this.stats.mpRegen * dt);
    else if (!this.inCombat) this.res += (50 - this.res) * Math.min(1, dt * 0.5);
    // 예약 실행
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.t <= now); this.pending = this.pending.filter((p) => p.t > now);
      for (const p of due) if (this.alive) p.fn();
    }
    for (const a of inp.pressed) this.buffer = { act: a, t: now };
    if (this.buffer && now - this.buffer.t > 130) this.buffer = null;
    if (this.state !== 'idle' && now >= this.stateEnd) this.endState();
    if (this.buffer && this.state !== 'ult' && this.canAct(this.buffer.act)) { const a = this.buffer.act; this.buffer = null; this.doAct(a); }

    // 이동
    let sp = this.stats.move * this.slowFactor();
    let mx = inp.mx, my = inp.my; const len = Math.hypot(mx, my); if (len > 0) { mx /= len; my /= len; }
    if (this.state === 'dash') {
      if (now < this.dashMoveUntil) { this.W.moveActor(this, this.dashVx * dt, this.dashVy * dt); if (Math.random() < 0.6) this.W.fx.afterimage(this.spr, this.c.color); }
    } else {
      const f = { idle: 1, attack: 0.45, potion: 0.5, ult: 0.3, parry: 0, parryFail: 0, hit: 0.2, dead: 0, dash: 0 }[this.state];
      if (len > 0 && f > 0) this.W.moveActor(this, mx * sp * f * dt, my * sp * f * dt);
    }
    this.moving = len > 0 && this.state === 'idle';
    if (this.state === 'idle' || this.state === 'potion') this.facing = this.aim;
    this.animate(dt);
    this.syncSprite();
  }

  canAct(a: Act) {
    const n = this.now;
    switch (this.state) {
      case 'idle': return true;
      case 'dash': return n >= this.stateEnd;
      case 'attack':
        if (this.curMove && (this.curMove.id.endsWith('_h'))) return (a === 'D' && this.hitConfirmed && n >= this.stateEnd - 120) || n >= this.stateEnd;
        return n >= this.cancelAt;
      default: return false;
    }
  }

  doAct(a: Act) {
    const n = this.now; const c = this.c;
    if (a === 'D') return this.dash();
    if (a === 'F') return this.parry();
    if (a === 'POT') return this.potion();
    if (a === 'R') {
      if (!this.unlocked(c.R)) return this.W.hint(`궁극기는 Lv${c.R.unlock}에 해금됩니다`);
      if (this.ult < 100) return;
      this.ult = 0; this.startMove(c.R, { tech: 'R', ult: true });
      if (this.stats.relics.has('rift_crown') && !this.crownUsed) { this.crownUsed = true; this.ult = 15; }
      return;
    }
    if (a === 'Q' || a === 'E') {
      const m = a === 'Q' ? c.Q : c.E;
      if (!this.unlocked(m)) return this.W.hint(`${m.name}은(는) Lv${m.unlock}에 해금됩니다`);
      if (!this.cdReady(a)) return;
      if (c.id === 'mage') { const cost = (m.mp || 0) * this.stats.mpCost; if (this.mp < cost) return this.W.hint('MP 부족'); this.mp -= cost; }
      else { if (this.res < (m.res || 0)) return this.W.hint(`${c.resName} 부족`); this.res -= m.res || 0; }
      this.setCd(a, m.cd!); this.startMove(m, { tech: a }); return;
    }
    // L / H 체인
    if (n > this.chainUntil) { this.chain = []; this.chainCoefs = []; }
    if (this.chain.length === 0 && this.prefix && this.prefixUntil > n) this.chain.push(this.prefix);
    this.prefix = null;
    if (a === 'L') {
      if (this.counterUntil > n) { // 패링 반격
        this.counterUntil = 0; this.chain = ['F', 'L']; this.chainCoefs = [0, c.C.coef];
        const extraPoise = hasTrait('instinct') ? 15 : 0;
        return this.startMove(c.C, { tech: 'C', autoAim: true, poiseAdd: extraPoise });
      }
      let ls = 0; for (let i = this.chain.length - 1; i >= 0 && this.chain[i] === 'L'; i--) ls++;
      if (ls >= 3 || this.chain.length >= 3) { this.chain = []; this.chainCoefs = []; ls = 0; }
      const m = c.L[ls]; this.chain.push('L'); this.chainCoefs.push(m.coef);
      if (c.id === 'mage') this.mp = Math.max(0, this.mp - (m.mp || 0) * this.stats.mpCost); // MP 0이어도 L은 막히지 않음
      const key = this.chain.join('');
      let mul = 1;
      if (ls === 2 && c.id === 'fist' && hasTrait('chain')) mul *= 1.15;
      if (key === 'LLL') {
        if (this.stats.relics.has('ash_seal')) mul *= 1.12;
        this.startMove(m, { tech: 'L' + ls, combo: c.combos.LLL, mul });
        this.chain = []; this.chainCoefs = [];
      } else this.startMove(m, { tech: 'L' + ls, mul });
      return;
    }
    if (a === 'H') {
      if (c.id === 'mage') { const cost = (c.H.mp || 0) * this.stats.mpCost; this.mp = Math.max(0, this.mp - cost); }
      this.chain.push('H');
      const key = this.chain.slice(-3).join('');
      const cd = this.chain.length >= 3 ? c.combos[key] : undefined;
      if (cd) {
        const prev = this.chainCoefs.slice(-2).reduce((s, v) => s + v, 0);
        const coef = Math.max(cd.total - prev, c.H.coef * 0.8);
        this.startMove(c.H, { tech: 'H', combo: cd, coef });
        this.chain = []; this.chainCoefs = [];
      } else { this.chainCoefs.push(c.H.coef); this.startMove(c.H, { tech: 'H' }); }
    }
  }

  startMove(m: Move, o: { tech: string; combo?: { name: string; eff: string[] }; coef?: number; mul?: number; ult?: boolean; autoAim?: boolean; poiseAdd?: number }) {
    const n = this.now; const spd = o.ult ? 1 : this.atkSpeed();
    let dur = (m.dur / spd) * 1000;
    if (m.charge && hasTrait('burst')) dur -= m.charge * 120;
    this.state = o.ult ? 'ult' : 'attack'; this.stateStart = n; this.stateEnd = n + dur; this.curMove = m; this.hitConfirmed = false;
    this.swingSide = m.id.endsWith('_l2') ? -1 : 1;
    this.superArmor = !!m.superArmor;
    this.lastCombatAt = n;
    let face = this.aim;
    if (o.autoAim) { const t = this.W.nearestEnemy(this.x, this.y, 220); if (t) { const ta = Math.atan2(t.y - this.y, t.x - this.x); if (Math.abs(Phaser.Math.Angle.Wrap(ta - face)) < 0.26) face = ta; } }
    this.facing = face;
    const actT = m.act * dur;
    this.cancelAt = m.id.endsWith('_l3') ? this.stateEnd : m.id.match(/_l[12]$/) ? n + actT + 80 : this.stateEnd - 60;
    if (o.combo) this.W.fx.label(this.x, this.y - 70, o.combo.name, '#ffe28a', 15, 800);
    if (m.charge) { this.W.fx.burst(this.x, this.y - 20, this.c.color, 40, 'fx_light'); }
    const hits = (m.hits || 1) + (o.tech === 'Q' && hasTrait('volley') ? 1 : 0);
    for (let i = 0; i < hits; i++) {
      this.sched(actT + i * (m.interval || 0) * 1000, () => {
        if (this.state !== 'attack' && this.state !== 'ult') return;
        if (this.state === 'ult' && i > 0) { const t = this.W.nearestEnemy(this.x, this.y, 260); if (t) this.facing = Math.atan2(t.y - this.y, t.x - this.x); }
        let mul = o.mul || 1;
        if (o.ult && (hasTrait('meteor') || hasTrait('archmage'))) mul *= 1.12;
        if (o.ult && i === hits - 1 && hasTrait('explode')) mul *= 1.15;
        this.execMove(m, (o.coef ?? m.coef) * mul, o, i);
      });
    }
    if (m.lunge) this.sched(actT * 0.6, () => { const L = m.lunge! * (o.combo?.eff.includes('dashFwd') ? 4 : 1); this.knock(this.facing, L * 9); });
    sfx(m.sfx || 'swing1', 0.6);
  }

  execMove(m: Move, coef: number, o: { tech: string; combo?: { eff: string[] }; poiseAdd?: number }, idx: number) {
    const sh = m.shape; const f = this.facing; const key = 'k' + KEY++;
    const eff = [...(m.eff || []), ...(o.combo?.eff || [])];
    const status = eff.includes('burn') ? 'burn' : eff.includes('chill') ? 'chill' : eff.includes('bleed') ? 'bleed' : undefined;
    let poise = m.poise + (o.poiseAdd || 0) + (eff.includes('poise45') ? 45 : 0) + (eff.includes('poise60') ? 60 : 0);
    if (this.stats.relics.has('steel_heart')) poise *= 1.15;
    const info: Omit<HitInfo, 'src'> = {
      coef, poise, eff, status, kb: eff.includes('knock') ? 380 : eff.includes('pull') ? -260 : 90, moveId: key, tech: o.tech, ult: m.ult ?? 1.2,
      pen: (m.pen || 0) + (o.tech === 'H' && hasTrait('shatter') ? 0.1 : 0), critBonus: eff.includes('critUp') ? 0.15 : 0,
    };
    if (o.tech === 'Q' && this.c.id === 'fist' && hasTrait('bind')) info.dmgMul = 1.2;
    if (eff.includes('backstep')) this.knock(this.facing + Math.PI, 700);
    if (eff.includes('mp10')) this.mp = Math.min(this.stats.mpMax, this.mp + 10);
    const tint = this.c.color;
    switch (sh.t) {
      case 'cone': {
        const shape: WShape = { k: 'cone', x: this.x, y: this.y - 10, r: sh.r, a: f, half: (sh.ang * Math.PI) / 360 };
        this.W.combat.strike(this, shape, info, 80, m.maxTargets || 6);
        if (m.fx === 'punch') { this.W.fx.sprite('fx_star', this.x + Math.cos(f) * sh.r * 0.7, this.y - 14 + Math.sin(f) * sh.r * 0.7, { tint, scale: 0.22, endScale: 0.45, dur: 160 }); }
        else this.W.fx.slash(this.x, this.y - 14, f + (idx % 2 ? 0.4 : -0.2), sh.r, tint, m.fx === 'slashBig');
        break;
      }
      case 'rect': {
        const len = sh.len * (o.tech.startsWith('L') && hasTrait('reach') ? 1.15 : 1);
        const shape: WShape = { k: 'rect', x: this.x, y: this.y - 10, a: f, len, w: sh.w };
        this.W.combat.strike(this, shape, info, 90, m.maxTargets || 6);
        if (this.c.id === 'fist') { this.W.fx.burst(this.x + Math.cos(f) * sh.len * 0.6, this.y - 12 + Math.sin(f) * sh.len * 0.6, tint, sh.w, 'fx_twirl'); this.W.fx.shake(80, 0.003); }
        else if (this.c.id === 'lancer') { this.W.fx.sprite('fx_trace', this.x + Math.cos(f) * len * 0.5, this.y - 12 + Math.sin(f) * len * 0.5, { tint, rot: f, scale: len / 110, dur: 160 }); }
        else this.W.fx.slash(this.x, this.y - 14, f, sh.len, tint, true);
        break;
      }
      case 'circle': {
        let cx = this.x, cy = this.y - 6;
        if (sh.at === 'aim') { const p = this.W.aimPoint(); const d = Math.min(sh.maxDist || 200, Math.hypot(p.x - this.x, p.y - this.y)); cx = this.x + Math.cos(this.aim) * d; cy = this.y + Math.sin(this.aim) * d; }
        let r = sh.r; if (this.c.id === 'mage' && o.tech === 'Q' && hasTrait('spread')) r *= 1.12;
        if (o.tech === 'E' && hasTrait('dragon')) r *= 1.2;
        if (eff.includes('leap')) {
          // 낙창: 조준 지점으로 도약 후 착지 타격
          const sx = this.x, sy = this.y; this.invulnUntil = this.now + 260;
          this.W.tweens.addCounter({ from: 0, to: 1, duration: 240, onUpdate: (tw) => { const k = tw.getValue(); this.W.moveActorTo(this, sx + (cx - sx) * k, sy + (cy + 6 - sy) * k); this.offY = -Math.sin(k * Math.PI) * 60; }, onComplete: () => {
            this.offY = 0; this.W.combat.strike(this, { k: 'circle', x: this.x, y: this.y - 6, r }, info, 90, m.maxTargets || 8); this.W.fx.burst(this.x, this.y, tint, r, 'fx_circle'); this.W.fx.smoke(this.x, this.y, 0xbbaa88, 4); this.W.fx.shake(120, 0.006); sfx('slam', 0.7);
          } });
          break;
        }
        this.W.combat.strike(this, { k: 'circle', x: cx, y: cy, r }, info, 90, m.maxTargets || 8);
        if (this.c.id === 'mage') { this.W.fx.burst(cx, cy, tint, r, 'fx_magic'); this.W.fx.sparks(cx, cy, tint, 6, r); }
        else if (this.c.id === 'ranger') { for (let k = 0; k < 4; k++) this.W.fx.sprite('fx_trace', cx + (Math.random() - 0.5) * r, cy + (Math.random() - 0.5) * r - 30, { tint, rot: Math.PI / 2, scale: 0.4, dur: 220, dy: 30 }); }
        else if (m.fx === 'slashBig') { this.W.fx.slash(cx, cy, Math.random() * 6.28, r, tint, true); }
        else this.W.fx.burst(cx, cy, tint, r, 'fx_twirl');
        if (o.tech === 'R') this.W.fx.shake(60, 0.004);
        break;
      }
      case 'proj': {
        let speed = sh.speed; if (o.tech === 'E' && hasTrait('wavelength')) speed *= 1.2;
        const ang0 = this.W.nearestAimAssist(this.x, this.y, this.aim);
        this.facing = ang0;
        const explode = sh.explode ? sh.explode * (hasTrait('spread') ? 1.12 : 1) : 0;
        const range = sh.range * (hasTrait('eagle') ? 1.15 : 1); const nShots = m.fan || 1;
        for (let k = 0; k < nShots; k++) { const ang = ang0 + (k - (nShots - 1) / 2) * 0.2;
        this.W.combat.projectile(this, this.x + Math.cos(ang) * 18, this.y - 16 + Math.sin(ang) * 18, ang, speed, range, sh.r, sh.tex, sh.tint, { ...info, moveId: nShots > 1 ? key + '_' + k : key, maxTargets: m.maxTargets } as any, {
          pierce: !!sh.pierce, trail: 1,
          explode: explode || undefined,
          onEnd: explode ? (p) => { this.W.combat.strike(this, { k: 'circle', x: p.x, y: p.y, r: explode }, { ...info, moveId: key + 'x', noNet: true }, 80, 8); this.W.fx.burst(p.x, p.y, 0xff8a3a, explode, 'fx_flame'); this.W.fx.sparks(p.x, p.y, 0xffc070, 8, explode); sfx('slam', 0.5); } : undefined,
        }); }
        const ang = ang0;
        if (this.c.id === 'mage') this.W.fx.sprite('fx_light', this.x + Math.cos(ang) * 22, this.y - 16 + Math.sin(ang) * 22, { tint: sh.tint, scale: 0.2, endScale: 0.4, dur: 140 });
        else if (this.c.id === 'ranger') this.W.fx.sprite('fx_spark', this.x + Math.cos(ang) * 24, this.y - 16 + Math.sin(ang) * 24, { tint, scale: 0.15, dur: 120 });
        else this.W.fx.slash(this.x, this.y - 14, ang, 70, tint, true);
        break;
      }
    }
  }

  // 플레이어 → 적 피해 계산 (특성/유물/고유효과 반영)
  outgoing(t: Actor, h: HitInfo) {
    const n = this.now; let mul = h.dmgMul || 1;
    if (h.tech?.startsWith('L') && (this.buffs.afterimage || 0) > n) { mul *= 1.25; this.buffs.afterimage = 0; }
    if (this.stats.uniques.has('bossDmg') && t.isBoss) mul *= 1.1;
    if (this.stats.uniques.has('execute') && t.hp < t.maxHp * 0.3) mul *= 1.15;
    if (this.stats.uniques.has('dashDmg') && (this.buffs.dash || 0) > n) mul *= 1.15;
    const chilled = (t.st.slow && t.st.slow.until > n) || (t.st.freeze && t.st.freeze.until > n);
    if (this.stats.relics.has('glacier_eye') && chilled) mul *= 1.08;
    if (hasTrait('hunter') && chilled) mul *= 1.12;
    if (this.stats.relics.has('void_revelation') && (this.buffs.revelation || 0) > n && /^[QER]/.test(h.tech || '')) mul *= 1.1;
    if (this.c.id === 'mage' && (chilled || (t.st.burn && t.st.burn.until > n))) mul *= hasTrait('resonance') ? 1.22 : 1.1;
    let crit = this.stats.crit + (h.critBonus || 0);
    if (this.stats.relics.has('crimson_shard') && 'AS'.includes(this.combo.rank())) crit += 0.05;
    return calcDamage(this.atk, h.coef * mul, t.def * t.defMul(), { pen: Math.min(0.4, this.stats.pen + (h.pen || 0)), crit: Math.min(0.5, crit), critDmg: this.stats.critDmg });
  }

  // 명중 이벤트 (기술 1회당 1번 보상)
  onDealt(t: Actor, dmg: number, crit: boolean, h: HitInfo) {
    const n = this.now; this.lastCombatAt = n;
    if (!this.hitConfirmed) this.hitConfirmed = true;
    if (crit && this.stats.uniques.has('critBurn')) t.applyStatus('burn', this);
    if (h.status === 'burn' && this.stats.relics.has('ember_idol')) this.buffs.ember = n + 3000;
    if (!h.moveId || this.awarded.has(h.moveId)) return;
    this.awarded.add(h.moveId); if (this.awarded.size > 200) this.awarded.clear();
    const pts: Record<string, number> = { L: 10, H: 17, Q: 22, E: 22, C: 17, R: 10 };
    const tech = h.tech || 'L';
    this.combo.add(pts[tech[0]] ?? 10, tech, n, 1 + this.stats.comboGain);
    this.gainUlt(h.ult ?? 2);
    if (this.c.id !== 'mage') this.res = Math.min(100, this.res + (tech[0] === 'L' ? 5 : 9));
  }
  gainUlt(v: number) { if (S.level < 20) return; this.ult = Math.min(100, this.ult + v * (1 + this.combo.ultBonus()) * (1 + this.stats.ultGain)); }

  receive(h: HitInfo): boolean {
    if (!this.alive) return false;
    const n = this.now;
    if (h.fake) return false;
    if (h.dot && h.flat) { this.damage(h.flat, h, false); return true; }
    if (n >= this.iframeFrom && n < this.iframeTo) { this.perfectDodge(); return false; }
    if (this.invulnUntil > n) return false;
    if (this.state === 'parry' && n <= this.parryTo && h.parryable) { this.parrySuccess(h); return false; }
    this.lastCombatAt = n;
    let { dmg } = calcDamage(h.src.atk, h.coef, this.def, { res: h.status ? this.stats.res : 0 });
    let red = this.stats.dr;
    if (hasTrait('guardian') && this.combo.rank() === 'S') red += 0.08;
    if (hasTrait('veil') && (this.buffs.veil || 0) > n) red += 0.1;
    dmg = Math.round(dmg * (1 - Math.min(0.33, red)));
    if (h.cap25) dmg = Math.min(dmg, Math.round(this.maxHp * 0.25));
    if (this.stats.relics.has('guardian_seal') && !this.sealUsed && this.W.boss && dmg >= this.maxHp * 0.15) { this.sealUsed = true; dmg = Math.round(dmg * 0.6); this.W.fx.label(this.x, this.y - 70, '수호자의 도장', '#ffd76a'); }
    this.lastHitBy = h.name || h.src.name;
    this.damage(dmg, h, true);
    if (h.status) this.applyStatus(h.status, h.src);
    if (!this.alive) return true;
    // 강공격·보스 공격만 행동을 끊는다(약한 잡몹 타격은 경직 없이 밀려나기만)
    const heavy = h.src.isBoss || h.coef >= 1.3 || (h.kb ?? 0) >= 400;
    if (!this.superArmor && !h.dot && heavy) {
      this.pending = []; this.state = 'hit'; this.stateEnd = n + 200; this.curMove = null;
      this.knock(h.ang ?? 0, h.kb ?? 260);
    } else if (!h.dot) this.knock(h.ang ?? 0, Math.min(160, (h.kb ?? 200) * 0.5));
    return true;
  }
  damage(d: number, h: HitInfo, big: boolean) {
    this.hp -= d; this.flashUntil = this.now + 70;
    this.W.onPlayerDamaged(d, h);
    this.W.fx.dmgText(this.x, this.y - 40, '-' + d, h.dot ? '#d59cff' : '#ff6a6a', false);
    if (big) { sfx('hurt', 0.8); this.W.fx.shake(110, 0.006); this.combo.onHurt(this.now, hasTrait('swordsaint')); this.W.onPlayerHurt(); }
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }
  die() {
    this.alive = false; this.state = 'dead'; this.pending = [];
    this.W.tweens.add({ targets: this.spr, angle: 90, alpha: 0.4, duration: 500 });
    this.weapon?.setVisible(false);
    sfx('defeat', 0.8); this.W.onPlayerDeath();
  }
  perfectDodge() {
    if (this.dodgedThisDash) return; this.dodgedThisDash = true;
    const n = this.now; sfx('bell', 0.35);
    this.W.fx.label(this.x, this.y - 70, '완벽 회피!', '#9fe8ff', 15, 700);
    this.combo.add(20, 'dodge', n, 1 + this.stats.comboGain); this.gainUlt(5);
    this.W.slowmo(160, 0.35);
    if (hasTrait('afterimage')) this.buffs.afterimage = n + 2000;
    if (hasTrait('evaderush')) this.buffs.evaderush = n + 3000;
    if (this.stats.relics.has('void_revelation')) this.buffs.revelation = n + 1000;
    if (this.stats.relics.has('tree_heart') && (this.buffs.treeCd || 0) <= n) { this.buffs.treeCd = n + 12000; this.heal(this.maxHp * 0.03); }
  }
  parrySuccess(h: HitInfo) {
    const n = this.now; this.lastParryAt = n;
    sfx('parry', 1); this.W.fx.sparks(this.x + Math.cos(this.facing) * 20, this.y - 20 + Math.sin(this.facing) * 20, 0x7ff8ff, 9, 50);
    this.W.fx.burst(this.x, this.y - 20, 0x30f0e0, 60, 'fx_light'); this.W.fx.label(this.x, this.y - 70, '패링!', '#30f0e0', 18, 700);
    this.W.hitstop(80);
    this.combo.add(35, 'parry', n, 1 + this.stats.comboGain); this.gainUlt(8);
    this.res = Math.min(100, this.res + 25);
    this.counterUntil = n + 450; this.prefix = 'F'; this.prefixUntil = n + 1150; this.chain = []; this.chainCoefs = [];
    this.state = 'idle'; this.cds.F = 0;
    if (this.stats.uniques.has('parryHeal')) this.heal(this.maxHp * 0.04);
    const src = h.src as any;
    if (src && src.onParried && !h.isProj) src.onParried(this.c.parryPoise);
    if (src && this.stats.relics.has('royal_ring')) src.st.defDown = { until: n + 4000, amt: 0.1 };
    this.W.run.parries++;
  }
  heal(v: number) { const d = Math.round(Math.min(v, this.maxHp - this.hp)); if (d <= 0) return; this.hp += d; this.W.fx.dmgText(this.x, this.y - 40, '+' + d, '#7dff9a'); }

  dash() {
    if (!this.cdReady('D')) return;
    const n = this.now; const inp = this.W.inputDir();
    let a = this.facing; if (inp.x || inp.y) a = Math.atan2(inp.y, inp.x);
    const spd = 170 / 0.28; this.dashVx = Math.cos(a) * spd; this.dashVy = Math.sin(a) * spd;
    this.state = 'dash'; this.stateStart = n; this.dashMoveUntil = n + 280; this.stateEnd = n + 280 + 90;
    this.iframeFrom = n + 70; this.iframeTo = n + 190; this.dodgedThisDash = false; this.pending = []; this.curMove = null;
    this.setCd('D', 1.2 - (hasTrait('gale') ? 0.15 : 0), false);
    if (this.stats.uniques.has('dashDmg')) this.buffs.dash = n + 280 + 1000;
    if (hasTrait('veil')) this.buffs.veil = n + 2280;
    this.prefix = 'D'; this.prefixUntil = n + 370 + 700; this.chain = []; this.chainCoefs = [];
    sfx('dash', 0.5); this.W.fx.smoke(this.x, this.y, 0xcccccc, 2);
  }
  parry() {
    if (!this.cdReady('F')) return;
    const n = this.now; this.state = 'parry'; this.stateStart = n; this.parryTo = n + 120; this.stateEnd = n + 120; this.pending = []; this.curMove = null;
    this.setCd('F', 1.2, false);
    this.W.fx.sprite('fx_circle', this.x, this.y - 20, { tint: 0x30f0e0, scale: 0.25, endScale: 0.5, dur: 140, alpha: 0.7 });
  }
  potion() {
    const n = this.now;
    if (this.potionBelt <= 0) return this.W.hint('포션이 없습니다');
    if (!this.cdReady('POT')) return this.W.hint('포션 쿨다운 중');
    if (this.hp >= this.maxHp) return;
    this.state = 'potion'; this.stateStart = n; this.stateEnd = n + 300; this.pending = []; this.curMove = null;
    this.sched(299, () => {
      if (this.state !== 'potion') return;
      this.potionBelt--; this.W.consumePotion(); this.heal(this.maxHp * 0.3); this.setCd('POT', 15, false); sfx('pickup', 0.7);
      this.W.fx.burst(this.x, this.y - 20, 0x7dff9a, 50, 'fx_light');
    });
  }
  endState() {
    const was = this.state;
    if (was === 'parry') {
      // 패링 실패 후딜 350ms (강철: -100ms)
      this.state = 'parryFail'; this.stateEnd = this.now + 350 - (hasTrait('steel') ? 100 : 0); return;
    }
    if (was === 'attack' || was === 'ult') this.chainUntil = this.now + 700;
    this.state = 'idle'; this.curMove = null; this.superArmor = false;
  }

  // 공격 진행도를 예비동작(wind) → 타격(strike) → 회수(rec) 3구간으로 나눈다. 타격 시점 = Move.act.
  // 다단히트는 타격마다 방향을 바꿔 이어서 휘두른다(alt = -1이면 반대 방향).
  attackPhase(): { k: 'wind' | 'strike' | 'rec'; t: number; alt: number } | null {
    const m = this.curMove; if (!m || (this.state !== 'attack' && this.state !== 'ult')) return null;
    const dur = Math.max(1, this.stateEnd - this.stateStart), el = this.now - this.stateStart;
    const act = m.act * dur, w = act * 0.8, strikeLen = Math.max(60, dur * 0.12);
    const hits = m.hits || 1, iv = (m.interval || 0) * 1000, last = act + (hits - 1) * iv;
    if (el < w) return { k: 'wind', t: el / Math.max(1, w), alt: 1 };
    const sl = act - w + strikeLen, s = last - (act - w) + sl; // 각 휘두르기 = 타격 직전부터 strikeLen 뒤까지
    if (el < s) {
      if (hits <= 1 || iv <= 0) return { k: 'strike', t: (el - w) / sl, alt: 1 };
      const j = Math.min(hits - 1, Math.floor((el - w) / iv));
      return { k: 'strike', t: Math.min(1, (el - w - j * iv) / Math.min(iv, sl)), alt: j % 2 ? -1 : 1 };
    }
    const alt = hits > 1 && iv > 0 && (hits - 1) % 2 ? -1 : 1;
    return { k: 'rec', t: Math.min(1, (el - s) / Math.max(1, dur - s)), alt };
  }

  animate(dt: number) {
    const n = this.now; const E = Phaser.Math.Easing;
    this.bob = this.moving ? Math.abs(Math.sin(n / 85)) * -3 : Math.sin(n / 400) * 0.6;
    const flip = Math.cos(this.facing) < 0; this.spr.setFlipX(flip); const side = flip ? -1 : 1;
    let rot = this.moving ? Math.sin(n / 85) * 0.07 : 0, sx = 1, sy = 1, lunge = 0;
    if (this.moving) { this.stepT -= dt; if (this.stepT <= 0) { this.stepT = 0.32; sfx('step', 0.12, 300); } }
    const ph = this.attackPhase();
    if (ph) {
      // 몸: 뒤로 젖히며 웅크림 → 앞으로 기울며 뻗음 → 원위치
      if (ph.k === 'wind') { const k = E.Quadratic.Out(ph.t); rot = -0.1 * k * side; sx = 1 + 0.04 * k; sy = 1 - 0.06 * k; lunge = -3 * k; }
      else if (ph.k === 'strike') { const k = E.Cubic.Out(ph.t); rot = (-0.1 + 0.3 * k) * side; sx = 1.04 + 0.08 * k; sy = 0.94 - 0.02 * k; lunge = -3 + 9 * k; }
      else { const k = 1 - E.Quadratic.InOut(ph.t); rot = 0.2 * k * side; sx = 1 + 0.12 * k; sy = 1 - 0.08 * k; lunge = 6 * k; }
    }
    if (this.state === 'dash') { sx = 1.15; sy = 0.88; }
    if (this.state === 'parry') { sx = 0.92; sy = 1.08; }
    if (this.state === 'parryFail') rot = (flip ? 1 : -1) * 0.15;
    if (this.state === 'hit') rot = (flip ? 1 : -1) * 0.25;
    this.offX = Math.cos(this.facing) * lunge; const lungeY = Math.sin(this.facing) * lunge * 0.6; this.bob += lungeY;
    this.spr.setRotation(rot).setScale(this.baseScale * sx, this.baseScale * sy);
    if (n < this.iframeTo && n >= this.iframeFrom) this.spr.setAlpha(0.55); else this.spr.setAlpha(1);
    if (this.weapon) {
      const idle = side * 0.5 + (this.moving ? Math.sin(n / 85) * 0.15 : 0);
      const fwd = this.facing + Math.PI / 2; // 이 회전값이면 칼끝이 조준 방향을 향함
      let wa = idle; this.weaponPush = 0;
      if (ph) {
        if (this.c.id === 'mage') { const k = ph.k === 'wind' ? -0.4 * E.Quadratic.Out(ph.t) : ph.k === 'strike' ? -0.4 + 0.9 * E.Cubic.Out(ph.t) : 0.5 * (1 - ph.t); wa = fwd - 0.6 + k; }
        else if (this.c.id === 'ranger') wa = this.facing + Math.PI / 4;
        else if (this.c.id === 'lancer') { // 당겼다가 찌르고 회수
          wa = fwd; this.weaponPush = ph.k === 'wind' ? -8 * E.Quadratic.Out(ph.t) : ph.k === 'strike' ? -8 + 34 * E.Cubic.Out(ph.t) : 26 * (1 - E.Quadratic.InOut(ph.t));
        } else { // 검·도끼류: 콤보마다 방향을 바꿔 크게 베고, 끝나면 대기 자세로 천천히 돌아온다
          const big = this.curMove!.id.endsWith('_l3') || this.curMove!.id.endsWith('_h') || this.state === 'ult';
          const a0 = big ? -2.3 : -1.9, a1 = big ? 2.0 : 1.6, sw = side * this.swingSide * ph.alt;
          const start = fwd + sw * a0, end = fwd + sw * a1;
          if (ph.k === 'wind') wa = lerpAng(idle, start, E.Quadratic.Out(ph.t));
          else if (ph.k === 'strike') { const k = E.Cubic.Out(ph.t); wa = fwd + sw * (a0 + (a1 - a0) * k); this.weaponPush = Math.sin(k * Math.PI) * 8; }
          else wa = lerpAng(end, idle, E.Quadratic.InOut(ph.t));
        }
      } else if (this.state === 'parry') wa = fwd - 0.2;
      const hx = this.x + side * this.body.hand.x + this.offX + Math.cos(this.facing) * this.weaponPush, hy = this.y + this.body.hand.y + this.bob + this.offY + Math.sin(this.facing) * this.weaponPush;
      this.weapon.setPosition(hx, hy).setRotation(wa).setDepth(this.y + (Math.sin(this.facing) > 0.3 ? 1 : -1)).setFlipX(false);
    }
  }
  syncSprite() { super.syncSprite(); }
}
