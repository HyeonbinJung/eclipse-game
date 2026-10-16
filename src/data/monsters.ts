// 기획서 7장 — 일반 몬스터 30종. 표의 대표 레벨 수치로 종별 배율을 역산해 다른 레벨에서도 공식으로 재산출한다.
import { SP, Spr } from './sprites';
import { enemyAtkBase, enemyDefBase, enemyHpBase, R } from './formulas';

export type Kind =
  | 'melee' | 'hopper' | 'charger' | 'ranged' | 'turret' | 'blinker' | 'brute' | 'shield'
  | 'caster' | 'duelist' | 'swarm' | 'exploder' | 'lobber' | 'healer' | 'lancer' | 'barrage';

export interface MonsterDef {
  id: string; name: string; ch: number; lv: number; hp: number; atk: number; def: number;
  kind: Kind; desc: string; spr: Spr; tint: number; scale: number; speed: number;
  status?: 'poison' | 'burn' | 'chill' | 'slow';
  mHp?: number; mAtk?: number; mDef?: number;
}

const M = (id: string, name: string, ch: number, lv: number, hp: number, atk: number, def: number, kind: Kind, desc: string, spr: Spr, tint: number, scale = 1, speed = 110, status?: MonsterDef['status']): MonsterDef =>
  ({ id, name, ch, lv, hp, atk, def, kind, desc, spr, tint, scale, speed, status });

export const MONSTERS: MonsterDef[] = [
  // I 망령의 숲
  M('shroom', '침식된 버섯', 1, 2, 75, 12, 6, 'hopper', '점프 후 300ms 공격', SP.mushroom, 0xd8a8ff, 1, 95),
  M('wolf', '독니 늑대', 1, 4, 127, 19, 8, 'charger', '돌진 예고 600ms', SP.beast, 0x9ad07a, 1, 130, 'poison'),
  M('ghost_archer', '망령 궁수', 1, 6, 133, 26, 8, 'ranged', '직선 화살 2연사', SP.ghost, 0xb8ffe0, 1, 100),
  M('root', '뿌리 촉수', 1, 7, 274, 25, 14, 'turret', '원형 범위 제한', SP.sprout, 0xa07850, 1.3, 0),
  M('ghost_thief', '유령 도적', 1, 8, 224, 33, 11, 'blinker', '측면 80px 순간이동', SP.hooded, 0x9aa8c0, 1, 120),
  M('giant', '숲의 거인', 1, 9, 442, 42, 18, 'brute', '느린 900ms 강공격', SP.cyclops, 0x88b878, 1.45, 80),
  // II 몰락한 왕성
  M('rusty', '녹슨 병사', 2, 12, 384, 42, 20, 'shield', '전면 방어 45%', SP.knight2, 0xd09870, 1, 95),
  M('wall_archer', '성벽 궁수', 2, 14, 363, 61, 15, 'ranged', '화살 관통 2타깃', SP.ranger, 0xc8c0b0, 1, 100),
  M('hound', '검은 사냥개', 2, 16, 515, 68, 17, 'charger', '돌진/회피', SP.beast, 0x55556a, 1.05, 145),
  M('curse_mage', '저주 마도사', 2, 17, 512, 72, 16, 'caster', '검은 장판', SP.hooded, 0x8a60c8, 1, 90, 'poison'),
  M('phantom', '갑주 유령', 2, 18, 879, 71, 31, 'duelist', '패링 유도 2연속', SP.knight, 0x9aa8ff, 1.1, 100),
  M('guard', '성채 수호병', 2, 19, 1074, 89, 31, 'brute', '넉백 충격파', SP.cyclops, 0xa8a8a8, 1.45, 80),
  // III 얼어붙은 심연
  M('frostbug', '결빙 벌레', 3, 22, 699, 84, 21, 'swarm', '냉기 둔화', SP.spider, 0xa8ecff, 0.9, 150, 'chill'),
  M('snow_spirit', '눈송이 정령', 3, 24, 839, 106, 25, 'ranged', '빙결 구체', SP.slime, 0xeaffff, 1, 95, 'chill'),
  M('ice_knight', '빙벽 기사', 3, 26, 1322, 110, 41, 'shield', '가드 브레이크 튜토리얼', SP.knight, 0xb0e8ff, 1.1, 90),
  M('panther', '빙하 표범', 3, 27, 1000, 141, 25, 'charger', '3연속 돌진', SP.beast, 0xf0f8ff, 1.05, 150),
  M('frost_mage', '서리술사', 3, 28, 1048, 133, 26, 'caster', '빙판 생성', SP.wizard, 0x90c8ff, 1, 90, 'chill'),
  M('ice_golem', '얼음 골렘', 3, 29, 2011, 159, 46, 'brute', '팔 휘두르기/낙하', SP.cyclops, 0x98dcff, 1.55, 75),
  // IV 타오르는 황무지
  M('ash_dead', '재의 망자', 4, 32, 1344, 148, 33, 'melee', '화상 부착', SP.ghost, 0xc09070, 1, 105, 'burn'),
  M('locust', '화염 메뚜기', 4, 34, 1169, 175, 28, 'exploder', '사망 폭발', SP.bat, 0xffa050, 0.95, 140, 'burn'),
  M('lava_hound', '용암 사냥개', 4, 36, 1695, 206, 34, 'charger', '연속 도약', SP.beast, 0xff7040, 1.05, 145, 'burn'),
  M('thrower', '작열 투척병', 4, 37, 1505, 210, 30, 'lobber', '용암병 투척', SP.monk, 0xff9a70, 1, 95, 'burn'),
  M('beetle', '화산 갑충', 4, 38, 2387, 193, 60, 'shield', '전면 외피 강화', SP.crab, 0xe07040, 1.15, 85),
  M('colossus', '불의 거상', 4, 39, 3075, 260, 55, 'brute', '십자 장판/슬램', SP.cyclops, 0xff6a30, 1.65, 75, 'burn'),
  // V 균열의 심장
  M('shard', '균열 파편수', 5, 42, 1727, 229, 39, 'blinker', '순간 점멸', SP.bat, 0xd090ff, 1, 130),
  M('stalker', '공허 추적자', 5, 44, 2183, 277, 45, 'blinker', '뒤잡기', SP.hooded, 0x7a5ad0, 1.05, 135),
  M('priest', '심연의 사제', 5, 46, 2018, 282, 41, 'healer', '적 회복 3%/2s', SP.wizard, 0xa070e0, 1, 90),
  M('lancer', '차원 창병', 5, 47, 2612, 296, 57, 'lancer', '직선 관통 찌르기', SP.soldier, 0xb080ff, 1.05, 100),
  M('void_mage', '공허 마도사', 5, 48, 2194, 332, 45, 'barrage', '3중 탄막', SP.hooded, 0xe070ff, 1, 90),
  M('rift_giant', '균열 거병', 5, 49, 4377, 394, 70, 'brute', '원형 분쇄/장판', SP.cyclops, 0x9a60f0, 1.7, 75),
];

// 커스텀 몬스터 시트(assets/img/monsters.png)의 칸 순서. 64×64, 바닥 기준 62행(마지막 행 여백)
export const MON_SHEET = 'mon', MON_SRC = 'assets/img/monsters.png', MON_CELL = 64, MON_SCALE = 1.5;
const MON_CELLS = [
  'shroom', 'wolf', 'ghost_archer', 'root', 'ghost_thief', 'giant', 'rusty', 'wall_archer', 'hound', 'curse_mage',
  'phantom', 'guard', 'frostbug', 'snow_spirit', 'ice_knight', 'panther', 'frost_mage', 'ice_golem', 'ash_dead', 'locust',
  'lava_hound', 'thrower', 'beetle', 'colossus', 'shard', 'stalker', 'priest', 'lancer', 'void_mage', 'rift_giant',
];

for (const m of MONSTERS) {
  const cell = MON_CELLS.indexOf(m.id);
  if (cell >= 0) m.spr = { sheet: 'mon', frame: cell };
  m.mHp = m.hp / enemyHpBase(m.lv);
  m.mAtk = m.atk / enemyAtkBase(m.lv);
  m.mDef = m.def / enemyDefBase(m.lv);
}
export const MON: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

export function monsterStats(def: MonsterDef, L: number, elite = false) {
  const hp = R(enemyHpBase(L) * def.mHp!) * (elite ? 4 : 1);
  const atk = R(enemyAtkBase(L) * def.mAtk! * (elite ? 1.45 : 1));
  const dfn = R(enemyDefBase(L) * def.mDef! * (elite ? 1.25 : 1));
  const poise = R((18 + L * 1.2) * (def.kind === 'brute' || def.kind === 'shield' ? 1.6 : 1) * (elite ? 2.3 : 1));
  return { hp, atk, def: dfn, poise };
}

// 7.2 지역별 필드 기본 그룹
export const FIELD_GROUPS: Record<number, string[][]> = {
  1: [['shroom', 'shroom'], ['shroom', 'shroom', 'wolf'], ['ghost_archer', 'wolf', 'shroom'], ['root', 'ghost_thief'], ['giant', 'shroom', 'shroom']],
  2: [['rusty', 'wall_archer', 'hound'], ['curse_mage', 'rusty', 'hound'], ['phantom', 'hound'], ['guard', 'rusty']],
  3: [['snow_spirit', 'snow_spirit', 'ice_knight'], ['frostbug', 'frostbug', 'frostbug', 'panther'], ['frost_mage', 'ice_knight'], ['ice_golem', 'frostbug', 'frostbug']],
  4: [['locust', 'locust', 'locust', 'beetle'], ['ash_dead', 'ash_dead', 'thrower'], ['lava_hound', 'ash_dead'], ['colossus', 'locust', 'locust']],
  5: [['lancer', 'void_mage', 'stalker'], ['shard', 'shard', 'priest'], ['stalker', 'lancer'], ['rift_giant', 'shard']],
};
