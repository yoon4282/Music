import { MessageCircle } from 'lucide-react';
import { shareLink } from '../lib/share.js';

/** 카카오톡 등으로 접속 링크 공유 (휴대폰은 공유 창, PC는 링크 복사) */
export default function ShareButton({ url, onToast, label = '카카오톡 공유', className = '' }) {
  const share = async () => {
    if (!url) return;
    const result = await shareLink(url);
    if (result === 'copied') onToast?.('초대 문구와 링크를 복사했어요. 카카오톡 채팅방에 붙여넣어 주세요!');
    else if (result === 'failed') onToast?.('공유하지 못했어요. 링크를 직접 복사해 주세요.', 'error');
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
