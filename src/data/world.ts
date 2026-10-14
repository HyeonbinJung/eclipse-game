// 기획서 2장(월드), 9장(던전·퀘스트)
import { SP, Spr } from './sprites';

export interface Theme {
  groundSheet: 'dun' | 'town'; ground: number[]; groundTint: number; wallFrame: number; wallSheet: 'dun' | 'town'; wallTint: number;
  props: { spr: Spr; tint: number; solid: boolean; scale?: number; w: number }[]; bg: number; ambient: number; fog: number;
}
export interface DungeonDef { id: string; name: string; lv: [number, number]; rooms: string[]; boss: string; reward: string }
export interface ChapterDef {
  id: number; name: string; range: [number, number]; town: string; field: string; hazard: string;
  mid: string; final: string; npcs: [string, string]; conflict: string; ending: string;
  dungeons: [DungeonDef, DungeonDef]; essence: string; theme: Theme; townTheme: Theme; music: number[];
}

const forest: Theme = {
  groundSheet: 'town', ground: [0, 0, 0, 0, 0, 1, 1, 2], groundTint: 0x8fb880, wallSheet: 'town', wallFrame: 16, wallTint: 0x7aa070,
  props: [
    { spr: SP.treeG, tint: 0x8ab880, solid: true, w: 4 }, { spr: SP.pine, tint: 0x88b080, solid: true, w: 4 },
    { spr: SP.bush, tint: 0x90b888, solid: false, w: 3 }, { spr: SP.mushroom, tint: 0xd0a0ff, solid: false, w: 2 },
    { spr: SP.sprout, tint: 0xb0d0a0, solid: false, w: 3 }, { spr: SP.treeO, tint: 0xb0a070, solid: true, w: 1 },
  ], bg: 0x23341f, ambient: 0xffffff, fog: 0x1a2a18,
};
const castle: Theme = {
  groundSheet: 'town', ground: [109], groundTint: 0xb8b0a8, wallSheet: 'dun', wallFrame: 40, wallTint: 0x8a8090,
  props: [
    { spr: SP.tomb1, tint: 0xa8a0b0, solid: true, w: 2 }, { spr: SP.tomb2, tint: 0xa8a0b0, solid: true, w: 1 },
    { spr: SP.crate, tint: 0xc0a080, solid: true, w: 2 }, { spr: SP.crateDark, tint: 0xb0a8b8, solid: true, w: 1 },
    { spr: SP.gargoyle, tint: 0xa098a8, solid: true, w: 1 }, { spr: SP.anvil, tint: 0xb0b0c0, solid: true, w: 1 }, { spr: SP.shelf, tint: 0xc0a080, solid: true, w: 1 },
  ], bg: 0x1d1a24, ambient: 0xe8e0ff, fog: 0x17141d,
};
const ice: Theme = {
  groundSheet: 'town', ground: [109], groundTint: 0xa8c4dc, wallSheet: 'dun', wallFrame: 40, wallTint: 0xa8d8f0,
  props: [
    { spr: SP.pine, tint: 0xd8f4ff, solid: true, w: 4 }, { spr: SP.rock, tint: 0xa8d0f0, solid: true, w: 2 },
    { spr: SP.gargoyle, tint: 0xb8e8ff, solid: true, w: 1 }, { spr: SP.tomb2, tint: 0xc0e0ff, solid: true, w: 1 },
    { spr: SP.rock, tint: 0xd0ecff, solid: true, w: 1 },
  ], bg: 0x18283a, ambient: 0xe0f4ff, fog: 0x10202e,
};
const waste: Theme = {
  groundSheet: 'dun', ground: [48, 48, 48, 48, 42], groundTint: 0xe89a70, wallSheet: 'dun', wallFrame: 40, wallTint: 0x905848,
  props: [
    { spr: SP.treeOS, tint: 0x7a4a30, solid: true, w: 3 }, { spr: SP.rock, tint: 0x8a5040, solid: true, w: 3 },
    { spr: SP.tomb1, tint: 0x906050, solid: true, w: 1 }, { spr: SP.rock, tint: 0xa06848, solid: true, w: 2 },
    { spr: SP.spikes, tint: 0xd07050, solid: false, w: 1 },
  ], bg: 0x2a1610, ambient: 0xffe0d0, fog: 0x24120c,
};
const rift: Theme = {
  groundSheet: 'town', ground: [109], groundTint: 0x7a68b0, wallSheet: 'dun', wallFrame: 40, wallTint: 0x6a50a0,
  props: [
    { spr: SP.gargoyleG, tint: 0xc090ff, solid: true, w: 2 }, { spr: SP.tomb1, tint: 0x9a80d0, solid: true, w: 2 },
    { spr: SP.wellGreen, tint: 0xd0a0ff, solid: true, w: 1 }, { spr: SP.rock, tint: 0x9070d0, solid: true, w: 2 },
    { spr: SP.tomb2, tint: 0x8a70c0, solid: true, w: 1 },
  ], bg: 0x140e24, ambient: 0xe8d8ff, fog: 0x0e0a1a,
};
const townTheme = (tint: number, bg: number): Theme => ({
  groundSheet: 'town', ground: [0, 0, 0, 1, 2], groundTint: tint, wallSheet: 'town', wallFrame: 16, wallTint: tint,
  props: [{ spr: SP.treeG, tint, solid: true, w: 3 }, { spr: SP.bush, tint, solid: false, w: 2 }, { spr: SP.treeO, tint, solid: true, w: 1 }],
  bg, ambient: 0xffffff, fog: bg,
});

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1, name: '망령의 숲', range: [1, 10], town: '나무그늘 야영지', field: '침식의 숲', hazard: '기본 콤보 · 독성 지대',
    mid: 'forest_predator', final: 'root_guardian', npcs: ['추적자 아린', '약초사 리아'],
    conflict: '숲이 무너진 원인은 악령이 아니라 봉인의 첫 균열이었다.', ending: '수호자의 핵에서 왕성의 인장을 발견했다.',
    dungeons: [
      { id: 'd1a', name: '포자 늪굴', lv: [4, 7], rooms: ['n', 'n', 'n', 'e'], boss: 'forest_predator', reward: '숲 정수 / 장갑' },
      { id: 'd1b', name: '고목의 심장', lv: [8, 10], rooms: ['n', 'n', 'p', 'n'], boss: 'root_guardian', reward: '고목 증표 / 희귀 무기' },
    ],
    essence: '숲 정수', theme: forest, townTheme: townTheme(0xb8e0a8, 0x22331e), music: [57, 60, 64, 67],
  },
  {
    id: 2, name: '몰락한 왕성', range: [11, 20], town: '재의 요새', field: '잿빛 성채', hazard: '방패 · 패링 · 돌진',
    mid: 'black_captain', final: 'fallen_king', npcs: ['망명 기사 레온', '기록관 이사'],
    conflict: '기사왕은 균열을 막으려 자신을 봉인했으나 역으로 타락했다.', ending: '기사왕의 검에서 빙하 지도가 나타났다.',
    dungeons: [
      { id: 'd2a', name: '잿빛 병영', lv: [14, 17], rooms: ['n', 'n', 'n', 'n'], boss: 'black_captain', reward: '왕성 휘장 / 방패 룬' },
      { id: 'd2b', name: '왕의 대전', lv: [18, 20], rooms: ['n', 'n', 'e'], boss: 'fallen_king', reward: '왕실 인장 / 영웅 장갑' },
    ],
    essence: '왕성 정수', theme: castle, townTheme: townTheme(0xc8c8b0, 0x221e1c), music: [50, 53, 57, 60],
  },
  {
    id: 3, name: '얼어붙은 심연', range: [21, 30], town: '광산 거점', field: '빙하동굴', hazard: '빙결 · 빙판 · 투사체',
    mid: 'frost_hunter', final: 'frost_queen', npcs: ['빙하 학자 세라', '광부 칸'],
    conflict: '서리 여왕은 시간을 늦춰 균열의 확산을 막고 있었다.', ending: '여왕의 눈물로 다음 균열의 위치를 확인했다.',
    dungeons: [
      { id: 'd3a', name: '서리 협곡', lv: [24, 27], rooms: ['n', 'n', 'n', 't'], boss: 'frost_hunter', reward: '빙하 정수 / 빙결 반지' },
      { id: 'd3b', name: '영원의 궁전', lv: [28, 30], rooms: ['p', 'n', 'p', 'n'], boss: 'frost_queen', reward: '여왕의 눈물 / 영웅 신발' },
    ],
    essence: '빙하 정수', theme: ice, townTheme: townTheme(0xd8ecf0, 0x1a2630), music: [52, 55, 59, 62],
  },
  {
    id: 4, name: '타오르는 황무지', range: [31, 40], town: '황동 피난소', field: '화산 성역', hazard: '화상 · 장판 · 연속 강공격',
    mid: 'lava_predator', final: 'immortal_avatar', npcs: ['화산 장인 루크', '봉인사 마야'],
    conflict: '불멸의 화신은 왕의 실험이 낳은 인공 수호자였다.', ending: '화염 핵으로 차원 관문을 기동했다.',
    dungeons: [
      { id: 'd4a', name: '잿불 동굴', lv: [34, 37], rooms: ['n', 'n', 't'], boss: 'lava_predator', reward: '마그마 정수 / 화염 룬' },
      { id: 'd4b', name: '화산 제단', lv: [38, 40], rooms: ['n', 'n', 'p'], boss: 'immortal_avatar', reward: '불멸의 재 / 전설 재료' },
    ],
    essence: '마그마 정수', theme: waste, townTheme: townTheme(0xe8c8a0, 0x2a1c14), music: [49, 50, 53, 56],
  },
  {
    id: 5, name: '균열의 심장', range: [41, 50], town: '최후의 전초기지', field: '공허의 사원', hazard: '차원 균열 · 복합 패턴',
    mid: 'void_executor', final: 'rift_lord', npcs: ['기록자 오르', '배신자 에테르'],
    conflict: '군주의 정체는 침략자가 아닌, 균열을 만든 최초의 연구자였다.', ending: '균열을 봉인할 것인가, 재건할 것인가.',
    dungeons: [
      { id: 'd5a', name: '차원의 틈', lv: [44, 47], rooms: ['n', 'n', 'n', 'e'], boss: 'void_executor', reward: '균열석 / 유물 조각' },
      { id: 'd5b', name: '최후의 성소', lv: [48, 50], rooms: ['n', 'n', 'n', 'p'], boss: 'rift_lord', reward: '군주 코어 / 전설 유물' },
    ],
    essence: '균열 정수', theme: rift, townTheme: townTheme(0xc0b0e0, 0x1a1428), music: [48, 51, 54, 57],
  },
];
export const chapterOfLevel = (L: number) => Math.min(5, Math.max(1, Math.ceil(L / 10)));

// 9.2 메인 퀘스트 50개
export type QType = 'markers' | 'villager' | 'material' | 'checkpoints' | 'clues' | 'devices' | 'elites' | 'chest' | 'seals' | 'boss';
const QT: { t: QType; need: number; cond: string }[] = [
  { t: 'markers', need: 3, cond: '필드 표식 3개' }, { t: 'villager', need: 1, cond: '주민 1명' }, { t: 'material', need: 5, cond: '재료 5개' },
  { t: 'checkpoints', need: 2, cond: 'NPC 체크포인트 2개' }, { t: 'clues', need: 4, cond: '단서 4개' }, { t: 'devices', need: 2, cond: '장치 2개' },
  { t: 'elites', need: 2, cond: '정예 2마리' }, { t: 'chest', need: 1, cond: '열쇠 보관함 1개' }, { t: 'seals', need: 3, cond: '봉인 오브젝트 3개' },
  { t: 'boss', need: 1, cond: '챕터 보스 1마리' },
];
const QNAMES = [
  '첫 발자국', '사라진 약초사', '버섯의 독', '숲속 피난민', '악령의 흔적', '고목의 뿌리', '추적자의 맹세', '수호의 열쇠', '마지막 봉인', '수호자와의 결전',
  '불탄 성문', '잃어버린 문장', '용병단의 보급', '감옥의 전령', '왕성의 기록', '저주의 기원', '검은 대장의 도전', '정예 기사 수색', '왕의 검 복원', '마지막 왕좌',
  '빙하의 시작', '광산의 구조신호', '수정 채굴', '끊어진 다리', '동결된 기록', '얼음의 봉인', '추적자 격파', '여왕의 회랑', '서리 속 진실', '여왕의 최후',
  '뜨거운 재의 길', '피난소의 불씨', '화산 재료 확보', '장인의 심부름', '폭발의 흔적', '제단의 봉인', '포식자의 흔적', '용암 핵 채굴', '영원의 불꽃', '화신의 소멸',
  '차원 마지막 선', '실종된 정찰대', '공허의 잔재', '전초기지 철수', '차원 지도 복원', '심연 관측', '집행관의 그림자', '마지막 열쇠', '진실의 문', '균열의 군주',
];
const QXP = [
  26, 39, 55, 73, 94, 117, 142, 170, 200, 514, 268, 306, 346, 389, 434, 481, 531, 583, 638, 1534,
  755, 817, 882, 949, 1018, 1090, 1164, 1241, 1321, 3094, 1487, 1573, 1662, 1754, 1848, 1944, 2043, 2144, 2248, 5194,
  2463, 2574, 2688, 2804, 2922, 3043, 3166, 3292, 3421, 0,
];
const QREW = ['정수', '상자', '포션'];
export interface MainQuest { lv: number; ch: number; name: string; type: QType; need: number; cond: string; xp: number; reward: string }
export const MAIN_QUESTS: MainQuest[] = QNAMES.map((n, i) => {
  const ch = Math.floor(i / 10) + 1; const q = QT[i % 10];
  // 추가 보상은 기획서 표의 순서(정수/상자/포션 반복)를 그대로 따른다
  return { lv: i + 1, ch, name: `${CHAPTERS[ch - 1].name} — ${n}`, type: q.t, need: q.need, cond: q.cond, xp: QXP[i], reward: QREW[i % 3] };
});

// 9.3 사이드 퀘스트 20종
export type SType = 'kill' | 'material' | 'elite' | 'event';
export interface SideQuest { id: string; ch: number; type: SType; need: number; cond: string; rec: [number, number] }
export const SIDE_QUESTS: SideQuest[] = [];
CHAPTERS.forEach((c, ci) => {
  const rec: [number, number] = [c.range[0] + 2, c.range[1]];
  const defs: [SType, number, string][] = [['kill', 12, '지역 일반 적 12마리'], ['material', 6, '특수 재료 6개'], ['elite', 2, '엘리트 2마리'], ['event', 1, '지역 이벤트 방 1회 완료']];
  defs.forEach(([t, n, cond], k) => SIDE_QUESTS.push({ id: 'S' + String(ci * 4 + k + 1).padStart(2, '0'), ch: c.id, type: t, need: n, cond, rec }));
});

export const STORY: Record<number, { intro: string[]; outro: string[] }> = {
  1: {
    intro: ['추적자 아린: 숲이 썩어가고 있어. 마을 사람들은 악령의 짓이라지만… 난 믿지 않아.', '약초사 리아: 독기가 퍼지는 곳을 따라가 보세요. 숲의 뿌리가 무언가를 감추고 있어요.'],
    outro: ['추적자 아린: 악령이 아니었어… 이건 봉인의 첫 균열이야.', '수호자의 핵 속에서 왕성의 인장이 빛난다. 다음 행선지는 몰락한 왕성이다.'],
  },
  2: {
    intro: ['망명 기사 레온: 왕성은 재가 되었다. 하지만 왕은… 아직 그곳에 있다.', '기록관 이사: 기록에 따르면, 왕은 무언가를 막기 위해 스스로를 봉인했다고 합니다.'],
    outro: ['망명 기사 레온: 폐하는 균열을 막으려다… 그 자신이 균열이 되셨군.', '기사왕의 검에 서린 서리 속에서 빙하의 지도가 떠오른다.'],
  },
  3: {
    intro: ['빙하 학자 세라: 이 얼음은 자연의 것이 아니에요. 시간이 멈춘 것처럼 느려져 있어요.', '광부 칸: 갱도 깊은 곳에서 여왕의 노래가 들려. 들으면 몸이 굳어버리지.'],
    outro: ['빙하 학자 세라: 여왕은… 균열의 확산을 늦추고 있었던 거예요.', '여왕의 눈물이 다음 균열의 위치를 가리킨다. 타오르는 황무지.'],
  },
  4: {
    intro: ['화산 장인 루크: 저 불꽃은 꺼지지 않아. 누군가 만든 불이니까.', '봉인사 마야: 불멸의 화신… 왕의 실험이 낳은 인공 수호자예요.'],
    outro: ['봉인사 마야: 화염 핵이 차원 관문을 깨웠어요. 이제 균열의 심장으로 갈 수 있어요.', '하늘이 갈라지고, 보라빛 공허가 손짓한다.'],
  },
  5: {
    intro: ['기록자 오르: 군주는 멀리서 온 침략자가 아니야. 그는… 균열을 처음 연 연구자였지.', '배신자 에테르: 나를 믿든 말든 상관없어. 군주의 사원으로 가는 길은 내가 안다.'],
    outro: ['균열의 군주가 무너진다. 갈라진 하늘 아래에서 선택의 순간이 다가온다.'],
  },
};
