import { useState, useRef, useEffect } from 'react';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskCardProps {
  title: string;
  tasks: Task[];
  targetDate: string;
  isCompleted: boolean;
  canAddTask?: boolean;
  onAddTask?: (content: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

export function TaskCard({ 
  title, 
  tasks, 
  targetDate, 
  isCompleted,
  canAddTask,
  onAddTask,
  onToggle,
  onDelete,
  onUpdate
}: TaskCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddSubmit = () => {
    if (newContent.trim() && onAddTask) {
      onAddTask(newContent.trim());
      setNewContent('');
      // 连续添加，不要关闭
      if (addInputRef.current) addInputRef.current.focus();
    } else {
      setIsAdding(false);
    }
  };

  return (
    <div className={cn(
      "bg-surface rounded-lg p-4 lg:p-6 shadow-sm",
      isCompleted && "bg-transparent border border-completed-bg"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-primary flex items-center gap-2">
          {title}
          <span className="text-xs text-tertiary font-normal bg-completed-bg px-1.5 rounded">{tasks.length}</span>
        </h2>
        
        {canAddTask && onAddTask && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center w-7 h-7 rounded bg-accent text-white hover:bg-opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {isAdding && (
          <div className="py-2 px-2 -mx-2 rounded-md bg-surface-hover mb-1 flex items-center">
            <div className="w-5 h-5 rounded border border-tertiary/50 mr-3 shrink-0" />
            <input
              ref={addInputRef}
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onBlur={() => setIsAdding(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubmit();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              placeholder="输入任务，按回车保存..."
              className="flex-1 bg-transparent outline-none text-[15px] text-primary"
            />
          </div>
        )}

        {tasks.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-tertiary text-sm">
            {isCompleted ? "暂无已完成任务" : "尽情享受今天的留白"}
          </div>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isCompleted={isCompleted}
              targetDate={targetDate}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
              onUpdate={(content) => onUpdate(task.id, content)}
            />
          ))
        )}
      </div>
    </div>
  );
}
