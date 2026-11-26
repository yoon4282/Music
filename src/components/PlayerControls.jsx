import { Pause, Play, SkipForward, User } from 'lucide-react';

/** 현재 곡 정보 + 재생/일시정지/스킵 (호스트·게스트 공용) */
export default function PlayerControls({ current, isPlaying, onToggle, onSkip, nextCount = 0 }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {current ? (
        <img src={current.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded-lg bg-zinc-800 object-cover sm:h-14 sm:w-24" />
      ) : (
        <div className="h-12 w-20 shrink-0 rounded-lg bg-zinc-800 sm:h-14 sm:w-24" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-zinc-100 sm:text-lg">
          {current ? current.title : '재생 중인 곡이 없어요'}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-zinc-400 sm:text-sm">
          {current ? (
            <>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {current.requestedBy} 님의 신청{current.author ? ` · ${current.author}` : ''}
              </span>
            </>
          ) : (
            `대기 중 ${nextCount}곡`
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={!current}
          aria-label={isPlaying ? '일시정지' : '재생'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:scale-105 active:scale-95 disabled:opacity-30"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!current}
          aria-label="다음 곡"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 active:scale-95 disabled:opacity-30"
        >
          <SkipForward className="h-5 w-5 fill-current" />
        </button>
      </div>
    </div>
  );
}
