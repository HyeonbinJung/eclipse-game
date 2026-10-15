// 캐릭터 고유 직업 20종. 전투 로직은 기본 계열(base) 5종을 공유하고,
// 직업마다 기술 이름·범위·속성, 시그니처 상태이상, 스탯 성향, 콤보 이름을 따로 갖는다.
import type { ClassDef, Move, BaseId, StatMods } from './classes';

type MoveMod = { name: string } & Partial<Omit<Move, 'id' | 'name'>>;
interface JobSpec {
  id: string; char: string; base: BaseId; name: string; en: string; role: string; desc: string;
  resName?: string; color: number; weaponNoun: string; weapons: [string, string, string]; mods?: StatMods;
  L: [string, string, string]; H: string | MoveMod; Q: MoveMod; E: MoveMod; R: MoveMod; C?: string;
  sig?: string[]; // L3·H에 추가되는 시그니처 효과
  combos: [string, string, string, string, string]; // LLL · LLH · LHH · DLH · FLH
}

const P = (tex: string, tint: number, o: Partial<{ range: number; speed: number; r: number; pierce: boolean; explode: number }> = {}) =>
  ({ t: 'proj' as const, range: o.range ?? 340, speed: o.speed ?? 640, r: o.r ?? 18, pierce: o.pierce, explode: o.explode, tex, tint });

const SPECS: JobSpec[] = [
  // ───────── 검 계열 ─────────
  {
    id: 'lemon', char: 'lemon', base: 'blade', name: '시트러스 나이트', en: 'Citrus Knight', role: '근접 중량형 · 일격 경직',
    desc: '양손 대검을 휘두르는 레몬 기사. 느리지만 한 방 한 방이 적을 무너뜨린다.',
    resName: '과즙', color: 0xfff06a, weaponNoun: '대검', weapons: ['양손 대검', '시트러스 클레이모어', '과즙 대검'],
    mods: { atk: 1.05, hp: 1.05, atkSpd: -0.05 },
    L: ['시트러스 베기', '과즙 베기', '레몬 슬래시'], H: { name: '대검 내려찍기', shape: { t: 'rect', len: 130, w: 80 } },
    Q: { name: '산성 회전베기', shape: { t: 'circle', r: 130, at: 'self' }, eff: ['knock', 'defDown'] },
    E: { name: '레몬즙 파동', shape: P('fx_slash', 0xfff27a, { range: 300, speed: 760, r: 26, pierce: true }), eff: ['slow'] },
    R: { name: '시트러스 폭풍', hits: 6, interval: 0.22, coef: 1.33, shape: { t: 'circle', r: 160, at: 'self' } },
    combos: ['삼단 압착', '상큼 승천', '과육 분쇄', '노란 섬광', '반격의 신맛'],
  },
  {
    id: 'redhair', char: 'redhair', base: 'blade', name: '홍련 검객', en: 'Crimson Duelist', role: '근접 고속 · 출혈 누적',
    desc: '붉은 머리칼처럼 빠른 세검술. 베일 때마다 출혈을 쌓는다.',
    resName: '혈기', color: 0xff5a5a, weaponNoun: '세검', weapons: ['세검', '홍련검', '적월도'],
    mods: { atkSpd: 0.06, crit: 0.03, hp: 0.95 }, sig: ['bleed'],
    L: ['홍련 1식', '홍련 2식', '홍련 3식'], H: { name: '혈화 찌르기', shape: { t: 'rect', len: 130, w: 40 } },
    Q: { name: '붉은 반월', shape: { t: 'cone', r: 150, ang: 200 }, eff: ['bleed', 'stagger'] },
    E: { name: '혈선', shape: { t: 'rect', len: 220, w: 50 }, lunge: 30, eff: ['bleed'] },
    R: { name: '천홍난무', hits: 10, interval: 0.14, coef: 0.8 },
    combos: ['홍련 삼연', '핏빛 승천', '혈흔 분쇄', '붉은 그림자', '역린의 칼'],
  },
  {
    id: 'pumpkin', char: 'pumpkin_king', base: 'blade', name: '호박 군주', en: 'Pumpkin Monarch', role: '근접 탱커 · 광역 화상',
    desc: '수확의 왕홀검으로 넓게 휩쓴다. 단단하지만 발이 느리다.',
    resName: '위엄', color: 0xff9a30, weaponNoun: '왕홀검', weapons: ['왕홀검', '호박 왕검', '수확의 낫검'],
    mods: { hp: 1.12, def: 1.1, atk: 0.97, move: -10 },
    L: ['왕의 일격', '왕의 이격', '왕홀 강타'], H: { name: '왕관 낙하', shape: { t: 'circle', r: 105, at: 'self' }, eff: ['stagger', 'knock'] },
    Q: { name: '등불 휘두르기', shape: { t: 'cone', r: 150, ang: 240 }, eff: ['burn', 'knock'] },
    E: { name: '잭오랜턴', shape: P('fx_flame', 0xff9a30, { range: 320, speed: 520, r: 22, explode: 90 }), eff: ['burn'] },
    R: { name: '할로윈 칙령', hits: 6, interval: 0.24, coef: 1.33, shape: { t: 'circle', r: 180, at: 'self' }, eff: ['burn'] },
    combos: ['왕실 삼연', '수확의 승천', '왕좌 분쇄', '군주의 돌진', '왕의 반격'],
  },
  {
    id: 'pepper', char: 'pepper', base: 'blade', name: '고추 기사', en: 'Chili Knight', role: '근접 공격형 · 화상 특화',
    desc: '매운맛을 칼날에 실었다. 모든 마무리 공격이 불을 붙인다.',
    resName: '열기', color: 0xff4a30, weaponNoun: '불꽃검', weapons: ['불꽃검', '고추 장검', '홍염검'],
    mods: { atk: 1.04, def: 0.95 }, sig: ['burn'],
    L: ['매운 베기', '화끈 베기', '불꽃 가르기'], H: '청양 분쇄',
    Q: { name: '작열 반월', eff: ['burn', 'knock'] },
    E: { name: '화염 검풍', shape: P('fx_flame', 0xff5030, { range: 300, speed: 700, r: 24, pierce: true }), eff: ['burn'] },
    R: { name: '캡사이신 폭발', shape: { t: 'circle', r: 150, at: 'self' }, eff: ['burn'] },
    combos: ['삼단 화끈', '불기둥 승천', '매운 분쇄', '화염 질주', '불꽃 반격'],
  },
  // ───────── 격투 계열 ─────────
  {
    id: 'durian', char: 'durian', base: 'fist', name: '가시 투사', en: 'Thorn Brawler', role: '근접 탱커 · 가시 출혈',
    desc: '온몸이 가시인 두리안 투사. 맞을수록 단단해지고 때릴수록 피를 낸다.',
    resName: '가시', color: 0xd8c040, weaponNoun: '가시 너클', weapons: ['가시 너클', '두리안 권갑', '철가시 건틀릿'],
    mods: { hp: 1.1, def: 1.08, atkSpd: -0.04 }, sig: ['bleed'],
    L: ['가시 잽', '가시 훅', '가시 어퍼'], H: { name: '두리안 박치기', eff: ['stagger', 'knock'] },
    Q: { name: '가시 폭발', shape: { t: 'circle', r: 130, at: 'self' }, eff: ['bleed', 'knock'] },
    E: { name: '냄새 충격파', shape: { t: 'rect', len: 170, w: 100 }, eff: ['guardBreak', 'slow'] },
    R: { name: '천 개의 가시', shape: { t: 'circle', r: 140, at: 'self' }, eff: ['bleed'] },
    combos: ['가시 연타', '가시 승천', '철갑 분쇄', '굴러오는 가시', '가시 반격'],
  },
  {
    id: 'tangerine', char: 'tangerine', base: 'fist', name: '귤 권사', en: 'Tangerine Monk', role: '근접 고속 · 연타',
    desc: '껍질을 벗기듯 빠르게 몰아친다. 공격 속도가 가장 빠른 권사.',
    resName: '비타민', color: 0xffa040, weaponNoun: '귤 너클', weapons: ['귤 너클', '감귤 권갑', '황금 건틀릿'],
    mods: { atkSpd: 0.08, hp: 0.97 },
    L: ['귤 잽', '귤 스트레이트', '껍질 깨기'], H: '과즙 폭발권',
    Q: { name: '회전 귤권' },
    E: { name: '오렌지 러시', shape: { t: 'rect', len: 190, w: 80 }, lunge: 30, eff: ['guardBreak'] },
    R: { name: '감귤 난타', hits: 12, interval: 0.14, coef: 0.64 },
    combos: ['귤 연환', '과즙 승천', '알맹이 분쇄', '오렌지 질주', '껍질 반격'],
  },
  {
    id: 'apple', char: 'apple', base: 'fist', name: '애플 복서', en: 'Apple Boxer', role: '근접 치명 · 끌어당김',
    desc: '사과가 떨어지듯 적을 끌어당겨 한 방에 날린다. 치명타가 높다.',
    resName: '근성', color: 0xff4050, weaponNoun: '글러브', weapons: ['복싱 글러브', '사과 권갑', '홍옥 너클'],
    mods: { crit: 0.05 }, sig: ['knock'],
    L: ['레드 잽', '레드 크로스', '풋사과 훅'], H: '사과 폭탄 펀치',
    Q: { name: '만유인력', shape: { t: 'circle', r: 130, at: 'self' }, eff: ['pull', 'stagger'] },
    E: { name: '애플 어퍼', shape: { t: 'rect', len: 120, w: 80 }, eff: ['launch', 'guardBreak'] },
    R: { name: '황금 사과 러시' },
    combos: ['원투 훅', '애플 어퍼컷', '홍옥 분쇄', '사이드 스텝', '카운터 펀치'],
  },
  {
    id: 'whitecat', char: 'whitecat', base: 'fist', name: '냥권사', en: 'Paw Fighter', role: '근접 기동 · 할퀴기',
    desc: '날렵한 발톱 무술. 빠르게 뛰어들어 할퀴고 빠진다. 체력은 낮다.',
    resName: '야성', color: 0xf0e8ff, weaponNoun: '발톱', weapons: ['고양이 발톱', '은빛 클로', '묘권갑'],
    mods: { move: 15, atkSpd: 0.05, hp: 0.92 }, sig: ['bleed'],
    L: ['냥냥 펀치', '할퀴기', '고양이 발톱'], H: '꾹꾹이 폭격',
    Q: { name: '털 뭉치 회오리', shape: { t: 'circle', r: 120, at: 'self' }, eff: ['pull', 'bleed'] },
    E: { name: '고양이 도약', shape: { t: 'circle', r: 100, at: 'aim', maxDist: 240 }, eff: ['leap', 'stagger'] },
    R: { name: '아홉 목숨 난무' },
    combos: ['냥냥 연타', '꼬리 승천', '발톱 분쇄', '그림자 도약', '고양이 반격'],
  },
  // ───────── 마법 계열 ─────────
  {
    id: 'berrymage', char: 'strawberry_mage', base: 'mage', name: '딸기 마도사', en: 'Berry Sorceress', role: '중거리 폭발 · 화상',
    desc: '달콤한 딸기잼 마법을 터뜨린다. 폭발 범위가 넓다.',
    color: 0xff6a8a, weaponNoun: '오브', weapons: ['딸기 오브', '베리 완드', '설탕 마도구'], sig: ['burn'],
    L: ['딸기탄', '잼탄', '딸기 폭탄'], H: '딸기잼 폭발',
    Q: { name: '스트로베리 메테오', shape: P('fx_flame', 0xff5a7a, { range: 380, speed: 520, r: 20, explode: 110 }), eff: ['burn'] },
    E: { name: '설탕 결정창', shape: P('fx_trace', 0xffd0e0, { range: 360, speed: 820, pierce: true }), eff: ['slow'] },
    R: { name: '딸기 유성우' },
    combos: ['딸기 연사', '잼 폭발', '과육 파열', '달콤한 잔광', '역류하는 단맛'],
  },
  {
    id: 'witch', char: 'witch', base: 'mage', name: '보라 마녀', en: 'Hex Witch', role: '중거리 저주 · 독',
    desc: '저주와 독으로 적을 서서히 무너뜨린다. 방어력을 깎는 데 특화.',
    color: 0xa060ff, weaponNoun: '마녀 지팡이', weapons: ['마녀의 지팡이', '해골 완드', '저주 마도서'], sig: ['poison'],
    L: ['저주탄', '독안개탄', '마녀의 손짓'], H: '독 웅덩이',
    Q: { name: '저주 솥 폭발', shape: P('fx_magic', 0xb060ff, { range: 360, speed: 500, r: 20, explode: 100 }), eff: ['poison', 'defDown'] },
    E: { name: '그림자 가시', shape: P('fx_trace', 0x8a50d0, { range: 360, speed: 820, pierce: true }), eff: ['poison', 'slow'] },
    R: { name: '발푸르기스의 밤', eff: ['poison'] },
    combos: ['저주 연사', '마녀의 폭발', '연쇄 저주', '그림자 폭풍', '저주 역류'],
  },
  {
    id: 'frost', char: 'frost', base: 'mage', name: '서리 공주', en: 'Frost Princess', role: '중거리 제어 · 빙결',
    desc: '닿는 모든 것을 얼린다. 적의 발을 묶어 거리를 지배한다.',
    color: 0xbfe8ff, weaponNoun: '서리 지팡이', weapons: ['서리 지팡이', '빙정 완드', '겨울 왕관봉'],
    mods: { def: 1.05 }, sig: ['chill'],
    L: ['눈송이', '얼음 조각', '빙결탄'], H: '서리꽃',
    Q: { name: '눈보라 구체', shape: P('fx_light', 0xbff0ff, { range: 360, speed: 480, r: 22, explode: 100 }), eff: ['chill'] },
    E: { name: '빙결창', eff: ['chill'] },
    R: { name: '영원의 겨울', hits: 7, interval: 0.22, coef: 1.11, eff: ['chill'] },
    combos: ['눈송이 연사', '서리 폭발', '연쇄 빙결', '눈보라 잔광', '얼음 역류'],
  },
  {
    id: 'grape', char: 'grape', base: 'mage', name: '포도 주술사', en: 'Vine Shaman', role: '중거리 다연발 · 독',
    desc: '포도송이처럼 여러 발을 흩뿌린다. 적이 많을수록 강하다.',
    color: 0x9a60e0, weaponNoun: '넝쿨 지팡이', weapons: ['포도 덩굴 지팡이', '와인 성배', '넝쿨 완드'], sig: ['poison'],
    L: ['포도알', '포도송이탄', '발효탄'], H: '와인 폭발',
    Q: { name: '포도송이 폭탄', fan: 3, coef: 0.9, shape: P('fx_magic', 0x9050d0, { range: 340, speed: 520, r: 16, explode: 70 }), eff: ['poison'] },
    E: { name: '발효 거품', shape: P('fx_circle', 0xc080ff, { range: 340, speed: 420, r: 24, pierce: true }), eff: ['slow', 'poison'] },
    R: { name: '수확제' },
    combos: ['포도 연사', '송이 폭발', '발효 파열', '덩굴 폭풍', '와인 역류'],
  },
  // ───────── 궁수 계열 ─────────
  {
    id: 'fox', char: 'fox', base: 'ranger', name: '여우 궁수', en: 'Fox Archer', role: '원거리 치명 · 기동',
    desc: '날렵한 여우 사냥꾼. 빠르게 움직이며 급소를 노린다.',
    resName: '집중', color: 0xffb060, weaponNoun: '활', weapons: ['여우 단궁', '은빛 장궁', '구미호 활'],
    mods: { crit: 0.04, move: 10 }, sig: ['critUp'],
    L: ['여우 화살', '연사', '여우불 화살'], H: '구미 관통',
    Q: { name: '여우비', hits: 5, coef: 0.5 }, E: { name: '여우 도약 사격' },
    R: { name: '아홉 꼬리 폭풍' },
    combos: ['삼연사', '여우의 조준', '연속 관통', '꼬리 사격', '역습의 여우불'],
  },
  {
    id: 'goldfish', char: 'goldfish', base: 'ranger', name: '금붕어 물총수', en: 'Bubble Gunner', role: '원거리 제어 · 넉백',
    desc: '물방울을 쏘아 적을 밀어내고 느리게 만든다.',
    resName: '수압', color: 0x8fd8ff, weaponNoun: '물총', weapons: ['물총', '버블 건', '어항 대포'], sig: ['slow'],
    L: ['물방울', '물줄기', '거품탄'], H: { name: '고압 물대포', shape: P('fx_light', 0x8fd8ff, { range: 520, speed: 980, r: 18, pierce: true }), eff: ['knock', 'stagger'] },
    Q: { name: '어항 폭탄', hits: 3, coef: 0.8, eff: ['slow', 'knock'] },
    E: { name: '지느러미 회피 사격' },
    R: { name: '대해일' },
    combos: ['물방울 삼연', '고압 조준', '연속 물대포', '거품 사격', '역류'],
  },
  {
    id: 'redhood', char: 'redhood', base: 'ranger', name: '빨간 망토', en: 'Red Hood Hunter', role: '원거리 사냥 · 덫',
    desc: '늑대를 쫓던 석궁 사냥꾼. 덫을 깔고 출혈로 사냥감을 몰아붙인다.',
    resName: '사냥', color: 0xe04050, weaponNoun: '석궁', weapons: ['석궁', '사냥꾼 석궁', '은 화살 석궁'],
    mods: { hp: 1.03 }, sig: ['bleed'],
    L: ['석궁 사격', '연속 사격', '갈고리 화살'], H: '늑대사냥 볼트',
    Q: { name: '바구니 덫', shape: { t: 'circle', r: 100, at: 'aim', maxDist: 300 }, eff: ['slow', 'bleed'] },
    E: { name: '망토 회피 사격' },
    R: { name: '사냥꾼의 밤' },
    combos: ['삼연 볼트', '정조준', '연속 관통', '망토 사격', '역습의 볼트'],
  },
  {
    id: 'mushroom', char: 'mushroom', base: 'ranger', name: '포자 사수', en: 'Spore Slinger', role: '원거리 장판 · 독',
    desc: '버섯 포자를 새총으로 날린다. 포자 구름으로 지역을 장악한다.',
    resName: '포자', color: 0xff7070, weaponNoun: '새총', weapons: ['포자 새총', '버섯 활', '균사 장궁'], sig: ['poison'],
    L: ['포자탄', '포자 연사', '독버섯탄'], H: '거대 포자',
    Q: { name: '포자 구름', hits: 5, coef: 0.5, shape: { t: 'circle', r: 130, at: 'aim', maxDist: 320 }, eff: ['poison', 'slow'] },
    E: { name: '버섯 점프 사격' },
    R: { name: '포자 폭풍', eff: ['poison'] },
    combos: ['포자 삼연', '독버섯 조준', '균사 관통', '점프 사격', '역습의 포자'],
  },
  // ───────── 창 계열 ─────────
  {
    id: 'tomato', char: 'tomato', base: 'lancer', name: '토마토 성기사', en: 'Tomato Paladin', role: '중거리 탱커 · 넉백',
    desc: '성창을 든 토마토 수호자. 튼튼한 몸으로 앞을 막고 적을 밀어낸다.',
    resName: '신념', color: 0xff5040, weaponNoun: '성창', weapons: ['성창', '토마토 할버드', '붉은 미늘창'],
    mods: { hp: 1.1, def: 1.1, atk: 0.96 }, sig: ['knock'],
    L: ['토마토 찌르기', '성창 찌르기', '휩쓸기'], H: '완숙 돌진',
    Q: { name: '케첩 폭발', shape: { t: 'circle', r: 140, at: 'self' }, eff: ['knock', 'slow'] },
    E: { name: '토마토 낙하' },
    R: { name: '대수확의 창' },
    combos: ['삼연창', '완숙 돌격', '과육 관통', '질주창', '성기사의 역린'],
  },
  {
    id: 'broccoli', char: 'broccoli', base: 'lancer', name: '브로콜리 창병', en: 'Broccoli Pikeman', role: '장거리 찌르기 · 둔화',
    desc: '가장 긴 줄기창을 쓴다. 멀리서 찌르고 뿌리로 발을 묶는다.',
    resName: '생장', color: 0x70d060, weaponNoun: '줄기창', weapons: ['줄기창', '브로콜리 장창', '녹림창'], sig: ['slow'],
    L: ['줄기 찌르기', '연속 찌르기', '송이 휩쓸기'], H: { name: '뿌리 관통', shape: { t: 'rect', len: 200, w: 46 } },
    Q: { name: '숲의 회전', eff: ['slow', 'knock'] },
    E: { name: '대지 낙창', eff: ['leap', 'stagger', 'slow'] },
    R: { name: '녹색 창림', shape: { t: 'rect', len: 300, w: 72 } },
    combos: ['삼연 줄기', '뿌리 돌격', '녹림 관통', '질주 줄기', '대지의 역린'],
  },
  {
    id: 'bride', char: 'bride', base: 'lancer', name: '딸기 신부', en: 'Bridal Lancer', role: '중거리 약화 · 우아함',
    desc: '부케창을 든 신부. 우아한 회전으로 적의 방어를 무너뜨린다.',
    resName: '맹세', color: 0xffd0e0, weaponNoun: '부케창', weapons: ['부케창', '레이스 랜스', '순백 장창'], sig: ['defDown'],
    L: ['부케 찌르기', '베일 찌르기', '웨딩 턴'], H: '버진로드 돌진',
    Q: { name: '꽃잎 회전', shape: { t: 'circle', r: 130, at: 'self' }, eff: ['knock', 'defDown'] },
    E: { name: '부케 낙하' },
    R: { name: '영원의 맹세' },
    combos: ['삼연 부케', '베일 돌격', '맹세의 관통', '버진로드', '신부의 역린'],
  },
  {
    id: 'pinkhair', char: 'pinkhair', base: 'lancer', name: '벚꽃 창희', en: 'Blossom Dancer', role: '중거리 기동 · 연속 찌르기',
    desc: '꽃잎처럼 가볍게 춤추며 찌른다. 빠르지만 체력이 낮다.',
    resName: '봄기운', color: 0xffa8d0, weaponNoun: '벚꽃창', weapons: ['벚꽃창', '분홍 창', '화사한 기창'],
    mods: { atkSpd: 0.06, move: 10, hp: 0.95 }, sig: ['critUp'],
    L: ['벚꽃 찌르기', '꽃잎 찌르기', '벚꽃 휩쓸기'], H: { name: '봄바람 돌진', lunge: 70 },
    Q: { name: '꽃보라' },
    E: { name: '낙화' },
    R: { name: '천본앵', hits: 8, interval: 0.2, coef: 0.98 },
    combos: ['삼연 벚꽃', '꽃잎 돌격', '만개 관통', '봄바람', '낙화의 역린'],
  },
];

const COMBO_KEYS = ['LLL', 'LLH', 'LHH', 'DLH', 'FLH'];

export function buildJobs(bases: Record<BaseId, ClassDef>): ClassDef[] {
  return SPECS.map((s) => {
    const B = bases[s.base];
    const withSig = (m: Move) => (s.sig?.length ? { ...m, eff: [...new Set([...(m.eff || []), ...s.sig])] } : m);
    const mv = (m: Move, suf: string, o: Partial<Move>): Move => ({ ...m, ...o, id: `${s.id}_${suf}` });
    const h = typeof s.H === 'string' ? { name: s.H } : s.H;
    return {
      ...B, id: s.id, base: s.base, char: s.char, name: s.name, en: s.en, role: s.role, desc: s.desc,
      resName: s.resName ?? B.resName, color: s.color, weaponNoun: s.weaponNoun, weapons: s.weapons, mods: s.mods, sig: s.sig,
      L: B.L.map((m, i) => mv(i === 2 ? withSig(m) : m, `l${i + 1}`, { name: s.L[i] })),
      H: mv(withSig(B.H), 'h', h), Q: mv(B.Q, 'q', s.Q), E: mv(B.E, 'e', s.E), C: mv(B.C, 'c', { name: s.C ?? '패링 반격' }), R: mv(B.R, 'r', s.R),
      combos: Object.fromEntries(COMBO_KEYS.map((k, i) => [k, { ...B.combos[k], name: s.combos[i] }])),
    };
  });
}
