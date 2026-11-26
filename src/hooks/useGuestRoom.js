import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { PEER_OPTIONS } from '../lib/peer.js';
import { reorderLocal } from '../lib/queue.js';
import { createRelayConn, onRelay, sendRelay } from '../lib/relay.js';

const P2P_TIMEOUT = 8000; // 이 시간 안에 P2P가 안 열리면 중계 모드로 전환
const PING_INTERVAL = 10000;
const HOST_SILENCE_LIMIT = 30000;

/**
 * 게스트 쪽: 호스트에 연결해 상태를 수신.
 * 1) WebRTC P2P 데이터 채널 시도
 * 2) 방화벽으로 막히면 시그널링 서버 WebSocket을 통한 중계 모드로 자동 전환
 */
export function useGuestRoom({ hostId, nickname, onToast }) {
  // connecting | connected | reconnecting | not-found
  const [status, setStatus] = useState('connecting');
  const [mode, setMode] = useState('p2p'); // p2p | relay
  const [room, setRoom] = useState(null); // { current, queue, isPlaying, guestCount }

  const connRef = useRef(null);
  const nicknameRef = useRef(nickname);
  const onToastRef = useRef(onToast);
  nicknameRef.current = nickname;
  onToastRef.current = onToast;

  useEffect(() => {
    let disposed = false;
    let retryTimer = null;
    let openTimer = null;
    let pingTimer = null;
    let attempts = 0;
    let relayMode = false;
    let everOpened = false; // P2P가 한 번이라도 열렸는지
    let hostMissing = false; // 시그널링 서버에 해당 방(호스트 ID)이 없음
    let lastProbe = 0;
    let lastHostMessage = 0;
    const peer = new Peer(PEER_OPTIONS);

    const handleHostMessage = (msg) => {
      lastHostMessage = Date.now();
      if (msg?.type === 'state') setRoom(msg.state);
      else if (msg?.type === 'toast') onToastRef.current?.(msg.message, msg.kind);
    };

    const scheduleRetryForce = () => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, 5000);
    };

    const scheduleRetry = () => {
      if (disposed || relayMode) return;
      clearTimeout(retryTimer);
      attempts += 1;
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** Math.min(attempts, 4), 15000));
    };

    // ── 중계 모드 ──
    const offRelay = onRelay(peer, (src, msg) => {
      if (src !== hostId || !relayMode) return;
      hostMissing = false;
      if (msg?.type !== 'pong') handleHostMessage(msg);
      else lastHostMessage = Date.now();
      setStatus('connected');
    });

    const startRelay = () => {
      if (disposed || relayMode) return;
      if (hostMissing) {
        // 방 자체가 없으면 중계해도 소용없음 → '방을 찾을 수 없음' 유지하고 P2P로 계속 확인
        scheduleRetryForce();
        return;
      }
      relayMode = true;
      clearTimeout(retryTimer);
      try { connRef.current?.close(); } catch { /* ignore */ }
      connRef.current = createRelayConn(peer, hostId);
      setMode('relay');
      setStatus('connecting');
      lastHostMessage = Date.now();
      sendRelay(peer, hostId, { type: 'hello', nickname: nicknameRef.current });
      pingTimer = setInterval(() => {
        if (peer.disconnected && !peer.destroyed) peer.reconnect();
        sendRelay(peer, hostId, { type: 'ping', nickname: nicknameRef.current });
        if (Date.now() - lastHostMessage > HOST_SILENCE_LIMIT) {
          setStatus((st) => (st === 'not-found' ? st : 'reconnecting'));
          // 호스트가 아직 존재하는지 확인 (없으면 peer-unavailable 에러로 알 수 있음)
          if (Date.now() - lastProbe > 30000) {
            lastProbe = Date.now();
            const probe = peer.connect(hostId, { reliable: true });
            probe.on('open', () => probe.close());
            setTimeout(() => { try { probe.close(); } catch { /* ignore */ } }, 20000);
          }
        }
      }, PING_INTERVAL);
    };

    // ── P2P 모드 ──
    function connect() {
      if (disposed || peer.destroyed || relayMode) return;
      if (peer.disconnected) peer.reconnect();
      hostMissing = false;
      const conn = peer.connect(hostId, {
        reliable: true,
        metadata: { nickname: nicknameRef.current },
      });
      connRef.current = conn;

      clearTimeout(openTimer);
      openTimer = setTimeout(() => {
        if (!disposed && connRef.current === conn && !conn.open) startRelay();
      }, P2P_TIMEOUT);

      conn.on('open', () => {
        clearTimeout(openTimer);
        everOpened = true;
        attempts = 0;
        setStatus('connected');
        conn.send({ type: 'hello', nickname: nicknameRef.current });
      });
      conn.on('data', handleHostMessage);
      const onLost = () => {
        if (disposed || connRef.current !== conn || relayMode) return;
        clearTimeout(openTimer);
        if (hostMissing) return; // 방이 없어서 실패한 것 → 재시도는 에러 핸들러가 처리
        // 한 번도 열리지 못하고 실패 → 방화벽이 P2P를 막는 네트워크. 바로 중계 모드로.
        if (!everOpened) {
          startRelay();
          return;
        }
        // 잘 되던 P2P가 끊김 → P2P 재시도
        setStatus('reconnecting');
        scheduleRetry();
      };
      conn.on('close', onLost);
      conn.on('error', onLost);
    }

    peer.on('open', () => {
      if (!relayMode) connect();
    });
    peer.on('error', (err) => {
      if (disposed) return;
      if (err.type === 'peer-unavailable') {
        hostMissing = true;
        setStatus('not-found');
        if (!relayMode) scheduleRetryForce();
        return;
      }
      if (relayMode) return; // 중계 모드에서는 호스트 응답 여부(ping/pong)로만 상태 판단
      if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(err.type)) {
        setStatus('reconnecting');
        scheduleRetry();
      }
    });
    peer.on('disconnected', () => {
      if (!disposed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1000);
    });

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearTimeout(openTimer);
      clearInterval(pingTimer);
      if (relayMode) sendRelay(peer, hostId, { type: 'bye' });
      offRelay();
      peer.destroy();
    };
  }, [hostId]);

  // 닉네임 변경 시 호스트에 알림
  useEffect(() => {
    const conn = connRef.current;
    if (conn?.open) conn.send({ type: 'hello', nickname });
  }, [nickname]);

  const send = useCallback((action) => {
    const conn = connRef.current;
    if (!conn?.open) {
      onToastRef.current?.('호스트와 연결되어 있지 않습니다.', 'error');
      return false;
    }
    // 드래그 순서 변경·삭제는 즉시 화면에 반영 (호스트 상태가 곧 덮어씀)
    if (action.type === 'reorder') {
      setRoom((r) => (r ? { ...r, queue: reorderLocal(r.queue, action.activeId, action.overId) } : r));
    }
    if (action.type === 'remove') {
      setRoom((r) => (r ? { ...r, queue: r.queue.filter((it) => it.id !== action.id) } : r));
    }
    conn.send({ type: 'action', action });
    return true;
  }, []);

  return { status, mode, room, send };
}
