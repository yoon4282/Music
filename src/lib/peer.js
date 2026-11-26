const env = import.meta.env;

/**
 * ICE 서버 목록
 *  - STUN: 공인 IP 확인용 (일반 가정용 와이파이는 이것만으로 충분)
 *  - PeerJS 기본 TURN: 포트 3478 → 학교/회사 방화벽에서 자주 막힘
 *  - 사용자 TURN(VITE_TURN_*): 443 포트(TLS) 중계 → 방화벽이 있는 네트워크에서도 동작
 */
function buildIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    {
      urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
      username: 'peerjs',
      credential: 'peerjsp',
    },
  ];

  const username = env.VITE_TURN_USERNAME;
  const credential = env.VITE_TURN_CREDENTIAL;
  if (username && credential) {
    // 기본값: Metered(무료 TURN) 서버 주소. 다른 업체를 쓰면 VITE_TURN_URLS에 쉼표로 구분해 입력
    const urls = (env.VITE_TURN_URLS ||
      'turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:80?transport=tcp,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // 방화벽 네트워크에서 먼저 시도되도록 앞쪽에 배치
    servers.unshift({ urls, username, credential });
  }
  return servers;
}

export const TURN_CONFIGURED = Boolean(env.VITE_TURN_USERNAME && env.VITE_TURN_CREDENTIAL);

/** PeerJS 옵션. 시그널링 서버 환경변수가 없으면 PeerJS 공개 클라우드 서버를 사용합니다. */
export const PEER_OPTIONS = {
  debug: 1,
  config: { iceServers: buildIceServers(), sdpSemantics: 'unified-plan' },
  ...(env.VITE_PEER_HOST
    ? {
        host: env.VITE_PEER_HOST,
        port: Number(env.VITE_PEER_PORT) || 443,
        path: env.VITE_PEER_PATH || '/',
        secure: env.VITE_PEER_SECURE !== 'false',
      }
    : {}),
};

/** 메시지 프로토콜
 *  guest → host : { type: 'hello', nickname }
 *                 { type: 'action', action: { type: 'add' | 'remove' | 'reorder' | 'skip' | 'toggle', ... } }
 *  host → guest : { type: 'state', state: { current, queue, isPlaying, guestCount } }
 *                 { type: 'toast', message, kind }
 */
