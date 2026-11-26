import { useState } from 'react';
import { ExternalLink, Loader2, Plus, Search, X } from 'lucide-react';
import { SEARCH_ENABLED, parseYouTubeId, searchYouTube, youtubeSearchPageUrl } from '../lib/youtube.js';

/** 유튜브 링크 붙여넣기 또는 (API 키가 있으면) 검색으로 곡 추가 */
export default function AddSongForm({ onAdd, onSearched, compact = false }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);
  const [results, setResults] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setHint(null);

    const videoId = parseYouTubeId(text);
    if (videoId) {
      if (onAdd({ videoId }) !== false) {
        setValue('');
        setResults([]);
      }
      return;
    }

    if (/^https?:\/\//i.test(text)) {
      setHint({ kind: 'error', text: '유튜브 영상 링크를 인식하지 못했어요.' });
      return;
    }

    if (!SEARCH_ENABLED) {
      setHint({ kind: 'search', text });
      return;
    }

    setBusy(true);
    try {
      const found = await searchYouTube(text);
      onSearched?.({ exhausted: false });
      setResults(found);
      if (!found.length) setHint({ kind: 'error', text: '검색 결과가 없어요.' });
    } catch (err) {
      if (err.quotaExceeded) onSearched?.({ exhausted: true });
      setHint({ kind: 'error', text: err.quotaExceeded ? err.message : `검색 실패: ${err.message}` });
    } finally {
      setBusy(false);
    }
  };

  const pick = (r) => {
    if (onAdd(r) !== false) {
      setResults([]);
      setValue('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode={SEARCH_ENABLED ? 'search' : 'url'}
            enterKeyHint={SEARCH_ENABLED ? 'search' : 'send'}
            placeholder={SEARCH_ENABLED ? '가수, 노래 제목 또는 유튜브 링크' : '유튜브 링크 붙여넣기'}
            className={`w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-zinc-100 outline-none
              placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
              ${compact ? 'h-10 text-sm' : 'h-12 text-base'}`}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 font-semibold text-white
            transition hover:bg-violet-500 active:scale-95 disabled:opacity-40 ${compact ? 'h-10 text-sm' : 'h-12'}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          추가
        </button>
      </form>

      {hint?.kind === 'error' && <p className="px-1 text-xs text-red-400">{hint.text}</p>}
      {hint?.kind === 'search' && (
        <p className="px-1 text-xs text-zinc-400">
          링크가 아니네요.{' '}
          <a
            href={youtubeSearchPageUrl(hint.text)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-violet-400 underline-offset-2 hover:underline"
          >
            유튜브에서 “{hint.text}” 검색 <ExternalLink className="h-3 w-3" />
          </a>{' '}
          후 공유 → 링크 복사해서 붙여넣어 주세요.
        </p>
      )}

      {results.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-zinc-500">검색 결과 — 탭해서 추가</span>
            <button type="button" onClick={() => setResults([])} className="p-1 text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto scrollbar-thin">
            {results.map((r) => (
              <li key={r.videoId}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-800 active:bg-zinc-800"
                >
                  <img src={r.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-100">{r.title}</p>
                    <p className="truncate text-xs text-zinc-500">{r.author}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
