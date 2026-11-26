const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(['youtube.com', 'youtube-nocookie.com']);

/**
 * 다양한 유튜브 링크에서 11자리 Video ID를 추출합니다.
 *  - https://www.youtube.com/watch?v=ID&list=...
 *  - https://m.youtube.com/watch?v=ID / music.youtube.com/watch?v=ID
 *  - https://youtu.be/ID?si=...
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/embed/ID, /live/ID, /v/ID
 *  - 스킴 없이 붙여넣은 youtu.be/ID, www.youtube.com/watch?v=ID
 * 링크가 아니면 null (→ 검색어로 취급)
 */
export function parseYouTubeId(input) {
  if (!input) return null;
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return ID_RE.test(id) ? id : null;
  }

  if (YT_HOSTS.has(host)) {
    const v = url.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/);
    if (m) return m[1];
  }
  return null;
}

export const thumbnailUrl = (videoId) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

async function fetchJson(url, ms = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** oEmbed로 제목/채널명을 가져옵니다. YouTube oEmbed → noembed(CORS 프록시) 순으로 시도. */
export async function fetchVideoMeta(videoId) {
  const target = encodeURIComponent(watchUrl(videoId));
  const sources = [
    `https://www.youtube.com/oembed?url=${target}&format=json`,
    `https://noembed.com/embed?url=${target}`,
  ];
  for (const src of sources) {
    try {
      const data = await fetchJson(src);
      if (data?.title) {
        return { title: data.title, author: data.author_name || '', thumbnail: thumbnailUrl(videoId) };
      }
    } catch { /* 다음 소스 시도 */ }
  }
  return { title: `YouTube 영상 (${videoId})`, author: '', thumbnail: thumbnailUrl(videoId) };
}

export const SEARCH_ENABLED = Boolean(import.meta.env?.VITE_YOUTUBE_API_KEY);

/** (선택) YouTube Data API v3 검색. VITE_YOUTUBE_API_KEY가 있을 때만 동작 */
export async function searchYouTube(query) {
  const key = import.meta.env?.VITE_YOUTUBE_API_KEY;
  if (!key) throw new Error('검색 API 키가 설정되지 않았습니다.');
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '8', q: query, key,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let data;
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: ctrl.signal });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = data?.error?.errors?.[0]?.reason;
      const err = new Error(
        reason === 'quotaExceeded' || reason === 'dailyLimitExceeded'
          ? '오늘 검색 한도를 다 썼어요. 유튜브 링크를 붙여넣어 주세요.'
          : data?.error?.message || `HTTP ${res.status}`,
      );
      err.quotaExceeded = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
  const decode = (s) => {
    const el = document.createElement('textarea');
    el.innerHTML = s;
    return el.value;
  };
  return (data.items || [])
    .filter((it) => it.id?.videoId)
    .map((it) => ({
      videoId: it.id.videoId,
      title: decode(it.snippet.title),
      author: decode(it.snippet.channelTitle),
      thumbnail: thumbnailUrl(it.id.videoId),
    }));
}

export const youtubeSearchPageUrl = (q) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
