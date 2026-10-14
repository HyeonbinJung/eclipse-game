// 메인 월드 씬: 마을 / 필드 / 던전 / 보스 아레나 (논리 60Hz 고정 스텝)
import Phaser from 'phaser';
import { Player, Act, InputState } from '../game/player';
import { Enemy } from '../game/enemy';
import { Boss, Minor } from '../game/boss';
import { Actor, Combat } from '../game/combat';
import { FX } from '../game/fx';
import { buildMap, placeProp, T, Circle, Rect } from '../game/mapgen';
import { CHAPTERS, ChapterDef, STORY, SIDE_QUESTS } from '../data/world';
import { MON, MONSTERS, FIELD_GROUPS, MonsterDef } from '../data/monsters';
import { BOSS, BossDef, PatternDef } from '../data/bosses';
import { SP, Spr } from '../data/sprites';
import { RAR, makeItem, rollRarity, slotIcon, Item } from '../data/items';
import { clamp, monsterXp, xpLevelMod, goldNormal, goldElite, goldChest, randi, pick } from '../data/formulas';
import { S, bus, gainXp, persist, questProgress, mainQuest, addItem, randomSlotFor, grantBossLoot, pendingTraits, cls } from '../core/state';
import { sfx, music } from '../audio/audio';
import { UI } from '../ui/ui';

export type Mode = 'town' | 'field' | 'dungeon' | 'boss';
export interface WorldData { mode: Mode; ch: number; dungeon?: number; room?: number; bossId?: string; rematch?: boolean; fromDungeon?: number; retry?: boolean; checkpointUsed?: boolean }

interface Pickup { kind: 'gold' | 'item' | 'ess' | 'qmat' | 'smat' | 'potion'; x: number; y: number; img: Phaser.GameObjects.Image; amount: number; item?: Item; born: number; glow?: Phaser.GameObjects.Image }
interface Interact { x: number; y: number; r: number; label: string; spr?: Phaser.GameObjects.Image; act: () => void; hold?: number; holdT?: number; done?: boolean; kind?: string; obj?: boolean }

const DT = 1 / 60;

export class World extends Phaser.Scene {
  d!: WorldData; mode!: Mode; ch!: ChapterDef; now = 0; ts = 1; acc = 0;
  hitstopUntil = 0; slowUntil = 0; slowScale = 1;
  player!: Player; enemies: Actor[] = []; boss: Boss | null = null; combat!: Combat; fx!: FX; tokens = new Set<Enemy>();
  obstacles: Circle[] = []; rects: Rect[] = []; bounds!: Rect; arena!: Rect; areaLevel = 1;
  pickups: Pickup[] = []; interacts: Interact[] = []; frozen = false;
  run = { start: 0, kills: 0, parries: 0, hurt: 0 };
  keys!: Record<string, Phaser.Input.Keyboard.Key>; pressed: Act[] = []; lmbHeldSince = 0; lastAutoL = 0;
  waveT = 0; roomCleared = false; roomIdx = 0; gBars!: Phaser.GameObjects.Graphics; promptText!: Phaser.GameObjects.Text;
  eventZone: { x: number; y: number; r: number; active: boolean; done: boolean; spawned: Enemy[]; g?: Phaser.GameObjects.Image } | null = null;
  bossPatternName = ''; bossPhaseText = ''; dummy: Minor | null = null; dummyLog: { t: number; d: number }[] = [];
  puzzle: { plates: { x: number; y: number; n: number; on: boolean; img: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text }[]; next: number; done: boolean } | null = null;
  trapUntil = 0; trapT = 0; exitDoor: Interact | null = null; arrowTarget: { x: number; y: number } | null = null;
  ended = false; padPrev: Record<number, boolean> = {};

  constructor() { super('World'); }
  init(d: WorldData) { this.d = d; }

  create() {
    const d = this.d; this.mode = d.mode; this.ch = CHAPTERS[d.ch - 1]; S.chapter = d.ch;
    this.now = 0; this.enemies = []; this.boss = null; this.tokens = new Set(); this.pickups = []; this.interacts = []; this.frozen = false; this.ended = false;
    this.eventZone = null; this.puzzle = null; this.dummy = null; this.exitDoor = null; this.bossPatternName = ''; this.bossPhaseText = '';
    this.objTargets = []; this.trapOwner = null; this.trapUntil = 0; (this as any).leaving = false; (this as any).wavesLeft = 0; this.dummyLog = []; this.acc = 0; this.hitstopUntil = 0; this.slowUntil = 0; this.pressed = [];
    this.run = { start: 0, kills: 0, parries: 0, hurt: 0 };
    this.fx = new FX(this); this.combat = new Combat(this);
    this.areaLevel = clamp(S.level, this.ch.range[0], this.ch.range[1]);
    this.gBars = this.add.graphics().setDepth(150000);
    this.promptText = this.add.text(0, 0, '', { fontFamily: 'Galmuri11', fontSize: '13px', color: '#fff', backgroundColor: '#000a', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(210000).setVisible(false);
    this.setupInput();
    if (this.mode === 'town') this.buildTown();
    else if (this.mode === 'field') this.buildField();
    else if (this.mode === 'dungeon') this.buildDungeonRoom();
    else this.buildBoss();
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.bounds.x * 2 + this.bounds.w, this.bounds.y + this.bounds.h + T);
    cam.startFollow(this.player.spr, true, 0.12, 0.12); cam.setRoundPixels(true);
    cam.fadeIn(350, 0, 0, 0);
    this.player.spr.setDepth(this.player.y);
    const onLevel = (L: number) => this.onLevelUp(L); const onStats = () => this.player.refreshStats(); const onToast = (m: string, c?: string) => UI.toast(m, c);
    bus.on('levelup', onLevel); bus.on('stats', onStats); bus.on('toast', onToast);
    this.events.once('shutdown', () => { bus.off('levelup', onLevel); bus.off('stats', onStats); bus.off('toast', onToast); this.combat.clearAll(); });
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud'); else this.scene.get('Hud').events.emit('world', this);
    this.scene.bringToTop('Hud');
    music.play(this.mode === 'town' ? 'town' : `ch${this.ch.id}`, this.mode === 'town' ? this.ch.music.map((m) => m + 7) : this.ch.music, this.mode === 'boss');
    persist();
  }

  // ================= 입력 =================
  setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,F,Q,E,R,ONE,G,I,J,K,ESC,TAB,F1,SHIFT') as any;
    kb.addCapture('SPACE,TAB,UP,DOWN,LEFT,RIGHT');
    const map: Record<string, Act> = { SPACE: 'D', SHIFT: 'D', F: 'F', Q: 'Q', E: 'E', R: 'R', ONE: 'POT' };
    for (const [k, a] of Object.entries(map)) this.keys[k].on('down', () => { if (!this.frozen) this.pressed.push(a); });
    this.keys.G.on('down', () => !this.frozen && this.tryInteract());
    this.keys.I.on('down', () => UI.toggle('inventory'));
    this.keys.J.on('down', () => UI.toggle('quest'));
    this.keys.K.on('down', () => UI.toggle('traits'));
    this.keys.ESC.on('down', () => (UI.isOpen() ? UI.close() : UI.open('menu')));
    this.keys.F1.on('down', () => UI.toggle('help'));
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.frozen) return;
      if (p.rightButtonDown()) this.pressed.push('H'); else { this.pressed.push('L'); this.lmbHeldSince = this.time.now; this.lastAutoL = this.time.now; }
    });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => { if (e.code === 'Digit1') e.preventDefault(); });
  }
  inputDir() {
    const k = this.keys; let x = 0, y = 0;
    if (k.A.isDown || k.LEFT.isDown) x -= 1; if (k.D.isDown || k.RIGHT.isDown) x += 1;
    if (k.W.isDown || k.UP.isDown) y -= 1; if (k.S.isDown || k.DOWN.isDown) y += 1;
    const pad = this.pad(); if (pad) { const lx = pad.axes[0]?.getValue() || 0, ly = pad.axes[1]?.getValue() || 0; if (Math.hypot(lx, ly) > 0.25) { x = lx; y = ly; } }
    return { x, y };
  }
  pad() { const g = this.input.gamepad; return g && g.total ? g.getPad(0) : null; }
  aimPoint() {
    const pad = this.pad();
    if (pad) {
      const rx = pad.axes[2]?.getValue() || 0, ry = pad.axes[3]?.getValue() || 0;
      if (Math.hypot(rx, ry) > 0.3) return { x: this.player.x + rx * 200, y: this.player.y + ry * 200 };
      const d = this.inputDir(); if (d.x || d.y) return { x: this.player.x + d.x * 200, y: this.player.y + d.y * 200 };
      if (this.padActive) { const e = this.nearestEnemy(this.player.x, this.player.y, 400); if (e) return { x: e.x, y: e.y }; return { x: this.player.x + Math.cos(this.player.facing) * 100, y: this.player.y + Math.sin(this.player.facing) * 100 }; }
    }
    const p = this.input.activePointer; const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2; return { x: w.x, y: w.y + 16 };
  }
  padActive = false;
  pollPad() {
    const pad = this.pad(); if (!pad) return;
    const map: [number, Act | 'G' | 'MENU'][] = [[2, 'L'], [3, 'H'], [1, 'D'], [4, 'F'], [5, 'Q'], [7, 'E'], [6, 'R'], [12, 'POT'], [0, 'G'], [9, 'MENU']];
    for (const [b, a] of map) {
      const down = !!pad.buttons[b]?.pressed;
      if (down && !this.padPrev[b]) { this.padActive = true; if (a === 'G') this.tryInteract(); else if (a === 'MENU') UI.isOpen() ? UI.close() : UI.open('menu'); else if (!this.frozen) this.pressed.push(a as Act); }
      this.padPrev[b] = down;
    }
  }

  // ================= 공통 API =================
  moveActor(a: Actor, dx: number, dy: number) {
    a.x += dx; a.y += dy;
    for (const o of this.obstacles) {
      const ddx = a.x - o.x, ddy = a.y - o.y; const dd = Math.hypot(ddx, ddy); const min = o.r + a.r * 0.7;
      if (dd < min && dd > 0.01) { a.x = o.x + (ddx / dd) * min; a.y = o.y + (ddy / dd) * min; }
    }
    const b = this.bounds; a.x = clamp(a.x, b.x + a.r * 0.6, b.x + b.w - a.r * 0.6); a.y = clamp(a.y, b.y + a.r * 0.3, b.y + b.h - 4);
  }
  moveActorTo(a: Actor, x: number, y: number) { this.moveActor(a, x - a.x, y - a.y); }
  blocked(x: number, y: number) { const b = this.bounds; return x < b.x - 20 || y < b.y - 40 || x > b.x + b.w + 20 || y > b.y + b.h + 20 || this.obstacles.some((o) => Math.hypot(o.x - x, o.y + 10 - y) < o.r * 0.8); }
  clampToArena(x: number, y: number) { const b = this.arena; return { x: clamp(x, b.x + 40, b.x + b.w - 40), y: clamp(y, b.y + 40, b.y + b.h - 30) }; }
  arenaArea() { return this.arena.w * this.arena.h; }
  nearestEnemy(x: number, y: number, maxD: number): Actor | null {
    let best: Actor | null = null, bd = maxD;
    for (const e of this.enemies) if (e.alive) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  nearestAimAssist(x: number, y: number, aim: number) {
    let best = aim, bd = 0.22;
    for (const e of this.enemies) if (e.alive) { const a = Math.atan2(e.y - y, e.x - x); const d = Math.abs(Phaser.Math.Angle.Wrap(a - aim)); if (d < bd && Math.hypot(e.x - x, e.y - y) < 420) { bd = d; best = a; } }
    return best;
  }
  hint(msg: string) { UI.toast(msg, '#bbbbbb', 1200); }
  hitstop(ms: number) { this.hitstopUntil = Math.max(this.hitstopUntil, this.time.now + ms); }
  slowmo(ms: number, scale: number) { if (S.settings.photosensitive && scale < 0.5) scale = 0.6; this.slowUntil = this.time.now + ms; this.slowScale = scale; }
  takeToken(e: Enemy) { if (this.tokens.size >= 3) return false; this.tokens.add(e); e.token = true; return true; }
  aggroAllowed() { return this.mode !== 'town'; }
  consumePotion() { if (this.mode === 'field' || this.mode === 'town') S.potions = Math.max(0, S.potions - 1); }
  onPlayerHurt() { this.run.hurt++; }

  spawnEnemy(def: MonsterDef, x: number, y: number, L: number, elite: boolean) {
    const p = this.clampToArena(x, y); const e = new Enemy(this, def, p.x, p.y, L, elite); this.enemies.push(e); return e;
  }

  // ================= 마을 =================
  buildTown() {
    const cols = 34, rows = 22; const cx = (cols * T) / 2, cy = (rows * T) / 2;
    const th = this.ch.townTheme;
    const m = buildMap(this, th, cols, rows, { density: 0.035, clear: [{ x: cx, y: cy, r: 520 }] });
    this.bounds = m.bounds; this.arena = m.bounds; this.obstacles = m.obstacles; this.rects = m.rects;
    // 길
    for (let x = 4; x < cols - 4; x++) placeProp(this, SP.cobble, x * T + 24, cy + 30, 0xffffff).setDepth(-9000).setOrigin(0.5, 0.5);
    for (let y = 4; y < rows - 3; y++) placeProp(this, SP.cobble, cx, y * T + 24, 0xffffff).setDepth(-9000).setOrigin(0.5, 0.5);
    // 집 (Tiny Town 지붕/벽 타일 조합)
    const house = (hx: number, hy: number, red: boolean) => {
      const roofTop = red ? [52, 53, 54] : [48, 49, 50], roofLow = red ? [64, 65, 66] : [60, 61, 62], wall = red ? [76, 78, 77] : [72, 74, 73];
      [roofTop, roofLow, wall].forEach((row, j) => row.forEach((f, i) => this.add.image(hx + i * T, hy + j * T, 'town', f).setScale(3).setOrigin(0, 0).setDepth(hy + 3 * T)));
      this.obstacles.push({ x: hx + T * 0.5, y: hy + 2.6 * T, r: 26 }, { x: hx + T * 1.5, y: hy + 2.6 * T, r: 26 }, { x: hx + T * 2.5, y: hy + 2.6 * T, r: 26 }, { x: hx + T * 1.5, y: hy + 1.5 * T, r: 50 });
    };
    house(cx - 9 * T, cy - 6 * T, false); house(cx + 5 * T, cy - 6 * T, true); house(cx - 9 * T, cy + 3 * T, true); house(cx + 6 * T, cy + 3 * T, false);
    placeProp(this, SP.wellTop, cx + 2 * T, cy - 2 * T + 6, 0xffffff); placeProp(this, SP.wellBottom, cx + 2 * T, cy - T + 6, 0xffffff); this.obstacles.push({ x: cx + 2 * T, y: cy - T, r: 22 });
    // NPC
    const c = this.ch;
    const npc = (spr: Spr, x: number, y: number, name: string, label: string, act: () => void, tint = 0xffffff) => {
      const im = this.add.image(x, y, spr.sheet, spr.frame).setScale(3).setOrigin(0.5, 0.86).setTint(tint).setDepth(y);
      this.tweens.add({ targets: im, y: y - 3, yoyo: true, repeat: -1, duration: 700 + Math.random() * 300, ease: 'Sine.InOut' });
      this.add.text(x, y - 60, name, { fontFamily: 'Galmuri11', fontSize: '12px', color: '#ffe9a8', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(y + 1);
      this.add.image(x, y + 2, 'shadow').setAlpha(0.35).setDepth(y - 1000);
      this.obstacles.push({ x, y, r: 16 });
      this.interacts.push({ x, y, r: 80, label, spr: im, act });
      return im;
    };
    const qIcon = npc(SP.ranger, cx - 3 * T, cy - 1 * T, c.npcs[0], '대화 (메인 퀘스트)', () => UI.open('quest', { npc: c.npcs[0] }));
    npc(SP.woman, cx + 4 * T, cy + 1.6 * T, c.npcs[1] + ' · 상점', '상점', () => UI.open('shop'));
    npc(SP.viking, cx - 5 * T, cy + 2 * T, '대장장이', '강화 · 재련 · 제작', () => UI.open('smith'));
    const board = placeProp(this, SP.sign, cx + 1 * T, cy + 1.5 * T, 0xffffff);
    this.add.text(board.x, board.y - 50, '의뢰 게시판', { fontFamily: 'Galmuri11', fontSize: '12px', color: '#9fe0ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(board.y + 1);
    this.interacts.push({ x: board.x, y: board.y, r: 70, label: '의뢰 게시판 (사이드 퀘스트)', act: () => UI.open('board') });
    // 포탈
    const px = cx, py = cy + 6 * T;
    const portal = this.add.image(px, py - 20, 'fx_twirl').setTint(0x9a7aff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setDepth(py);
    this.tweens.add({ targets: portal, angle: 360, repeat: -1, duration: 3000 });
    this.add.text(px, py - 80, '여행의 문', { fontFamily: 'Galmuri11', fontSize: '13px', color: '#c8b0ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(py + 1);
    this.interacts.push({ x: px, y: py, r: 80, label: '이동 (필드 · 던전 · 보스)', act: () => UI.open('travel') });
    // 훈련 인형
    const dx = cx + 9 * T, dy = cy - 1 * T;
    this.dummy = new Minor(this, dx, dy, 'town', SP.target.frame, 3, 0xffffff, 999999, '훈련 인형');
    this.dummy.receive = (h) => { if (h.src.team !== 'player') return false; const { dmg, crit } = this.player.outgoing(this.dummy!, h); this.dummy!.flashUntil = this.now + 60; this.fx.dmgText(dx, dy - 40, String(dmg), crit ? '#ffd23a' : '#fff', crit); this.player.onDealt(this.dummy!, dmg, crit, h); sfx('hit1', 0.4); this.dummyLog.push({ t: this.now, d: dmg }); if (!S.firstCombatAt) { S.firstCombatAt = this.now; } return true; };
    (this.dummy as any).onParried = () => { this.fx.label(dx, dy - 70, '반격하세요! (L)', '#30f0e0', 14); };
    this.enemies.push(this.dummy);
    this.add.text(dx, dy - 70, '훈련 인형 (DPS 측정)', { fontFamily: 'Galmuri11', fontSize: '12px', color: '#ffd9a0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(dy + 1);
    this.dummyAttackT = 4;
    // 플레이어
    this.player = new Player(this, cx, cy + 3 * T); this.player.potionBelt = Math.min(3, S.potions);
    this.addQuestMarker(qIcon);
    this.time.delayedCall(500, () => this.townIntro());
  }
  dummyAttackT = 4;
  addQuestMarker(npc: Phaser.GameObjects.Image) {
    const q = mainQuest(); const t = this.add.text(npc.x, npc.y - 82, '', { fontFamily: 'Galmuri11', fontSize: '22px', color: '#ffd23a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200000);
    const upd = () => { const qq = mainQuest(); t.setText(!qq ? '' : S.questStates.mainActive ? (S.questStates.mainProgress >= qq.need ? '?' : '…') : '!'); };
    upd(); const h = () => upd(); bus.on('quest', h); this.events.once('shutdown', () => bus.off('quest', h));
    this.tweens.add({ targets: t, y: t.y - 6, yoyo: true, repeat: -1, duration: 500 });
    void q;
  }
  townIntro() {
    const key = 'town' + this.ch.id;
    if (!S.seenStory.includes(key)) {
      S.seenStory.push(key);
      const lines = [...STORY[this.ch.id].intro];
      if (!S.tutorialDone) lines.push('[조작] WASD 이동 · 좌클릭 약공격(L) · 우클릭 강공격(H) · Space 대시 · F 패링 · 1 포션 · G 상호작용', '훈련 인형을 때려보세요. 인형이 청록색 테두리 공격을 하면 F로 패링한 뒤 바로 L로 반격!');
      UI.dialog(lines, () => { S.tutorialDone = true; persist(); });
    }
    if (pendingTraits().length) UI.toast('새 특성을 선택할 수 있습니다 (K)', '#ffd76a', 4000);
  }

  // ================= 필드 =================
  buildField() {
    const cols = 64, rows = 44; const sx = 6 * T, sy = (rows / 2) * T;
    const m = buildMap(this, this.ch.theme, cols, rows, { density: 0.07, clear: [{ x: sx, y: sy, r: 260 }] });
    this.bounds = m.bounds; this.arena = m.bounds; this.obstacles = m.obstacles; this.rects = m.rects;
    this.player = new Player(this, sx, sy); this.player.potionBelt = Math.min(3, S.potions);
    // 귀환 포탈
    const portal = this.add.image(sx - 100, sy - 20, 'fx_twirl').setTint(0x9a7aff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setDepth(sy);
    this.tweens.add({ targets: portal, angle: 360, repeat: -1, duration: 3000 });
    this.interacts.push({ x: sx - 100, y: sy, r: 70, label: `${this.ch.town}(으)로 귀환`, act: () => this.travel({ mode: 'town', ch: this.ch.id }) });
    // 초기 몬스터 그룹
    for (let i = 0; i < 7; i++) this.spawnGroup(true);
    this.setupObjectives();
    this.waveT = 6;
    UI.banner(this.ch.field, `Lv${this.areaLevel} · ${this.ch.hazard}`);
  }
  fieldMonsters() {
    const pool = FIELD_GROUPS[this.ch.id];
    const ok = pool.filter((g) => g.every((id) => MON[id].lv <= this.areaLevel + 2));
    return ok.length ? ok : [pool[0]];
  }
  randomFarPoint(minD = 500) {
    for (let i = 0; i < 40; i++) {
      const x = this.bounds.x + 80 + Math.random() * (this.bounds.w - 160), y = this.bounds.y + 80 + Math.random() * (this.bounds.h - 160);
      if (Math.hypot(x - this.player.x, y - this.player.y) < minD) continue;
      if (this.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < 50)) continue;
      return { x, y };
    }
    return { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
  }
  spawnGroup(initial = false, at?: { x: number; y: number }) {
    const g = pick(this.fieldMonsters()); const p = at || this.randomFarPoint(initial ? 450 : 700);
    const out: Enemy[] = [];
    for (const id of g) { const L = clamp(this.areaLevel + randi(-1, 1), this.ch.range[0], this.ch.range[1]); out.push(this.spawnEnemy(MON[id], p.x + (Math.random() - 0.5) * 140, p.y + (Math.random() - 0.5) * 140, L, false)); }
    // 엘리트(필드 동시 1체)
    if (!initial && S.level >= 3 && Math.random() < 0.12 && !this.enemies.some((e) => e.alive && e.isElite)) {
      const def = MON[pick(g)]; out.push(this.spawnEnemy(def, p.x, p.y, this.areaLevel, true));
    }
    return out;
  }
  setupObjectives() {
    const q = mainQuest(); const qs = S.questStates;
    if (q && qs.mainActive && q.ch === this.ch.id && qs.mainProgress < q.need) {
      const left = q.need - qs.mainProgress;
      const place = (kind: string, n: number) => { for (let i = 0; i < n; i++) this.makeObjective(kind, this.randomFarPoint(700)); };
      switch (q.type) {
        case 'markers': place('marker', left); break;
        case 'checkpoints': place('checkpoint', left); break;
        case 'clues': place('clue', left); break;
        case 'villager': place('villager', left); break;
        case 'devices': place('device', left); break;
        case 'chest': place('chest', left); break;
        case 'seals': place('seal', left); break;
        case 'elites': for (let i = 0; i < left; i++) { const p = this.randomFarPoint(800); const e = this.spawnEnemy(MON[pick(this.fieldMonsters())[0]], p.x, p.y, this.areaLevel, true); e.questTag = 'q'; this.makeArrowTarget(e); } break;
        case 'material': for (let i = 0; i < left + 2; i++) this.makeObjective('herb', this.randomFarPoint(400)); break;
      }
    }
    const sd = qs.side && SIDE_QUESTS.find((x) => x.id === qs.side!.id);
    if (sd && sd.ch === this.ch.id && qs.side!.progress < sd.need) {
      if (sd.type === 'event') { const p = this.randomFarPoint(900); this.eventZone = { x: p.x, y: p.y, r: 140, active: false, done: false, spawned: [] }; this.eventZone.g = this.add.image(p.x, p.y, 'fx_magic').setTint(0xff5070).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.5).setDepth(-3000); this.tweens.add({ targets: this.eventZone.g, angle: 360, duration: 8000, repeat: -1 }); }
      if (sd.type === 'elite') for (let i = 0; i < sd.need - qs.side!.progress; i++) { const p = this.randomFarPoint(800); const e = this.spawnEnemy(MON[pick(this.fieldMonsters())[0]], p.x, p.y, this.areaLevel, true); e.questTag = 's'; }
    }
  }
  objTargets: { x: number; y: number; alive: () => boolean }[] = [];
  makeArrowTarget(e: Actor) { this.objTargets.push({ get x() { return e.x; }, get y() { return e.y; }, alive: () => e.alive }); }
  makeObjective(kind: string, p: { x: number; y: number }) {
    const it: Interact = { x: p.x, y: p.y, r: 46, label: '', act: () => {}, kind, obj: true };
    const glow = (tint: number, sc = 0.7) => { const g = this.add.image(p.x, p.y - 10, 'fx_light').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(sc).setAlpha(0.6).setDepth(p.y - 1); this.tweens.add({ targets: g, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 }); return g; };
    const done = (type: string) => { it.done = true; it.spr?.destroy(); (it as any).g?.destroy(); questProgress(type); sfx('confirm', 0.6); this.fx.burst(p.x, p.y - 10, 0xffe070, 60, 'fx_star'); };
    switch (kind) {
      case 'marker': case 'checkpoint': case 'clue': {
        const map: Record<string, [string, string, number]> = { marker: ['필드 표식', 'markers', 0xffd76a], checkpoint: ['NPC 체크포인트', 'checkpoints', 0x9fe0ff], clue: ['단서', 'clues', 0xff9ad0] };
        const [label, type, tint] = map[kind];
        if (kind === 'checkpoint') it.spr = placeProp(this, SP.villager, p.x, p.y, 0xffffff);
        else { it.spr = this.add.image(p.x, p.y - 12, kind === 'marker' ? 'fx_symbol' : 'fx_star', undefined).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(kind === 'marker' ? 0.5 : 0.3).setDepth(p.y); this.tweens.add({ targets: it.spr, angle: 360, duration: 4000, repeat: -1 }); }
        (it as any).g = glow(tint);
        it.label = label + ' 조사'; it.act = () => done(type); break;
      }
      case 'villager': {
        it.spr = placeProp(this, pick([SP.villager, SP.woman, SP.elder]), p.x, p.y, 0xffffff); (it as any).g = glow(0x9fffa0);
        it.label = '주민 구출'; it.act = () => { UI.toast('주민: 살았다… 고마워요! 마을로 돌아갈게요.', '#9fffa0'); done('villager'); };
        for (let i = 0; i < 3; i++) this.spawnGroup(false, { x: p.x + 160, y: p.y });
        break;
      }
      case 'device': {
        it.spr = placeProp(this, SP.wellGrey, p.x, p.y, 0xd0c0ff); (it as any).g = glow(0xb090ff);
        it.label = '장치 기동 (G 길게)'; it.hold = 1.5; it.holdT = 0;
        it.act = () => done('devices'); break;
      }
      case 'chest': {
        it.spr = placeProp(this, SP.chestBig, p.x, p.y, 0xffffff); (it as any).g = glow(0xffd76a);
        const guards = [...this.spawnGroup(false, { x: p.x, y: p.y + 60 }), ...this.spawnGroup(false, { x: p.x + 80, y: p.y - 40 })];
        guards.forEach((g) => (g.homeX = p.x + (g.homeX - p.x) * 0.6));
        it.label = '열쇠 보관함'; it.act = () => {
          if (guards.some((g) => g.alive)) { UI.toast('보관함을 지키는 적을 먼저 처치하세요', '#ff9a9a'); it.done = false; return; }
          it.spr?.setFrame(SP.chestOpen.frame); it.done = true; (it as any).g?.destroy(); questProgress('chest'); sfx('door', 0.7);
          this.dropGold(p.x, p.y, goldChest(this.areaLevel)); this.dropItem(p.x, p.y, makeItem(randomSlotFor(S.level), this.areaLevel, rollRarity(1), S.classId));
        };
        break;
      }
      case 'seal': {
        const m = new Minor(this, p.x, p.y, 'dun', SP.tomb2.frame, 3.4, 0xc080ff, Math.round(this.player.atk * 8), '봉인 오브젝트', () => { questProgress('seals'); sfx('glass', 0.8); this.spawnGroup(false, { x: p.x + 80, y: p.y }); (it as any).g?.destroy(); });
        this.enemies.push(m); (it as any).g = glow(0xc080ff, 1); it.done = true; this.objTargets.push({ x: p.x, y: p.y, alive: () => m.alive });
        return;
      }
      case 'herb': {
        it.spr = placeProp(this, SP.sprout, p.x, p.y, 0x90ffb0); (it as any).g = glow(0x90ffb0, 0.5);
        it.label = '재료 채집'; it.act = () => { it.done = true; it.spr?.destroy(); (it as any).g?.destroy(); questProgress('material'); sfx('pickup', 0.6); };
        break;
      }
    }
    this.interacts.push(it);
    if (!it.done) this.objTargets.push({ x: p.x, y: p.y, alive: () => !it.done });
  }

  // ================= 던전 =================
  get dungeon() { return this.ch.dungeons[this.d.dungeon || 0]; }
  buildDungeonRoom() {
    const dg = this.dungeon; const room = this.d.room || 0; const type = dg.rooms[room];
    const cols = 26, rows = 17;
    const m = buildMap(this, this.ch.theme, cols, rows, { density: type === 'p' || type === 't' ? 0.01 : 0.025, clear: [{ x: cols * T / 2, y: rows * T / 2, r: 300 }, { x: 3 * T, y: rows * T / 2, r: 140 }] });
    this.bounds = m.bounds; this.arena = m.bounds; this.obstacles = m.obstacles; this.rects = m.rects;
    this.areaLevel = clamp(Math.max(S.level, dg.lv[0]), dg.lv[0], dg.lv[1]);
    this.player = new Player(this, 3 * T, (rows * T) / 2); this.player.potionBelt = this.d.room ? (this.registry.get('dungeonPotions') ?? 3) : 3;
    if (!this.d.room) this.registry.set('dungeonPotions', 3);
    this.roomCleared = false;
    UI.banner(`${dg.name} — ${room + 1}/${dg.rooms.length}`, type === 'e' ? '엘리트의 방' : type === 'p' ? '봉인 문양 퍼즐' : type === 't' ? '함정 회랑' : '전투');
    const mid = { x: (cols * T) / 2 + 100, y: (rows * T) / 2 };
    if (type === 'n') { this.spawnGroup(false, mid); this.spawnGroup(false, { x: mid.x + 200, y: mid.y - 150 }); this.waveT = 999; (this as any).wavesLeft = 1; }
    else if (type === 'e') { const g = this.fieldMonsters(); this.spawnEnemy(MON[g[g.length - 1][0]], mid.x + 150, mid.y, this.areaLevel, true); this.spawnGroup(false, mid); (this as any).wavesLeft = 0; }
    else if (type === 'p') this.setupPuzzle();
    else if (type === 't') { this.trapUntil = this.now + 20000; this.trapT = 1; UI.toast('20초간 함정을 피해 버티세요!', '#ffb060', 3000); }
    // 중간 체크포인트 (HP 35% 회복 1회)
    if (room === Math.floor(dg.rooms.length / 2) && !this.d.checkpointUsed) {
      const cx = 3 * T + 60, cy = (rows * T) / 2 - 90; const im = placeProp(this, SP.gargoyleG, cx, cy, 0xa0ffb0);
      const it: Interact = { x: cx, y: cy, r: 70, label: '체크포인트 (HP 35% 회복, 1회)', spr: im, act: () => { it.done = true; this.player.heal(this.player.maxHp * 0.35); this.d.checkpointUsed = true; sfx('magic', 0.6); im.setTint(0x777777); } };
      this.interacts.push(it);
    }
  }
  setupPuzzle() {
    const A = this.arena; const plates = [];
    const order = Phaser.Utils.Array.Shuffle([1, 2, 3, 4]);
    for (let i = 0; i < 4; i++) {
      const x = A.x + A.w * (0.3 + 0.18 * i), y = A.y + A.h * (i % 2 ? 0.3 : 0.7);
      const img = this.add.image(x, y, 'fx_symbol').setTint(0x8080a0).setScale(0.5).setDepth(-3000);
      const txt = this.add.text(x, y - 4, String(order[i]), { fontFamily: 'Galmuri11', fontSize: '22px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(-2999);
      plates.push({ x, y, n: order[i], on: false, img, txt });
    }
    this.puzzle = { plates, next: 1, done: false };
    UI.toast('봉인 문양을 1 → 4 순서대로 밟으세요', '#ffe9a8', 3500);
  }
  updatePuzzle() {
    const pz = this.puzzle; if (!pz || pz.done) return;
    for (const p of pz.plates) {
      if (p.on || Math.hypot(this.player.x - p.x, this.player.y - p.y) > 40) continue;
      if (p.n === pz.next) { p.on = true; pz.next++; p.img.setTint(0x80ffb0); sfx('confirm', 0.5); if (pz.next > 4) { pz.done = true; UI.toast('봉인 해제!', '#80ffb0'); this.fx.flashScreen(0x80ffb0, 150); } }
      else { sfx('error', 0.6); UI.toast('순서가 틀렸습니다 — 봉인이 반응합니다!', '#ff8080'); pz.next = 1; for (const q of pz.plates) { q.on = false; q.img.setTint(0x8080a0); } this.spawnGroup(false, { x: p.x + 120, y: p.y }); }
    }
  }
  updateTrap(dt: number) {
    if (!this.trapUntil) return;
    if (this.now >= this.trapUntil) { this.trapUntil = 0; UI.toast('함정 회랑 돌파!', '#80ffb0'); return; }
    this.trapT -= dt; if (this.trapT > 0) return; this.trapT = 1.1;
    const A = this.arena; const vertical = Math.random() < 0.5; const pos = vertical ? A.x + Math.random() * A.w : A.y + Math.random() * A.h;
    const sh = vertical ? { k: 'rect' as const, x: pos, y: A.y, a: Math.PI / 2, len: A.h, w: 70 } : { k: 'rect' as const, x: A.x, y: pos, a: 0, len: A.w, w: 70 };
    const dummy = this.trapOwner || (this.trapOwner = Object.assign(Object.create(Actor.prototype), { W: this, team: 'enemy', atk: Math.round(9 + 2 * this.areaLevel + 0.065 * this.areaLevel ** 2), x: 0, y: 0, name: '함정', alive: true }));
    this.combat.telegraph(sh, 800, {}, () => { this.combat.strike(dummy, sh, { coef: 0.9, name: '함정', kb: 200 }, 120); this.fx.shake(60, 0.003); sfx('chop', 0.4); }, dummy);
    const sh2 = { k: 'circle' as const, x: this.player.x, y: this.player.y, r: 60 };
    this.combat.telegraph(sh2, 900, {}, () => { this.combat.strike(dummy, sh2, { coef: 0.8, name: '함정' }, 120); this.fx.burst(sh2.x, sh2.y, 0xff8040, 60, 'fx_flame'); }, dummy);
  }
  trapOwner: any = null;
  roomDone() {
    if (this.roomCleared) return; this.roomCleared = true;
    const dg = this.dungeon; const room = this.d.room || 0; const last = room >= dg.rooms.length - 1;
    UI.toast(last ? '보스의 방으로 가는 문이 열렸습니다' : '방 정리 완료 — 다음 방으로', '#ffe9a8');
    sfx('door', 0.7); this.registry.set('dungeonPotions', this.player.potionBelt);
    const A = this.arena; const x = A.x + A.w - 60, y = A.y + A.h / 2;
    const door = this.add.image(x, y - 20, 'fx_twirl').setTint(last ? 0xff5070 : 0x9a7aff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7).setDepth(y);
    this.tweens.add({ targets: door, angle: 360, repeat: -1, duration: 2500 });
    this.exitDoor = { x, y, r: 70, label: last ? '보스에게 도전 (체크포인트: 완전 회복)' : '다음 방', act: () => {
      if (last) this.travel({ mode: 'boss', ch: this.ch.id, bossId: dg.boss, fromDungeon: this.d.dungeon });
      else this.travel({ ...this.d, room: room + 1 });
    } };
    this.interacts.push(this.exitDoor); this.objTargets = [{ x, y, alive: () => true }];
  }

  // ================= 보스 =================
  buildBoss() {
    const B = BOSS[this.d.bossId!]; const cols = 30, rows = 16;
    const m = buildMap(this, this.ch.theme, cols, rows, { density: 0.006, clear: [{ x: cols * T / 2, y: rows * T / 2, r: 520 }] });
    this.bounds = m.bounds; this.arena = m.bounds; this.obstacles = m.obstacles; this.rects = m.rects;
    this.player = new Player(this, (cols * T) / 2, rows * T - 3 * T); this.player.potionBelt = 3; // 보스 진입 직전 완전 회복 + 포션 3개
    this.player.ult = S.level >= 20 ? 100 : 0; this.player.mp = this.player.stats.mpMax;
    this.boss = new Boss(this, B, (cols * T) / 2, 6 * T); this.enemies.push(this.boss);
    const first = !(S.clearedBosses[B.id] > 0) && !this.d.retry;
    this.boss.stateEnd = this.now + (first ? 2600 : 1000);
    this.areaLevel = B.lv;
    UI.bossIntro(B.name, B.title, first ? B.intro : '');
    sfx('boss', 0.7);
    this.run.start = this.now;
  }
  onBossPattern(_b: Boss, p: PatternDef) { this.bossPatternName = p.name; }
  onBossPhase(b: Boss, ph: number, text: string) { this.bossPhaseText = text; UI.banner(`페이즈 ${ph + 1}`, text, 1600); this.fx.flashScreen(b.B.tint, 200); }
  onBossStagger(_b: Boss) { this.bossPatternName = '그로기'; }
  onBossDefeated(b: Boss) {
    if (this.ended) return; this.ended = true;
    const B = b.B; const first = !(S.clearedBosses[B.id] > 0);
    const xp = Math.round(monsterXp(B.lv) * (B.role === 'final' ? 25 : 15) * xpLevelMod(S.level, B.lv));
    gainXp(xp);
    const loot = grantBossLoot(B.id, B.lv, B.role, B.ch);
    questProgress('boss', 1, B.id);
    if (B.role === 'final' && B.ch === S.unlockedChapter && B.ch < 5) { S.unlockedChapter = B.ch + 1; loot.lines.push(`새 챕터 해금: ${CHAPTERS[B.ch].name}`); }
    persist(); sfx('victory', 0.8);
    const time = (this.now - this.run.start) / 1000;
    const done = () => {
      if (B.role === 'final' && first) {
        const outro = STORY[B.ch].outro;
        UI.dialog(outro, () => { if (B.ch === 5) UI.open('ending'); else this.travel({ mode: 'town', ch: Math.min(5, B.ch + 1) }); });
      } else this.travel({ mode: 'town', ch: B.ch });
    };
    UI.results({ title: `${B.name} 격파!`, time, rank: this.player.combo.best, parries: this.run.parries, hurt: this.run.hurt, xp, lines: loot.lines, items: loot.items, onClose: done });
  }

  // ================= 이벤트 =================
  onEnemyKilled(e: Enemy) {
    this.run.kills++;
    if (e.noLoot) return;
    const L = e.level; const xp = Math.round(monsterXp(L) * (e.isElite ? 6 : 1) * xpLevelMod(S.level, L) * e.xpMul);
    if (S.level < 50) { gainXp(xp); this.fx.label(e.x, e.y - 50, `+${xp} XP`, '#a8d8ff', 12, 900); }
    this.dropGold(e.x, e.y, Math.round((e.isElite ? goldElite(L) : goldNormal(L)) * (0.8 + Math.random() * 0.4)));
    if (Math.random() < (e.isElite ? 0.22 : 0.04)) this.dropItem(e.x, e.y, makeItem(randomSlotFor(S.level), L, rollRarity(0, L >= 45 && e.isElite), S.classId));
    if (e.isElite && Math.random() < 0.35) this.dropPick('ess', e.x, e.y, 1);
    if (!e.isElite && Math.random() < 0.25 && Math.random() < 0.3) this.dropPick('ess', e.x, e.y, 1);
    if (Math.random() < 0.03) this.dropPick('potion', e.x, e.y, 1);
    const q = mainQuest();
    if (q && S.questStates.mainActive && q.type === 'material' && q.ch === this.ch.id && S.questStates.mainProgress < q.need && Math.random() < 0.6) this.dropPick('qmat', e.x, e.y, 1);
    const sd = S.questStates.side && SIDE_QUESTS.find((x) => x.id === S.questStates.side!.id);
    if (sd && sd.ch === this.ch.id) {
      if (sd.type === 'material' && Math.random() < 0.4) this.dropPick('smat', e.x, e.y, 1);
      if (sd.type === 'kill' && !e.isElite) questProgress('kill');
    }
    if (e.isElite) questProgress('elites');
    if (this.eventZone?.active) { this.eventZone.spawned = this.eventZone.spawned.filter((x) => x.alive); }
  }
  dropGold(x: number, y: number, amt: number) { const n = Math.min(5, Math.max(1, Math.floor(amt / 15))); for (let i = 0; i < n; i++) this.dropPick('gold', x, y, Math.ceil(amt / n)); }
  dropItem(x: number, y: number, it: Item) {
    const ic = slotIcon(it.slot, it.cls);
    const p = this.dropPick('item', x, y, 1, ic); p.item = it;
    p.glow = this.add.image(p.x, p.y, 'fx_light').setTint(RAR[it.rarity].hex).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.7).setDepth(p.y - 1);
    if (it.rarity !== 'common' && it.rarity !== 'uncommon') { sfx('bell', 0.4); this.fx.label(x, y - 60, RAR[it.rarity].name + '!', RAR[it.rarity].color, 14); }
  }
  dropPick(kind: Pickup['kind'], x: number, y: number, amount: number, spr?: Spr) {
    const s = spr || { gold: SP.coin, ess: SP.vialB, qmat: SP.sprout, smat: SP.sack, potion: SP.potionR, item: SP.sword }[kind];
    const a = Math.random() * 6.28, d = 20 + Math.random() * 40;
    const img = this.add.image(x, y, s.sheet, s.frame).setScale(kind === 'gold' ? 1.6 : 2.2).setOrigin(0.5, 0.8);
    if (kind === 'ess') img.setTint(0xa0c8ff); if (kind === 'qmat') img.setTint(0x90ffb0); if (kind === 'smat') img.setTint(0xffd0a0);
    const p: Pickup = { kind, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, img, amount, born: this.now };
    this.tweens.add({ targets: img, x: p.x, duration: 300 }); this.tweens.add({ targets: img, y: { from: y - 10, to: p.y }, duration: 300, ease: 'Bounce.Out' });
    img.setDepth(p.y); this.pickups.push(p); return p;
  }
  updatePickups(dt: number) {
    const P = this.player;
    for (const p of this.pickups) {
      if (this.now - p.born < 350) continue;
      const d = Math.hypot(P.x - p.x, P.y - p.y);
      if (p.kind !== 'item' && d < 140) { const a = Math.atan2(P.y - p.y, P.x - p.x); const sp = 420 * dt; p.x += Math.cos(a) * sp; p.y += Math.sin(a) * sp; p.img.setPosition(p.x, p.y); }
      if (d < (p.kind === 'item' ? 34 : 22)) this.collect(p);
    }
    this.pickups = this.pickups.filter((p) => p.img.active);
  }
  collect(p: Pickup) {
    p.img.destroy(); p.glow?.destroy();
    switch (p.kind) {
      case 'gold': S.gold = Math.min(9999999, S.gold + p.amount); sfx('coin', 0.25); break;
      case 'ess': S.essence[this.ch.id] += p.amount; sfx('pickup', 0.5); UI.toast(`${this.ch.essence} +${p.amount}`, '#a0c8ff', 1200); break;
      case 'potion': S.potions++; if (this.player.potionBelt < 3) this.player.potionBelt++; sfx('pickup', 0.5); UI.toast('HP 포션 +1', '#ff9a9a', 1200); break;
      case 'qmat': questProgress('material'); sfx('pickup', 0.5); break;
      case 'smat': questProgress('smat'); sfx('pickup', 0.5); break;
      case 'item': { const it = p.item!; addItem(it); sfx('pickup', 0.6); UI.toast(`획득: ${RAR[it.rarity].name} ${it.name} (iLv${it.itemLevel})`, RAR[it.rarity].color, 2200); break; }
    }
  }
  onLevelUp(L: number) {
    this.player.refreshStats(true); this.player.mp = this.player.stats.mpMax;
    this.fx.burst(this.player.x, this.player.y - 20, 0xffe070, 120, 'fx_light'); this.fx.label(this.player.x, this.player.y - 80, `LEVEL UP! Lv${L}`, '#ffe070', 22, 1600);
    sfx('levelup', 0.7);
    const c = cls(); const msgs: string[] = [];
    if (L === c.Q.unlock) msgs.push(`Q 스킬 [${c.Q.name}] 해금`); if (L === c.E.unlock) msgs.push(`E 스킬 [${c.E.name}] 해금`); if (L === c.R.unlock) msgs.push(`궁극기 R [${c.R.name}] 해금`);
    if ([12, 24, 36, 48].includes(L)) msgs.push('특성 슬롯 개방 — K 키로 선택');
    const slots: Record<number, string> = { 4: '장갑', 6: '신발', 8: '반지1', 10: '유물', 16: '반지2', 20: '목걸이' }; if (slots[L]) msgs.push(`${slots[L]} 슬롯 개방`);
    for (const m of msgs) UI.toast(m, '#ffe070', 3500);
    persist();
  }
  onPlayerDeath() {
    if (this.ended) return; this.ended = true;
    this.combat.clearEnemy();
    this.time.delayedCall(900, () => {
      if (this.mode === 'boss') UI.death({ cause: this.player.lastHitBy, boss: this.boss?.B.name, hpLeft: this.boss ? this.boss.hp / this.boss.maxHp : 0,
        retry: () => this.travel({ ...this.d, retry: true }), town: () => this.travel({ mode: 'town', ch: this.ch.id }) });
      else UI.death({ cause: this.player.lastHitBy, town: () => this.travel({ mode: 'town', ch: this.ch.id }) });
    });
  }
  travel(d: WorldData) {
    if ((this as any).leaving) return; (this as any).leaving = true;
    UI.close(true); persist();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(d));
  }
  tryInteract() {
    const P = this.player; if (!P?.alive || UI.isOpen()) return;
    const it = this.nearestInteract(); if (!it || it.hold) return;
    it.act();
  }
  nearestInteract() {
    const P = this.player; let best: Interact | null = null, bd = 1e9;
    for (const it of this.interacts) { if (it.done) continue; const d = Math.hypot(P.x - it.x, P.y - it.y); if (d < it.r && d < bd) { bd = d; best = it; } }
    return best;
  }

  // ================= 업데이트 =================
  update(_t: number, deltaMs: number) {
    const real = this.time.now;
    this.pollPad();
    if (UI.isOpen() || this.frozen) { this.pressed = []; this.drawUi(); return; }
    let scale = 1;
    if (real < this.hitstopUntil) scale = 0.05; else if (real < this.slowUntil) scale = this.slowScale;
    this.ts = scale; this.tweens.timeScale = scale; this.time.timeScale = scale;
    // 마우스 홀드 시 L 연타 입력
    const ptr = this.input.activePointer;
    if (ptr.leftButtonDown() && real - this.lmbHeldSince > 200 && real - this.lastAutoL > 150) { this.pressed.push('L'); this.lastAutoL = real; }
    // 고정 스텝 60Hz (렌더 프레임 가변)
    this.acc += Math.min(0.1, deltaMs / 1000) * scale;
    let steps = 0;
    while (this.acc >= DT && steps < 6) { this.step(DT); this.acc -= DT; steps++; }
    this.drawUi();
  }
  saveT = 0;
  step(dt: number) {
    this.now += dt * 1000;
    S.playTimeSec += dt; this.saveT += dt; if (this.saveT > 30) { this.saveT = 0; persist(); }
    const aim = this.aimPoint(); const dir = this.inputDir();
    const inp: InputState = { mx: dir.x, my: dir.y, aimX: aim.x, aimY: aim.y, pressed: this.pressed };
    this.player.update(dt, inp); this.pressed = [];
    for (const e of this.enemies) (e as any).update(dt);
    // 몹 겹침 방지 12px 분리
    const alive = this.enemies.filter((e) => e.alive && !(e instanceof Minor));
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01; const min = (a.r + b.r) * 0.55 + 12;
      if (d < min) { const push = (min - d) / 2; if (!a.isBoss) this.moveActor(a, (-dx / d) * push, (-dy / d) * push); if (!b.isBoss) this.moveActor(b, (dx / d) * push, (dy / d) * push); }
    }
    this.combat.update(dt);
    this.updatePickups(dt);
    this.enemies = this.enemies.filter((e) => e.alive || e === this.boss);
    if (this.mode === 'field') this.updateField(dt);
    if (this.mode === 'dungeon') this.updateDungeon(dt);
    if (this.mode === 'town') this.updateTown(dt);
    // 장치 홀드 상호작용
    const it = this.nearestInteract();
    if (it?.hold) { if (this.keys.G.isDown || this.pad()?.buttons[0]?.pressed) { it.holdT = (it.holdT || 0) + dt; if (it.holdT >= it.hold) { it.done = true; it.act(); } } else it.holdT = 0; }
    // 접촉형 목표 (표식/단서/주민 등)
    for (const o of this.interacts) if (o.obj && !o.done && !o.hold && o.kind !== 'chest' && Math.hypot(this.player.x - o.x, this.player.y - o.y) < 40) o.act();
  }
  updateTown(dt: number) {
    // 훈련 인형: 근처에 있으면 주기적으로 패링 가능 공격
    if (!this.dummy) return;
    this.dummy.update();
    const d = Math.hypot(this.player.x - this.dummy.x, this.player.y - this.dummy.y);
    this.dummyAttackT -= dt;
    if (d < 160 && this.dummyAttackT <= 0) {
      this.dummyAttackT = 3.2; const a = Math.atan2(this.player.y - this.dummy.y, this.player.x - this.dummy.x);
      const sh = { k: 'cone' as const, x: this.dummy.x, y: this.dummy.y, r: 150, a, half: 0.7 };
      const dummyAtk = Object.assign(Object.create(Actor.prototype), { W: this, team: 'enemy', atk: 1, x: this.dummy.x, y: this.dummy.y, name: '훈련 인형', alive: true, onParried: () => this.fx.label(this.dummy!.x, this.dummy!.y - 70, '좋아요! 지금 L로 반격!', '#30f0e0', 14) });
      this.combat.telegraph(sh, 800, { parry: true }, () => { this.combat.strike(dummyAtk, sh, { coef: 0.01, parryable: true, name: '훈련 인형', kb: 120 }, 120); this.fx.slash(this.dummy!.x, this.dummy!.y - 20, a, 120, 0xffd9a0); }, dummyAtk);
    }
    this.dummyLog = this.dummyLog.filter((l) => this.now - l.t < 5000);
    // 마을에서는 체력/포션 회복
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.2 * dt);
    this.player.potionBelt = Math.min(3, S.potions);
  }
  dummyDps() { if (!this.dummyLog.length) return 0; const span = Math.max(1, (this.now - this.dummyLog[0].t) / 1000); return Math.round(this.dummyLog.reduce((a, l) => a + l.d, 0) / span); }
  updateField(dt: number) {
    this.waveT -= dt;
    const aliveN = this.enemies.filter((e) => e.alive && e instanceof Enemy && !e.isElite).length;
    if (this.waveT <= 0) { this.waveT = 6 + Math.random() * 4; if (aliveN < 22) this.spawnGroup(); }
    // 비전투 시 포션 벨트 자동 보충
    if (!this.player.inCombat && this.player.potionBelt < Math.min(3, S.potions)) this.player.potionBelt = Math.min(3, S.potions);
    const ez = this.eventZone;
    if (ez && !ez.done) {
      if (!ez.active && Math.hypot(this.player.x - ez.x, this.player.y - ez.y) < ez.r) {
        ez.active = true; UI.toast('균열 이벤트 발생! 모든 적을 처치하세요', '#ff7090', 3000); sfx('glitch', 0.8);
        for (let i = 0; i < 4; i++) ez.spawned.push(...this.spawnGroup(false, { x: ez.x + Math.cos(i * 1.57) * 200, y: ez.y + Math.sin(i * 1.57) * 200 }));
        ez.spawned.forEach((e) => (e.state = 'chase'));
      }
      if (ez.active && ez.spawned.every((e) => !e.alive)) { ez.done = true; ez.g?.destroy(); questProgress('event'); UI.toast('균열 이벤트 완료!', '#9fe0ff'); this.dropGold(ez.x, ez.y, goldChest(this.areaLevel) * 2); }
    }
  }
  updateDungeon(dt: number) {
    const type = this.dungeon.rooms[this.d.room || 0];
    this.updatePuzzle(); this.updateTrap(dt);
    if (this.roomCleared) return;
    const aliveN = this.enemies.filter((e) => e.alive).length;
    if (type === 'n' && aliveN === 0 && (this as any).wavesLeft > 0) { (this as any).wavesLeft--; const A = this.arena; this.spawnGroup(false, { x: A.x + A.w * 0.7, y: A.y + A.h * 0.5 }).forEach((e) => (e.state = 'chase')); UI.toast('추가 적 출현!', '#ff9a9a', 1500); return; }
    if ((type === 'n' || type === 'e') && aliveN === 0) this.roomDone();
    if (type === 'p' && this.puzzle?.done && aliveN === 0) this.roomDone();
    if (type === 't' && !this.trapUntil) this.roomDone();
  }

  drawUi() {
    // 체력바 (피격된 몬스터)
    const g = this.gBars; g.clear();
    for (const e of this.enemies) {
      if (!e.alive || e.isBoss || e === this.dummy) continue;
      if (!(e instanceof Minor) && this.now - (e as Enemy).lastHurt > 4000 && !e.isElite) continue;
      const w = e.isElite ? 60 : 40, x = e.x - w / 2, y = e.y - e.r * 2.9;
      g.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 6); g.fillStyle(e.isElite ? 0xffb030 : 0xff4a4a, 1).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
      if (e.isElite) { g.fillStyle(0xffe070, 1).fillRect(x, y + 5, w * Math.max(0, e.poise / e.maxPoise), 2); }
    }
    // 상호작용 안내
    const it = this.player?.alive ? this.nearestInteract() : null;
    if (it && !(it.obj && !it.hold && it.kind !== 'chest')) {
      const holdTxt = it.hold ? ` ${Math.round(((it.holdT || 0) / it.hold) * 100)}%` : '';
      this.promptText.setText(`[G] ${it.label}${holdTxt}`).setPosition(it.x, it.y - 90).setVisible(true);
    } else this.promptText.setVisible(false);
    // 목표 화살표 대상
    this.objTargets = this.objTargets.filter((o) => o.alive());
    let best: { x: number; y: number } | null = null, bd = 1e9;
    for (const o of this.objTargets) { const d = Math.hypot(o.x - this.player.x, o.y - this.player.y); if (d < bd) { bd = d; best = { x: o.x, y: o.y }; } }
    if (!best && this.eventZone && !this.eventZone.done) best = { x: this.eventZone.x, y: this.eventZone.y };
    this.arrowTarget = best;
  }
}
