import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { PEER_OPTIONS } from '../lib/peer.js';
import { randomId } from '../lib/id.js';
import { createRelayConn, onRelay } from '../lib/relay.js';

const PEER_ID_KEY = 'jukebox:host-peer-id';
const RELAY_TIMEOUT = 35000; // 중계 게스트가 이 시간 동안 ping이 없으면 퇴장 처리

/**
 * 호스트 쪽 PeerJS 방.
 * - 고유 Peer ID로 시그널링 서버에 등록 (같은 기기에서는 탭을 새로 열어도 같은 방 코드 → 예전 링크도 유효)
 * - 게스트 연결(P2P 데이터 채널 또는 중계 모드)을 관리하고, 상태 변경 시 모두에게 브로드캐스트
 * - 게스트가 보낸 action은 onAction(action, ctx)로 전달
 */
export function useHostRoom({ enabled, state, onAction }) {
  const [peerId, setPeerId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | connecting | ready | error
  const [error, setError] = useState(null);
  const [guests, setGuests] = useState([]); // [{ id, nickname, relay }]

  const connsRef = useRef(new Map()); // guestPeerId -> { conn, nickname }
  const stateRef = useRef(state);
  const onActionRef = useRef(onAction);
  stateRef.current = state;
  onActionRef.current = onAction;

  const syncGuests = useCallback(() => {
    setGuests([...connsRef.current.entries()].map(([id, g]) => ({ id, nickname: g.nickname, relay: !!g.conn.relay })));
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
    let offRelay = () => {};
    setStatus('connecting');

    const addGuest = (conn, nickname) => {
      connsRef.current.set(conn.peer, { conn, nickname: nickname || '게스트' });
      syncGuests();
      conn.send({ type: 'state', state: snapshot() });
    };

    const handleGuestMessage = (guestId, msg) => {
      if (!msg || typeof msg !== 'object') return;
      const entry = connsRef.current.get(guestId);
      if (!entry) return;
      if (msg.type === 'hello') {
        entry.nickname = String(msg.nickname || '게스트').slice(0, 20);
        syncGuests();
      } else if (msg.type === 'action' && msg.action) {
        onActionRef.current?.(msg.action, {
          nickname: entry.nickname,
          reply: (m) => entry.conn.open && entry.conn.send(m),
        });
      }
    };

    const create = (id) => {
      peer = new Peer(id, PEER_OPTIONS);
      const thisPeer = peer;

      thisPeer.on('open', (openId) => {
        reconnectAttempts = 0;
        try { localStorage.setItem(PEER_ID_KEY, openId); } catch { /* ignore */ }
        setPeerId(openId);
        setStatus('ready');
        setError(null);
      });

      // ── P2P(WebRTC) 게스트 ──
      thisPeer.on('connection', (conn) => {
        conn.on('open', () => addGuest(conn, conn.metadata?.nickname));
        conn.on('data', (msg) => handleGuestMessage(conn.peer, msg));
        const drop = () => {
          if (connsRef.current.get(conn.peer)?.conn === conn) {
            connsRef.current.delete(conn.peer);
            syncGuests();
          }
        };
        conn.on('close', drop);
        conn.on('error', drop);
      });

      // ── 중계 모드 게스트 (시그널링 WebSocket 경유) ──
      offRelay();
      offRelay = onRelay(thisPeer, (guestId, msg) => {
        if (!msg || typeof msg !== 'object') return;
        let entry = connsRef.current.get(guestId);
        if (msg.type === 'bye') {
          if (entry?.conn.relay) {
            connsRef.current.delete(guestId);
            syncGuests();
          }
          return;
        }
        if (!entry || (!entry.conn.relay && !entry.conn.open)) {
          addGuest(createRelayConn(thisPeer, guestId), msg.nickname);
          entry = connsRef.current.get(guestId);
        }
        if (entry.conn.relay) entry.conn.lastSeen = Date.now();
        if (msg.type === 'ping') entry.conn.send({ type: 'pong' });
        else handleGuestMessage(guestId, msg);
      });

      thisPeer.on('disconnected', () => {
        // 시그널링 서버와 끊겨도 기존 P2P 채널은 유지됨. 새 게스트·중계 게스트를 위해 재연결.
        if (disposed || thisPeer.destroyed) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts++, 30000);
        setTimeout(() => !thisPeer.destroyed && thisPeer.disconnected && thisPeer.reconnect(), delay);
      });

      thisPeer.on('error', (err) => {
        if (disposed) return;
        if (err.type === 'unavailable-id') {
          // 이전 세션의 ID가 아직 서버에 남아있는 경우 → 새 ID로 재시도
          thisPeer.destroy();
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
    try { savedId = localStorage.getItem(PEER_ID_KEY); } catch { /* ignore */ }
    create(savedId || `jb-${randomId(8)}`);

    // 응답 없는 중계 게스트 정리
    const sweep = setInterval(() => {
      let changed = false;
      for (const [id, { conn }] of connsRef.current) {
        if (conn.relay && Date.now() - conn.lastSeen > RELAY_TIMEOUT) {
          connsRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) syncGuests();
    }, 10000);

    return () => {
      disposed = true;
      clearInterval(sweep);
      offRelay();
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
