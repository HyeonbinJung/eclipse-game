// HUD (기획서 12장): 좌상 HP/자원, 하단 Q/E/R, 우상 미니맵, 좌측 콤보 랭크, 상단 보스 HP·Poise·페이즈
import Phaser from 'phaser';
import { resolveBody } from '../game/look';
import { CHAR_W, CHAR_H } from '../data/chars';
import type { World } from './World';
import { S, mainQuest, cls } from '../core/state';
import { xpToNext } from '../data/formulas';
import { SIDE_QUESTS } from '../data/world';

const RANK_COL: Record<string, string> = { D: '#8a8fa0', C: '#7fd0ff', B: '#7dff9a', A: '#ffd23a', S: '#ff5aa0' };
const F = 'Galmuri11';

export class Hud extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics; t: Record<string, Phaser.GameObjects.Text> = {}; icons: Phaser.GameObjects.Image[] = [];
  portrait!: Phaser.GameObjects.Image; portraitKey = ''; arrow!: Phaser.GameObjects.Image; vignette!: Phaser.GameObjects.Image;
  constructor() { super('Hud'); }
  txt(k: string, x: number, y: number, size = 13, color = '#fff', origin = 0) {
    this.t[k] = this.add.text(x, y, '', { fontFamily: F, fontSize: size + 'px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(origin, origin === 0.5 ? 0.5 : 0); return this.t[k];
  }
  create() {
    this.vignette = this.add.image(640, 360, 'vignette').setDisplaySize(1280, 720).setAlpha(0.75);
    this.g = this.add.graphics();
    this.portrait = this.add.image(44, 44, 'dun', 96).setScale(3);
    this.txt('lv', 18, 70, 12, '#ffe9a8'); this.txt('hp', 86, 18, 12); this.txt('res', 86, 40, 11, '#cfe0ff'); this.txt('ult', 86, 58, 11, '#ffe070');
    this.txt('gold', 18, 92, 12, '#ffd76a'); this.txt('area', 18, 112, 12, '#c8c8d8');
    this.txt('rank', 34, 300, 54, '#fff', 0.5).setFontStyle('bold'); this.txt('rankScore', 34, 336, 11, '#ddd', 0.5);
    this.txt('boss', 640, 14, 16, '#ffdddd', 0.5); this.txt('bossPat', 640, 70, 13, '#ffcf9a', 0.5); this.txt('bossPh', 640, 88, 11, '#c8b0ff', 0.5);
    this.txt('quest', 1262, 160, 12, '#fff').setOrigin(1, 0).setAlign('right').setWordWrapWidth(300);
    this.txt('dps', 640, 120, 13, '#ffd9a0', 0.5);
    this.txt('help', 1262, 700, 11, '#9aa0b8').setOrigin(1, 1).setText('F1 도움말 · I 가방 · J 퀘스트 · K 특성 · ESC 메뉴');
    const keys = ['L', 'H', 'Space', 'F', 'Q', 'E', 'R', '1'];
    keys.forEach((k, i) => { this.txt('k' + i, 0, 0, 10, '#fff', 0.5); this.txt('cd' + i, 0, 0, 12, '#fff', 0.5); });
    this.arrow = this.add.image(0, 0, 'fx_trace').setTint(0xffe070).setScale(0.35).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.scale.on('resize', () => this.cameras.main.setSize(this.scale.width, this.scale.height));
  }
  get W(): World | null { const w = this.scene.get('World') as World; return w && w.player && this.scene.isActive('World') ? w : null; }

  update() {
    const W = this.W; const g = this.g; g.clear();
    for (const k in this.t) if (k !== 'help') this.t[k].setText('');
    if (!W || !S) return;
    const P = W.player; const c = cls(); const n = W.now;
    const b = resolveBody(W, S.look, c.id); const pk = b.tex + b.frame;
    if (this.portraitKey !== pk) {
      this.portraitKey = pk; this.portrait.setTexture(b.tex, b.frame).setTint(b.tint);
      if (b.tex === 'dun') this.portrait.setCrop().setOrigin(0.5).setScale(3);
      else this.portrait.setCrop(0, 0, CHAR_W, 32).setOrigin(0.5, 16 / CHAR_H).setScale(48 / 32);
    }
    // ── 좌상 HP/자원 ──
    g.fillStyle(0x0b0f1c, 0.75).fillRoundedRect(8, 8, 290, 125, 8); g.lineStyle(1, 0x3a4060, 1).strokeRoundedRect(8, 8, 290, 125, 8);
    const bar = (x: number, y: number, w: number, h: number, f: number, col: number, bg = 0x241a22) => { g.fillStyle(bg, 1).fillRect(x, y, w, h); g.fillStyle(col, 1).fillRect(x, y, w * Phaser.Math.Clamp(f, 0, 1), h); g.lineStyle(1, 0x000000, 0.8).strokeRect(x, y, w, h); };
    bar(84, 16, 204, 18, P.hp / P.maxHp, P.hp / P.maxHp < 0.3 ? 0xff3040 : 0xe0454a);
    this.t.hp.setText(`${Math.ceil(P.hp)} / ${P.maxHp}`);
    const resF = c.id === 'mage' ? P.mp / P.stats.mpMax : P.res / 100;
    bar(84, 40, 204, 12, resF, c.id === 'mage' ? 0x5a8cff : 0xffa040); this.t.res.setText(`${c.resName} ${Math.floor(c.id === 'mage' ? P.mp : P.res)}`);
    if (S.level >= 20) { bar(84, 58, 204, 10, P.ult / 100, P.ult >= 100 ? 0xfff070 : 0xd0a020); this.t.ult.setText(P.ult >= 100 ? '궁극기 준비! [R]' : `궁극기 ${Math.floor(P.ult)}%`); }
    const xpF = S.level >= 50 ? 1 : S.currentXp / xpToNext(S.level); bar(18, 84, 270, 4, xpF, 0x6ab0ff, 0x1a2030);
    this.t.lv.setText(`Lv ${S.level}  ${S.name || ''}`).setPosition(18, 68);
    this.t.gold.setText(`G ${S.gold.toLocaleString()}   정수 ${S.essence[W.ch.id]}   포션 ${P.potionBelt}/${W.mode === 'dungeon' || W.mode === 'boss' ? 3 : S.potions}`);
    const modeName = W.mode === 'town' ? W.ch.town : W.mode === 'field' ? `${W.ch.field} (Lv${W.areaLevel})` : W.mode === 'dungeon' ? W.dungeon.name : W.mode === 'pvp' ? '투기장' : W.boss?.B.name || '';
    this.t.area.setText(`${W.ch.name} · ${modeName}`);
    // 상태이상 아이콘(텍스트)
    const sts: string[] = []; const st = P.st;
    if (st.poison && st.poison.until > n) sts.push(`독×${st.poison.stacks}`); if (st.burn && st.burn.until > n) sts.push(`화상×${st.burn.stacks}`); if (st.slow && st.slow.until > n) sts.push('둔화');
    if (sts.length) this.t.area.setText(this.t.area.text + '   [' + sts.join(' ') + ']');
    // ── 콤보 랭크 ──
    const rank = P.combo.rank(); const sc = P.combo.score;
    if (sc > 0) {
      this.t.rank.setText(rank).setColor(RANK_COL[rank]).setPosition(48, 300).setScale(1 + (n - P.combo.lastHit < 120 ? 0.15 : 0));
      this.t.rankScore.setText(`COMBO ${Math.floor(sc)}`).setPosition(48, 336);
      const next = [80, 180, 320, 500, 700].find((v) => v > sc) || 700, prev = [0, 80, 180, 320, 500].reverse().find((v) => v <= sc) || 0;
      g.fillStyle(0x000000, 0.6).fillRect(18, 348, 60, 5); g.fillStyle(Phaser.Display.Color.HexStringToColor(RANK_COL[rank]).color, 1).fillRect(18, 348, 60 * ((sc - prev) / Math.max(1, next - prev)), 5);
    }
    // ── 스킬 바 ──
    const slots: { k: string; name: string; cdKey?: string; lock?: boolean; avail?: boolean; extra?: string }[] = [
      { k: 'L', name: '약공격' }, { k: 'H', name: '강공격' }, { k: 'Space', name: '대시', cdKey: 'D' }, { k: 'F', name: '패링', cdKey: 'F' },
      { k: 'Q', name: c.Q.name, cdKey: 'Q', lock: S.level < (c.Q.unlock || 0) }, { k: 'E', name: c.E.name, cdKey: 'E', lock: S.level < (c.E.unlock || 0) },
      { k: 'R', name: c.R.name, lock: S.level < 20, avail: P.ult >= 100 }, { k: '1', name: '포션', cdKey: 'POT', extra: String(P.potionBelt) },
    ];
    const bw = 58, gap = 8, total = slots.length * (bw + gap) - gap, x0 = 640 - total / 2, y0 = 640;
    slots.forEach((s, i) => {
      const x = x0 + i * (bw + gap);
      g.fillStyle(0x0b0f1c, 0.8).fillRoundedRect(x, y0, bw, bw, 6);
      const ready = !s.lock && (!s.cdKey || P.cdReady(s.cdKey)) && (s.k !== 'R' || s.avail);
      g.lineStyle(2, s.k === 'R' && s.avail ? 0xfff070 : ready ? 0x7a86b8 : 0x3a3f55, 1).strokeRoundedRect(x, y0, bw, bw, 6);
      if (s.cdKey && !P.cdReady(s.cdKey)) {
        const left = (P.cds[s.cdKey] - n) / (P.cdDur[s.cdKey] || 1);
        g.fillStyle(0x000000, 0.6).fillRect(x + 2, y0 + 2 + (bw - 4) * (1 - left), bw - 4, (bw - 4) * left);
        this.t['cd' + i].setText(((P.cds[s.cdKey] - n) / 1000).toFixed(1)).setPosition(x + bw / 2, y0 + bw / 2);
      } else if (s.lock) this.t['cd' + i].setText('🔒').setPosition(x + bw / 2, y0 + bw / 2);
      else if (s.extra) this.t['cd' + i].setText(s.extra).setPosition(x + bw / 2, y0 + bw / 2 + 4);
      else this.t['cd' + i].setText(s.name.length > 4 ? s.name.slice(0, 4) : s.name).setPosition(x + bw / 2, y0 + bw / 2 + 4).setFontSize(11);
      this.t['k' + i].setText(s.k).setPosition(x + bw / 2, y0 - 9);
    });
    // 체인 표시
    if (P.chain.length && n < P.chainUntil + 50) { const s = P.chain.join(' - '); this.t.dps.setText(s).setPosition(640, 612).setColor('#ffe9a8'); }
    // ── 보스 바 ──
    const B = W.boss;
    if (B && W.mode === 'boss' && B.fsm !== 'DEAD') {
      const bw2 = 620, bx = 640 - bw2 / 2, by = 36;
      g.fillStyle(0x0b0f1c, 0.8).fillRoundedRect(bx - 10, 6, bw2 + 20, 76, 8);
      bar(bx, by, bw2, 18, B.hp / B.maxHp, 0xc02838, 0x2a1018);
      for (const ph of B.B.phases) { g.fillStyle(0xffffff, 0.9).fillRect(bx + bw2 * ph.at - 1, by - 3, 2, 24); }
      bar(bx, by + 22, bw2, 6, B.poise / B.maxPoise, B.fsm === 'STAGGER' ? 0xffffff : 0xffd040, 0x2a2410);
      this.t.boss.setText(`${B.B.name}  ·  ${Math.ceil(B.hp).toLocaleString()} / ${B.maxHp.toLocaleString()}`).setPosition(640, 22);
      if (S.settings.patternName && W.bossPatternName && (B.fsm === 'TELEGRAPH' || B.fsm === 'ATTACK' || B.fsm === 'STAGGER')) this.t.bossPat.setText(W.bossPatternName).setPosition(640, 98);
      this.t.bossPh.setText(`페이즈 ${B.phase + 1}/${B.B.phases.length + 1}${W.bossPhaseText ? ' · ' + W.bossPhaseText : ''}`).setPosition(640, 116);
    }
    // ── PvP 상대 ──
    const R = W.remote;
    if (R && W.mode === 'pvp') {
      const bw2 = 520, bx = 640 - bw2 / 2, by = 36;
      g.fillStyle(0x0b0f1c, 0.8).fillRoundedRect(bx - 10, 6, bw2 + 20, 62, 8);
      bar(bx, by, bw2, 18, R.hp / R.maxHp, 0xd03050, 0x2a1018);
      this.t.boss.setText(`${R.snap.name} (${R.snap.user || ''}) · Lv${R.snap.level} · 레이팅 ${R.snap.rating ?? '-'}`).setPosition(640, 22);
      const left = Math.max(0, (W.pvpEnd - Math.max(n, W.pvpStart)) / 1000);
      this.t.bossPat.setText(`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`).setPosition(640, 74).setColor(left < 15 ? '#ff7080' : '#ffffff');
    }
    if (W.mode === 'town' && W.dummyLog.length) this.t.dps.setText(`훈련 인형 DPS ${W.dummyDps()}`).setPosition(640, 120).setColor('#ffd9a0');
    // ── 미니맵 ──
    const mw = 200, mh = 132, mx = 1272 - mw, my = 8; const A = W.bounds;
    g.fillStyle(0x0b0f1c, 0.75).fillRoundedRect(mx - 4, my - 4, mw + 8, mh + 8, 6); g.lineStyle(1, 0x3a4060, 1).strokeRect(mx, my, mw, mh);
    const sx = mw / A.w, sy = mh / A.h; const mp = (x: number, y: number) => [mx + (x - A.x) * sx, my + (y - A.y) * sy];
    for (const e of W.enemies) if (e.alive) { const [x, y] = mp(e.x, e.y); g.fillStyle(e.isBoss ? 0xff3050 : e.isElite ? 0xffb030 : 0xff6a6a, 1).fillRect(x - (e.isBoss ? 3 : 1.5), y - (e.isBoss ? 3 : 1.5), e.isBoss ? 6 : 3, e.isBoss ? 6 : 3); }
    for (const it of W.interacts) if (!it.done) { const [x, y] = mp(it.x, it.y); g.fillStyle(it.obj ? 0xffe070 : 0x9fe0ff, 1).fillCircle(x, y, 3); }
    if (W.eventZone && !W.eventZone.done) { const [x, y] = mp(W.eventZone.x, W.eventZone.y); g.lineStyle(2, 0xff5070, 1).strokeCircle(x, y, 5); }
    { const [x, y] = mp(P.x, P.y); g.fillStyle(0x7dff9a, 1).fillCircle(x, y, 3.5); }
    // ── 퀘스트 추적 ──
    const q = mainQuest(); const lines: string[] = [];
    if (q) { if (S.questStates.mainActive) lines.push(`◆ ${q.name}`, `   ${q.cond} (${S.questStates.mainProgress}/${q.need})${S.questStates.mainProgress >= q.need ? ' ✔ 마을에 보고' : ''}`); else lines.push(`◇ 다음 메인: Lv${q.lv} ${q.name.split(' — ')[1]}`, '   마을 NPC에게 수락'); }
    const sd = S.questStates.side; if (sd) { const def = SIDE_QUESTS.find((x) => x.id === sd.id)!; lines.push(`◆ ${def.id} ${def.cond} (${sd.progress}/${def.need})`); }
    this.t.quest.setText(lines.join('\n')).setPosition(1268, 152);
    // ── 목표 화살표 ──
    const tgt = W.arrowTarget; const cam = W.cameras.main;
    if (tgt && W.mode !== 'town') {
      const sxp = (tgt.x - cam.worldView.x), syp = (tgt.y - cam.worldView.y);
      if (sxp < 0 || syp < 0 || sxp > 1280 || syp > 720) {
        const a = Math.atan2(syp - 360, sxp - 640); const ax = 640 + Math.cos(a) * 300, ay = 360 + Math.sin(a) * 270;
        this.arrow.setVisible(true).setPosition(ax, ay).setRotation(a).setAlpha(0.6 + 0.4 * Math.sin(n / 150));
      } else this.arrow.setVisible(false);
    } else this.arrow.setVisible(false);
    // 저체력 경고 비네트
    this.vignette.setTint(P.hp / P.maxHp < 0.3 && !S.settings.photosensitive ? 0xff4040 : 0xffffff);
  }
}
