/**
 * YouTube Data API 검색 사용량 (이 방에서 한 검색만 집계)
 * - 기본 할당량: 하루 10,000 유닛, 검색 1회 = 100 유닛 → 하루 약 100회
 * - 매일 미국 태평양 시간 자정에 초기화 (한국 시간 오후 4시 또는 5시)
 * Google은 남은 할당량을 웹페이지에서 조회할 방법을 제공하지 않아서 직접 셉니다.
 */
export const DAILY_UNITS = 10000;
export const SEARCH_COST = 100;
const KEY = 'jukebox:search-usage';

/** 할당량 기준 날짜 (태평양 시간) */
export const quotaDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

export function loadUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(KEY));
    if (u?.day === quotaDay()) return u;
  } catch { /* ignore */ }
  return { day: quotaDay(), units: 0, exhausted: false };
}

export function saveUsage(u) {
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* ignore */ }
}

/** 날짜가 바뀌었으면 0으로 */
export function currentUsage(u) {
  return u?.day === quotaDay() ? u : { day: quotaDay(), units: 0, exhausted: false };
}

export function usagePercent(u) {
  if (!u) return 0;
  if (u.exhausted) return 100;
  return Math.min(100, Math.round((u.units / DAILY_UNITS) * 100));
}

/** 다음 초기화 시각을 한국 시간 문자열로 */
export function nextResetLabel() {
  const now = new Date();
  // 태평양 시간 기준 현재 시각의 오프셋 계산
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const offsetMs = now.getTime() - pt.getTime();
  const nextMidnightPt = new Date(pt);
  nextMidnightPt.setHours(24, 0, 0, 0);
  const reset = new Date(nextMidnightPt.getTime() + offsetMs);
  return reset.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' });
}
