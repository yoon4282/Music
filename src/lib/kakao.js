/**
 * 카카오톡 공유 (Kakao JavaScript SDK)
 * 카카오 개발자 사이트 → 내 애플리케이션 → 플랫폼 → Web 사이트 도메인에
 * 배포 주소(https://yoon4282.github.io)가 등록되어 있어야 동작합니다.
 */
const KEY = import.meta.env?.VITE_KAKAO_JS_KEY;
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js';
const SDK_INTEGRITY = 'sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w';

export const KAKAO_ENABLED = Boolean(KEY);

let loading = null;

/** SDK를 한 번만 불러와 초기화. 실패하면 reject */
export function loadKakao() {
  if (!KAKAO_ENABLED) return Promise.reject(new Error('카카오 키 없음'));
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const init = () => {
        try {
          if (!window.Kakao.isInitialized()) window.Kakao.init(KEY);
          resolve(window.Kakao);
        } catch (err) {
          reject(err);
        }
      };
      if (window.Kakao) return init();
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.integrity = SDK_INTEGRITY;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = init;
      script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했어요'));
      document.head.appendChild(script);
    }).catch((err) => {
      loading = null; // 다음 클릭 때 재시도
      throw err;
    });
  }
  return loading;
}

/** 카카오톡 피드 메시지로 초대 링크 공유 */
export function sendKakaoInvite(Kakao, url, { title, description }) {
  const imageUrl = new URL('og-image.png', window.location.href).href;
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl,
      imageWidth: 800,
      imageHeight: 400,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: '🎵 노래 신청하러 가기', link: { mobileWebUrl: url, webUrl: url } }],
  });
}
