#!/bin/bash
# macOS: 더블클릭으로 빌드 후 서버 실행. 같은 와이파이의 다른 기기는 터미널에 표시되는 주소로 접속
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 없습니다. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."; read -r -p "엔터를 누르면 닫힙니다"; exit 1
fi
[ -d node_modules ] || npm install || exit 1
npm run build || { read -r -p "빌드 실패. 엔터를 누르면 닫힙니다"; exit 1; }
(sleep 2; open "http://localhost:${PORT:-4173}") &
node server/index.mjs
