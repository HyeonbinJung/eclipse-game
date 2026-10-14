import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// 빌드 후 dist 전체를 사전 캐시하는 서비스 워커(sw.js)를 생성한다.
function pwaPrecache() {
  return {
    name: 'pwa-precache',
    apply: 'build' as const,
    closeBundle() {
      const dist = path.resolve('dist');
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir)) {
          const p = path.join(dir, f);
          if (fs.statSync(p).isDirectory()) walk(p);
          else files.push(path.relative(dist, p).split(path.sep).join('/'));
        }
      };
      walk(dist);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.txt'));
      const h = crypto.createHash('sha1');
      for (const f of list) h.update(f).update(fs.readFileSync(path.join(dist, f)));
      const version = h.digest('hex').slice(0, 12);
      const tpl = fs.readFileSync('src/pwa/sw-template.js', 'utf8')
        .replace('__PRECACHE__', JSON.stringify(['./', ...list.map((f) => './' + f)]))
        .replace('__VERSION__', version);
      fs.writeFileSync(path.join(dist, 'sw.js'), tpl);
      console.log(`[pwa] sw.js 생성: ${list.length}개 파일 사전 캐시, 버전 ${version}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [pwaPrecache()],
  build: { chunkSizeWarningLimit: 2500, assetsInlineLimit: 0 },
  server: { port: 5173 },
});
