import { copyText } from './clipboard.js';

export const SHARE_TEXT = '🎵 같이 노래 신청해요! 링크로 들어와서 유튜브 곡을 예약하세요.';

/**
 * 링크 공유
 * - 휴대폰·태블릿: 시스템 공유 창(Web Share API) → 카카오톡 선택
 * - 공유 창이 없는 PC: 링크를 복사 → 카카오톡에 붙여넣기
 * @returns 'shared' | 'cancelled' | 'copied' | 'failed'
 */
export async function shareLink(url, { title = 'Jukebox Party', text = SHARE_TEXT } = {}) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // 공유 실패 시 복사로 대체
    }
  }
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'failed';
}
