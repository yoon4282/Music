import { useEffect, useRef, useState } from 'react';
import { DAILY_UNITS, SEARCH_COST, nextResetLabel, usagePercent } from '../lib/quota.js';

const SIZE = 30;
const STROKE = 3.5;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function tone(pct) {
  if (pct >= 90) return { ring: '#f87171', text: 'text-red-300' }; // red-400
  if (pct >= 70) return { ring: '#fbbf24', text: 'text-amber-200' }; // amber-400
  return { ring: '#a78bfa', text: 'text-zinc-200' }; // violet-400
}

/** 오늘 검색 API 사용량 원형 게이지 (누르면 자세한 정보) */
export default function QuotaRing({ usage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pct = usagePercent(usage);
  const { ring, text } = tone(pct);
  const used = usage?.exhausted ? DAILY_UNITS / SEARCH_COST : Math.round((usage?.units || 0) / SEARCH_COST);
  const total = DAILY_UNITS / SEARCH_COST;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`오늘 검색 사용량 ${pct}%`}
        title={`오늘 검색 사용량 ${pct}%`}
        className="relative flex items-center justify-center rounded-full transition hover:scale-105"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#27272a" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={ring}
            strokeWidth={STROKE}
            strokeLinecap={pct > 0 && pct < 100 ? 'round' : 'butt'}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 600ms ease, stroke 300ms' }}
          />
        </svg>
        <span className={`absolute font-bold tabular-nums ${pct >= 100 ? "text-[8.5px]" : "text-[10px]"} ${text}`}>{pct}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-left text-xs shadow-xl">
          <p className="font-semibold text-zinc-100">오늘 검색 사용량 {pct}%</p>
          <p className="mt-1 text-zinc-400">
            {usage?.exhausted ? (
              <span className="text-red-300">오늘 검색 한도를 다 썼어요. 링크 붙여넣기는 계속 돼요.</span>
            ) : (
              <>
                검색 <b className="text-zinc-200">{used}</b> / {total}회 사용 · 남은 {total - used}회
              </>
            )}
          </p>
          <p className="mt-1 text-zinc-500">매일 {nextResetLabel()}에 초기화 (이 방에서 한 검색 기준)</p>
        </div>
      )}
    </div>
  );
}
