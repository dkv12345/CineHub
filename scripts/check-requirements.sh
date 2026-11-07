#!/usr/bin/env bash
# Kiểm tra code hiện tại đã có các thay đổi đã thống nhất chưa (chỉ đọc, không sửa gì).
# Chạy trong repo: bash scripts/check-requirements.sh
cd "$(git rev-parse --show-toplevel)" || exit 1

CHAT=services/core-api/src/modules/chatbot
GREP_OPTS=(-rqI --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.angular)
ok=0
missing=0

report() { # $1 = 0 nếu đạt, $2 = nhãn, $3 = nơi đã tìm
  if [ "$1" -eq 0 ]; then
    printf 'OK     %s\n' "$2"
    ok=$((ok + 1))
  else
    printf 'THIEU  %s  [%s]\n' "$2" "$3"
    missing=$((missing + 1))
  fi
}

exists() { [ -e "$2" ]; report $? "$1" "$2"; }
has() { [ -e "$3" ] && grep "${GREP_OPTS[@]}" -E -- "$2" "$3" 2>/dev/null; report $? "$1" "$3"; }
hasf() { [ -e "$3" ] && grep "${GREP_OPTS[@]}" -F -- "$2" "$3" 2>/dev/null; report $? "$1" "$3"; }

echo "== Seed va co so du lieu =="
exists "Loader concession" packages/db/prisma/seed/concessions.js
exists "Du lieu combo Galaxy" data/seed/galaxy_concessions.json
exists "Script sinh ghe" packages/db/prisma/seed/seats.js
hasf "seed.js goi seedConcessions" "await seedConcessions" packages/db/prisma/seed.js
hasf "seed.js goi seedSeats" "await seedSeats" packages/db/prisma/seed.js
node -e "process.exit(require('./packages/db/package.json').prisma?.seed ? 0 : 1)" 2>/dev/null
report $? "packages/db/package.json co prisma.seed (cho npx prisma db seed)" "packages/db/package.json"

echo
echo "== Chatbot =="
exists "Module vector (MongoDB)" "$CHAT/chatbot.vector.js"
exists "Module phien hoi thoai" "$CHAT/chatbot.session.js"
hasf "Tim theo nghia (semanticSearch)" "semanticSearch" "$CHAT/chatbot.service.js"
hasf "Loc tu dem truoc khi tao vector" "semanticQueryText" "$CHAT/chatbot.nlp.js"
hasf "Cong diem the loai theo hoan canh" "MOOD_BOOST" "$CHAT/chatbot.service.js"
hasf "Lich chieu theo phim vua goi y" "resolveShowtimeScope" "$CHAT/chatbot.service.js"
hasf "Ke thua ngay/buoi toi cua luot goi y" "lastFilters" "$CHAT/chatbot.session.js"
hasf "Thoi gian cho Gemini doc tu env" "GEMINI_TIMEOUT_MS" "$CHAT/chatbot.service.js"
hasf "Tam ngung Gemini sau loi" "geminiPausedUntil" "$CHAT/chatbot.service.js"
hasf "Hieu 'nguoi yeu'" "nguoi yeu" "$CHAT/chatbot.nlp.js"
hasf "Hieu 'chon gi'" "chon gi" "$CHAT/chatbot.nlp.js"
hasf "'gia dinh' khong bi hieu la hoi gia ve" "(?! dinh)" "$CHAT/chatbot.nlp.js"

echo
echo "== Giao dien va API =="
has "Angular: proxy /api" "proxyConfig" apps
has "POV ghe (Three.js) con trong code" "from .three." apps
hasf "Select: chu trang ep bang CSS" "-webkit-text-fill-color" apps
hasf "Link showtimes dung chung theo phim" "buildShowtimesLink" apps
has "Frontend goi API concession" "api/concessions" apps
has "API: danh sach concession" "concessionsRouter|/concessions" services/core-api/src
has "API: suat chieu theo phim" "movieId/showtimes" services/core-api/src

echo
echo "== Nhanh hien tai =="
git rev-parse --abbrev-ref HEAD
BR=""
for candidate in nhaky_concession origin/nhaky_concession; do
  if git rev-parse --verify -q "$candidate" >/dev/null; then BR="$candidate"; break; fi
done
if [ -n "$BR" ]; then
  read -r only_here only_there < <(git rev-list --left-right --count "HEAD...$BR")
  echo "so voi $BR: chi co o nhanh hien tai $only_here commit | chi co o $BR $only_there commit"
else
  echo "Khong thay nhanh nhaky_concession o may nay (thu: git fetch --all)"
fi
git status --short | head -10

echo
echo "Tong: $ok dat, $missing thieu"
echo "Luu y: 'THIEU' o muc API chi la khong tim thay ten goi do chung toi dat; Copilot can kiem chung thuc te."
