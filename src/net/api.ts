// 계정/클라우드 세이브 API 클라이언트
export interface User { id: number; username: string; rating: number; wins: number; losses: number }
export interface CharSummary { slot: number; name: string; classId: string; level: number; updatedAt: number }

const TK = 'eclipse_token';
export const account = { token: localStorage.getItem(TK) || '', user: null as User | null, slot: -1 };
export const online = () => !!account.token && !!account.user;

async function call(path: string, method = 'GET', data?: any) {
  const r = await fetch('./api' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(account.token ? { Authorization: 'Bearer ' + account.token } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  let j: any = {}; try { j = await r.json(); } catch { /* */ }
  if (!r.ok) { const e: any = new Error(j.error || `서버 오류 (${r.status})`); e.status = r.status; e.body = j; throw e; }
  return j;
}
export async function register(username: string, password: string) { const r = await call('/register', 'POST', { username, password }); setSession(r.token, r.user); return r.user as User; }
export async function login(username: string, password: string) { const r = await call('/login', 'POST', { username, password }); setSession(r.token, r.user); return r.user as User; }
export async function logout() { try { await call('/logout', 'POST'); } catch { /* */ } setSession('', null); }
export async function me() {
  if (!account.token) return null;
  try { const r = await call('/me'); account.user = r.user; return r.user as User; }
  catch (e: any) { if (e.status === 401) setSession('', null); return null; }
}
function setSession(token: string, user: User | null) { account.token = token; account.user = user; if (token) localStorage.setItem(TK, token); else localStorage.removeItem(TK); }
export const listChars = async () => (await call('/chars')).chars as CharSummary[];
export const getChar = async (slot: number) => (await call('/chars/' + slot)) as { data: any; updatedAt: number };
export const deleteChar = (slot: number) => call('/chars/' + slot, 'DELETE');
export const putChar = (slot: number, data: any) => call('/chars/' + slot, 'PUT', { data });
export const leaderboard = async () => (await call('/leaderboard')) as { pvp: any[]; level: any[] };

// 디바운스 업로드 + 페이지 이탈 시 즉시 전송
let pending: any = null; let timer: any = null; export let lastSync = { ok: true, at: 0, msg: '' };
export function queueUpload(data: any) {
  if (!online() || account.slot < 0) return;
  pending = data; clearTimeout(timer); timer = setTimeout(flush, 2000);
}
export async function flush() {
  if (!pending || !online() || account.slot < 0) return; const d = pending; pending = null;
  try { await putChar(account.slot, d); lastSync = { ok: true, at: Date.now(), msg: '' }; }
  catch (e: any) { lastSync = { ok: false, at: Date.now(), msg: e.message }; }
}
const beacon = () => {
  if (!pending || !online() || account.slot < 0) return;
  fetch('./api/chars/' + account.slot, { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + account.token }, body: JSON.stringify({ data: pending }) }).catch(() => {});
  pending = null;
};
window.addEventListener('pagehide', beacon);
document.addEventListener('visibilitychange', () => { if (document.hidden) beacon(); });
