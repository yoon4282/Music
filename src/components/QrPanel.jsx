import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Check, Copy, Loader2, Maximize2, Users, X } from 'lucide-react';
import { copyText } from '../lib/clipboard.js';
import ShareButton from './ShareButton.jsx';

const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export default function QrPanel({ joinUrl, roomCode, status, error, guests, onToast }) {
  const [copied, setCopied] = useState(false);
  const [big, setBig] = useState(false);

  const copy = async () => {
    if (!joinUrl) return;
    if (await copyText(joinUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:flex-row lg:items-center">
      <button
        type="button"
        onClick={() => joinUrl && setBig(true)}
        aria-label="QR코드 크게 보기"
        className="group relative mx-auto flex h-48 w-48 shrink-0 items-center justify-center rounded-xl bg-white p-3 lg:mx-0"
      >
        {joinUrl ? (
          <>
            {/* 오류정정 L = 모듈 수가 적어 화면 촬영으로도 잘 인식됨 */}
            <QRCodeSVG value={joinUrl} size={168} level="L" className="h-full w-full" />
            <span className="absolute bottom-1 right-1 rounded-md bg-zinc-900/80 p-1 text-white opacity-70 group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        )}
      </button>

      {big && (
        <div
          role="dialog"
          onClick={() => setBig(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-zinc-950/95 p-6"
        >
          <div className="rounded-3xl bg-white p-6">
            <QRCodeSVG
              value={joinUrl}
              size={512}
              level="L"
              style={{ width: 'min(80vw, calc(100dvh - 220px))', height: 'auto' }}
            />
          </div>
          <p className="text-lg text-zinc-300">
            방 코드 <span className="font-mono font-semibold text-white">{roomCode}</span>
          </p>
          <button type="button" className="flex items-center gap-1 text-sm text-zinc-400">
            <X className="h-4 w-4" /> 닫기 (아무 곳이나 탭)
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">스마트폰으로 QR 스캔</h2>
          <p className="text-xs text-zinc-400">QR을 누르면 크게 볼 수 있어요</p>
          {roomCode && (
            <p className="mt-1 text-xs text-zinc-500">
              방 코드 <span className="font-mono text-zinc-200">{roomCode}</span>
            </p>
          )}
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
            <span className="truncate text-xs text-zinc-500">
              ({guests.map((g) => g.nickname + (g.relay ? '·중계' : '')).join(', ')})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!joinUrl}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 px-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? '복사됨!' : '링크 복사'}
          </button>
          <ShareButton url={joinUrl} onToast={onToast} label="카톡 공유" className="h-9 px-2 text-sm" />
        </div>

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
