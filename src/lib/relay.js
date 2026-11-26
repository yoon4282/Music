/**
 * 중계(relay) 모드
 * 학교·회사 와이파이처럼 WebRTC(P2P·TURN)가 전부 막혀도, PeerJS 시그널링 서버와의
 * WebSocket(443 포트)은 열려 있는 경우가 많습니다. 이 소켓으로 작은 앱 메시지를 전달합니다.
 *
 * PeerJS 서버는 CANDIDATE 타입 메시지를 dst 피어에게 그대로 전달하므로,
 * connectionId 없이 payload에 앱 데이터를 실어 보냅니다(PeerJS 클라이언트는 이를 무시).
 */
const RELAY_KEY = '__jbRelay';

export function sendRelay(peer, dst, data) {
  if (!peer || peer.destroyed || !peer.socket) return false;
  peer.socket.send({ type: 'CANDIDATE', dst, payload: { [RELAY_KEY]: data } });
  return true;
}

/** 중계 메시지 수신 등록. 반환값으로 해제 */
export function onRelay(peer, handler) {
  const socket = peer?.socket;
  if (!socket) return () => {};
  const listener = (msg) => {
    const data = msg?.payload?.[RELAY_KEY];
    if (data !== undefined && msg.src) handler(msg.src, data);
  };
  socket.on('message', listener);
  return () => socket.off('message', listener);
}

/** 중계 모드용 가짜 DataConnection (conn.open / conn.send 인터페이스 호환) */
export function createRelayConn(peer, dst) {
  return {
    peer: dst,
    relay: true,
    open: true,
    lastSeen: Date.now(),
    send: (data) => sendRelay(peer, dst, data),
    close() { this.open = false; },
  };
}
