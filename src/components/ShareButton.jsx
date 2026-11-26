import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { shareLink } from '../lib/share.js';
import { KAKAO_ENABLED, loadKakao, sendKakaoInvite } from '../lib/kakao.js';

const INVITE = {
  title: 'Jukebox Party 🎵 같이 노래 신청해요!',
  description: '링크로 들어와서 유튜브 곡을 대기열에 예약하세요.',
};

/**
 * 카카오톡으로 접속 링크 공유
 * 1) 카카오 SDK(키 설정 시): 카카오톡 미리보기 카드로 바로 공유
 * 2) 실패하거나 키가 없으면: 휴대폰은 공유 창, PC는 초대 문구+링크 복사
 */
export default function ShareButton({ url, onToast, label = '카카오톡 공유', className = '' }) {
  // 클릭 시점에 바로 공유 창을 띄울 수 있도록 SDK를 미리 불러옴 (팝업 차단 방지)
  useEffect(() => {
    if (KAKAO_ENABLED) loadKakao().catch(() => {});
  }, []);

  const fallback = async () => {
    const result = await shareLink(url);
    if (result === 'copied') onToast?.('초대 문구와 링크를 복사했어요. 카카오톡 채팅방에 붙여넣어 주세요!');
    else if (result === 'failed') onToast?.('공유하지 못했어요. 링크를 직접 복사해 주세요.', 'error');
  };

  const share = async () => {
    if (!url) return;
    if (KAKAO_ENABLED) {
      try {
        const Kakao = window.Kakao?.isInitialized?.() ? window.Kakao : await loadKakao();
        sendKakaoInvite(Kakao, url, INVITE);
        return;
      } catch (err) {
        console.warn('카카오 공유 실패, 기본 공유로 대체:', err);
      }
    }
    await fallback();
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={!url}
      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#FEE500] px-3 font-semibold text-[#191919] transition hover:brightness-95 active:scale-95 disabled:opacity-40 ${className}`}
    >
      <MessageCircle className="h-4 w-4 fill-current" />
      {label}
    </button>
  );
}
