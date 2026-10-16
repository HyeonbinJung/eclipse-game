// 보스 AI 상태 머신 (기획서 8.3) + 기술 선택 가중치/공정성 (8.4)
import Phaser from 'phaser';
import { Actor, HitInfo } from './combat';
import { BossDef, BossLook, PatternDef, bossLook } from '../data/bosses';
import { WShape } from './shapes';
import { sfx } from '../audio/audio';
import { MON } from '../data/monsters';
import type { World } from '../scenes/World';

type FSM = 'IDLE' | 'CHASE' | 'SELECT' | 'TELEGRAPH' | 'ATTACK' | 'RECOVERY' | 'STAGGER' | 'PHASE_CHANGE' | 'DEAD';
const STATUS_COLOR: Record<string, number> = { poison: 0x80ff60, burn: 0xff7030, chill: 0x80d8ff };
const CAT_W: Record<string, number> = { melee: 45, ranged: 25, area: 20, special: 10 };

// 분신·수정 등 HP가 매우 낮은 보조 오브젝트
export class Minor extends Actor {
  constructor(W: World, x: number, y: number, tex: string, frame: number, scale: number, tint: number, hp: number, public kind: string, public onDeath?: () => void) {
    super(W); this.x = x; this.y = y; this.hp = this.maxHp = hp; this.def = 0; this.team = 'enemy'; this.name = kind;
    this.makeSprite(tex, frame, scale, tint); this.r = Math.max(14, 5 * scale);
  }
  receive(h: HitInfo) {
    if (!this.alive || h.src.team === 'enemy' || h.dot) return false;
    const { dmg, crit } = this.W.player.outgoing(this, h); this.hp -= dmg; this.flashUntil = this.W.now + 60;
    this.W.fx.dmgText(this.x, this.y - 40, String(dmg), crit ? '#ffd23a' : '#ffffff', crit); this.W.player.onDealt(this, dmg, crit, h); sfx('glass', 0.4);
    if (this.hp <= 0) this.kill(); return true;
  }
  kill() { if (!this.alive) return; this.alive = false; this.W.fx.burst(this.x, this.y - 20, this.tint, 50, 'fx_magic'); this.W.fx.sparks(this.x, this.y - 20, this.tint, 6, 40); this.destroySprite(); this.onDeath?.(); }
  update() { if (this.alive) { this.bob = Math.sin(this.W.now / 200) * 2; this.syncSprite(); } }
}

export class Boss extends Actor {
  fsm: FSM = 'IDLE'; stateEnd = 0; phase = 0; mods: Record<string, any> = {};
  q: { t: number; fn: () => void }[] = []; history: { id: string; parry: boolean }[] = []; uses: Record<string, number> = {};
  cur: PatternDef | null = null; curHit = false; hitStreak = 0; invuln = 0; guardCharges = 0; used = new Set<string>();
  minors: Minor[] = []; poiseBoostUntil = 0; aura!: Phaser.GameObjects.Image; pendingDeath = false; speed: number;
  startedAt = 0; look!: BossLook;
  constructor(W: World, public B: BossDef, x: number, y: number) {
    super(W); this.isBoss = true; this.x = x; this.y = y; this.name = B.name; this.level = B.lv;
    this.hp = this.maxHp = B.hp; this.atk = B.atk; this.def = B.def; this.poise = this.maxPoise = B.poise; this.speed = B.speed;
    this.aura = W.add.image(x, y, 'fx_light').setTint(B.tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(B.scale * 0.25);
    const L = this.look = bossLook(W, B);
    this.makeSprite(L.tex, L.frame, L.scale, L.tint, L.originY); this.r = 5.5 * B.scale; // 판정은 기존 배율 기준 유지
    if (L.custom) this.fitShadow(this);
    this.stateEnd = W.now + 1000; this.startedAt = W.now;
  }
  // 커스텀 시트는 칸(96px)이 커서 기본 그림자 계산이 과하게 커진다 → 판정 반경 기준으로 맞춤
  fitShadow(a: Actor, mul = 1) { const k = (this.r * 2.2 * mul) / 48; a.shadow.setScale(k * 0.9, k * 0.7); }
  // 분신: 본체와 같은 그림
  clone(x: number, y: number, mul: number) {
    const L = this.look;
    const m = new Minor(this.W, x, y, L.tex, L.frame, L.scale * mul, L.tint, 1, '분신');
    if (L.custom) { m.spr.setOrigin(0.5, L.originY); this.fitShadow(m, mul); }
    return m;
  }
  get P() { return this.W.player; }
  angTo() { return Math.atan2(this.P.y - this.y, this.P.x - this.x); }
  dist() { return Math.hypot(this.P.x - this.x, this.P.y - this.y); }
  sched(ms: number, fn: () => void) { this.q.push({ t: this.W.now + ms, fn }); }
  cancelAll() { this.q = []; this.W.combat.cancelOwner(this); }

  update(dt: number) {
    const n = this.W.now;
    for (const m of this.minors) m.update();
    this.minors = this.minors.filter((m) => m.alive);
    if (this.fsm === 'DEAD') return;
    this.tickStatus(dt);
    // 페이즈 전환 체크
    const ph = this.B.phases[this.phase];
    if (ph && this.hp / this.maxHp <= ph.at && this.fsm !== 'PHASE_CHANGE') this.enterPhase();
    if (this.q.length) { const due = this.q.filter((x) => x.t <= n); this.q = this.q.filter((x) => x.t > n); for (const d of due) if ((this.fsm as FSM) !== 'DEAD') d.fn(); }
    let moving = false;
    switch (this.fsm) {
      case 'IDLE': if (n >= this.stateEnd) { this.fsm = 'CHASE'; this.stateEnd = n + 2000; } break;
      case 'CHASE': {
        this.facing = this.angTo();
        if (this.dist() >= 100 && n < this.stateEnd) { const sp = this.speed * this.slowFactor(); this.W.moveActor(this, Math.cos(this.facing) * sp * dt, Math.sin(this.facing) * sp * dt); moving = true; }
        if (this.dist() < 160 || n >= this.stateEnd || this.W.now - this.startedAt > 1500 && Math.random() < 0.02) this.fsm = 'SELECT';
        break;
      }
      case 'SELECT': this.select(); break;
      case 'RECOVERY': if (n >= this.stateEnd) { this.fsm = 'CHASE'; this.stateEnd = n + 900 + Math.random() * 1100; } break;
      case 'STAGGER': if (n >= this.stateEnd) { this.poise = this.maxPoise * 1.2; this.poiseBoostUntil = n + 10000; this.fsm = 'RECOVERY'; this.stateEnd = n + 300; } break;
      case 'PHASE_CHANGE': if (n >= this.stateEnd) { if (this.pendingDeath) return this.die(); this.fsm = 'CHASE'; this.stateEnd = n + 600; } break;
      default: break;
    }
    if (this.fsm !== 'STAGGER' && n - this.lastPoiseHit > 3000 && this.poise < this.maxPoise) this.poise = Math.min(this.maxPoise, this.poise + this.maxPoise * 0.08 * dt);
    this.animate(moving); this.syncSprite();
  }

  // ---------- 선택 ----------
  select() {
    const n = this.W.now; const d = this.dist(); const hpf = this.hp / this.maxHp;
    let cands = this.B.patterns.filter((p) => (p.minPhase || 0) <= this.phase && !(p.once && this.used.has(p.id)) && !(p.hpBelow && hpf > p.hpBelow));
    const forced = cands.find((p) => (p.id === 'judgement' && this.mods.judgement) || (p.id === 'rekindle' && this.mods.rekindle && !this.used.has('rekindle')));
    let pick: PatternDef | undefined = forced;
    if (!pick) {
      cands = cands.filter((p) => p.id !== 'judgement' && p.id !== 'rekindle');
      const last = this.history[this.history.length - 1];
      cands = cands.filter((p) => !last || p.id !== last.id || cands.length === 1); // 동일 기술 2연속 금지
      const arenaA = this.W.arenaArea();
      if (this.W.combat.zoneArea() >= arenaA * 0.25) cands = cands.filter((p) => !p.zone); // 장판 25% 이상이면 장판류 금지
      const last3 = this.history.slice(-3);
      if (last3.length === 3 && last3.every((h) => h.parry)) cands = cands.filter((p) => !this.parryable(p)); // 패링 가능 4연속 금지
      if (!cands.length) cands = this.B.patterns.filter((p) => !p.once && !p.hpBelow && (p.minPhase || 0) <= this.phase);
      const weights = cands.map((p) => {
        let w = CAT_W[p.cat] / Math.max(1, cands.filter((c) => c.cat === p.cat).length);
        if (d >= 250) { if (p.cat === 'ranged') w += 20; if (p.cat === 'melee') w = Math.max(2, w - 20); }
        if (this.hitStreak >= 2 && Math.max(...([] as number[]).concat(p.mult)) >= 1.5) w *= 0.4; // 숨통 확보
        return Math.max(1, w);
      });
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      pick = cands[0]; for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) { pick = cands[i]; break; } }
    }
    this.run(pick!);
  }
  parryable(p: PatternDef) { return Array.isArray(p.parry) ? p.parry.some(Boolean) : !!p.parry; }
  T(p: PatternDef, base: number) {
    let t = base; if ((this.uses[p.id] || 0) < 2) t += 150; // 최초 2회 시연 +150ms
    if (this.mods.speedUp) t *= this.mods.speedUp; return t;
  }
  info(p: PatternDef, mult: number, parry = false, extra: Partial<HitInfo> = {}): Omit<HitInfo, 'src'> {
    return { coef: mult, parryable: parry, cap25: true, status: p.status, name: `${this.B.name}의 ${p.name}`, kb: 300, ...extra };
  }
  hit(shape: WShape, p: PatternDef, mult: number, parry = false, active = 120, extra: Partial<HitInfo> = {}) {
    return this.W.combat.strike(this, shape, this.info(p, mult, parry, extra), active, 99, () => { this.curHit = true; });
  }
  tele(shape: WShape, ms: number, parry: boolean, then: () => void, fake = false) { return this.W.combat.telegraph(shape, ms, { parry, fake }, then, this); }
  finish(extra = 0) {
    if (this.fsm === 'DEAD' || this.fsm === 'STAGGER' || this.fsm === 'PHASE_CHANGE') return;
    this.hitStreak = this.curHit ? this.hitStreak + 1 : 0;
    this.fsm = 'RECOVERY'; this.stateEnd = this.W.now + 450 + Math.random() * 350 + extra + (this.hitStreak >= 2 ? 400 : 0);
  }

  run(p: PatternDef) {
    const n = this.W.now; this.cur = p; this.curHit = false; this.uses[p.id] = (this.uses[p.id] || 0) + 1; if (p.once) this.used.add(p.id);
    if (p.id === 'rekindle') this.mods.rekindle = false;
    this.history.push({ id: p.id, parry: this.parryable(p) }); if (this.history.length > 4) this.history.shift();
    this.fsm = 'TELEGRAPH'; this.W.onBossPattern(this, p);
    const P = this.P; const a = this.angTo(); this.facing = a;
    const mult = (i = 0) => (Array.isArray(p.mult) ? p.mult[i] : p.mult);
    const col = STATUS_COLOR[p.status || ''] || this.B.tint;
    switch (p.type) {
      case 'melee': {
        let teles = (p.tele as number[]).slice(), mults = (p.mult as number[]).slice(), parries = (p.parry as boolean[]).slice();
        if (p.id === 'triple' && this.mods.fourHit) { teles = [500, 650, 800, 800]; mults = [0.9, 1.0, 1.2, 1.3]; parries = [false, false, true, false]; }
        if (p.id === 'flame_slash' && this.mods.tripleSlash) { teles = [650, 500, 500]; mults = [1.1, 1.1, 1.2]; parries = [true, false, true]; }
        const step = (i: number) => {
          if (i >= teles.length) return this.finish();
          const aa = this.angTo(); this.facing = aa; this.knock(aa, 260);
          const sh: WShape = { k: 'cone', x: this.x, y: this.y - 10, r: p.r + this.r * 0.4, a: aa, half: (p.ang * Math.PI) / 360 };
          this.tele(sh, this.T(p, teles[i]), parries[i], () => {
            this.fsm = 'ATTACK'; const sh2 = { ...sh, x: this.x, y: this.y - 10 } as WShape;
            this.hit(sh2, p, mults[i], parries[i]); this.W.fx.slash(this.x, this.y - 20, aa, (sh as any).r, col, true); sfx('swing1', 0.7); this.W.fx.shake(70, 0.003);
            this.sched(220, () => step(i + 1));
          });
        };
        step(0); break;
      }
      case 'leap': {
        const count = this.mods.leapCount || 1;
        const jump = (i: number) => {
          if (i >= count) return this.finish();
          const tx = P.x, ty = P.y; const sh: WShape = { k: 'circle', x: tx, y: ty, r: p.r };
          const ms = this.T(p, p.tele as number);
          this.tele(sh, ms, false, () => {
            this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 120, { kb: 420 }); this.W.fx.burst(tx, ty, col, p.r, 'fx_smoke'); this.W.fx.shake(140, 0.007); sfx('slam', 0.8);
            this.sched(400, () => jump(i + 1));
          });
          const sx = this.x, sy = this.y;
          this.W.tweens.addCounter({ from: 0, to: 1, delay: ms * 0.45, duration: ms * 0.55, onUpdate: (tw) => { const k = tw.getValue(); this.W.moveActorTo(this, sx + (tx - sx) * k, sy + (ty - sy) * k); this.hopZ = Math.sin(k * Math.PI) * 120; }, onComplete: () => { this.hopZ = 0; } });
        };
        jump(0); break;
      }
      case 'cloud': {
        const count = (p.count || 1) + (this.mods.extraZone ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const x = i === 0 ? P.x : P.x + (Math.random() - 0.5) * 360, y = i === 0 ? P.y : P.y + (Math.random() - 0.5) * 260;
          const sh: WShape = { k: 'circle', x, y, r: p.r };
          this.tele(sh, this.T(p, p.tele as number), false, () => { this.W.combat.zone(this, sh, this.mods.zoneDur || p.dur, this.info(p, mult()), col); this.W.fx.smoke(x, y, col, 4); });
        }
        this.sched(this.T(p, p.tele as number) + 200, () => this.finish()); break;
      }
      case 'lines': {
        for (let i = 0; i < p.count; i++) {
          const aa = a + (i - (p.count - 1) / 2) * (p.spread * Math.PI / 180) * (i % 2 ? 1 : 0.85);
          const sh: WShape = { k: 'rect', x: this.x, y: this.y, a: aa, len: p.len, w: p.w };
          this.sched(i * 90, () => this.tele(sh, this.T(p, p.tele as number), !!p.parry, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), !!p.parry); this.W.fx.sprite('fx_trace', this.x + Math.cos(aa) * p.len / 2, this.y + Math.sin(aa) * p.len / 2, { tint: col, rot: aa, scale: p.len / 140, dur: 280, add: false }); sfx('chop', 0.5); }));
        }
        this.sched(this.T(p, p.tele as number) + p.count * 90 + 150, () => this.finish()); break;
      }
      case 'ring': {
        const sh: WShape = { k: 'ring', x: this.x, y: this.y, R: p.R, a: p.a, b: p.b, reverse: !!this.mods.ringReverse };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 140); this.W.fx.burst(this.x, this.y, col, p.R, 'fx_circle'); this.W.fx.shake(140, 0.006); sfx('slam', 0.8); this.sched(200, () => this.finish()); });
        break;
      }
      case 'grab': case 'line': {
        const sh: WShape = { k: 'rect', x: this.x, y: this.y - 8, a, len: p.len, w: p.w };
        this.tele(sh, this.T(p, p.tele as number), !!p.parry, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), !!p.parry, 140); this.W.fx.sprite('fx_trace', this.x + Math.cos(a) * p.len / 2, this.y + Math.sin(a) * p.len / 2, { tint: col, rot: a, scale: p.len / 120, dur: 260 }); sfx('swing1', 0.7); this.sched(200, () => this.finish()); });
        break;
      }
      case 'summon': {
        const sh: WShape = { k: 'circle', x: this.x, y: this.y, r: 60 };
        this.W.combat.telegraph(sh, this.T(p, p.tele as number), { subtle: true, color: 0x80ff90 }, () => {
          const alive = this.W.enemies.filter((e) => e.alive && !e.isBoss).length;
          const n2 = Math.min(p.count, (p.max || 4) - alive);
          const def = MON[(this.B.adds || ['shroom'])[0]];
          for (let i = 0; i < n2; i++) { const ang = Math.random() * 6.28; const e = this.W.spawnEnemy(def, this.x + Math.cos(ang) * 90, this.y + Math.sin(ang) * 90, Math.max(1, this.B.lv - 1), false); e.summoned = true; e.noLoot = true; e.state = 'chase'; this.W.fx.burst(e.x, e.y, 0x80ff90, 40, 'fx_magic'); }
          sfx('magic', 0.6); this.finish(200);
        }, this);
        break;
      }
      case 'charge': {
        const count = this.mods.dashCount || 1;
        const go = (i: number) => {
          if (i >= count) return this.finish();
          const aa = this.angTo(); this.facing = aa;
          const sh: WShape = { k: 'rect', x: this.x, y: this.y - 6, a: aa, len: p.len, w: p.w };
          this.tele(sh, this.T(p, i ? 450 : (p.tele as number)), false, () => {
            this.fsm = 'ATTACK'; const sx = this.x, sy = this.y; const ex = sx + Math.cos(aa) * p.len, ey = sy + Math.sin(aa) * p.len;
            this.hit(sh, p, mult(), false, 300, { kb: 480 }); sfx('dash', 0.8);
            this.W.tweens.addCounter({ from: 0, to: 1, duration: 300, ease: 'Quad.Out', onUpdate: (tw) => { const k = tw.getValue(); this.W.moveActorTo(this, sx + (ex - sx) * k, sy + (ey - sy) * k); if (Math.random() < 0.6) this.W.fx.afterimage(this.spr, col); } });
            this.sched(500, () => go(i + 1));
          });
        };
        go(0); break;
      }
      case 'cone': {
        const angs = p.id === 'blizzard' && this.mods.blizzard2 ? [a - 0.6, a + 0.6] : [a];
        for (const aa of angs) {
          const sh: WShape = { k: 'cone', x: this.x, y: this.y - 8, r: p.r, a: aa, half: (p.ang * Math.PI) / 360 };
          this.tele(sh, this.T(p, p.tele as number), false, () => {
            this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 160, { kb: 380 });
            for (let i = 0; i < 6; i++) this.W.fx.sprite(p.status === 'chill' ? 'fx_smoke' : 'fx_flame', this.x + Math.cos(aa + (i - 2.5) * 0.15) * p.r * 0.6, this.y + Math.sin(aa + (i - 2.5) * 0.15) * p.r * 0.6, { tint: col, scale: 0.35, endScale: 0.7, dur: 420 });
            if (p.leaveZone) this.W.combat.zone(this, sh, this.mods.zoneDur || 3000, this.info(p, 0.15), col);
            sfx(p.status === 'chill' ? 'glass' : 'slam', 0.7); this.W.fx.shake(90, 0.004);
          });
        }
        this.sched(this.T(p, p.tele as number) + 250, () => this.finish()); break;
      }
      case 'tail': {
        const side = Math.random() < 0.5 ? 1 : -1; const aa = a + side * Math.PI / 2;
        const sh: WShape = { k: 'cone', x: this.x, y: this.y, r: p.r, a: aa, half: Math.PI / 2 };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 140, { kb: 480 }); this.W.fx.slash(this.x, this.y, aa, p.r, col, true); sfx('swing2', 0.8); this.sched(200, () => this.finish()); });
        break;
      }
      case 'quake': {
        const sh: WShape = { k: 'circle', x: this.x, y: this.y, r: p.r };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 140, { kb: 500 }); this.W.fx.burst(this.x, this.y, col, p.r, 'fx_circle'); this.W.fx.smoke(this.x, this.y, 0x885544, 6); this.W.fx.shake(220, 0.01); sfx('slam', 1); this.sched(300, () => this.finish(200)); });
        break;
      }
      case 'projFan': {
        const sh: WShape = { k: 'rect', x: this.x, y: this.y - 20, a, len: 360, w: 12 };
        this.tele(sh, this.T(p, p.tele as number), true, () => {
          this.fsm = 'ATTACK';
          for (let i = 0; i < p.count; i++) { const aa = this.angTo() + (i - (p.count - 1) / 2) * (p.spread * Math.PI / 180); this.W.combat.projectile(this, this.x, this.y - 20, aa, p.speed, 600, 14, 'fx_trace', 0xa8f0ff, this.info(p, mult(), true), { trail: 1 }); }
          sfx('glass', 0.6); this.sched(200, () => this.finish());
        });
        break;
      }
      case 'traps': {
        const existing = this.W.combat.zones.filter((z) => z.owner === this && (z as any).trap).length;
        const k = Math.max(0, Math.min(2, (p.max || 3) - existing)); // 3개 이상 덫 생성 금지
        for (let i = 0; i < k; i++) {
          const x = P.x + (i ? (Math.random() - 0.5) * 300 : 0), y = P.y + (i ? (Math.random() - 0.5) * 200 : 0);
          const sh: WShape = { k: 'circle', x, y, r: p.r };
          this.tele(sh, this.T(p, p.tele as number), false, () => { const z = this.W.combat.zone(this, sh, 9000, this.info(p, mult(), false, { status: 'chill' }), 0x80d8ff, 600); (z as any).trap = true; this.W.fx.burst(x, y, 0x9fe8ff, p.r, 'fx_star'); sfx('glass', 0.4); });
        }
        this.sched(this.T(p, p.tele as number) + 200, () => this.finish()); break;
      }
      case 'crystals': case 'rekindle': {
        const isRe = p.type === 'rekindle';
        const cnt = p.count || 2; const ms = this.T(p, p.tele as number);
        if (isRe) { this.W.fx.label(this.x, this.y - 140, '불사 재점화 — 수정을 부수세요!', '#ffb060', 18, 2500); this.W.hint('수정 3개를 부숴 회복을 막으세요'); }
        const crystals: Minor[] = [];
        for (let i = 0; i < cnt; i++) {
          const ang = (i / cnt) * Math.PI * 2 + Math.random(); const dd = isRe ? 220 : 120 + Math.random() * 80;
          const cx = (isRe ? this.x : P.x) + Math.cos(ang) * dd, cy = (isRe ? this.y : P.y) + Math.sin(ang) * dd;
          const pos = this.W.clampToArena(cx, cy);
          const m = new Minor(this.W, pos.x, pos.y, 'dun', 56, 3.2, isRe ? 0xffa050 : 0x9fe8ff, Math.round(this.P.atk * (isRe ? 6 : 2.5)), '수정');
          this.W.fx.burst(pos.x, pos.y - 20, isRe ? 0xffa050 : 0x9fe8ff, 50, 'fx_light'); crystals.push(m); this.minors.push(m); this.W.enemies.push(m as any);
          if (!isRe) { const sh: WShape = { k: 'circle', x: pos.x, y: pos.y, r: p.r }; this.tele(sh, p.fuse, false, () => { if (m.alive) { this.hit(sh, p, mult()); this.W.fx.burst(pos.x, pos.y, 0x9fe8ff, p.r, 'fx_star'); sfx('glass', 0.7); m.kill(); } }); }
        }
        if (isRe) {
          this.fsm = 'ATTACK';
          this.W.combat.telegraph({ k: 'circle', x: this.x, y: this.y, r: 80 }, 6000, { subtle: true, color: 0xffa040 }, () => {
            const left = crystals.filter((c) => c.alive).length; crystals.forEach((c) => c.kill());
            if (left > 0) { const h = Math.round(this.maxHp * p.heal); this.hp = Math.min(this.maxHp, this.hp + h); this.W.fx.dmgText(this.x, this.y - 100, '+' + h, '#7dff9a', true); this.W.fx.burst(this.x, this.y, 0xff8030, 160, 'fx_flame'); sfx('magic', 0.8); }
            else this.W.fx.label(this.x, this.y - 120, '재점화 저지!', '#7dff9a', 18);
            this.finish();
          }, this);
        } else this.sched(ms + 300, () => this.finish());
        break;
      }
      case 'circles': {
        const count = p.id === 'glacier' && this.mods.fall4 ? 4 : p.count;
        for (let i = 0; i < count; i++) {
          const pos = i === 0 ? { x: P.x, y: P.y } : this.W.clampToArena(P.x + (Math.random() - 0.5) * 460, P.y + (Math.random() - 0.5) * 320);
          const sh: WShape = { k: 'circle', x: pos.x, y: pos.y, r: p.r };
          this.sched(i * 120, () => this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 130); this.W.fx.burst(pos.x, pos.y, col, p.r, p.status === 'burn' ? 'fx_flame' : 'fx_star'); this.W.fx.shake(80, 0.004); sfx('slam', 0.5); }));
        }
        this.sched(this.T(p, p.tele as number) + count * 120 + 200, () => this.finish()); break;
      }
      case 'floor': {
        // 빙판 분할: 아레나를 4×3 칸으로 나눠 30% 안전 확보
        const A = this.W.arena; const cw = A.w / 4, chh = A.h / 3; const cells: { x: number; y: number }[] = [];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cells.push({ x: A.x + i * cw, y: A.y + j * chh });
        Phaser.Utils.Array.Shuffle(cells); const danger = cells.slice(0, 8);
        const parts: WShape[] = danger.map((c) => ({ k: 'rect', x: c.x, y: c.y + chh / 2, a: 0, len: cw, w: chh } as WShape));
        const sh: WShape = { k: 'multi', parts };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.W.combat.zone(this, sh, p.dur, this.info(p, mult()), 0x80d8ff, 500); sfx('glass', 0.8); this.finish(); });
        break;
      }
      case 'cross': {
        const sh: WShape = { k: 'multi', parts: [{ k: 'rect', x: P.x - 520, y: P.y, a: 0, len: 1040, w: p.w }, { k: 'rect', x: P.x, y: P.y - 520, a: Math.PI / 2, len: 1040, w: p.w }] };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 140); for (let i = -4; i <= 4; i++) { this.W.fx.sprite('fx_flame', P.x + i * 110, P.y, { tint: col, scale: 0.4, dur: 400 }); this.W.fx.sprite('fx_flame', P.x, P.y + i * 110, { tint: col, scale: 0.4, dur: 400 }); } sfx('slam', 0.8); this.sched(200, () => this.finish()); });
        break;
      }
      case 'clones': {
        const count = this.mods.clones || p.count;
        const pos: { x: number; y: number; fake: boolean }[] = [{ x: this.x, y: this.y, fake: false }];
        for (let i = 0; i < count; i++) { const ang = Math.random() * 6.28; const pp = this.W.clampToArena(P.x + Math.cos(ang) * 260, P.y + Math.sin(ang) * 260); pos.push({ ...pp, fake: true }); }
        Phaser.Utils.Array.Shuffle(pos);
        // 본체를 섞인 위치 중 하나로 순간이동
        const real = pos.find((q) => !q.fake)!; const tmp = pos[0]; if (tmp !== real) { const rx = real.x, ry = real.y; real.x = tmp.x; real.y = tmp.y; tmp.x = rx; tmp.y = ry; }
        this.W.fx.smoke(this.x, this.y, this.B.tint, 4); this.W.moveActorTo(this, real.x, real.y);
        const clones: Minor[] = [];
        for (const q of pos) {
          if (q.fake) { const m = this.clone(q.x, q.y, 1); m.spr.setAlpha(0.85); clones.push(m); this.minors.push(m); this.W.enemies.push(m as any); }
          const aa = Math.atan2(P.y - q.y, P.x - q.x); const sh: WShape = { k: 'rect', x: q.x, y: q.y - 8, a: aa, len: 460, w: 56 };
          // 가짜 분신은 붉은 공격 예고 없음
          this.tele(sh, this.T(p, p.tele as number), false, () => { if (!q.fake) { this.fsm = 'ATTACK'; this.hit(sh, p, mult()); } this.W.fx.sprite('fx_trace', q.x + Math.cos(aa) * 230, q.y + Math.sin(aa) * 230, { tint: q.fake ? 0x8888aa : col, rot: aa, scale: 3, dur: 260 }); }, q.fake);
        }
        this.sched(this.T(p, p.tele as number) + 500, () => { clones.forEach((c) => c.alive && c.kill()); this.finish(); });
        break;
      }
      case 'snare': {
        const sh: WShape = { k: 'circle', x: P.x, y: P.y, r: p.r };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult()); this.W.fx.burst(sh.x, sh.y, col, p.r, 'fx_twirl'); sfx('glitch', 0.6); this.sched(200, () => this.finish()); });
        break;
      }
      case 'timeCut': {
        for (let i = 0; i < p.count; i++) this.sched(i * 300, () => {
          const aa = this.angTo(); const sh: WShape = { k: 'rect', x: this.x, y: this.y - 8, a: aa, len: p.len, w: p.w };
          this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult()); this.W.fx.sprite('fx_trace', this.x + Math.cos(aa) * p.len / 2, this.y + Math.sin(aa) * p.len / 2, { tint: col, rot: aa, scale: p.len / 120, dur: 260 }); sfx('chop', 0.6); });
        });
        this.sched(this.T(p, p.tele as number) + p.count * 300 + 200, () => this.finish()); break;
      }
      case 'brand': {
        const doBrand = () => {
          const sh: WShape = { k: 'circle', x: P.x, y: P.y, r: p.r }; const ms = this.T(p, p.tele as number);
          const t = this.tele(sh, ms, false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult()); this.W.fx.burst(sh.x, sh.y, col, p.r, 'fx_magic'); sfx('glitch', 0.7); this.sched(200, () => this.finish()); });
          // 추적 후 마지막 300ms 고정
          const follow = () => { if (this.W.now < t.end - 300 && !t.cancelled) { (sh as any).x = P.x; (sh as any).y = P.y; this.sched(16, follow); } };
          follow();
        };
        if (this.mods.leapBrand && Math.random() < 0.6) {
          const tx = P.x, ty = P.y, sx = this.x, sy = this.y; const lsh: WShape = { k: 'circle', x: tx, y: ty, r: 100 };
          this.tele(lsh, this.T(p, 700), false, () => { this.hit(lsh, p, 1.4); this.W.fx.shake(120, 0.006); sfx('slam', 0.7); this.sched(250, doBrand); });
          this.W.tweens.addCounter({ from: 0, to: 1, delay: 300, duration: 400, onUpdate: (tw) => { const k = tw.getValue(); this.W.moveActorTo(this, sx + (tx - sx) * k, sy + (ty - sy) * k); this.hopZ = Math.sin(k * Math.PI) * 120; }, onComplete: () => (this.hopZ = 0) });
        } else doBrand();
        break;
      }
      case 'collapse': {
        const sh: WShape = { k: 'wedges', x: this.x, y: this.y, R: p.R, safeHalf: (p.safe * Math.PI) / 180, rot: -Math.PI / 2 };
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 160); this.W.fx.flashScreen(0xb080ff, 150); this.W.fx.shake(250, 0.01); sfx('glitch', 1); this.sched(300, () => this.finish(200)); });
        break;
      }
      case 'symClones': {
        const k = this.mods.moreClones ? 4 : 2; const ms = this.T(p, p.tele as number);
        const base = Math.random() * 6.28; const pts = [{ x: this.x, y: this.y }];
        for (let i = 1; i <= k; i++) { const ang = base + (i / (k + 1)) * Math.PI * 2; pts.push(this.W.clampToArena(P.x + Math.cos(ang) * 270, P.y + Math.sin(ang) * 270)); }
        const clones: Minor[] = [];
        pts.forEach((q, i) => {
          if (i > 0) { const m = this.clone(q.x, q.y, 0.85); m.spr.setAlpha(0.7); clones.push(m); this.minors.push(m); this.W.enemies.push(m as any); }
          const aa = Math.atan2(P.y - q.y, P.x - q.x); const sh: WShape = { k: 'rect', x: q.x, y: q.y - 8, a: aa, len: p.len, w: p.w };
          this.tele(sh, ms, false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult()); this.W.fx.sprite('fx_trace', q.x + Math.cos(aa) * p.len / 2, q.y + Math.sin(aa) * p.len / 2, { tint: col, rot: aa, scale: p.len / 120, dur: 260 }); });
        });
        sfx('glitch', 0.6);
        this.sched(ms + 500, () => { clones.forEach((c) => c.alive && c.kill()); this.finish(); });
        break;
      }
      case 'judgement': {
        this.mods.judgement = false;
        const A = this.W.arena; this.W.moveActorTo(this, A.x + A.w / 2, A.y + A.h / 2); this.W.fx.flashScreen(0xffffff, 200);
        const safe = [0, 1, 2].map(() => this.W.clampToArena(A.x + 120 + Math.random() * (A.w - 240), A.y + 100 + Math.random() * (A.h - 200))).map((q) => ({ ...q, r: p.safeR }));
        const sh: WShape = { k: 'arena', x: A.x - 50, y: A.y - 50, w: A.w + 100, h: A.h + 100, safe };
        this.W.fx.label(this.x, this.y - 160, '최후의 심판', '#ff5070', 26, 2000);
        this.tele(sh, this.T(p, p.tele as number), false, () => { this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 160); this.W.fx.flashScreen(0xff3050, 250); this.W.fx.shake(350, 0.014); sfx('boss', 0.9); this.sched(400, () => this.finish(400)); });
        break;
      }
      case 'lanes': {
        const A = this.W.arena; const ys = [P.y, A.y + 80 + Math.random() * (A.h - 160), A.y + 80 + Math.random() * (A.h - 160)].slice(0, p.count);
        ys.forEach((y, i) => {
          const fromLeft = i % 2 === 0; const sh: WShape = { k: 'rect', x: fromLeft ? A.x - 40 : A.x + A.w + 40, y, a: fromLeft ? 0 : Math.PI, len: A.w + 80, w: p.w };
          this.sched(i * 260, () => this.tele(sh, this.T(p, p.tele as number), false, () => {
            this.fsm = 'ATTACK'; this.hit(sh, p, mult(), false, 200, { kb: 400 });
            const rider = this.W.add.image(sh.x, y, 'dun', 96).setScale(3).setTint(0x403060).setAlpha(0.9).setFlipX(!fromLeft).setDepth(y);
            this.W.tweens.add({ targets: rider, x: fromLeft ? A.x + A.w + 40 : A.x - 40, duration: 380, onUpdate: () => this.W.fx.afterimage(rider, 0x6040a0), onComplete: () => rider.destroy() }); sfx('dash', 0.6);
          }));
        });
        this.sched(this.T(p, p.tele as number) + p.count * 260 + 300, () => this.finish()); break;
      }
      default: this.finish();
    }
  }

  enterPhase() {
    const ph = this.B.phases[this.phase]; this.phase++;
    Object.assign(this.mods, ph.mods);
    if (ph.mods.guard) this.guardCharges = 1;
    this.cancelAll(); this.W.combat.clearEnemy();
    this.fsm = 'PHASE_CHANGE'; this.stateEnd = this.W.now + 1200 + 1000; this.invuln = this.W.now + 2200;
    this.W.onBossPhase(this, this.phase, ph.text);
    this.W.fx.burst(this.x, this.y, this.B.tint, 200, 'fx_light'); this.W.fx.shake(300, 0.008); sfx('boss', 0.8);
  }

  receive(h: HitInfo): boolean {
    if (this.fsm === 'DEAD') return false;
    const n = this.W.now; const P = this.W.player;
    if (h.dot && h.flat) { this.hurt(h.flat, false, true); return true; }
    if (h.src.team === 'enemy') return false;
    if (n < this.invuln || this.fsm === 'IDLE') { this.W.fx.label(this.x, this.y - this.r * 3, '무적', '#aaaaaa', 12, 400); return false; }
    if (this.guardCharges > 0) { this.guardCharges--; sfx('guard', 0.8); this.W.fx.sparks(this.x, this.y - this.r * 2, 0xffffff, 8, 50); this.W.fx.label(this.x, this.y - this.r * 3, '가드!', '#dddddd', 18, 700); P.onDealt(this, 0, false, h); return true; }
    const { dmg, crit } = P.outgoing(this, h);
    this.hurt(dmg, crit, false); P.onDealt(this, dmg, crit, h);
    if (h.status) this.applyStatus(h.status, P);
    if (h.eff?.includes('defDown')) this.st.defDown = { until: n + 4000, amt: 0.12 };
    this.poise -= h.poise || 0; this.lastPoiseHit = n;
    if (this.poise <= 0 && this.fsm !== 'STAGGER' && this.fsm !== 'PHASE_CHANGE') this.stagger(3000);
    return true;
  }
  hurt(dmg: number, crit: boolean, dot: boolean) {
    const nextPh = this.B.phases[this.phase];
    this.hp -= dmg;
    if (this.hp <= 0 && (nextPh || this.fsm === 'PHASE_CHANGE')) { this.hp = 1; this.pendingDeath = !nextPh; }
    if (!dot) { this.flashUntil = this.W.now + 60; sfx(crit ? 'hit2' : 'hit1', 0.5); this.W.fx.sparks(this.x, this.y - this.r * 2, crit ? 0xffe070 : 0xffffff, crit ? 7 : 3, 40); if (crit) this.W.hitstop(40); }
    this.W.fx.dmgText(this.x, this.y - this.r * 3.5, String(dmg), dot ? '#c58cff' : crit ? '#ffd23a' : '#ffffff', crit);
    if (this.hp <= 0 && this.fsm !== 'PHASE_CHANGE') this.die();
  }
  stagger(ms: number, label = '그로기!') {
    this.cancelAll(); this.fsm = 'STAGGER'; this.stateEnd = this.W.now + ms; this.poise = 0;
    this.W.fx.label(this.x, this.y - this.r * 3.2, label, '#ffd040', 20, 900); sfx('bell', 0.6); this.W.onBossStagger(this);
  }
  onParried(pow: number) {
    const n = this.W.now;
    if (this.cur?.parryStagger) { this.stagger(2000, '무방비!'); return; }
    this.poise -= pow * 1.5; this.lastPoiseHit = n;
    if (this.poise <= 0 && this.fsm !== 'STAGGER') this.stagger(3000);
  }
  die() {
    if (this.fsm === 'DEAD') return;
    this.fsm = 'DEAD'; this.alive = false; this.hp = 0; this.cancelAll(); this.W.combat.clearEnemy();
    for (const m of this.minors) m.kill();
    for (const e of this.W.enemies) if (e.alive && e !== (this as any)) (e as any).die?.();
    this.W.fx.flashScreen(0xffffff, 300); this.W.fx.shake(400, 0.012); sfx('boss', 1);
    this.W.slowmo(900, 0.25);
    this.W.tweens.add({ targets: this.spr, alpha: 0, scaleY: this.spr.scaleY * 0.1, scaleX: this.spr.scaleX * 1.4, duration: 1400, ease: 'Quad.In' });
    this.W.tweens.add({ targets: [this.aura, this.shadow], alpha: 0, duration: 1400 });
    for (let i = 0; i < 8; i++) this.W.time.delayedCall(i * 140, () => { this.W.fx.burst(this.x + (Math.random() - 0.5) * 100, this.y - Math.random() * 120, this.B.tint, 70, 'fx_light'); this.W.fx.sparks(this.x, this.y - 60, 0xffffff, 6, 120); });
    this.W.time.delayedCall(1500, () => this.W.onBossDefeated(this));
  }
  animate(moving: boolean) {
    const n = this.W.now;
    this.bob = moving ? -Math.abs(Math.sin(n / 120)) * 5 : Math.sin(n / 500) * 2;
    let sx = 1, sy = 1, rot = 0;
    if (this.fsm === 'TELEGRAPH') { const k = Math.sin(n / 45) * 0.04; sx = 1.06 + k; sy = 0.95 - k; this.offX = Math.sin(n / 30) * 2; }
    else this.offX = 0;
    if (this.fsm === 'STAGGER') { rot = Math.sin(n / 90) * 0.15; sy = 0.92; }
    if (this.fsm === 'PHASE_CHANGE') { const k = Math.sin(n / 60) * 0.08; sx = 1 + k; sy = 1 + k; }
    if (moving) rot = Math.sin(n / 120) * 0.06;
    this.spr.setScale(this.baseScale * sx, this.baseScale * sy).setRotation(rot);
    if (this.B.spr.sheet === 'dun' || this.look.custom) this.spr.setFlipX(Math.cos(this.facing) < 0);
    this.aura.setPosition(this.x, this.y - this.r * 1.5).setDepth(this.y - 3).setAlpha((this.fsm === 'PHASE_CHANGE' ? 0.7 : 0.3) + 0.1 * Math.sin(n / 300));
    if (n < this.invuln) this.spr.setAlpha(0.6 + 0.4 * Math.sin(n / 50)); else this.spr.setAlpha(1);
  }
  destroyAll() { this.destroySprite(); this.aura.destroy(); for (const m of this.minors) m.destroySprite(); }
}
