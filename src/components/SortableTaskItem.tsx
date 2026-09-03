import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import type { Task } from '../types';

interface SortableTaskItemProps {
  task: Task;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (content: string, creationDate?: string) => void;
}

export function SortableTaskItem(props: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative flex items-center cursor-grab active:cursor-grabbing"
    >
      <div className="flex-1 min-w-0">
        <TaskItem {...props} />
      </div>
    </div>
  );
}
