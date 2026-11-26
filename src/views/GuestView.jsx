import { useEffect, useState } from 'react';
import { ListMusic, Loader2, Music, Users, Wifi, WifiOff } from 'lucide-react';
import AddSongForm from '../components/AddSongForm.jsx';
import QueueList from '../components/QueueList.jsx';
import PlayerControls from '../components/PlayerControls.jsx';
import Toasts from '../components/Toasts.jsx';
import { useGuestRoom } from '../hooks/useGuestRoom.js';
import { useToasts } from '../hooks/useToasts.js';

const NICK_KEY = 'jukebox:nickname';
const defaultNick = () => `게스트${Math.floor(100 + Math.random() * 900)}`;

function readNick() {
  try {
    return localStorage.getItem(NICK_KEY) || defaultNick();
  } catch {
    return defaultNick();
  }
}

const STATUS_TEXT = {
  connecting: '호스트에 연결 중…',
  connected: '연결됨',
  reconnecting: '연결이 끊겨 재연결 중…',
  'not-found': '방을 찾을 수 없어요. 호스트 화면이 켜져 있는지 확인하세요.',
};

/** 모바일 리모컨 UI: 영상 플레이어 없이 곡 추가 + 닉네임 + 대기열 */
export default function GuestView({ hostId }) {
  const { toasts, push } = useToasts();
  const [nickDraft, setNickDraft] = useState(readNick);
  const [nickname, setNickname] = useState(nickDraft);
  const { status, mode, room, send } = useGuestRoom({ hostId, nickname, onToast: push });

  // 입력 후 잠시 멈추면 닉네임 확정
  useEffect(() => {
    const t = setTimeout(() => {
      const v = nickDraft.trim().slice(0, 20);
      if (v && v !== nickname) {
        setNickname(v);
        try { localStorage.setItem(NICK_KEY, v); } catch { /* ignore */ }
      }
    }, 500);
    return () => clearTimeout(t);
  }, [nickDraft, nickname]);

  const connected = status === 'connected';

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-white">Jukebox Remote</h1>
            <p className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {connected ? <Wifi className="h-3 w-3" /> : status === 'connecting' ? <Loader2 className="h-3 w-3 animate-spin" /> : <WifiOff className="h-3 w-3" />}
              {mode === 'relay'
                ? connected
                  ? '연결됨 (중계 모드)'
                  : status === 'reconnecting'
                    ? '중계 모드: 호스트 응답 없음 (재시도 중…)'
                    : '중계 모드로 연결 중…'
                : STATUS_TEXT[status]}
            </p>
          </div>
        </div>
        {room && (
          <span className="flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
            <Users className="h-3.5 w-3.5" /> {room.guestCount}명
          </span>
        )}
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <label className="flex items-center gap-3">
          <span className="shrink-0 text-sm text-zinc-400">닉네임</span>
          <input
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            maxLength={20}
            className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-violet-500"
          />
        </label>
        <AddSongForm onAdd={(r) => send({ type: 'add', ...r })} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-violet-400">
          {room?.isPlaying ? '▶ 지금 재생 중' : '현재 곡'}
        </p>
        <PlayerControls
          current={room?.current}
          isPlaying={room?.isPlaying}
          nextCount={room?.queue.length ?? 0}
          onToggle={() => send({ type: 'toggle' })}
          onSkip={() => send({ type: 'skip' })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 px-1 font-semibold text-zinc-100">
          <ListMusic className="h-4 w-4 text-violet-400" /> 대기열
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs tabular-nums text-zinc-400">
            {room?.queue.length ?? 0}
          </span>
          <span className="ml-auto text-xs font-normal text-zinc-500">길게 눌러 순서 변경</span>
        </h2>
        {room ? (
          <QueueList
            items={room.queue}
            onReorder={(activeId, overId) => send({ type: 'reorder', activeId, overId })}
            onRemove={(id) => send({ type: 'remove', id })}
          />
        ) : (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        )}
      </section>

      <Toasts toasts={toasts} />
    </div>
  );
}
