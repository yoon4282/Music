import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

/**
 * YouTube IFrame Player API 래퍼.
 * - item({ id, videoId })이 바뀌면 loadVideoById로 즉시 재생
 * - 곡이 끝나면(onStateChange === 0 / YT.PlayerState.ENDED) onEnded 호출
 */
const YouTubePlayer = forwardRef(function YouTubePlayer({ item, onEnded, onPlayingChange, onError }, ref) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const cb = useRef({});
  cb.current = { onEnded, onPlayingChange, onError };

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    toggle: () => {
      const p = playerRef.current;
      if (!p?.getPlayerState) return;
      if (p.getPlayerState() === 1) p.pauseVideo();
      else p.playVideo();
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      const mount = document.createElement('div');
      containerRef.current.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e) => {
            if (e.data === 0) {
              // ENDED → 다음 곡
              cb.current.onPlayingChange?.(false);
              cb.current.onEnded?.();
            } else if (e.data === 1) cb.current.onPlayingChange?.(true);
            else if (e.data === 2) cb.current.onPlayingChange?.(false);
          },
          // 2: 잘못된 ID, 5: HTML5 오류, 100: 삭제/비공개, 101·150: 퍼가기 금지
          onError: (e) => cb.current.onError?.(e.data),
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, []);

  const itemKey = item?.id;
  const videoId = item?.videoId;
  useEffect(() => {
    if (!ready) return;
    const p = playerRef.current;
    if (videoId) p.loadVideoById(videoId);
    else p.stopVideo();
    // 같은 영상이 연속으로 예약돼도 다시 로드되도록 item.id를 기준으로 동작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, ready]);

  return <div ref={containerRef} className="yt-host absolute inset-0" />;
});

export default YouTubePlayer;
