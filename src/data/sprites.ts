// Kenney Tiny Dungeon / Tiny Town (CC0) 패킹 시트의 프레임 인덱스. 16×16, 가로 12칸.
// 'mon': 커스텀 몬스터 시트(assets/img/monsters.png). 64×64, 가로 10칸 × 세로 3줄.
export type Sheet = 'dun' | 'town' | 'mon';
export interface Spr { sheet: Sheet; frame: number }
const S = (sheet: Sheet, frame: number): Spr => ({ sheet, frame });

export const SP = {
  // 인물
  wizard: S('dun', 84), villager: S('dun', 85), monk: S('dun', 86), viking: S('dun', 87), woman: S('dun', 88),
  knight: S('dun', 96), knight2: S('dun', 97), soldier: S('dun', 98), princess: S('dun', 99), elder: S('dun', 100),
  // 몬스터
  slime: S('dun', 108), cyclops: S('dun', 109), crab: S('dun', 110), hooded: S('dun', 111), ranger: S('dun', 112),
  bat: S('dun', 120), ghost: S('dun', 121), spider: S('dun', 122), rat: S('dun', 123), beast: S('dun', 124),
  // 오브젝트
  chest: S('dun', 89), chestBig: S('dun', 90), chestOpen: S('dun', 91), mimic: S('dun', 92),
  sword: S('dun', 104), dagger: S('dun', 103), shortsword: S('dun', 105), bigsword: S('dun', 106), redsword: S('dun', 107),
  hammer: S('dun', 117), axe2: S('dun', 118), axe: S('dun', 119), wand: S('dun', 129), staff: S('dun', 130), spear: S('dun', 131),
  shieldR: S('dun', 101), shield: S('dun', 102),
  potionW: S('dun', 113), potionG: S('dun', 114), potionR: S('dun', 115), potionB: S('dun', 116),
  vialW: S('dun', 125), vialG: S('dun', 126), vialR: S('dun', 127), vialB: S('dun', 128),
  column: S('dun', 18), columnTop: S('dun', 6), gargoyle: S('dun', 19), gargoyleG: S('dun', 20),
  wellGrey: S('dun', 31), wellGreen: S('dun', 32), banner: S('dun', 29), spikes: S('dun', 41),
  crateDark: S('dun', 54), crate: S('dun', 55), rock: S('dun', 56), tomb1: S('dun', 64), tomb2: S('dun', 65),
  table: S('dun', 72), stool: S('dun', 73), anvil: S('dun', 74), shelf: S('dun', 75), barrelBig: S('dun', 90),
  rubble: S('dun', 24),
  // 마을/자연
  grass: S('town', 0), grass2: S('town', 1), grassFlower: S('town', 2),
  treeOS: S('town', 3), tree: S('town', 4), bush: S('town', 5),
  treeO: S('town', 15), treeG: S('town', 16), sprout: S('town', 17),
  pineO: S('town', 27), pine: S('town', 28), mushroom: S('town', 29),
  cobble: S('town', 43), sign: S('town', 83), fenceH: S('town', 81),
  wellTop: S('town', 92), wellBottom: S('town', 104), coin: S('town', 93), hive: S('town', 94), target: S('town', 95),
  bomb: S('town', 105), log: S('town', 106), sack: S('town', 107), key: S('town', 117), bow: S('town', 118),
  pickaxe: S('town', 115), bucket: S('town', 130), stoneFloor: S('town', 109),
};

export const SHEET_COLS = 12;
export const TILE = 16;
export const SCALE = 3; // 화면 내 캐릭터 높이 약 48px (기획서 14.2)
