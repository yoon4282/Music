import { arrayMove } from '@dnd-kit/sortable';

const STORAGE_KEY = 'jukebox:host-state';

export const emptyState = { current: null, queue: [], isPlaying: false };

/** 새로고침해도 대기열이 유지되도록 호스트 상태를 localStorage에서 복원 */
export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.queue)) {
      return { current: saved.current ?? null, queue: saved.queue, isPlaying: false };
    }
  } catch { /* ignore */ }
  return emptyState;
}

export function saveState({ current, queue }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ current, queue }));
  } catch { /* ignore */ }
}

export function queueReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.current
        ? { ...state, queue: [...state.queue, action.item] }
        : { ...state, current: action.item };
    case 'REMOVE':
      if (state.current?.id === action.id) return queueReducer(state, { type: 'NEXT' });
      return { ...state, queue: state.queue.filter((it) => it.id !== action.id) };
    case 'REORDER': {
      const from = state.queue.findIndex((it) => it.id === action.activeId);
      const to = state.queue.findIndex((it) => it.id === action.overId);
      if (from < 0 || to < 0 || from === to) return state;
      return { ...state, queue: arrayMove(state.queue, from, to) };
    }
    case 'NEXT': {
      const [next = null, ...rest] = state.queue;
      return { ...state, current: next, queue: rest, isPlaying: next ? state.isPlaying : false };
    }
    case 'SET_PLAYING':
      return state.isPlaying === action.value ? state : { ...state, isPlaying: action.value };
    case 'CLEAR':
      return { ...state, queue: [] };
    default:
      return state;
  }
}

/** 게스트 쪽 낙관적 업데이트용 */
export function reorderLocal(queue, activeId, overId) {
  const from = queue.findIndex((it) => it.id === activeId);
  const to = queue.findIndex((it) => it.id === overId);
  return from < 0 || to < 0 ? queue : arrayMove(queue, from, to);
}
