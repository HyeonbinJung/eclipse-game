// 추가 직업: 궁수 · 창술사 / 외형 선택지
import { SP } from './sprites';
import type { ClassDef, Shape } from './classes';

const ARROW = (r = 9, tint = 0xffe6b0): Shape => ({ t: 'proj', range: 340, speed: 780, r, tex: 'fx_trace', tint });

export const RANGER: ClassDef = {
  id: 'ranger', base: 'ranger', name: '궁수', en: 'Shadow Ranger', role: '원거리 기동 · 카이팅',
  desc: '멀리서 화살을 퍼붓고 도약으로 거리를 벌린다. 근접 압박에 약하다.',
  spr: SP.ranger, weapon: SP.bow, resName: '집중', color: 0xa8ff9a, parryPoise: 28, weaponNoun: '활',
  L: [
    { id: 'r_l1', name: '속사', coef: 0.7, dur: 0.3, act: 0.35, shape: ARROW(), poise: 4, fx: 'magic', sfx: 'swing2', ult: 2 },
    { id: 'r_l2', name: '연사', coef: 0.75, dur: 0.3, act: 0.35, shape: ARROW(), poise: 4, fx: 'magic', sfx: 'swing2', ult: 2 },
    { id: 'r_l3', name: '꿰뚫기', coef: 0.95, dur: 0.4, act: 0.4, shape: { t: 'proj', range: 340, speed: 780, r: 11, tex: 'fx_trace', tint: 0xfff0a0, pierce: true }, poise: 7, fx: 'magic', sfx: 'swing1', eff: ['stagger'], ult: 3 },
  ],
  H: { id: 'r_h', name: '관통 화살', coef: 1.8, dur: 0.7, act: 0.5, charge: 0.3, shape: { t: 'proj', range: 460, speed: 1050, r: 15, pierce: true, tex: 'fx_trace', tint: 0xfff07a }, poise: 16, fx: 'magic', sfx: 'draw', eff: ['stagger'], ult: 3.5 },
  Q: { id: 'r_q', name: '화살비', coef: 0.62, hits: 4, interval: 0.18, dur: 0.9, act: 0.25, cd: 8, res: 20, unlock: 4, shape: { t: 'circle', r: 115, at: 'aim', maxDist: 320 }, poise: 6, fx: 'magic', sfx: 'swing2', eff: ['slow'], ult: 1.5, maxTargets: 10 },
  E: { id: 'r_e', name: '후방 도약 사격', coef: 0.58, dur: 0.5, act: 0.3, cd: 10, res: 30, unlock: 8, fan: 5, shape: ARROW(10, 0xb8ffb0), poise: 6, fx: 'magic', sfx: 'dash', eff: ['backstep'], ult: 1 },
  C: { id: 'r_c', name: '반격 사격', coef: 0.6, dur: 0.35, act: 0.25, fan: 3, shape: ARROW(12, 0x9ff8ff), poise: 10, fx: 'magic', sfx: 'swing1', eff: ['stagger'], ult: 3 },
  R: { id: 'r_r', name: '폭풍 화살', coef: 0.35, hits: 8, interval: 0.17, dur: 1.6, act: 0.08, fan: 3, unlock: 20, shape: ARROW(10, 0xfff07a), poise: 2, fx: 'magic', sfx: 'swing2', superArmor: true },
  combos: {
    LLL: { name: '삼연사', total: 2.4, eff: ['stagger'], desc: '마지막 화살 관통' },
    LLH: { name: '조준 사격', total: 3.2, eff: ['critUp'], desc: '치명 +15%' },
    LHH: { name: '연속 관통', total: 3.9, eff: ['slow'], desc: '둔화' },
    DLH: { name: '그림자 사격', total: 3.1, eff: ['critUp'], desc: '대시 직후 치명 +15%' },
    FLH: { name: '역습의 화살', total: 4.3, eff: ['stagger'], desc: '패링 성공 전제' },
  },
  traits: [
    { lv: 12, opts: [{ id: 'eagle', name: '매의 눈', desc: '투사체 사거리 +15%' }, { id: 'gale', name: '날렵함', desc: '대시 쿨다운 -0.15초' }] },
    { lv: 24, opts: [{ id: 'spirit', name: '기합', desc: '궁극기 충전 +8%' }, { id: 'hunter', name: '사냥꾼', desc: '둔화된 적에게 피해 +12%' }] },
    { lv: 36, opts: [{ id: 'volley', name: '일제 사격', desc: '화살비 1회 추가 타격' }, { id: 'veil', name: '장막', desc: '대시 후 2초간 피해감소 +10%' }] },
    { lv: 48, opts: [{ id: 'meteor', name: '폭풍의 눈', desc: '궁극기 피해 +12%' }, { id: 'evaderush', name: '회피 연사', desc: '완벽 회피 후 3초간 공격 속도 +15%' }] },
  ],
};

export const LANCER: ClassDef = {
  id: 'lancer', base: 'lancer', name: '창술사', en: 'Dragon Lancer', role: '중거리 관통 · 돌진',
  desc: '긴 사거리의 찌르기와 돌진으로 전장을 가른다. 낙창으로 단숨에 거리를 좁힌다.',
  spr: SP.soldier, weapon: SP.spear, resName: '기백', color: 0xffd76a, parryPoise: 34, weaponNoun: '창',
  L: [
    { id: 'n_l1', name: '찌르기', coef: 0.8, dur: 0.34, act: 0.4, shape: { t: 'rect', len: 125, w: 36 }, poise: 6, lunge: 12, fx: 'slash', sfx: 'swing1', ult: 2 },
    { id: 'n_l2', name: '연속 찌르기', coef: 0.85, dur: 0.36, act: 0.4, shape: { t: 'rect', len: 125, w: 36 }, poise: 6, lunge: 12, fx: 'slash', sfx: 'swing2', ult: 2 },
    { id: 'n_l3', name: '휩쓸기', coef: 1.1, dur: 0.48, act: 0.4, shape: { t: 'cone', r: 125, ang: 160 }, poise: 10, lunge: 10, fx: 'slashBig', sfx: 'swing1', eff: ['stagger'], ult: 3 },
  ],
  H: { id: 'n_h', name: '돌진 찌르기', coef: 1.85, dur: 0.72, act: 0.45, shape: { t: 'rect', len: 175, w: 46 }, poise: 20, lunge: 55, pen: 0.1, fx: 'slashBig', sfx: 'dash', eff: ['stagger', 'knock'], ult: 3.5 },
  Q: { id: 'n_q', name: '회전창', coef: 1.1, hits: 2, interval: 0.2, dur: 0.6, act: 0.3, cd: 7, res: 20, unlock: 4, shape: { t: 'circle', r: 130, at: 'self' }, poise: 12, fx: 'slashBig', sfx: 'swing2', eff: ['knock'], ult: 2, maxTargets: 10 },
  E: { id: 'n_e', name: '낙창', coef: 2.6, dur: 0.6, act: 0.5, cd: 10, res: 30, unlock: 8, shape: { t: 'circle', r: 105, at: 'aim', maxDist: 270 }, poise: 24, fx: 'nova', sfx: 'slam', eff: ['leap', 'stagger'], ult: 4, maxTargets: 8 },
  C: { id: 'n_c', name: '패링 반격', coef: 1.9, dur: 0.4, act: 0.3, shape: { t: 'rect', len: 150, w: 50 }, poise: 34, lunge: 20, fx: 'slashBig', sfx: 'swing1', eff: ['stagger'], ult: 8 },
  R: { id: 'n_r', name: '천공창', coef: 1.3, hits: 6, interval: 0.25, dur: 1.7, act: 0.1, unlock: 20, shape: { t: 'rect', len: 270, w: 72 }, poise: 6, fx: 'slashBig', sfx: 'swing1', superArmor: true, maxTargets: 10 },
  combos: {
    LLL: { name: '삼연창', total: 2.75, eff: ['stagger'], desc: '기본 경직' },
    LLH: { name: '용아돌격', total: 3.5, eff: ['launch'], desc: '일반 적 공중 0.6초' },
    LHH: { name: '관룡창', total: 4.0, eff: ['defDown'], desc: '방어력 -12% 4초' },
    DLH: { name: '질주창', total: 3.3, eff: ['dashFwd'], desc: '돌진 거리 증가' },
    FLH: { name: '역린', total: 4.6, eff: ['stagger'], desc: '패링 성공 전제' },
  },
  traits: [
    { lv: 12, opts: [{ id: 'reach', name: '장창', desc: '찌르기 사거리 +15%' }, { id: 'steel', name: '강철', desc: '패링 실패 후딜 -100ms' }] },
    { lv: 24, opts: [{ id: 'spirit', name: '기합', desc: '궁극기 충전 +8%' }, { id: 'shatter', name: '파쇄', desc: 'H 방어관통 +10%' }] },
    { lv: 36, opts: [{ id: 'gale', name: '질풍', desc: '대시 쿨다운 -0.15초' }, { id: 'redmoon', name: '적월', desc: '출혈 지속 +1초' }] },
    { lv: 48, opts: [{ id: 'dragon', name: '용기사', desc: '낙창 범위 +20%' }, { id: 'meteor', name: '천룡', desc: '궁극기 피해 +12%' }] },
  ],
};

// 외형: 의상(스프라이트 프레임)과 색상
export const OUTFITS = [96, 97, 98, 99, 100, 84, 85, 86, 87, 88, 112, 111];
export const TINTS = [0xffffff, 0xff9a9a, 0x9ac8ff, 0x9affb0, 0xffe08a, 0xd0a0ff, 0xb0b0b0, 0xffb0e0];
