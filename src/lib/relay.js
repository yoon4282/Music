/**
 * 중계(relay) 모드
 * 학교·회사 와이파이처럼 WebRTC(P2P·TURN)가 전부 막혀도, PeerJS 시그널링 서버와의
 * WebSocket(443 포트)은 열려 있는 경우가 많습니다. 이 소켓으로 작은 앱 메시지를 전달합니다.
 *
 * PeerJS 공개 서버(0.peerjs.com)는 메시지 형식을 엄격하게 검사해서, 정상적인 ICE 후보
 * (CANDIDATE) 모양이 아니면 보낸 쪽 연결을 끊어버립니다. 또 약 16KB를 넘는 메시지도 끊습니다.
 * 그래서 앱 데이터를 "빈 ICE 후보" 모양의 메시지에 실어 보내고, 큰 데이터는 조각내서 보냅니다.
 */
const RELAY_KEY = '__jbRelay';
const RELAY_CONN_ID = 'dc_jbrelay'; // 실제 연결과 겹치지 않는 가짜 connectionId
const CHUNK_CHARS = 2000; // 한글(UTF-8 3바이트)이어도 6KB 이하 → 서버 한도(16KB)보다 넉넉히 작게
const CHUNK_TTL = 30000;

let seq = 0;

function rawSend(peer, dst, body) {
  peer.socket.send({
    type: 'CANDIDATE',
    dst,
    payload: {
      type: 'data',
      connectionId: RELAY_CONN_ID,
      candidate: { candidate: '', sdpMid: '0', sdpMLineIndex: 0 },
      [RELAY_KEY]: body,
    },
  });
}

export function sendRelay(peer, dst, data) {
  if (!peer || peer.destroyed || !peer.socket) return false;
  const text = JSON.stringify(data);
  if (text.length <= CHUNK_CHARS) {
    rawSend(peer, dst, { d: text });
    return true;
  }
  const id = `${Date.now().toString(36)}${(seq++).toString(36)}`;
  const n = Math.ceil(text.length / CHUNK_CHARS);
  for (let i = 0; i < n; i++) {
    rawSend(peer, dst, { id, i, n, c: text.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) });
  }
  return true;
}

/** 중계 메시지 수신 등록. 반환값으로 해제 */
export function onRelay(peer, handler) {
  const socket = peer?.socket;
  if (!socket) return () => {};
  const partials = new Map(); // `${src}:${id}` -> { parts, got, n, at }

  const deliver = (src, text) => {
    try {
      handler(src, JSON.parse(text));
    } catch { /* 손상된 메시지는 무시 */ }
  };

  const listener = (msg) => {
    const body = msg?.payload?.[RELAY_KEY];
    if (body === undefined || !msg.src) return;
    // PeerJS가 "연결 없는 메시지"로 쌓아두는 것을 비워서 메모리 누수 방지
    peer._lostMessages?.delete?.(RELAY_CONN_ID);

    if (typeof body.d === 'string') {
      deliver(msg.src, body.d);
      return;
    }
    if (!body.id || typeof body.c !== 'string') return;
    const key = `${msg.src}:${body.id}`;
    let entry = partials.get(key);
    if (!entry) {
      entry = { parts: new Array(body.n), got: 0, n: body.n, at: Date.now() };
      partials.set(key, entry);
    }
    if (entry.parts[body.i] === undefined) {
      entry.parts[body.i] = body.c;
      entry.got += 1;
    }
    if (entry.got === entry.n) {
      partials.delete(key);
      deliver(msg.src, entry.parts.join(''));
    }
    // 오래된 미완성 조각 정리
    for (const [k, e] of partials) if (Date.now() - e.at > CHUNK_TTL) partials.delete(k);
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
