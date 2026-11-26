import { Music, Volume2 } from 'lucide-react';

/** 브라우저 자동재생 정책 대응: 사용자 클릭(제스처) 이후에 플레이어를 생성 */
export default function StartOverlay({ onStart, restoredCount }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Music className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Jukebox Party</h1>
        <p className="mt-2 text-sm text-zinc-400">
          이 화면이 메인 스피커가 됩니다. 친구들은 QR코드로 접속해 유튜브 곡을 예약할 수 있어요.
        </p>
        {restoredCount > 0 && (
          <p className="mt-3 text-xs text-violet-300">이전 대기열 {restoredCount}곡을 불러왔어요.</p>
        )}
        <button
          type="button"
          autoFocus
          onClick={onStart}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-lg font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
        >
          <Volume2 className="h-5 w-5" />
          방 시작하기 (오디오 활성화)
        </button>
        <p className="mt-3 text-xs text-zinc-500">브라우저 자동 재생 정책 때문에 한 번 클릭이 필요해요</p>
      </div>
    </div>
  );
}
