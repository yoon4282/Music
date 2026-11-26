const env = import.meta.env;

/** PeerJS 옵션. 환경변수가 없으면 PeerJS 공개 클라우드 시그널링 서버를 사용합니다. */
export const PEER_OPTIONS = {
  debug: 1,
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
