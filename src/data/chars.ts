// 커스텀 캐릭터 시트(assets/img/chars.png). 프레임 32×48, 가로 10칸 × 세로 2줄 = 320×96.
// 시트가 없거나 프레임이 모자라면 기존 Kenney 의상(OUTFITS)으로 자동 대체된다.
export const CHAR_SHEET = 'chars';
export const CHAR_SRC = 'assets/img/chars.png';
export const CHAR_W = 32, CHAR_H = 48;
export const CHAR_SCALE = 1.5; // 화면 내 약 48×72px
export const CHAR_ORIGIN_Y = 47 / 48; // 발바닥 = 46행(맨 아래 1행은 여백)
// 무기를 쥐는 손 위치(시트 픽셀, 오른쪽을 보는 기준) → 발 기준점에서의 화면 오프셋
const HAND_PX = { x: 23, y: 30 };
export const CHAR_HAND = { x: (HAND_PX.x - CHAR_W / 2) * CHAR_SCALE, y: (HAND_PX.y - CHAR_H * CHAR_ORIGIN_Y) * CHAR_SCALE };

// weapon: false → 그림에 무기가 포함돼 있어 엔진 무기를 덧그리지 않음
export interface CharDef { id: string; name: string; frame: number; weapon?: boolean }

// 이름은 디자인 시트 순서대로 붙인 임시 이름
export const CHARS: CharDef[] = [
  { id: 'redhood', name: '빨간 망토', frame: 0 },
  { id: 'apple', name: '사과', frame: 1 },
  { id: 'bride', name: '딸기 신부', frame: 2 },
  { id: 'pumpkin_king', name: '호박 왕', frame: 3 },
  { id: 'tomato', name: '토마토', frame: 4 },
  { id: 'broccoli', name: '브로콜리', frame: 5 },
  { id: 'durian', name: '두리안', frame: 6 },
  { id: 'goldfish', name: '금붕어', frame: 7 },
  { id: 'frost', name: '서리 공주', frame: 8 },
  { id: 'redhair', name: '붉은 머리 검사', frame: 9, weapon: false },
  { id: 'pinkhair', name: '분홍 머리', frame: 10 },
  { id: 'whitecat', name: '흰 고양이', frame: 11 },
  { id: 'lemon', name: '레몬 기사', frame: 12, weapon: false },
  { id: 'strawberry_mage', name: '딸기 마법사', frame: 13, weapon: false },
  { id: 'witch', name: '보라 마녀', frame: 14 },
  { id: 'tangerine', name: '귤 전사', frame: 15 },
  { id: 'pepper', name: '고추 기사', frame: 16 },
  { id: 'grape', name: '포도', frame: 17 },
  { id: 'mushroom', name: '버섯', frame: 18 },
  { id: 'carrot', name: '당근 궁수', frame: 19, weapon: false },
];
export const CHAR_BY_ID: Record<string, CharDef> = Object.fromEntries(CHARS.map((c) => [c.id, c]));

// 직업별 기본 캐릭터
export const CLASS_DEFAULT_CHAR: Record<string, string> = { blade: 'lemon', fist: 'durian', mage: 'witch', ranger: 'carrot', lancer: 'tangerine' };
