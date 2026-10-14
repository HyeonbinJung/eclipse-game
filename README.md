# ECLIPSE — 잊혀진 균열

기획서(ECLIPSE 50레벨 액션RPG 통합게임기획서 v1)를 바탕으로 만든 2D 브라우저 액션 RPG입니다. PWA로 설치해 오프라인으로도 플레이할 수 있습니다.

## 실행

```bash
npm install
npm run build      # dist/ 생성 + 서비스 워커(sw.js) 자동 생성
npm run preview    # http://localhost:4173
```

Windows에서는 `ECLIPSE 실행.bat`을 더블클릭하면 빌드 후 브라우저가 열립니다.
개발 모드는 `npm run dev` (http://localhost:5173, 서비스 워커 비활성).

## 앱 설치 (PWA)

`npm run preview`로 연 페이지(또는 https로 배포한 페이지)에서
- 타이틀 화면의 **⬇ 앱으로 설치** 버튼, 또는
- 크롬/엣지 주소창 오른쪽 설치 아이콘

을 누르면 독립 창 앱으로 설치됩니다. 첫 실행 때 모든 리소스를 캐시하므로 이후에는 오프라인에서도 실행됩니다.
새 빌드를 배포하면 다음 실행 시 자동으로 업데이트됩니다.

## 조작

| 키 | 동작 |
|---|---|
| WASD | 이동 |
| 마우스 | 조준 |
| 좌클릭 / 우클릭 | 약공격(L) / 강공격(H) — 좌클릭을 누르고 있으면 연타 |
| Space / Shift | 대시 (70~190ms 무적) |
| F | 패링 (120ms) — 성공 후 450ms 안에 L로 반격 |
| Q / E / R | 스킬 (Lv4 / Lv8) / 궁극기 (Lv20) |
| 1 | HP 포션 |
| G | 상호작용 |
| I / J / K / ESC / F1 | 가방 / 퀘스트 / 특성 / 메뉴 / 도움말 |

게임패드(Xbox 배치)도 지원합니다.

## 구현 범위 (기획서 대응)

- 3직업(검사·격투가·마법사) — 스킬 계수, 콤보 커맨드(L-L-L, L-L-H, L-H-H, D-L-H, F-L-H), 특성 4단계
- 입력 버퍼 130ms, 콤보 유지 700ms, 대시 i-frame, 패링, 콤보 랭크 D~S, 상태이상(독·화상·빙결·출혈·가드파괴·그로기)
- 1~50레벨 경험치/성장 공식, 레벨 차 XP 보정
- 5챕터 · 일반 몬스터 30종(16가지 AI) · 엘리트 · 보스 10종(상태 머신, 페이즈, 가중치 선택, 공정성 규칙)
- 메인 퀘스트 50개, 사이드 퀘스트 20종, 던전 10개(전투·엘리트·퍼즐·함정 방), 체크포인트
- 장비 8슬롯·6등급·옵션·강화(+8)·재련·제작·분해, 유물 10종, 전설 천장, 보스 일일 보상 제한
- 엔딩 선택, 세이브 2개 로테이션, 세이브 내보내기/가져오기, 접근성 옵션(광과민 모드·흔들림 끄기·패턴명 표시)

## 리소스와 라이선스

| 리소스 | 출처 | 라이선스 |
|---|---|---|
| 캐릭터·몬스터·타일·아이템 | Kenney *Tiny Dungeon*, *Tiny Town* | CC0 |
| 이펙트 | Kenney *Particle Pack* | CC0 |
| 효과음·징글 | Kenney *Impact Sounds*, *RPG Audio*, *Interface Sounds*, *Music Jingles* | CC0 |
| 폰트 | Galmuri (quiple) | SIL OFL 1.1 |
| 배경음 | WebAudio 절차 생성 (자체 코드) | — |

Kenney 원본 라이선스는 `public/assets/LICENSE-kenney.txt`, Galmuri OFL 전문은 `public/assets/LICENSE-galmuri-OFL.txt`에 있습니다.
