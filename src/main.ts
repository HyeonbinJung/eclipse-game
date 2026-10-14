import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Title } from './scenes/Title';
import { World } from './scenes/World';
import { Hud } from './scenes/Hud';
import { UI } from './ui/ui';
import { initAudio, music } from './audio/audio';
import { registerSW, applyUpdate } from './pwa';

const fps30 = localStorage.getItem('eclipse_fps30') === '1';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0b0f1c',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  fps: fps30 ? { target: 30, limit: 30 } : { target: 60 },
  scene: [Boot, Title, World, Hud],
  audio: { disableWebAudio: false },
});
initAudio(game);
UI.init(game);
(window as any).__game = game;

// 첫 사용자 입력에서 오디오 컨텍스트 재개
const resume = () => { music.ensure(); window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume); };
window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume);

// 새 버전: 타이틀 화면이면 즉시 적용, 플레이 중이면 진행을 끊지 않고 다음 실행 때 적용
registerSW(() => {
  if (game.scene.isActive('Title')) { UI.toast('새 버전을 적용합니다…', '#9fe0ff'); setTimeout(applyUpdate, 1200); }
  else UI.toast('새 버전이 준비되었습니다 — 다음 실행 시 적용됩니다', '#9fe0ff', 4000);
});

// 개발용: ?debug 로 열면 콘솔/자동 테스트용 훅과 F9(레벨업)·F10(골드·정수) 단축키 제공
if (new URLSearchParams(location.search).has('debug')) {
  import('./core/state').then((st) => {
    (window as any).__dbg = { st, UI };
    window.addEventListener('keydown', (e) => {
      if (!st.S) return;
      if (e.code === 'F9') st.debugLevelUp();
      if (e.code === 'F10') { st.S.gold += 50000; st.S.essence = st.S.essence.map((v) => v + 50); st.persist(); UI.toast('디버그: 골드/정수 지급'); }
    });
  });
}
