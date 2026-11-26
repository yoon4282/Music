import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { PEER_OPTIONS } from '../lib/peer.js';
import { reorderLocal } from '../lib/queue.js';

/**
 * 게스트 쪽: 호스트 Peer ID로 데이터 채널을 열고 상태를 수신.
 * 연결이 끊기면 자동으로 재연결을 시도합니다.
 */
export function useGuestRoom({ hostId, nickname, onToast }) {
  const [status, setStatus] = useState('connecting'); // connecting | connected | reconnecting | not-found | error
  const [room, setRoom] = useState(null); // { current, queue, isPlaying, guestCount }

  const connRef = useRef(null);
  const nicknameRef = useRef(nickname);
  const onToastRef = useRef(onToast);
  nicknameRef.current = nickname;
  onToastRef.current = onToast;

  useEffect(() => {
    let disposed = false;
    let retryTimer = null;
    let attempts = 0;
    const peer = new Peer(PEER_OPTIONS);

    const scheduleRetry = () => {
      if (disposed) return;
      clearTimeout(retryTimer);
      attempts += 1;
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** Math.min(attempts, 4), 15000));
    };

    function connect() {
      if (disposed || peer.destroyed) return;
      if (peer.disconnected) peer.reconnect();
      const conn = peer.connect(hostId, {
        reliable: true,
        metadata: { nickname: nicknameRef.current },
      });
      connRef.current = conn;

      conn.on('open', () => {
        attempts = 0;
        setStatus('connected');
        conn.send({ type: 'hello', nickname: nicknameRef.current });
      });
      conn.on('data', (msg) => {
        if (msg?.type === 'state') setRoom(msg.state);
        else if (msg?.type === 'toast') onToastRef.current?.(msg.message, msg.kind);
      });
      conn.on('close', () => {
        if (disposed || connRef.current !== conn) return;
        setStatus('reconnecting');
        scheduleRetry();
      });
      conn.on('error', () => {
        if (disposed || connRef.current !== conn) return;
        setStatus('reconnecting');
        scheduleRetry();
      });
    }

    peer.on('open', connect);
    peer.on('error', (err) => {
      if (disposed) return;
      if (err.type === 'peer-unavailable') {
        setStatus('not-found');
        scheduleRetry();
      } else if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(err.type)) {
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
    // 드래그 순서 변경은 즉시 화면에 반영 (호스트 상태가 곧 덮어씀)
    if (action.type === 'reorder') {
      setRoom((r) => (r ? { ...r, queue: reorderLocal(r.queue, action.activeId, action.overId) } : r));
    }
    if (action.type === 'remove') {
      setRoom((r) => (r ? { ...r, queue: r.queue.filter((it) => it.id !== action.id) } : r));
    }
    conn.send({ type: 'action', action });
    return true;
  }, []);

  return { status, room, send };
}
