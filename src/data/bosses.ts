// 기획서 8장 — 보스 10종 (수치는 기획서 기재값 그대로)
import type Phaser from 'phaser';
import { SP, Spr } from './sprites';

export type Cat = 'melee' | 'ranged' | 'area' | 'special';
export interface PatternDef {
  id: string; name: string; type: string; cat: Cat;
  tele: number | number[]; mult: number | number[]; parry?: boolean | boolean[];
  minPhase?: number; maxPhase?: number; once?: boolean; hpBelow?: number; zone?: boolean;
  [k: string]: any;
}
export interface BossDef {
  id: string; name: string; title: string; ch: number; role: 'mid' | 'final'; lv: number;
  hp: number; atk: number; def: number; poise: number;
  spr: Spr; tint: number; scale: number; speed: number;
  phases: { at: number; text: string; mods: Record<string, any> }[];
  patterns: PatternDef[]; adds?: string[]; intro: string;
}

export const BOSSES: BossDef[] = [
  {
    id: 'forest_predator', name: '숲의 포식자', title: '챕터 I 중간보스', ch: 1, role: 'mid', lv: 7,
    hp: 3210, atk: 38, def: 15, poise: 170, spr: SP.beast, tint: 0x6fa050, scale: 4.2, speed: 120,
    intro: '독기 어린 숨결이 숲을 덮는다.',
    phases: [{ at: 0.5, text: '연속 도약 2회', mods: { leapCount: 2 } }],
    patterns: [
      { id: 'claw2', name: '발톱 2연타', type: 'melee', cat: 'melee', tele: [550, 550], mult: [0.8, 0.8], parry: [true, true], r: 120, ang: 110 },
      { id: 'leap', name: '도약 추적', type: 'leap', cat: 'special', tele: 750, mult: 1.4, r: 105 },
      { id: 'poison', name: '독 구름', type: 'cloud', cat: 'area', tele: 900, mult: 0.25, r: 120, dur: 4000, status: 'poison', zone: true, count: 1 },
    ],
  },
  {
    id: 'root_guardian', name: '뿌리의 수호자', title: '챕터 I 최종보스', ch: 1, role: 'final', lv: 10,
    hp: 8680, atk: 61, def: 19, poise: 300, spr: SP.treeG, tint: 0x5f7f48, scale: 5.5, speed: 60,
    intro: '봉인의 첫 균열을 지키던 고목이 깨어났다.', adds: ['shroom'],
    phases: [
      { at: 0.7, text: '장판 추가', mods: { extraZone: true } },
      { at: 0.35, text: '안전 고리 반전', mods: { ringReverse: true } },
    ],
    patterns: [
      { id: 'root_spear', name: '뿌리 직선창', type: 'lines', cat: 'ranged', tele: 650, mult: 1.15, parry: true, count: 3, spread: 22, len: 420, w: 48 },
      { id: 'thorn_ring', name: '가시 원형', type: 'ring', cat: 'area', tele: 900, mult: 1.5, R: 330, a: 120, b: 210 },
      { id: 'stem_grab', name: '줄기 잡기', type: 'grab', cat: 'melee', tele: 800, mult: 1.8, len: 240, w: 80 },
      { id: 'spores', name: '소환 포자', type: 'summon', cat: 'special', tele: 1000, mult: 0, count: 2, max: 4 },
      { id: 'spore_field', name: '포자 장판', type: 'cloud', cat: 'area', tele: 900, mult: 0.25, r: 100, dur: 4000, status: 'poison', zone: true, count: 2, minPhase: 1 },
    ],
  },
  {
    id: 'black_captain', name: '검은 근위대장', title: '챕터 II 중간보스', ch: 2, role: 'mid', lv: 17,
    hp: 8127, atk: 90, def: 26, poise: 270, spr: SP.knight2, tint: 0x5a5a70, scale: 4, speed: 125,
    intro: '"왕의 방패는 아직 무너지지 않았다."',
    phases: [{ at: 0.5, text: '방패를 내려놓고 공격속도 +15%', mods: { speedUp: 0.87 } }],
    patterns: [
      { id: 'front_slash', name: '전방 베기', type: 'melee', cat: 'melee', tele: [500], mult: [1.0], parry: [true], r: 125, ang: 120 },
      { id: 'shield_rush', name: '방패 돌진', type: 'charge', cat: 'special', tele: 700, mult: 1.5, len: 380, w: 80 },
      { id: 'shield_bash', name: '방패 강타', type: 'melee', cat: 'melee', tele: [850], mult: [1.6], parry: [true], r: 115, ang: 90, parryStagger: true },
    ],
  },
  {
    id: 'fallen_king', name: '타락한 기사왕', title: '챕터 II 최종보스', ch: 2, role: 'final', lv: 20,
    hp: 18498, atk: 128, def: 30, poise: 440, spr: SP.knight, tint: 0x6a4a90, scale: 4.6, speed: 120,
    intro: '균열을 막으려 스스로를 봉인한 왕. 이제는 그 균열의 일부다.', adds: ['rusty'],
    phases: [
      { at: 0.7, text: '가드 1회', mods: { guard: true } },
      { at: 0.35, text: '3연격이 4연격으로 — 마지막은 회피 전용', mods: { fourHit: true } },
    ],
    patterns: [
      { id: 'triple', name: '3연 검격', type: 'melee', cat: 'melee', tele: [500, 650, 800], mult: [0.9, 1.0, 1.2], parry: [false, false, true], r: 130, ang: 120 },
      { id: 'sweep', name: '넓은 횡베기', type: 'cone', cat: 'melee', tele: 900, mult: 1.8, r: 190, ang: 240 },
      { id: 'charge', name: '전방 돌진', type: 'charge', cat: 'special', tele: 750, mult: 1.6, len: 420, w: 90 },
      { id: 'cavalry', name: '어둠 기병', type: 'lanes', cat: 'area', tele: 1000, mult: 1.3, count: 3, w: 90 },
    ],
  },
  {
    id: 'frost_hunter', name: '서리의 사냥꾼', title: '챕터 III 중간보스', ch: 3, role: 'mid', lv: 27,
    hp: 13332, atk: 160, def: 38, poise: 370, spr: SP.ranger, tint: 0x90d8ff, scale: 4, speed: 135,
    intro: '하얀 숨결 너머로 화살촉이 번뜩인다.',
    phases: [{ at: 0.5, text: '2연 돌진', mods: { dashCount: 2 } }],
    patterns: [
      { id: 'ice_spear', name: '빙결 창', type: 'projFan', cat: 'ranged', tele: 650, mult: 1.1, count: 3, spread: 14, speed: 420, status: 'chill', parry: true },
      { id: 'leap_dash', name: '도약 돌진', type: 'charge', cat: 'special', tele: 700, mult: 1.5, len: 400, w: 80 },
      { id: 'ice_trap', name: '얼음 덫', type: 'traps', cat: 'area', tele: 900, mult: 0.15, r: 60, max: 3, zone: true },
    ],
  },
  {
    id: 'frost_queen', name: '서리의 여왕', title: '챕터 III 최종보스', ch: 3, role: 'final', lv: 30,
    hp: 26754, atk: 218, def: 41, poise: 580, spr: SP.princess, tint: 0xa8ecff, scale: 4.6, speed: 90,
    intro: '"시간을 늦추지 않으면, 균열이 세계를 삼킨다."', adds: ['snow_spirit'],
    phases: [
      { at: 0.7, text: '눈보라 2갈래', mods: { blizzard2: true } },
      { at: 0.35, text: '빙하 낙하 4지점', mods: { fall4: true } },
    ],
    patterns: [
      { id: 'blizzard', name: '부채꼴 눈보라', type: 'cone', cat: 'ranged', tele: 1000, mult: 1.4, r: 330, ang: 120, status: 'chill' },
      { id: 'crystal', name: '빙결 수정', type: 'crystals', cat: 'special', tele: 750, mult: 1.2, count: 2, r: 110, fuse: 2600 },
      { id: 'glacier', name: '빙하 낙하', type: 'circles', cat: 'area', tele: 1100, mult: 1.9, count: 3, r: 95 },
      { id: 'ice_floor', name: '빙판 분할', type: 'floor', cat: 'area', tele: 1400, mult: 0.3, dur: 3500, status: 'chill', zone: true },
    ],
  },
  {
    id: 'lava_predator', name: '용암 포식자', title: '챕터 IV 중간보스', ch: 4, role: 'mid', lv: 37,
    hp: 17556, atk: 249, def: 49, poise: 470, spr: SP.crab, tint: 0xff6a3a, scale: 4.6, speed: 105,
    intro: '녹아내린 대지 아래에서 거대한 집게가 솟아오른다.',
    phases: [{ at: 0.5, text: '장판 지속 3→4초', mods: { zoneDur: 4000 } }],
    patterns: [
      { id: 'lava_spit', name: '용암 토사', type: 'cone', cat: 'ranged', tele: 850, mult: 1.2, r: 260, ang: 70, leaveZone: true, status: 'burn' },
      { id: 'tail', name: '꼬리 후려치기', type: 'tail', cat: 'melee', tele: 700, mult: 1.5, r: 170 },
      { id: 'quake', name: '지진 강타', type: 'quake', cat: 'area', tele: 1100, mult: 2.0, r: 230 },
    ],
  },
  {
    id: 'immortal_avatar', name: '불멸의 화신', title: '챕터 IV 최종보스', ch: 4, role: 'final', lv: 40,
    hp: 32305, atk: 328, def: 52, poise: 720, spr: SP.soldier, tint: 0xff7a2a, scale: 4.8, speed: 115,
    intro: '왕의 실험이 낳은 인공 수호자. 꺼지지 않는 불꽃.', adds: ['locust'],
    phases: [
      { at: 0.7, text: '재점화 1회', mods: { rekindle: true } },
      { at: 0.35, text: '연속 3연검', mods: { tripleSlash: true } },
    ],
    patterns: [
      { id: 'flame_slash', name: '화염 검격', type: 'melee', cat: 'melee', tele: [650], mult: [1.1], parry: [true], r: 135, ang: 120, status: 'burn' },
      { id: 'cross', name: '십자 화염', type: 'cross', cat: 'area', tele: 1050, mult: 1.6, w: 80, status: 'burn' },
      { id: 'eruption', name: '화산 분출', type: 'circles', cat: 'area', tele: 1200, mult: 2.1, count: 4, r: 95, status: 'burn' },
      { id: 'rekindle', name: '불사 재점화', type: 'rekindle', cat: 'special', tele: 1500, mult: 0, minPhase: 1, once: true, heal: 0.08, count: 3 },
    ],
  },
  {
    id: 'void_executor', name: '공허의 집행관', title: '챕터 V 중간보스', ch: 5, role: 'mid', lv: 47,
    hp: 20268, atk: 358, def: 60, poise: 570, spr: SP.hooded, tint: 0xa888ff, scale: 4.2, speed: 125,
    intro: '"균열의 문턱을 넘는 자, 집행한다."',
    phases: [{ at: 0.5, text: '분신 3개 — 가짜는 붉은 예고 없음', mods: { clones: 3 } }],
    patterns: [
      { id: 'dim_stab', name: '차원 찌르기', type: 'line', cat: 'ranged', tele: 650, mult: 1.25, len: 460, w: 56 },
      { id: 'holo', name: '홀로그램 분신', type: 'clones', cat: 'special', tele: 900, mult: 1.25, count: 2 },
      { id: 'snare', name: '공허 올가미', type: 'snare', cat: 'area', tele: 900, mult: 1.6, r: 140 },
    ],
  },
  {
    id: 'rift_lord', name: '균열의 군주', title: '챕터 V 최종보스', ch: 5, role: 'final', lv: 50,
    hp: 33908, atk: 462, def: 64, poise: 860, spr: SP.elder, tint: 0x9a5aff, scale: 5, speed: 110,
    intro: '균열을 만든 최초의 연구자. 모든 것의 시작이자 끝.', adds: ['shard'],
    phases: [
      { at: 0.7, text: '도약 후 낙인', mods: { leapBrand: true } },
      { at: 0.35, text: '분신 추가', mods: { moreClones: true } },
      { at: 0.15, text: '최후의 심판', mods: { judgement: true } },
    ],
    patterns: [
      { id: 'time_cut', name: '시공 절단', type: 'timeCut', cat: 'ranged', tele: 850, mult: 1.4, count: 3, len: 520, w: 60 },
      { id: 'brand', name: '균열 낙인', type: 'brand', cat: 'area', tele: 1100, mult: 1.8, r: 110 },
      { id: 'collapse', name: '차원 붕괴', type: 'collapse', cat: 'area', tele: 1450, mult: 2.2, R: 520, safe: 22 },
      { id: 'sym', name: '대칭 분신', type: 'symClones', cat: 'special', tele: 900, mult: 1.0, len: 480, w: 60 },
      { id: 'judgement', name: '최후의 심판', type: 'judgement', cat: 'special', tele: 1800, mult: 2.35, once: true, hpBelow: 0.15, safeR: 70 },
    ],
  },
];
export const BOSS: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

// 커스텀 보스 시트(assets/img/bosses.png). 96×96, 가로 5칸 × 세로 2줄, 바닥 기준 94행(마지막 행 여백).
// 시트가 없으면 기존 Kenney 스프라이트 + 틴트로 대체된다.
export const BOSS_SHEET = 'boss', BOSS_SRC = 'assets/img/bosses.png', BOSS_CELL = 96, BOSS_SCALE = 1.5;
const BOSS_CELLS = ['forest_predator', 'root_guardian', 'black_captain', 'fallen_king', 'frost_hunter', 'frost_queen', 'lava_predator', 'immortal_avatar', 'void_executor', 'rift_lord'];

export interface BossLook { tex: string; frame: number; scale: number; tint: number; originY: number; custom: boolean }
export function bossLook(scene: Phaser.Scene, B: BossDef): BossLook {
  const cell = BOSS_CELLS.indexOf(B.id);
  // frameTotal에는 __BASE 프레임이 포함된다
  if (cell >= 0 && scene.textures.exists(BOSS_SHEET) && scene.textures.get(BOSS_SHEET).frameTotal > BOSS_CELLS.length) {
    return { tex: BOSS_SHEET, frame: cell, scale: BOSS_SCALE, tint: 0xffffff, originY: (BOSS_CELL - 1) / BOSS_CELL, custom: true };
  }
  return { tex: B.spr.sheet, frame: B.spr.frame, scale: B.scale, tint: B.tint, originY: 0.86, custom: false };
}
