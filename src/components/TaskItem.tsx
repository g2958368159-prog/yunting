import { useState, useRef, useEffect } from 'react';
import type { Task } from '../types';
import { Check, Trash2, Edit2, X, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskItemProps {
  task: Task;
  isCompleted: boolean;
  targetDate: string;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (content: string) => void;
}

export function TaskItem({ task, isCompleted, targetDate, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(editContent.trim());
    } else {
      setEditContent(task.content);
    }
    setIsEditing(false);
  };

  const isCrossDay = task.completion_date && task.completion_date > task.creation_date;
  
  return (
    <div className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-[4px] transition-all duration-200 hover:bg-surface-hover/80 border border-transparent hover:border-tertiary/5 relative overflow-hidden">
      
      {/* 纯净的文本区域，无勾选框 */}
      <div className="flex-1 min-w-0 pr-4">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editContent}
            maxLength={200}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full bg-transparent border-b border-accent/50 outline-none text-[15px] text-primary pb-0.5"
          />
        ) : (
          <div className="flex flex-col min-w-0 cursor-text" onDoubleClick={() => setIsEditing(true)}>
            <span className={cn(
              "text-[15px] truncate transition-all duration-300",
              isCompleted ? "text-tertiary line-through decoration-tertiary/40" : "text-primary"
            )}>
              {task.content}
            </span>
            {/* 快照小字逻辑 */}
            {!isCompleted && task.creation_date !== targetDate && (
              <span className="text-[11px] text-tertiary/70 mt-0.5 tracking-wide">创建于 {task.creation_date}</span>
            )}
            {isCompleted && isCrossDay && (
              <span className="text-[11px] text-tertiary/70 mt-0.5 tracking-wide">始 {task.creation_date}</span>
            )}
          </div>
        )}
      </div>

      {/* 悬停滑入的操作组 */}
      <div className="shrink-0 flex items-center">
        {isDeleting ? (
          <div className="flex items-center gap-2 text-xs bg-surface-hover px-2 py-1 rounded-[4px] animate-in fade-in slide-in-from-right-2">
            <span className="text-secondary">确认删除？</span>
            <button onClick={onDelete} className="text-danger font-medium hover:underline">删除</button>
            <button onClick={() => setIsDeleting(false)} className="text-tertiary hover:text-primary">取消</button>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-1.5",
            // 移动端：常驻且较淡；PC端：默认隐藏（向右偏移+透明），悬停时丝滑滑入
            "opacity-100 translate-x-0 md:opacity-0 md:translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 transition-all duration-200 ease-out"
          )}>
            <button 
              onClick={onToggle}
              title={isCompleted ? "撤销完成" : "完成任务"}
              className={cn(
                "p-1.5 rounded-[4px] transition-colors",
                isCompleted 
                  ? "text-tertiary hover:text-primary hover:bg-black/5" 
                  : "text-accent/60 hover:text-accent hover:bg-accent/10"
              )}
            >
              {isCompleted ? <RotateCcw size={16} /> : <Check size={18} strokeWidth={2.5} />}
            </button>
            
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 text-tertiary/60 hover:text-primary hover:bg-black/5 rounded-[4px] transition-colors"
            >
              {isEditing ? <X size={16} /> : <Edit2 size={16} />}
            </button>
            
            <button 
              onClick={() => setIsDeleting(true)}
              className="p-1.5 text-tertiary/60 hover:text-danger hover:bg-danger/10 rounded-[4px] transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
