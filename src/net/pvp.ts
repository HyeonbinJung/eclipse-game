// PvP WebSocket 클라이언트 (빠른 매칭 / 방 코드 / 경기 중계)
import Phaser from 'phaser';
import { account } from './api';

export interface Snap { name: string; user?: string; rating?: number; classId: string; look: { frame: number; tint: number }; level: number; atk: number; def: number; maxHp: number }
export interface Match { id: number; side: 0 | 1; opp: Snap; me: Snap; arena: number; startIn: number; duration: number; receivedAt: number }

class PvpClient extends Phaser.Events.EventEmitter {
  ws: WebSocket | null = null; ready = false; match: Match | null = null; status: 'idle' | 'queued' | 'room' | 'match' = 'idle'; roomCode = '';
  connect(): Promise<void> {
    if (this.ws && this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const url = location.origin.replace(/^http/, 'ws') + location.pathname.replace(/[^/]*$/, '') + 'ws';
      const ws = new WebSocket(url); this.ws = ws; this.ready = false;
      const to = setTimeout(() => reject(new Error('서버에 연결할 수 없습니다.')), 6000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token: account.token }));
      ws.onmessage = (ev) => {
        let o: any; try { o = JSON.parse(ev.data); } catch { return; }
        switch (o.t) {
          case 'authed': this.ready = true; clearTimeout(to); resolve(); break;
          case 'error': this.emit('error', o.msg); if (!this.ready) { clearTimeout(to); reject(new Error(o.msg)); } break;
          case 'queued': this.status = 'queued'; this.emit('status'); break;
          case 'room': this.status = 'room'; this.roomCode = o.code; this.emit('status'); break;
          case 'cancelled': this.status = 'idle'; this.emit('status'); break;
          case 'match': this.status = 'match'; this.match = { ...o, receivedAt: performance.now() }; this.emit('match', this.match); break;
          case 'r': this.emit('msg', o.d); break;
          case 'result': this.status = 'idle'; this.emit('result', o); this.match = null; break;
        }
      };
      ws.onclose = () => { this.ready = false; this.ws = null; if (this.status !== 'idle') { this.status = 'idle'; this.emit('status'); } this.emit('closed'); };
      ws.onerror = () => { clearTimeout(to); reject(new Error('서버에 연결할 수 없습니다.')); };
    });
  }
  raw(o: any) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  send(d: any) { this.raw({ t: 'r', d }); }
  async queue(snap: Snap) { await this.connect(); this.raw({ t: 'queue', snap }); }
  async createRoom(snap: Snap) { await this.connect(); this.raw({ t: 'room:create', snap }); }
  async joinRoom(code: string, snap: Snap) { await this.connect(); this.raw({ t: 'room:join', code, snap }); }
  cancel() { this.raw({ t: 'cancel' }); this.status = 'idle'; }
  dead() { this.raw({ t: 'dead' }); }
  leave() { this.raw({ t: 'leave' }); }
}
export const pvp = new PvpClient();
