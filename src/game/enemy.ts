// 일반 몬스터 AI: 탐지 330px / 이탈 530px / 동시 공격 3마리 / 예고 최소 400ms (기획서 7.3)
import Phaser from 'phaser';
import { Actor, HitInfo } from './combat';
import { MonsterDef, monsterStats, MON_SHEET, MON_SCALE, MON_CELL } from '../data/monsters';
import { sfx } from '../audio/audio';
import { WShape } from './shapes';
import type { World } from '../scenes/World';

type EState = 'idle' | 'alert' | 'chase' | 'windup' | 'act' | 'recover' | 'return' | 'hop';
const STATUS_COLOR: Record<string, number> = { poison: 0x80ff60, burn: 0xff7030, chill: 0x80d8ff, slow: 0x80d8ff };

export class Enemy extends Actor {
  state: EState = 'idle'; stateEnd = 0; homeX = 0; homeY = 0; atkReady = 0; token = false; speed = 100;
  questTag = ''; aura: Phaser.GameObjects.Image | null = null; tag: Phaser.GameObjects.Text | null = null;
  lastHurt = -9999; wanderT = 0; wx = 0; wy = 0; dashLeft = 0; healT = 0; summoned = false; xpMul = 1; noLoot = false;
  constructor(W: World, public d: MonsterDef, x: number, y: number, L: number, elite = false) {
    super(W);
    this.x = this.homeX = x; this.y = this.homeY = y; this.level = L; this.isElite = elite; this.name = (elite ? '정예 ' : '') + d.name;
    const s = monsterStats(d, L, elite); this.hp = this.maxHp = s.hp; this.atk = s.atk; this.def = s.def; this.poise = this.maxPoise = s.poise;
    this.speed = d.speed * (elite ? 1.05 : 1);
    const sheet = d.spr.sheet; const sc = 3 * d.scale * (elite ? 1.3 : 1); // 판정·오라 크기는 기존 16px 기준 배율을 유지
    if (sheet === MON_SHEET) {
      // 커스텀 시트는 크기 등급이 그림에 반영돼 있어 배율 고정, 색은 그린 그대로
      this.makeSprite(sheet, d.spr.frame, MON_SCALE * (elite ? 1.3 : 1), 0xffffff, 63 / MON_CELL);
      const k = (Math.max(12, 6.5 * sc) * 2.4) / 48; this.shadow.setScale(k * 0.9, k * 0.7);
    } else this.makeSprite(sheet, d.spr.frame, sc, d.tint);
    this.r = Math.max(12, 6.5 * sc);
    if (elite) {
      this.aura = W.add.image(x, y, 'fx_light').setTint(0xffc040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setScale(sc * 0.18);
      this.tag = W.add.text(x, y, '★ ' + d.name, { fontFamily: 'Galmuri11', fontSize: '12px', color: '#ffd76a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    }
    this.atkReady = W.now + 600 + Math.random() * 800; this.facing = Math.random() * 6.28;
  }
  get P() { return this.W.player; }
  dist() { return Math.hypot(this.P.x - this.x, this.P.y - this.y); }
  angTo() { return Math.atan2(this.P.y - this.y, this.P.x - this.x); }
  releaseToken() { if (this.token) { this.token = false; this.W.tokens.delete(this); } }

  update(dt: number) {
    if (!this.alive) return;
    const n = this.W.now;
    this.tickStatus(dt);
    if (!this.alive) return;
    if (this.stunned) {
      if (this.st.launch && this.st.launch.until > n) { const p = (this.st.launch.until - n) / 600; this.hopZ = Math.sin(p * Math.PI) * 50; }
      if (this.state === 'windup' || this.state === 'act') { this.W.combat.cancelOwner(this); this.state = 'recover'; this.stateEnd = n + 300; }
      this.releaseToken(); this.animate(dt, false); this.syncSprite(); return;
    }
    if (this.hopZ > 0 && this.state !== 'hop') this.hopZ = Math.max(0, this.hopZ - 300 * dt);
    if (this.d.kind === 'healer') this.healAllies(dt);
    const d = this.dist(); const P = this.P;
    let moving = false;
    switch (this.state) {
      case 'idle': {
        this.wanderT -= dt;
        if (this.wanderT <= 0) { this.wanderT = 1.5 + Math.random() * 2; const a = Math.random() * 6.28; this.wx = Math.cos(a) * 0.35; this.wy = Math.sin(a) * 0.35; if (Math.random() < 0.4) this.wx = this.wy = 0; }
        if (this.d.speed > 0 && Math.hypot(this.x - this.homeX, this.y - this.homeY) < 120) { this.W.moveActor(this, this.wx * this.speed * dt, this.wy * this.speed * dt); moving = !!(this.wx || this.wy); }
        else if (this.d.speed > 0) { const a = Math.atan2(this.homeY - this.y, this.homeX - this.x); this.W.moveActor(this, Math.cos(a) * this.speed * 0.4 * dt, Math.sin(a) * this.speed * 0.4 * dt); moving = true; }
        if (P.alive && d < 330 && this.W.aggroAllowed()) { this.state = 'alert'; this.stateEnd = n + 300; this.W.fx.label(this.x, this.y - this.r * 3.2, '!', '#ffcf40', 18, 500); }
        break;
      }
      case 'alert': if (n >= this.stateEnd) this.state = 'chase'; this.facing = this.angTo(); break;
      case 'chase': {
        if (!P.alive) { this.state = 'return'; break; }
        if (Math.hypot(this.x - this.homeX, this.y - this.homeY) > 530 && d > 330 && !this.summoned) { this.state = 'return'; this.releaseToken(); break; }
        this.facing = this.angTo();
        const [minR, maxR] = this.range();
        let mv = 0;
        if (d > maxR) mv = 1; else if (d < minR) mv = -0.7;
        // 토큰이 없으면 포위 이동
        if (!this.token && d < 160 && this.W.tokens.size >= 3) mv = d < 120 ? -0.4 : 0;
        if (this.d.speed > 0 && mv !== 0) {
          const a = this.facing + (mv < 0 ? 0 : 0); const sp = this.speed * this.slowFactor() * mv;
          const side = (this.W.tokens.size >= 3 && !this.token) ? 0.6 : 0;
          this.W.moveActor(this, (Math.cos(a) + Math.cos(a + Math.PI / 2) * side) * sp * dt, (Math.sin(a) + Math.sin(a + Math.PI / 2) * side) * sp * dt); moving = true;
        } else if (this.d.speed > 0 && !this.token && this.W.tokens.size >= 3) {
          const a = this.facing + Math.PI / 2; this.W.moveActor(this, Math.cos(a) * this.speed * 0.4 * dt, Math.sin(a) * this.speed * 0.4 * dt); moving = true;
        }
        if (d <= maxR + 10 && d >= minR * 0.6 && n >= this.atkReady && (this.token || this.W.takeToken(this))) this.startAttack();
        break;
      }
      case 'windup': case 'act': if (n >= this.stateEnd) { this.state = 'recover'; this.stateEnd = n + 650 + Math.random() * 300; } break;
      case 'hop': break;
      case 'recover': if (n >= this.stateEnd) { this.releaseToken(); this.state = 'chase'; this.atkReady = n + 900 + Math.random() * 900; } break;
      case 'return': {
        const a = Math.atan2(this.homeY - this.y, this.homeX - this.x); this.facing = a;
        this.W.moveActor(this, Math.cos(a) * this.speed * 1.2 * dt, Math.sin(a) * this.speed * 1.2 * dt); moving = true;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3 * dt);
        if (Math.hypot(this.x - this.homeX, this.y - this.homeY) < 20) this.state = 'idle';
        break;
      }
    }
    this.animate(dt, moving); this.syncSprite();
  }

  range(): [number, number] {
    switch (this.d.kind) {
      case 'ranged': case 'barrage': return [170, 290];
      case 'caster': case 'lobber': return [150, 280];
      case 'healer': return [180, 300];
      case 'charger': return [90, 270];
      case 'blinker': return [60, 300];
      case 'lancer': return [70, 210];
      case 'turret': return [0, 150];
      case 'hopper': return [30, 140];
      case 'brute': return [20, 90 * this.d.scale * 0.8];
      default: return [20, 60 + this.r];
    }
  }

  tele(shape: WShape, ms: number, parry: boolean, then: () => void, subtle = true) {
    this.state = 'windup'; this.stateEnd = this.W.now + ms + 120;
    this.W.combat.telegraph(shape, ms, { parry, subtle: subtle && !parry }, () => { if (this.alive && !this.stunned) then(); }, this);
  }
  info(mult: number, parry: boolean, name?: string) {
    return { coef: mult, parryable: parry, status: this.d.status, name: name || this.name, kb: 240 } as Omit<HitInfo, 'src'>;
  }
  hitFx(x: number, y: number, a: number, r: number) { this.W.fx.slash(x, y, a, r, STATUS_COLOR[this.d.status || ''] || 0xffb0b0); sfx('swing2', 0.35); }

  startAttack() {
    const n = this.W.now; const a = this.angTo(); this.facing = a; const P = this.P; const k = this.d.kind;
    const elite = this.isElite; const m = elite ? 1.1 : 1;
    switch (k) {
      case 'melee': case 'shield': case 'swarm': case 'exploder': {
        const r = k === 'swarm' || k === 'exploder' ? 55 : 72 + this.r * 0.5; const ms = k === 'swarm' ? 400 : k === 'shield' ? 600 : 500; const parry = k !== 'swarm';
        const sh: WShape = { k: 'cone', x: this.x, y: this.y - 8, r, a, half: 0.9 };
        this.tele(sh, ms, parry, () => { this.knock(a, 260); this.W.combat.strike(this, { ...sh, x: this.x, y: this.y - 8 }, this.info((k === 'swarm' ? 0.7 : 1) * m, parry), 120); this.hitFx(this.x, this.y - 10, a, r); });
        break;
      }
      case 'duelist': {
        const r = 95; const sh = (): WShape => ({ k: 'cone', x: this.x, y: this.y - 8, r, a: this.angTo(), half: 0.9 });
        const s1 = sh();
        this.tele(s1, 500, true, () => {
          this.W.combat.strike(this, s1, this.info(0.9 * m, true), 110); this.hitFx(this.x, this.y - 10, s1.k === 'cone' ? s1.a : 0, r);
          const s2 = sh(); this.state = 'windup'; this.stateEnd = this.W.now + 600;
          this.W.combat.telegraph(s2, 450, { parry: true }, () => { if (!this.alive || this.stunned) return; this.W.combat.strike(this, s2, this.info(1.1 * m, true), 110); this.hitFx(this.x, this.y - 10, (s2 as any).a, r); }, this);
        });
        break;
      }
      case 'hopper': {
        // 점프 후 300ms 공격
        this.state = 'hop'; const tx = P.x - Math.cos(a) * 34, ty = P.y - Math.sin(a) * 34; const sx = this.x, sy = this.y;
        this.W.tweens.addCounter({ from: 0, to: 1, duration: 380, onUpdate: (tw) => { const p = tw.getValue(); this.W.moveActorTo(this, sx + (tx - sx) * p, sy + (ty - sy) * p); this.hopZ = Math.sin(p * Math.PI) * 36; }, onComplete: () => {
          this.hopZ = 0; if (!this.alive) return; const sh: WShape = { k: 'circle', x: this.x, y: this.y - 4, r: 52 };
          this.tele(sh, 300, false, () => { this.W.combat.strike(this, sh, this.info(1 * m, false), 110); this.W.fx.burst(this.x, this.y, this.d.tint, 52, 'fx_smoke'); sfx('hit1', 0.3); }, true);
        } });
        this.stateEnd = n + 2000;
        break;
      }
      case 'charger': {
        this.dashLeft = this.d.id === 'panther' ? 3 : this.d.id === 'lava_hound' ? 2 : 1;
        const go = () => {
          const a2 = this.angTo(); const len = Math.min(300, this.dist() + 80);
          const sh: WShape = { k: 'rect', x: this.x, y: this.y - 6, a: a2, len, w: 48 };
          this.tele(sh, this.dashLeft === (this.d.id === 'panther' ? 3 : this.d.id === 'lava_hound' ? 2 : 1) ? 600 : 420, false, () => {
            const sx = this.x, sy = this.y; const ex = sx + Math.cos(a2) * len, ey = sy + Math.sin(a2) * len;
            this.state = 'act'; this.stateEnd = this.W.now + 600; const hit = this.W.combat.strike(this, sh, this.info(1.2 * m, false), 280); hit.shape = sh;
            sfx('dash', 0.5);
            this.W.tweens.addCounter({ from: 0, to: 1, duration: 260, ease: 'Quad.Out', onUpdate: (tw) => { const p = tw.getValue(); this.W.moveActorTo(this, sx + (ex - sx) * p, sy + (ey - sy) * p); if (Math.random() < 0.5) this.W.fx.afterimage(this.spr, this.d.tint); if (this.d.id === 'lava_hound') this.hopZ = Math.sin(p * Math.PI) * 30; }, onComplete: () => {
              this.hopZ = 0; this.dashLeft--; if (this.dashLeft > 0 && this.alive && !this.stunned) this.W.time.delayedCall(180, go);
            } });
          });
        };
        go(); break;
      }
      case 'ranged': case 'barrage': case 'healer': {
        const shots = this.d.id === 'ghost_archer' ? 2 : 1; const spread = k === 'barrage' ? 3 : 1;
        const sh: WShape = { k: 'rect', x: this.x, y: this.y - 14, a, len: 300, w: 10 };
        this.tele(sh, 450, false, () => {
          for (let s = 0; s < shots; s++) this.W.time.delayedCall(s * 160, () => {
            if (!this.alive) return; const aa = this.angTo();
            for (let i = 0; i < spread; i++) {
              const ang = aa + (i - (spread - 1) / 2) * 0.35;
              const orb = this.d.id === 'snow_spirit' || k === 'barrage' || k === 'healer';
              this.W.combat.projectile(this, this.x, this.y - 16, ang, 220 + Math.min(100, this.level * 2), 420, orb ? 12 : 9, orb ? 'fx_light' : 'fx_trace', orb ? this.d.tint : 0xffe0b0, { ...this.info(k === 'healer' ? 0.6 : 0.9 * m, !orb) }, { pierce: this.d.id === 'wall_archer' });
            }
            sfx('swing1', 0.25);
          });
        }, true);
        break;
      }
      case 'turret': {
        const sh: WShape = { k: 'circle', x: this.x, y: this.y, r: 110 };
        this.tele(sh, 700, false, () => { this.W.combat.strike(this, sh, this.info(1 * m, false), 120); for (let i = 0; i < 6; i++) this.W.fx.sprite('fx_trace', this.x + Math.cos(i) * 60, this.y + Math.sin(i) * 60, { tint: 0xa07850, scale: 0.3, rot: i, dur: 300, add: false }); sfx('slam', 0.4); }, false);
        break;
      }
      case 'blinker': {
        this.W.fx.smoke(this.x, this.y, this.d.tint, 2);
        const side = this.d.id === 'stalker' ? Math.PI : (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        const pa = P.facing + side; this.W.moveActorTo(this, P.x + Math.cos(pa) * 80, P.y + Math.sin(pa) * 80);
        this.W.fx.burst(this.x, this.y - 10, this.d.tint, 40, 'fx_magic'); sfx('glitch', 0.3);
        const aa = this.angTo(); const sh: WShape = { k: 'cone', x: this.x, y: this.y - 8, r: 100, a: aa, half: 0.8 };
        this.tele(sh, 420, true, () => { this.W.combat.strike(this, sh, this.info(1.05 * m, true), 110); this.hitFx(this.x, this.y - 10, aa, 90); });
        break;
      }
      case 'brute': {
        const id = this.d.id;
        if (id === 'colossus') {
          const sh: WShape = { k: 'multi', parts: [{ k: 'rect', x: P.x - 160, y: P.y, a: 0, len: 320, w: 54 }, { k: 'rect', x: P.x, y: P.y - 160, a: Math.PI / 2, len: 320, w: 54 }] };
          this.tele(sh, 900, false, () => { this.W.combat.strike(this, sh, this.info(1.4 * m, false), 140); this.W.combat.zone(this, sh, 2500, this.info(0.15, false, '십자 장판'), 0xff6030); this.W.fx.shake(120, 0.005); sfx('slam', 0.6); }, false);
        } else if (id === 'ice_golem' && Math.random() < 0.5) {
          const sh: WShape = { k: 'circle', x: P.x, y: P.y, r: 80 };
          this.tele(sh, 900, false, () => { this.W.combat.strike(this, sh, this.info(1.5 * m, false), 140); this.W.fx.burst(sh.x, sh.y, 0x9fe8ff, 80, 'fx_circle'); this.W.fx.shake(120, 0.005); sfx('glass', 0.6); }, false);
        } else if (id === 'guard' || id === 'rift_giant') {
          const sh: WShape = { k: 'circle', x: this.x, y: this.y, r: 135 };
          this.tele(sh, 900, false, () => {
            this.W.combat.strike(this, sh, { ...this.info(1.5 * m, false), kb: 520 }, 140); this.W.fx.burst(this.x, this.y, this.d.tint, 135, 'fx_circle'); this.W.fx.shake(140, 0.006); sfx('slam', 0.7);
            if (id === 'rift_giant') this.W.combat.zone(this, { k: 'circle', x: this.x, y: this.y, r: 90 }, 3000, this.info(0.15, false, '균열 장판'), 0xa060ff);
          }, false);
        } else {
          const r = 125 + this.r * 0.3; const sh: WShape = { k: 'cone', x: this.x, y: this.y - 8, r, a, half: 1.1 };
          this.tele(sh, 900, false, () => { this.W.combat.strike(this, sh, { ...this.info(1.6 * m, false), kb: 420 }, 140); this.hitFx(this.x, this.y - 10, a, r); this.W.fx.shake(120, 0.005); sfx('slam', 0.6); }, false);
        }
        break;
      }
      case 'caster': case 'lobber': {
        const sh: WShape = { k: 'circle', x: P.x, y: P.y, r: k === 'lobber' ? 66 : 74 };
        this.tele(sh, k === 'lobber' ? 800 : 700, false, () => {
          this.W.combat.strike(this, sh, this.info((k === 'lobber' ? 1.0 : 0.6) * m, false), 120);
          this.W.combat.zone(this, sh, 3000, this.info(0.2, false, this.d.name + '의 장판'), STATUS_COLOR[this.d.status || ''] || 0x8a60c8);
          this.W.fx.burst(sh.x, sh.y, STATUS_COLOR[this.d.status || ''] || 0x8a60c8, sh.r, k === 'lobber' ? 'fx_flame' : 'fx_magic'); sfx(k === 'lobber' ? 'glass' : 'magic', 0.4);
        }, false);
        break;
      }
      case 'lancer': {
        const sh: WShape = { k: 'rect', x: this.x, y: this.y - 8, a, len: 240, w: 40 };
        this.tele(sh, 600, true, () => { this.knock(a, 500); this.W.combat.strike(this, sh, this.info(1.3 * m, true), 120); this.W.fx.sprite('fx_trace', this.x + Math.cos(a) * 120, this.y - 8 + Math.sin(a) * 120, { tint: this.d.tint, rot: a, scale: 0.8, dur: 200 }); sfx('swing1', 0.4); });
        break;
      }
    }
  }

  healAllies(dt: number) {
    this.healT -= dt; if (this.healT > 0 || this.state === 'idle') return; this.healT = 2;
    for (const e of this.W.enemies) if (e.alive && e !== this && !e.isBoss && Math.hypot(e.x - this.x, e.y - this.y) < 220 && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03); this.W.fx.sprite('fx_light', e.x, e.y - 20, { tint: 0x80ff9a, scale: 0.2, endScale: 0.5, dur: 400 });
    }
  }

  receive(h: HitInfo): boolean {
    if (!this.alive) return false;
    const n = this.W.now; const P = this.W.player;
    if (h.dot && h.flat) { this.hurt(h.flat, false, h, true); return true; }
    if (h.src.team === 'enemy') return false;
    let { dmg, crit } = P.outgoing(this, h);
    const guard = this.d.kind === 'shield' && !(this.st.guardBreak && this.st.guardBreak.until > n) && !this.stunned;
    let blocked = false;
    if (guard && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(h.src.y - this.y, h.src.x - this.x) - this.facing)) < 1.05 && !h.isProj) { dmg = Math.round(dmg * 0.55); blocked = true; }
    this.hurt(dmg, crit, h, false);
    P.onDealt(this, dmg, crit, h);
    if (blocked) { sfx('guard', 0.5); this.W.fx.sparks(this.x + Math.cos(this.facing) * 16, this.y - 18, 0xffffff, 4, 28); this.W.fx.label(this.x, this.y - 60, '가드', '#cccccc', 12, 500); }
    if (!this.alive) return true;
    const eff = h.eff || [];
    if (h.status) this.applyStatus(h.status, P);
    if (eff.includes('defDown')) this.st.defDown = { until: n + 4000, amt: 0.12 };
    if (eff.includes('guardBreak') && (!this.st.guardBreak || this.st.guardBreak.cd < n)) { this.st.guardBreak = { until: n + 3000, cd: n + 5000 }; if (this.d.kind === 'shield') this.W.fx.label(this.x, this.y - 60, '가드 파괴!', '#ffb050', 14, 700); }
    const winding = this.state === 'windup' || this.state === 'act';
    if (eff.includes('launch') && !this.isElite) { this.st.launch = { until: n + 600 }; }
    else if (eff.includes('stagger') && (!this.isElite || !winding)) { this.st.stun = { until: n + (this.isElite ? 200 : 320) }; }
    if (h.kb && !blocked) { const a = h.kb < 0 ? Math.atan2(P.y - this.y, P.x - this.x) : (h.ang ?? 0); const res = this.isElite ? 0.4 : 1; this.knock(a, Math.abs(h.kb) * res * (this.d.kind === 'brute' ? 0.4 : 1)); }
    // Poise
    this.poise -= (h.poise || 0) * (blocked ? 0.6 : 1); this.lastPoiseHit = n;
    if (this.poise <= 0) { this.poise = this.maxPoise; this.staggerUntil = n + (this.isElite ? 1800 : 1000); this.W.fx.label(this.x, this.y - 64, '그로기', '#ffd040', 13, 600); this.W.combat.cancelOwner(this); this.releaseToken(); }
    if (this.state === 'idle' || this.state === 'alert' || this.state === 'return') this.state = 'chase';
    return true;
  }
  hurt(dmg: number, crit: boolean, h: HitInfo, dot: boolean) {
    this.hp -= dmg; this.lastHurt = this.W.now;
    if (!dot) { this.flashUntil = this.W.now + 60; sfx(crit || (h.tech && h.tech[0] !== 'L') ? 'hit2' : 'hit1', 0.45); this.W.fx.sparks(this.x, this.y - this.r, crit ? 0xffe070 : 0xffffff, crit ? 6 : 3, 30); if (crit || h.tech === 'H') this.W.hitstop(crit ? 45 : 30); }
    this.W.fx.dmgText(this.x, this.y - this.r * 2.4, String(dmg), dot ? '#c58cff' : crit ? '#ffd23a' : '#ffffff', crit);
    if (this.hp <= 0) this.die();
  }
  onParried(pow: number) {
    const n = this.W.now; this.W.combat.cancelOwner(this);
    this.poise -= pow; this.lastPoiseHit = n;
    if (this.poise <= 0) { this.poise = this.maxPoise; this.staggerUntil = n + (this.isElite ? 1800 : 1000); }
    else this.st.stun = { until: n + 700 };
    this.state = 'recover'; this.stateEnd = n + 700; this.releaseToken();
  }
  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.releaseToken(); this.W.combat.cancelOwner(this);
    const spr = this.spr, sh = this.shadow;
    this.W.tweens.add({ targets: spr, alpha: 0, scaleX: spr.scaleX * 1.3, scaleY: spr.scaleY * 0.2, y: spr.y + 6, duration: 380, ease: 'Quad.In', onComplete: () => spr.destroy() });
    this.W.tweens.add({ targets: sh, alpha: 0, duration: 380, onComplete: () => sh.destroy() });
    this.aura?.destroy(); this.tag?.destroy();
    this.W.fx.smoke(this.x, this.y - 10, this.d.tint, 3); this.W.fx.sparks(this.x, this.y - 12, this.d.tint, 6, 40);
    if (this.d.kind === 'exploder') {
      const ex = this.x, ey = this.y; const sh2: WShape = { k: 'circle', x: ex, y: ey, r: 75 };
      this.W.combat.telegraph(sh2, 500, {}, () => { this.W.combat.strike(this, sh2, this.info(1.2, false, '화염 메뚜기 폭발'), 100); this.W.fx.burst(ex, ey, 0xff8040, 75, 'fx_flame'); sfx('slam', 0.4); });
    }
    this.W.onEnemyKilled(this);
  }
  animate(dt: number, moving: boolean) {
    const n = this.W.now;
    if (this.state === 'windup') { const k = Math.sin(n / 40) * 0.06; this.spr.setScale(this.baseScale * (1.05 + k), this.baseScale * (0.95 - k)); this.offX = Math.sin(n / 25) * 1.5; }
    else { this.spr.setScale(this.baseScale); this.offX = 0; }
    this.bob = moving ? -Math.abs(Math.sin(n / 90 + this.homeX)) * 3 : Math.sin(n / 500 + this.homeX) * 0.8;
    this.spr.setRotation(moving ? Math.sin(n / 90) * 0.08 : this.stunned ? Math.sin(n / 60) * 0.12 : 0);
    if (this.d.spr.sheet === 'dun' || this.d.spr.sheet === MON_SHEET) this.spr.setFlipX(Math.cos(this.facing) < 0);
    if (this.aura) this.aura.setPosition(this.x, this.y - this.r).setDepth(this.y - 2).setAlpha(0.35 + 0.15 * Math.sin(n / 200));
    if (this.tag) this.tag.setPosition(this.x, this.y - this.r * 3.6).setDepth(this.y + 1);
  }
}
