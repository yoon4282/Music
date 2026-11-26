import { useCallback, useRef, useState } from 'react';

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const push = useCallback((message, kind = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}
