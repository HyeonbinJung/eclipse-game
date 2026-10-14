// 기획서 3.2 / 5.1 / 7.1 / 8.1 의 공식을 그대로 옮긴 모듈
export const R = Math.round;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const MAX_LEVEL = 50;

// 5.1 경험치
export const xpToNext = (L: number) => (L >= MAX_LEVEL ? Infinity : R(45 + 28 * L + 3.6 * L * L));
export const monsterXp = (L: number) => R(4 + 0.9 * L + 0.02 * L * L);

// 3.2 플레이어 기본 성장
export const hpBase = (L: number) => R(120 + 18 * (L - 1) + 0.28 * (L - 1) ** 2);
export const atkBase = (L: number) => R(18 + 2.1 * (L - 1) + 0.045 * (L - 1) ** 2);
export const defBase = (L: number) => R(4 + 0.95 * L);
// 표준 플레이어 가정(부록 A)에 맞춘 자동 STR/VIT 성장
export const strAt = (L: number) => 5 + 0.45 * (L - 1);
export const vitAt = (L: number) => 4 + 0.6 * (L - 1);

// 7.1 일반 적
export const enemyHpBase = (L: number) => (55 + 16 * L + 0.95 * L * L) * (1 - 0.25 * clamp((L - 20) / 30, 0, 1));
export const enemyAtkBase = (L: number) => 9 + 2 * L + 0.065 * L * L;
export const enemyDefBase = (L: number) => 6 + 0.9 * L;

// 5.1 레벨 차 XP 보정
export function xpLevelMod(playerL: number, enemyL: number) {
  const d = playerL - enemyL;
  if (d >= -3 && d <= 3) return 1;
  if (d >= 4 && d <= 6) return 0.7;
  if (d >= 7 && d <= 9) return 0.35;
  if (d >= 10) return 0.1;
  return 1.1; // 적이 4레벨 이상 높음
}

// 3.2 피해 공식
export interface DmgOpt { pen?: number; res?: number; crit?: number; critDmg?: number; forceCrit?: boolean }
export function calcDamage(atk: number, coef: number, def: number, o: DmgOpt = {}) {
  const effDef = def * (1 - Math.min(0.4, o.pen || 0));
  let d = R(atk * coef * (100 / (100 + effDef)) * (1 - Math.min(0.5, o.res || 0)) * rand(0.95, 1.05));
  let crit = false;
  if (o.forceCrit || Math.random() < (o.crit || 0)) { d = R(d * (o.critDmg || 1.5)); crit = true; }
  return { dmg: Math.max(1, d), crit };
}

// 10.1 골드
export const goldNormal = (L: number) => 6 + 2 * L;
export const goldElite = (L: number) => 40 + 7 * L;
export const goldMid = (L: number) => 140 + 22 * L;
export const goldFinal = (L: number) => 240 + 30 * L;
export const goldChest = (L: number) => 40 + 8 * L;
export const potionPrice = (L: number) => L * 8 + 20;
export const rerollCost = (iLv: number) => 200 + 30 * iLv;
export const craftCost = (iLv: number) => 900 + 55 * iLv;

export function cumulativeXp(L: number) {
  let s = 0;
  for (let i = 1; i < L; i++) s += xpToNext(i);
  return s;
}
