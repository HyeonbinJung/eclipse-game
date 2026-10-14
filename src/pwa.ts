// PWA: 설치 프롬프트 + 서비스 워커 등록/업데이트
let deferred: any = null;
const listeners: (() => void)[] = [];

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((f) => f());
});
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });

export const canInstall = () => !!deferred;
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as any).standalone === true;
export const onInstallChange = (f: () => void) => listeners.push(f);
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  return r?.outcome === 'accepted';
}

export function registerSW(onUpdate: () => void) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) onUpdate();
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    } catch (e) { console.warn('SW 등록 실패', e); }
  });
}
export async function applyUpdate() {
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.waiting?.postMessage('SKIP_WAITING');
}
