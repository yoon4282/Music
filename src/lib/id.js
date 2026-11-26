// crypto.randomUUID는 보안 컨텍스트(HTTPS/localhost)에서만 동작하므로
// LAN IP(http://192.168.x.x)로 접속한 경우를 위해 직접 생성합니다.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function randomId(length = 10) {
  let out = '';
  const bytes = new Uint8Array(length);
  (globalThis.crypto ?? window.msCrypto).getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
