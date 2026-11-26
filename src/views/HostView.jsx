import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ListMusic, Music } from 'lucide-react';
import YouTubePlayer from '../components/YouTubePlayer.jsx';
import PlayerControls from '../components/PlayerControls.jsx';
import QrPanel from '../components/QrPanel.jsx';
import QueueList from '../components/QueueList.jsx';
import AddSongForm from '../components/AddSongForm.jsx';
import StartOverlay from '../components/StartOverlay.jsx';
import Toasts from '../components/Toasts.jsx';
import { useHostRoom } from '../hooks/useHostRoom.js';
import { useToasts } from '../hooks/useToasts.js';
import { loadState, queueReducer, saveState } from '../lib/queue.js';
import { fetchVideoMeta, thumbnailUrl } from '../lib/youtube.js';
import { randomId } from '../lib/id.js';

const PLAYER_ERRORS = {
  2: '잘못된 영상 ID',
  5: '플레이어 오류',
  100: '삭제되었거나 비공개 영상',
  101: '퍼가기가 허용되지 않은 영상',
  150: '퍼가기가 허용되지 않은 영상',
};

export default function HostView() {
  const [state, dispatch] = useReducer(queueReducer, undefined, loadState);
  const [started, setStarted] = useState(false);
  const playerRef = useRef(null);
  const { toasts, push } = useToasts();
  const restoredCount = useMemo(() => (state.current ? 1 : 0) + state.queue.length, []); // eslint-disable-line

  useEffect(() => saveState(state), [state]);

  /** 호스트/게스트 공통 액션 처리 (호스트가 유일한 진실의 원천) */
  const handleAction = useCallback(
    async (action, { nickname, reply }) => {
      switch (action.type) {
        case 'add': {
          const videoId = String(action.videoId || '');
          if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
          const meta = action.title
            ? { title: action.title, author: action.author || '', thumbnail: thumbnailUrl(videoId) }
            : await fetchVideoMeta(videoId);
          dispatch({
            type: 'ADD',
            item: { id: randomId(12), videoId, ...meta, requestedBy: nickname, addedAt: Date.now() },
          });
          reply({ type: 'toast', message: `🎵 “${meta.title}” 예약 완료` });
          if (nickname !== '호스트') push(`${nickname} 님이 “${meta.title}” 추가`);
          break;
        }
        case 'remove':
          dispatch({ type: 'REMOVE', id: action.id });
          break;
        case 'reorder':
          dispatch({ type: 'REORDER', activeId: action.activeId, overId: action.overId });
          break;
        case 'skip':
          dispatch({ type: 'NEXT' });
          if (nickname !== '호스트') push(`${nickname} 님이 스킵했어요`);
          break;
        case 'toggle':
          playerRef.current?.toggle();
          break;
        default:
      }
    },
    [push],
  );

  const local = useCallback(
    (action) => handleAction(action, { nickname: '호스트', reply: (m) => push(m.message, m.kind) }),
    [handleAction, push],
  );

  const { peerId, status, error, guests } = useHostRoom({ enabled: true, state, onAction: handleAction });

  const joinUrl = peerId ? `${window.location.origin}${window.location.pathname}?hostId=${peerId}` : '';

  return (
    <div className="min-h-dvh bg-zinc-950 md:grid md:h-dvh md:grid-cols-3 md:overflow-hidden">
      {!started && <StartOverlay onStart={() => setStarted(true)} restoredCount={restoredCount} />}

      {/* ── 왼쪽(2): 플레이어 + 컨트롤 ── */}
      <main className="flex flex-col md:col-span-2 md:min-h-0 md:border-r md:border-zinc-900">
        <div className="relative aspect-video w-full bg-black md:aspect-auto md:flex-1">
          {started && (
            <YouTubePlayer
              ref={playerRef}
              item={state.current}
              onEnded={() => dispatch({ type: 'NEXT' })}
              onPlayingChange={(v) => dispatch({ type: 'SET_PLAYING', value: v })}
              onError={(code) => {
                push(`재생할 수 없어 건너뜁니다 (${PLAYER_ERRORS[code] || code})`, 'error');
                dispatch({ type: 'NEXT' });
              }}
            />
          )}
          {!state.current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/40 text-center">
              <Music className="h-14 w-14 text-violet-500/70" />
              <p className="text-lg font-semibold text-zinc-200">재생 대기 중</p>
              <p className="text-sm text-zinc-500">QR코드를 스캔해서 첫 곡을 예약해 주세요</p>
            </div>
          )}
        </div>
        <div className="border-t border-zinc-900 bg-zinc-950 px-4 py-3 sm:px-6 sm:py-4">
          <PlayerControls
            current={state.current}
            isPlaying={state.isPlaying}
            nextCount={state.queue.length}
            onToggle={() => playerRef.current?.toggle()}
            onSkip={() => local({ type: 'skip' })}
          />
        </div>
      </main>

      {/* ── 오른쪽(1): 상단 QR / 하단 대기열 ── */}
      <aside className="flex flex-col gap-4 p-4 md:min-h-0">
        <QrPanel joinUrl={joinUrl} status={status} error={error} guests={guests} />

        <section className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 md:min-h-0 md:flex-1">
          <header className="flex items-center justify-between gap-2 px-4 pt-4">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
              <ListMusic className="h-4 w-4 text-violet-400" /> 다음 곡
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs tabular-nums text-zinc-400">
                {state.queue.length}
              </span>
            </h2>
            {state.queue.length > 1 && (
              <button
                type="button"
                onClick={() => window.confirm('대기열을 모두 비울까요?') && dispatch({ type: 'CLEAR' })}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                전체 삭제
              </button>
            )}
          </header>
          <div className="px-4 pt-3">
            <AddSongForm compact onAdd={(r) => local({ type: 'add', ...r })} />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4 md:min-h-0">
            <QueueList
              items={state.queue}
              onReorder={(activeId, overId) => local({ type: 'reorder', activeId, overId })}
              onRemove={(id) => local({ type: 'remove', id })}
            />
          </div>
        </section>
      </aside>

      <Toasts toasts={toasts} />
    </div>
  );
}
