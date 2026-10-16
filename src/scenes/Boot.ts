import Phaser from 'phaser';
import { SFX_KEYS } from '../audio/audio';
import { CHAR_SHEET, CHAR_SRC, CHAR_W, CHAR_H } from '../data/chars';
import { MON_SHEET, MON_SRC, MON_CELL } from '../data/monsters';
import { BOSS_SHEET, BOSS_SRC, BOSS_CELL } from '../data/bosses';
import { TERRAIN_KEY, TERRAIN_SRC, TERRAIN_PX, PROPS_KEY, PROPS_SRC, PROPS_W, PROPS_H } from '../game/terrain';

export const FX_KEYS = ['slash_02:fx_slash', 'spark_01:fx_spark', 'star_04:fx_star', 'circle_05:fx_circle', 'smoke_04:fx_smoke', 'flame_03:fx_flame', 'magic_03:fx_magic', 'twirl_01:fx_twirl', 'light_01:fx_light', 'scorch_01:fx_scorch', 'trace_01:fx_trace', 'symbol_02:fx_symbol'];

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.graphics(); const w = this.scale.width, h = this.scale.height;
    this.load.on('progress', (p: number) => { bar.clear(); bar.fillStyle(0x222838).fillRect(w / 2 - 200, h / 2, 400, 10); bar.fillStyle(0xffa040).fillRect(w / 2 - 200, h / 2, 400 * p, 10); });
    this.load.spritesheet('dun', 'assets/img/dungeon.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('town', 'assets/img/town.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet(CHAR_SHEET, CHAR_SRC, { frameWidth: CHAR_W, frameHeight: CHAR_H }); // 없으면 기존 의상으로 대체
    this.load.spritesheet(MON_SHEET, MON_SRC, { frameWidth: MON_CELL, frameHeight: MON_CELL });
    this.load.spritesheet(BOSS_SHEET, BOSS_SRC, { frameWidth: BOSS_CELL, frameHeight: BOSS_CELL }); // 없으면 기존 스프라이트로 대체
    this.load.spritesheet(TERRAIN_KEY, TERRAIN_SRC, { frameWidth: TERRAIN_PX, frameHeight: TERRAIN_PX }); // 없으면 Kenney 타일로 대체
    this.load.spritesheet(PROPS_KEY, PROPS_SRC, { frameWidth: PROPS_W, frameHeight: PROPS_H }); // 없으면 Kenney 소품으로 대체
    for (const k of FX_KEYS) { const [f, key] = k.split(':'); this.load.image(key, `assets/fx/${f}.png`); }
    for (const k of SFX_KEYS) this.load.audio(k, `assets/sfx/${k}.ogg`);
  }
  async create() {
    // 그림자/비네트 텍스처 생성
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 1).fillEllipse(24, 8, 44, 14); g.generateTexture('shadow', 48, 16); g.destroy();
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d')!;
    const grd = x.createRadialGradient(160, 90, 50, 160, 90, 190); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.85)');
    x.fillStyle = grd; x.fillRect(0, 0, 320, 180); this.textures.addCanvas('vignette', c);
    const c2 = document.createElement('canvas'); c2.width = c2.height = 400; const y2 = c2.getContext('2d')!;
    const cg = y2.createRadialGradient(200, 200, 100, 200, 200, 200); cg.addColorStop(0, 'rgba(255,200,120,1)'); cg.addColorStop(0.12, 'rgba(255,150,60,0.9)'); cg.addColorStop(0.45, 'rgba(255,90,30,0.3)'); cg.addColorStop(1, 'rgba(255,60,20,0)');
    y2.fillStyle = cg; y2.fillRect(0, 0, 400, 400); this.textures.addCanvas('corona', c2);
    try { await Promise.race([document.fonts.load('16px Galmuri11'), new Promise((r) => setTimeout(r, 2500))]); } catch { /* 폰트 없이 진행 */ }
    document.getElementById('boot-msg')?.remove();
    this.scene.start('Title');
  }
}
