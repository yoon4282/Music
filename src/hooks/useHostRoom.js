import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { PEER_OPTIONS } from '../lib/peer.js';
import { randomId } from '../lib/id.js';

const PEER_ID_KEY = 'jukebox:host-peer-id';

/**
 * 호스트 쪽 PeerJS 방.
 * - 고유 Peer ID로 시그널링 서버에 등록 (새로고침 시 같은 ID 재사용 → QR 그대로 유효)
 * - 게스트 연결을 관리하고, 상태가 바뀔 때마다 모든 게스트에게 브로드캐스트
 * - 게스트가 보낸 action은 onAction(action, ctx)로 전달
 */
export function useHostRoom({ enabled, state, onAction }) {
  const [peerId, setPeerId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | connecting | ready | error
  const [error, setError] = useState(null);
  const [guests, setGuests] = useState([]); // [{ id, nickname }]

  const connsRef = useRef(new Map()); // peerId -> { conn, nickname }
  const stateRef = useRef(state);
  const onActionRef = useRef(onAction);
  stateRef.current = state;
  onActionRef.current = onAction;

  const syncGuests = useCallback(() => {
    setGuests([...connsRef.current.entries()].map(([id, g]) => ({ id, nickname: g.nickname })));
  }, []);

  const snapshot = useCallback(
    () => ({ ...stateRef.current, guestCount: connsRef.current.size }),
    [],
  );

  useEffect(() => {
    if (!enabled) return undefined;
    let peer = null;
    let disposed = false;
    let reconnectAttempts = 0;
    setStatus('connecting');

    const create = (id) => {
      peer = new Peer(id, PEER_OPTIONS);

      peer.on('open', (openId) => {
        try { sessionStorage.setItem(PEER_ID_KEY, openId); } catch { /* ignore */ }
        reconnectAttempts = 0;
        setPeerId(openId);
        setStatus('ready');
        setError(null);
      });

      peer.on('connection', (conn) => {
        conn.on('open', () => {
          connsRef.current.set(conn.peer, { conn, nickname: conn.metadata?.nickname || '게스트' });
          syncGuests();
          conn.send({ type: 'state', state: snapshot() });
        });
        conn.on('data', (msg) => {
          if (!msg || typeof msg !== 'object') return;
          const entry = connsRef.current.get(conn.peer);
          if (msg.type === 'hello' && entry) {
            entry.nickname = String(msg.nickname || '게스트').slice(0, 20);
            syncGuests();
          } else if (msg.type === 'action' && msg.action) {
            onActionRef.current?.(msg.action, {
              nickname: entry?.nickname || '게스트',
              reply: (m) => conn.open && conn.send(m),
            });
          }
        });
        const drop = () => {
          if (connsRef.current.get(conn.peer)?.conn === conn) {
            connsRef.current.delete(conn.peer);
            syncGuests();
          }
        };
        conn.on('close', drop);
        conn.on('error', drop);
      });

      peer.on('disconnected', () => {
        // 시그널링 서버와 끊겨도 기존 데이터 채널은 유지됨. 새 게스트를 받기 위해 재연결.
        if (disposed || peer.destroyed) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts++, 30000);
        const current = peer;
        setTimeout(() => !current.destroyed && current.disconnected && current.reconnect(), delay);
      });

      peer.on('error', (err) => {
        if (disposed) return;
        if (err.type === 'unavailable-id') {
          // 이전 세션의 ID가 아직 서버에 남아있는 경우 → 새 ID로 재시도
          peer.destroy();
          create(`jb-${randomId(8)}`);
          return;
        }
        if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(err.type)) {
          setStatus('error');
          setError(err.message || err.type);
        }
      });
    };

    let savedId = null;
    try { savedId = sessionStorage.getItem(PEER_ID_KEY); } catch { /* ignore */ }
    create(savedId || `jb-${randomId(8)}`);

    return () => {
      disposed = true;
      connsRef.current.clear();
      peer?.destroy();
    };
  }, [enabled, snapshot, syncGuests]);

  // 상태 변경 시 모든 게스트에게 동기화
  useEffect(() => {
    const msg = { type: 'state', state: { ...state, guestCount: guests.length } };
    for (const { conn } of connsRef.current.values()) {
      if (conn.open) conn.send(msg);
    }
  }, [state, guests.length]);

  return { peerId, status, error, guests };
}
