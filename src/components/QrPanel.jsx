import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Check, Copy, Loader2, Users } from 'lucide-react';
import { copyText } from '../lib/clipboard.js';

const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export default function QrPanel({ joinUrl, status, error, guests }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!joinUrl) return;
    if (await copyText(joinUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:flex-row lg:items-center">
      <div className="mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 lg:mx-0">
        {joinUrl ? (
          <QRCodeSVG value={joinUrl} size={140} level="M" className="h-full w-full" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">스마트폰으로 QR 스캔</h2>
          <p className="text-xs text-zinc-400">접속하면 누구나 곡을 예약할 수 있어요</p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'ready' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-500' : 'animate-pulse bg-amber-400'
            }`}
          />
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="text-zinc-200">
            접속 <b className="tabular-nums">{guests.length}</b>명
          </span>
          {guests.length > 0 && (
            <span className="truncate text-xs text-zinc-500">({guests.map((g) => g.nickname).join(', ')})</span>
          )}
        </div>

        <button
          type="button"
          onClick={copy}
          disabled={!joinUrl}
          className="flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {copied ? '복사됨!' : '접속 링크 복사'}
        </button>

        {status === 'error' && <p className="text-xs text-red-400">시그널링 서버 연결 실패: {error}</p>}
        {isLocalHost && (
          <p className="flex gap-1.5 text-xs text-amber-400/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              localhost로 열려 있어 휴대폰에서 접속할 수 없어요. 터미널의 <b>Network</b> 주소(예: http://192.168.x.x:5173)로 다시 열어주세요.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
