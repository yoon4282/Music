# 🎵 Jukebox Party

디스코드 노래봇처럼, 여러 명이 스마트폰으로 QR코드를 스캔해 유튜브 곡을 예약하고 호스트 화면(PC/태블릿)에서 재생하는 웹 앱입니다.
**백엔드·DB 없이** PeerJS(WebRTC 데이터 채널)로 실시간 동기화됩니다.

**배포 주소:** https://yoon4282.github.io/Music/ (브랜치에 push하면 GitHub Actions가 자동 배포)

## 빠른 시작

```bash
npm install
npm run dev
```

터미널에 주소가 두 개 출력됩니다.

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.0.12:5173/   ← 호스트 PC에서는 이 주소로 여세요
```

1. **호스트 화면은 Network 주소로 엽니다.** QR코드는 현재 주소로 만들어지는데, 휴대폰은 `localhost`에 접속할 수 없습니다.
2. **[방 시작하기 (오디오 활성화)]** 버튼을 클릭합니다. 브라우저 자동 재생 정책 때문에 필요합니다.
3. **같은 Wi-Fi**에 연결된 휴대폰으로 QR코드를 스캔하면 리모컨 화면이 열립니다. 유튜브 링크를 붙여넣으면 됩니다.

프로덕션 빌드: `npm run build && npm run preview`. `dist/` 폴더를 정적 호스팅(Vercel, Netlify, GitHub Pages 등)에 그대로 올려도 됩니다. 공개 호스팅에 올리면 LTE 등 다른 네트워크의 휴대폰도 접속할 수 있습니다.

## 기능

| | 호스트 (`/`) | 게스트 (`/?hostId=...`) |
|---|---|---|
| 유튜브 플레이어 | ✅ IFrame API, 곡이 끝나면(`onStateChange === 0`) 다음 곡 자동 재생 | 숨김 (리모컨 UI만) |
| 곡 추가 (링크 / 검색\*) | ✅ | ✅ |
| 재생·일시정지·스킵 | ✅ | ✅ (호스트에 요청) |
| 드래그 앤 드롭 순서 변경 | ✅ 마우스 / 키보드 | ✅ 터치 (길게 누른 뒤 끌기) |
| 삭제 (휴지통 버튼) | ✅ | ✅ |
| QR코드 · 접속 인원 · 링크 복사 | ✅ | — |

- **레이아웃**: 가로 768px 이상은 `2 : 1` 그리드(왼쪽: 플레이어 + 컨트롤, 오른쪽: 위 QR / 아래 대기열), 768px 미만은 세로 1열 스크롤입니다.
- **지원 링크**: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `/embed/`, `/live/`, `m.`·`music.youtube.com`, `https://` 없이 붙여넣은 링크.
- **제목·썸네일**: YouTube oEmbed로 가져오고, 실패하면 noembed로 재시도합니다. 둘 다 실패하면 영상 ID를 표시합니다.
- **재생 오류**: 비공개 영상이나 퍼가기가 금지된 영상(오류 100/101/150)은 자동으로 건너뜁니다.
- **유지**: 대기열과 호스트 Peer ID를 브라우저에 저장하므로, 호스트 화면을 새로고침해도 대기열과 기존 QR코드가 유지됩니다.

\* 검색어로 찾기는 `VITE_YOUTUBE_API_KEY`를 설정했을 때만 동작합니다. 키가 없으면 검색어를 입력했을 때 유튜브 검색 링크를 보여줍니다.

## 구조

```
 [게스트 폰] ──WebRTC DataChannel──┐
 [게스트 폰] ──WebRTC DataChannel──┼──▶ [호스트]  (유일한 진실의 원천: 대기열 상태 + 유튜브 플레이어)
 [게스트 폰] ──WebRTC DataChannel──┘      │
                                           └─ 상태가 바뀔 때마다 모든 게스트에게 전체 상태를 브로드캐스트
```

- 게스트는 `action` 메시지(`add` / `remove` / `reorder` / `skip` / `toggle`)만 보냅니다.
- 호스트가 `queueReducer`로 반영한 뒤 모든 피어에게 `{ type: 'state' }`를 보냅니다.
- PeerJS 시그널링 서버는 처음 연결을 맺을 때만 쓰이고, 곡·대기열 데이터는 P2P로 주고받습니다.

```
src/
├─ App.jsx                 # ?hostId 유무로 호스트 / 게스트 결정
├─ views/HostView.jsx      # 2:1 그리드, 플레이어, QR, 대기열
├─ views/GuestView.jsx     # 모바일 리모컨
├─ hooks/useHostRoom.js    # PeerJS 호스트: 연결 관리, 상태 브로드캐스트
├─ hooks/useGuestRoom.js   # PeerJS 게스트: 연결 및 자동 재연결
├─ components/             # YouTubePlayer, QueueList(dnd-kit), AddSongForm, QrPanel 등
└─ lib/                    # youtube.js(ID 파싱 / oEmbed / 검색), queue.js(리듀서)
```

## 선택 설정 (`.env`)

`.env.example`을 `.env`로 복사해서 사용합니다.

- `VITE_YOUTUBE_API_KEY`: YouTube Data API v3 키. 설정하면 검색어로 곡을 찾을 수 있습니다. 키가 클라이언트 번들에 포함되므로 반드시 HTTP 리퍼러 제한을 걸어두세요.
- `VITE_PEER_HOST` / `PORT` / `PATH` / `SECURE`: 자체 시그널링 서버. 공개 PeerJS 서버(`0.peerjs.com`)가 불안정하거나 막혀 있을 때 사용합니다. 예:
  ```bash
  npx peerjs --port 9000 --path /myapp
  # .env → VITE_PEER_HOST=192.168.0.12  VITE_PEER_PORT=9000  VITE_PEER_PATH=/myapp  VITE_PEER_SECURE=false
  ```

## 방화벽 네트워크(학교·회사 와이파이)에서 쓰기 — TURN 설정

학교·회사 와이파이는 기기끼리 직접 연결(P2P)하는 것을 막는 경우가 많습니다. 이때는 **443 포트로 데이터를 중계해 주는 TURN 서버**가 필요합니다. 데이터 양이 아주 작아서 무료 플랜으로 충분합니다.

1. https://www.metered.ca/stun-turn 에서 무료 가입 → 대시보드 **TURN Server → Credentials**에서 `username` / `credential`을 확인합니다.
2. 저장소의 `.env.production` 파일에서 `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` 값을 바꿔 커밋하면 자동으로 다시 배포됩니다.

> TURN 계정 정보는 웹페이지 코드에 포함되므로 누구나 볼 수 있습니다. 무료 플랜 사용량 한도만 주의하면 됩니다.

## 문제 해결

- **휴대폰이 접속되지 않음**: 로컬 실행이라면 같은 Wi-Fi인지, 호스트 화면을 `localhost`가 아닌 Network IP로 열었는지 확인하세요. 학교·회사 와이파이라면 휴대폰을 LTE로 바꿔보거나, 위의 TURN 설정을 하세요.
- **첫 곡이 재생되지 않음**: [방 시작하기] 버튼을 건너뛰었다면 호스트 화면을 새로고침하고 버튼을 클릭하세요.
- **특정 영상만 재생되지 않음**: 업로더가 퍼가기를 막은 영상입니다. 자동으로 건너뜁니다.
