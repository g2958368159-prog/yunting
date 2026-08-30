import { useState, useRef, useEffect } from 'react';
import type { Task } from '../types';
import { Check, Trash2, Edit2, X, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { DateRangePicker } from './DateRangePicker';

interface TaskItemProps {
  task: Task;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (content: string, creationDate?: string) => void;
}

export function TaskItem({ task, isCompleted, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  
  const [start, endStr] = task.creation_date.split('_');
  const [editStartDate, setEditStartDate] = useState(start);
  const [editEndDate, setEditEndDate] = useState(endStr || start);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editContent.trim()) {
      const finalEndDate = editEndDate && editEndDate > editStartDate ? editEndDate : '';
      const finalCreationDate = finalEndDate ? `${editStartDate}_${finalEndDate}` : editStartDate;
      onUpdate(editContent.trim(), finalCreationDate);
    } else {
      setEditContent(task.content);
      setEditStartDate(start);
      setEditEndDate(endStr || start);
    }
    setIsEditing(false);
    setShowDatePicker(false);
  };
  
  return (
    <div className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-[4px] transition-all duration-200 hover:bg-surface-hover/80 border border-transparent hover:border-tertiary/5 relative overflow-hidden">
      
      {/* 纯净的文本区域，无勾选框 */}
      <div className="flex-1 min-w-0 pr-4">
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full">
            <input
              ref={inputRef}
              type="text"
              value={editContent}
              maxLength={200}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditContent(task.content);
                  setEditEndDate(endStr || '');
                }
              }}
              className="w-full bg-transparent border-b border-accent/50 outline-none text-[15px] text-primary pb-0.5"
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 shrink-0 text-tertiary">
                  <span className="text-xs">计划日期:</span>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="text-xs bg-white text-primary px-2 py-1 rounded border border-tertiary/20 hover:border-accent/50 transition-colors"
                  >
                    {editStartDate} {editEndDate && editEndDate !== editStartDate ? `至 ${editEndDate}` : ''}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { 
                      setIsEditing(false); 
                      setEditContent(task.content); 
                      setEditStartDate(start);
                      setEditEndDate(endStr || start); 
                      setShowDatePicker(false);
                    }}
                    className="text-xs text-tertiary hover:text-primary transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSave}
                    className="text-xs bg-accent text-white px-3 py-1 rounded-[4px] hover:bg-accent/90 transition-colors shadow-sm"
                  >
                    保存
                  </button>
                </div>
              </div>
              
              {showDatePicker && (
                <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                  <DateRangePicker 
                    startDate={editStartDate}
                    endDate={editEndDate}
                    onChange={(start, end) => {
                      setEditStartDate(start);
                      setEditEndDate(end);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-w-0 cursor-text" onDoubleClick={() => setIsEditing(true)}>
            <span className={cn(
              "text-[15px] truncate transition-all duration-300",
              isCompleted ? "text-tertiary line-through decoration-tertiary/40" : "text-primary"
            )}>
              {task.content}
            </span>
            {/* 快照小字逻辑：只要是长待办，任何时候都显示它的完整周期 */}
            {endStr && endStr !== start && (
              <span className="text-[11px] text-tertiary/70 mt-0.5 tracking-wide">
                计划: {start} 至 {endStr}
              </span>
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
