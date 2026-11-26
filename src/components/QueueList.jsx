import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListMusic, Trash2 } from 'lucide-react';

function QueueItem({ item, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-3 rounded-xl border px-2 py-2 select-none touch-manipulation
        ${isDragging
          ? 'z-10 cursor-grabbing border-violet-500/60 bg-zinc-800 shadow-xl shadow-violet-900/30'
          : 'cursor-grab border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-zinc-500">{index + 1}</span>
      <img
        src={item.thumbnail}
        alt=""
        draggable={false}
        className="h-10 w-16 shrink-0 rounded-md bg-zinc-800 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
        <p className="truncate text-xs text-zinc-500">
          {item.requestedBy}
          {item.author ? ` · ${item.author}` : ''}
        </p>
      </div>
      <button
        type="button"
        aria-label="대기열에서 삭제"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(item.id)}
        className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 active:scale-95"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/** 드래그 앤 드롭(마우스/터치/키보드)으로 순서 변경 가능한 대기열 */
export default function QueueList({ items, onReorder, onRemove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // 모바일: 살짝 길게 눌러야 드래그 시작 → 일반 스크롤과 충돌 방지
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-zinc-500">
        <ListMusic className="h-8 w-8 text-zinc-700" />
        <p className="text-sm">대기열이 비어 있어요</p>
        <p className="text-xs text-zinc-600">유튜브 링크를 추가해보세요</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onReorder(active.id, over.id);
      }}
    >
      <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <QueueItem key={item.id} item={item} index={i} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
