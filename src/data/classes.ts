// 기획서 4장 — 직업·스킬·콤보·특성
import { SP, Spr } from './sprites';

export type Shape =
  | { t: 'cone'; r: number; ang: number }
  | { t: 'rect'; len: number; w: number }
  | { t: 'circle'; r: number; at: 'self' | 'aim'; maxDist?: number }
  | { t: 'proj'; range: number; speed: number; r: number; pierce?: boolean; explode?: number; tex: string; tint: number };

export interface Move {
  id: string; name: string; coef: number; dur: number; act: number;
  shape: Shape; poise: number; lunge?: number; hits?: number; interval?: number;
  eff?: string[]; mp?: number; res?: number; cd?: number;
  fx?: 'slash' | 'slashBig' | 'punch' | 'magic' | 'fire' | 'ice' | 'nova' | 'wave';
  sfx?: string; ult?: number; maxTargets?: number; charge?: number; pen?: number; superArmor?: boolean; unlock?: number; fan?: number;
}
export interface ComboDef { name: string; total: number; eff: string[]; desc: string }
export interface TraitOpt { id: string; name: string; desc: string }
export interface ClassDef {
  id: 'blade' | 'fist' | 'mage' | 'ranger' | 'lancer'; name: string; en: string; role: string; desc: string;
  spr: Spr; weapon: Spr | null; resName: string; color: number;
  L: Move[]; H: Move; Q: Move; E: Move; C: Move; R: Move;
  combos: Record<string, ComboDef>; traits: { lv: number; opts: [TraitOpt, TraitOpt] }[];
  parryPoise: number; weaponNoun: string;
}

const BLADE: ClassDef = {
  id: 'blade', name: '검사', en: 'Blade Dancer', role: '근접 균형형 · 패링 장려',
  desc: '균형 잡힌 근접 전투. 패링 후 반격의 칼날이 가장 강력하다.',
  spr: SP.knight, weapon: SP.sword, resName: '검기', color: 0x7fd8ff, parryPoise: 30, weaponNoun: '검',
  L: [
    { id: 'b_l1', name: '1타', coef: 0.85, dur: 0.34, act: 0.35, shape: { t: 'cone', r: 88, ang: 120 }, poise: 6, lunge: 10, fx: 'slash', sfx: 'swing1', ult: 2 },
    { id: 'b_l2', name: '2타', coef: 0.9, dur: 0.36, act: 0.35, shape: { t: 'cone', r: 88, ang: 120 }, poise: 6, lunge: 10, fx: 'slash', sfx: 'swing2', ult: 2 },
    { id: 'b_l3', name: '3타', coef: 1.15, dur: 0.46, act: 0.35, shape: { t: 'cone', r: 98, ang: 150 }, poise: 10, lunge: 16, fx: 'slashBig', sfx: 'swing1', eff: ['stagger'], ult: 3 },
  ],
  H: { id: 'b_h', name: '분쇄', coef: 1.75, dur: 0.7, act: 0.45, shape: { t: 'rect', len: 110, w: 64 }, poise: 18, lunge: 18, pen: 0.12, fx: 'slashBig', sfx: 'chop', eff: ['stagger', 'bleed'], ult: 3.5 },
  Q: { id: 'b_q', name: '반월참', coef: 2.2, dur: 0.5, act: 0.4, cd: 7, res: 20, unlock: 4, shape: { t: 'cone', r: 140, ang: 180 }, poise: 20, fx: 'slashBig', sfx: 'draw', eff: ['knock', 'stagger'], ult: 4, maxTargets: 8 },
  E: { id: 'b_e', name: '파동참', coef: 2.6, dur: 0.45, act: 0.4, cd: 10, res: 30, unlock: 8, shape: { t: 'proj', range: 300, speed: 760, r: 26, pierce: true, tex: 'fx_slash', tint: 0x9fe8ff }, poise: 16, fx: 'wave', sfx: 'draw', ult: 4 },
  C: { id: 'b_c', name: '패링 반격', coef: 2.0, dur: 0.4, act: 0.3, shape: { t: 'cone', r: 105, ang: 160 }, poise: 30, lunge: 22, fx: 'slashBig', sfx: 'swing1', eff: ['stagger'], ult: 8 },
  R: { id: 'b_r', name: '검성난무', coef: 1.0, hits: 8, interval: 0.18, dur: 1.6, act: 0.08, unlock: 20, shape: { t: 'circle', r: 140, at: 'self' }, poise: 4.4, fx: 'slashBig', sfx: 'swing2', superArmor: true, maxTargets: 10 },
  combos: {
    LLL: { name: '삼연참', total: 2.9, eff: ['stagger'], desc: '기본 경직' },
    LLH: { name: '승천격', total: 3.5, eff: ['launch'], desc: '일반 적 공중 0.6초' },
    LHH: { name: '파쇄참', total: 4.0, eff: ['defDown'], desc: '방어력 -12% 4초' },
    DLH: { name: '그림자 돌진', total: 3.2, eff: ['critUp'], desc: '치명 +15%' },
    FLH: { name: '반격의 칼날', total: 4.7, eff: ['stagger'], desc: '패링 성공 전제' },
  },
  traits: [
    { lv: 12, opts: [{ id: 'afterimage', name: '잔영', desc: '완벽 회피 후 다음 L 피해 +25%' }, { id: 'steel', name: '강철', desc: '패링 실패 후딜 -100ms' }] },
    { lv: 24, opts: [{ id: 'spirit', name: '기합', desc: '궁극기 충전 +8%' }, { id: 'shatter', name: '파쇄', desc: 'H 방어관통 +10%' }] },
    { lv: 36, opts: [{ id: 'gale', name: '질풍', desc: '대시 쿨다운 -0.15초' }, { id: 'redmoon', name: '적월', desc: '출혈 지속 +1초' }] },
    { lv: 48, opts: [{ id: 'swordsaint', name: '검성', desc: '20초마다 피격 시 콤보 1회 유지' }, { id: 'meteor', name: '유성', desc: '궁극기 피해 +12%' }] },
  ],
};

const FIST: ClassDef = {
  id: 'fist', name: '격투가', en: 'Iron Fist', role: '근접 고속 · 누적 그로기 우위',
  desc: '빠른 연타로 그로기를 쌓는다. 피격 허용도가 가장 높다.',
  spr: SP.monk, weapon: null, resName: '투기', color: 0xffb35c, parryPoise: 40, weaponNoun: '건틀릿',
  L: [
    { id: 'f_l1', name: '잽', coef: 0.64, dur: 0.24, act: 0.35, shape: { t: 'cone', r: 80, ang: 90 }, poise: 5, lunge: 8, fx: 'punch', sfx: 'hit1', ult: 2 },
    { id: 'f_l2', name: '크로스', coef: 0.72, dur: 0.26, act: 0.35, shape: { t: 'cone', r: 80, ang: 90 }, poise: 5, lunge: 8, fx: 'punch', sfx: 'hit1', ult: 2 },
    { id: 'f_l3', name: '훅', coef: 0.96, dur: 0.34, act: 0.4, shape: { t: 'cone', r: 100, ang: 120 }, poise: 7, lunge: 12, fx: 'punch', sfx: 'hit2', eff: ['stagger'], ult: 3 },
  ],
  H: { id: 'f_h', name: '발경', coef: 1.9, dur: 0.72, act: 0.5, charge: 0.28, shape: { t: 'rect', len: 95, w: 66 }, poise: 22, lunge: 20, fx: 'nova', sfx: 'hit2', eff: ['stagger', 'knock'], ult: 3.5 },
  Q: { id: 'f_q', name: '용권', coef: 1.85, dur: 0.55, act: 0.45, cd: 6, res: 20, unlock: 4, shape: { t: 'circle', r: 120, at: 'self' }, poise: 18, fx: 'nova', sfx: 'slam', eff: ['pull', 'stagger'], ult: 4, maxTargets: 10 },
  E: { id: 'f_e', name: '파진각', coef: 2.35, dur: 0.55, act: 0.45, cd: 9, res: 30, unlock: 8, shape: { t: 'rect', len: 150, w: 90 }, poise: 24, lunge: 10, fx: 'nova', sfx: 'slam', eff: ['guardBreak', 'stagger'], ult: 4 },
  C: { id: 'f_c', name: '패링 반격', coef: 1.65, dur: 0.35, act: 0.3, shape: { t: 'circle', r: 100, at: 'self' }, poise: 40, fx: 'nova', sfx: 'hit2', eff: ['stagger'], ult: 8 },
  R: { id: 'f_r', name: '파천연격', coef: 0.77, hits: 10, interval: 0.17, dur: 1.9, act: 0.06, unlock: 20, shape: { t: 'cone', r: 120, ang: 140 }, poise: 4.5, fx: 'punch', sfx: 'hit2', superArmor: true, maxTargets: 10 },
  combos: {
    LLL: { name: '연환권', total: 2.32, eff: [], desc: '빠른 콤보' },
    LLH: { name: '승룡격', total: 3.2, eff: ['launch'], desc: '공중 띄우기' },
    LHH: { name: '철산고', total: 4.1, eff: ['poise45'], desc: 'Poise 45' },
    DLH: { name: '질풍타', total: 2.9, eff: ['dashFwd'], desc: '이동 거리 +60px' },
    FLH: { name: '강철 반격', total: 4.0, eff: ['poise60'], desc: 'Poise 60' },
  },
  traits: [
    { lv: 12, opts: [{ id: 'chain', name: '연환', desc: 'L 3타 공격 +15%' }, { id: 'ironbody', name: '철신', desc: '최대 HP +7%' }] },
    { lv: 24, opts: [{ id: 'burst', name: '발경', desc: 'H 차지 시간 -12%' }, { id: 'instinct', name: '전투 본능', desc: '반격 Poise +15' }] },
    { lv: 36, opts: [{ id: 'evaderush', name: '회피 연타', desc: '완벽 회피 후 3초간 공격 속도 +15%' }, { id: 'bind', name: '속박', desc: '용권(끌어당김) 피해 +20%' }] },
    { lv: 48, opts: [{ id: 'explode', name: '폭렬', desc: 'R 마지막 타 +15%' }, { id: 'guardian', name: '수호', desc: 'S랭크 때 피해감소 +8%' }] },
  ],
};

const MAGE: ClassDef = {
  id: 'mage', name: '마법사', en: 'Arcane Weaver', role: '중거리 원소 연계 · 범위 제압',
  desc: '중거리에서 투사체와 원소 연계로 다수를 제압한다. 체력이 가장 낮다.',
  spr: SP.wizard, weapon: SP.staff, resName: 'MP', color: 0xb98cff, parryPoise: 30, weaponNoun: '지팡이',
  L: [
    { id: 'm_l1', name: '마력탄', coef: 0.9, dur: 0.4, act: 0.35, mp: 2, shape: { t: 'proj', range: 320, speed: 560, r: 12, tex: 'fx_light', tint: 0xc9a8ff }, poise: 5, fx: 'magic', sfx: 'magic', ult: 2 },
    { id: 'm_l2', name: '응축탄', coef: 1.04, dur: 0.42, act: 0.35, mp: 3, shape: { t: 'proj', range: 320, speed: 580, r: 13, tex: 'fx_light', tint: 0xa8c4ff }, poise: 5, fx: 'magic', sfx: 'magic', ult: 2 },
    { id: 'm_l3', name: '연쇄탄', coef: 1.16, dur: 0.47, act: 0.35, mp: 3, shape: { t: 'proj', range: 320, speed: 600, r: 15, tex: 'fx_light', tint: 0xff9cf0 }, poise: 8, fx: 'magic', sfx: 'magic', eff: ['stagger'], ult: 3 },
  ],
  H: { id: 'm_h', name: '파열', coef: 1.7, dur: 0.76, act: 0.5, mp: 8, shape: { t: 'circle', r: 110, at: 'aim', maxDist: 170 }, poise: 16, fx: 'nova', sfx: 'glass', eff: ['stagger'], ult: 3.5, maxTargets: 8 },
  Q: { id: 'm_q', name: '화염구', coef: 2.15, dur: 0.5, act: 0.4, cd: 7, mp: 18, unlock: 4, shape: { t: 'proj', range: 380, speed: 520, r: 18, explode: 95, tex: 'fx_flame', tint: 0xff8a3a }, poise: 18, fx: 'fire', sfx: 'magic', eff: ['burn'], ult: 4, maxTargets: 8 },
  E: { id: 'm_e', name: '빙결창', coef: 2.45, dur: 0.5, act: 0.4, cd: 9, mp: 22, unlock: 8, shape: { t: 'proj', range: 360, speed: 820, r: 18, pierce: true, tex: 'fx_trace', tint: 0x9fe6ff }, poise: 16, fx: 'ice', sfx: 'glass', eff: ['chill'], ult: 4 },
  C: { id: 'm_c', name: '패링 반격', coef: 1.5, dur: 0.35, act: 0.3, mp: 0, shape: { t: 'circle', r: 115, at: 'self' }, poise: 30, fx: 'nova', sfx: 'glass', eff: ['knock'], ult: 8 },
  R: { id: 'm_r', name: '성운낙하', coef: 1.3, hits: 6, interval: 0.24, dur: 1.7, act: 0.2, unlock: 20, shape: { t: 'circle', r: 150, at: 'aim', maxDist: 260 }, poise: 6, fx: 'magic', sfx: 'slam', superArmor: true, maxTargets: 12 },
  combos: {
    LLL: { name: '마력 연사', total: 3.1, eff: [], desc: '중거리 지속' },
    LLH: { name: '아케인 폭발', total: 3.65, eff: [], desc: '작은 광역' },
    LHH: { name: '연쇄 파열', total: 4.2, eff: ['burn'], desc: '원소 부착' },
    DLH: { name: '잔광 폭풍', total: 3.25, eff: [], desc: '대시 직후 범위 타격' },
    FLH: { name: '마나 역류', total: 4.1, eff: ['mp10'], desc: '패링 성공, MP +10' },
  },
  traits: [
    { lv: 12, opts: [{ id: 'spread', name: '확산', desc: '화염 범위 +12%' }, { id: 'focus', name: '집중', desc: '마나 회복 +15%' }] },
    { lv: 24, opts: [{ id: 'resonance', name: '공명', desc: '원소연계 피해 +12%' }, { id: 'deepfreeze', name: '동결', desc: '빙결 지속 +0.3초' }] },
    { lv: 36, opts: [{ id: 'wavelength', name: '파장', desc: 'E 투사체 속도 +20%' }, { id: 'veil', name: '장막', desc: '대시 후 2초간 피해감소 +10%' }] },
    { lv: 48, opts: [{ id: 'archmage', name: '대원소', desc: 'R 피해 +12%' }, { id: 'stabilize', name: '안정화', desc: '마나 소모 -15%' }] },
  ],
};

import { RANGER, LANCER } from './classes2';
export { OUTFITS, TINTS } from './classes2';
export const CLASSES: Record<string, ClassDef> = { blade: BLADE, fist: FIST, mage: MAGE, ranger: RANGER, lancer: LANCER };
export const CLASS_LIST = [BLADE, FIST, MAGE, RANGER, LANCER];
