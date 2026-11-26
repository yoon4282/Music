export default function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm rounded-xl px-4 py-2.5 text-sm shadow-lg backdrop-blur
            ${t.kind === 'error' ? 'bg-red-600/90 text-white' : 'bg-zinc-800/95 text-zinc-100 ring-1 ring-zinc-700'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
