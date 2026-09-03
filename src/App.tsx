import { useState, useEffect } from 'react';
import { useTodoApp } from './hooks/useTodoApp';
import { TaskItem } from './components/TaskItem';
import { CalendarWidget } from './components/CalendarWidget';
import { DateRangePicker } from './components/DateRangePicker';
import { SortableTaskItem } from './components/SortableTaskItem';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar as CalendarIcon, ChevronDown, X, Plus, Archive, Coffee, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { UserProfile } from './components/UserProfile';
import { MobileUserMenu } from './components/MobileUserMenu';
import { DailySummaryPanel } from './components/DailySummaryPanel';
import { useTheme } from './hooks/useTheme';
import type { Session, User } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const { theme, setTheme } = useTheme(session?.user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    }).catch(err => {
      console.error("Failed to get session:", err);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isSessionLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-app text-tertiary">加载中...</div>;
  }

  if (!session) {
    return <Auth onLogin={() => {}} />;
  }

  return <TodoAppContent onLogout={() => supabase.auth.signOut()} theme={theme} onSetTheme={setTheme} user={session.user} />;
}

function TodoAppContent({ onLogout, theme, onSetTheme, user }: { onLogout: () => void; theme: 'green' | 'orange'; onSetTheme: (theme: 'green' | 'orange') => Promise<void>; user: User }) {
  const {
    tasks,
    targetDate,
    setTargetDate,
    physicalToday,
    unfinishedTasks,
    finishedTasks,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
    reorderTasks,
    hasPreviousMonthUnfinished
  } = useTodoApp();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newAutoRollover, setNewAutoRollover] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addError, setAddError] = useState('');
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(Boolean(user.user_metadata?.daily_summary_enabled));

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const [hidePrevMonthAlert, setHidePrevMonthAlert] = useState(() => {
    return localStorage.getItem(`dismiss_alert_${currentMonthKey}`) === 'true';
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTasks(active.id as string, over.id as string);
    }
  };

  // Date Titles
  const targetDateObj = parseISO(targetDate);
  const headerTitle = format(targetDateObj, 'MM月dd日');
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][targetDateObj.getDay()];

  const handleAddSubmit = async () => {
    if (newContent.trim()) {
      const finalStart = newStartDate || targetDate;
      const finalEnd = newEndDate || finalStart;
      
      // Update useTodoApp's addTask to handle just the final creationDate string
      // But wait, the current addTask signature is `addTask(content: string, endDate?: string)`.
      // I should update it to accept the raw creation_date string.
      // Let's change how we call it. For now, let's just pass `finalStart` and `finalEnd`.
      try {
        await addTask(newContent.trim(), finalStart, finalEnd, newAutoRollover);
        setNewContent('');
        setNewStartDate('');
        setNewEndDate('');
        setNewAutoRollover(true);
        setShowDatePicker(false);
        setIsAdding(false);
        setAddError('');
      } catch {
        setAddError('保存失败，请检查网络后重试。');
      }
    } else {
      setIsAdding(false);
      setNewAutoRollover(true);
      setShowDatePicker(false);
    }
  };

  const handleDismissAlert = (permanently: boolean = false) => {
    setHidePrevMonthAlert(true);
    if (permanently) {
      localStorage.setItem(`dismiss_alert_${currentMonthKey}`, 'true');
    }
  };

  const handleSetDailySummaryEnabled = async (enabled: boolean) => {
    const previousValue = dailySummaryEnabled;
    setDailySummaryEnabled(enabled);
    const { error } = await supabase.auth.updateUser({ data: { daily_summary_enabled: enabled } });
    if (error) {
      setDailySummaryEnabled(previousValue);
      throw error;
    }
  };

  const sidebarContentNode = (
    <div className="flex flex-col h-full">
      <div className="flex-1 mt-2">
        {hasPreviousMonthUnfinished && !hidePrevMonthAlert && (
          <div className="mb-5 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-xl p-3 shadow-sm animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-medium flex items-center gap-1.5 mt-0.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>上月有未完成的待办</span>
                </div>
                <button 
                  onClick={() => handleDismissAlert(true)}
                  className="text-[11px] text-orange-600/60 hover:text-orange-600 transition-colors underline decoration-orange-600/30 underline-offset-2 ml-5 w-fit"
                >
                  不再提示
                </button>
              </div>
              <button 
                onClick={() => handleDismissAlert(false)}
                className="text-orange-600/50 hover:text-orange-600 transition-colors p-0.5 rounded-md hover:bg-orange-500/10 shrink-0"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <CalendarWidget 
          tasks={tasks}
          targetDate={targetDate} 
          onChangeDate={(date) => {
            setTargetDate(date);
            setIsMobileDrawerOpen(false);
          }} 
          physicalToday={physicalToday} 
        />
      </div>

      <div className="hidden md:block mt-auto pt-6 border-t border-tertiary/10">
        <UserProfile
          user={user}
          onLogout={onLogout}
          theme={theme}
          onSetTheme={onSetTheme}
          dailySummaryEnabled={dailySummaryEnabled}
          onSetDailySummaryEnabled={handleSetDailySummaryEnabled}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-0 md:p-6 lg:p-8">
      
      {/* 桌面端居中主视窗 / 移动端全屏铺满 */}
      <div className={`w-full ${dailySummaryEnabled ? 'max-w-[1500px]' : 'max-w-[1000px]'} h-[100dvh] md:h-[85vh] min-h-[600px] bg-surface md:rounded-2xl md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row overflow-hidden border border-transparent md:border-tertiary/10`}>
        
        {/* 移动端全局 Header */}
        <header className="md:hidden shrink-0 bg-surface border-b border-tertiary/10 px-5 py-4 flex items-center justify-between z-10">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsMobileDrawerOpen(true)}
          >
            <CalendarIcon size={18} className="text-accent" />
            <h1 className="text-base font-medium text-primary flex items-baseline gap-1.5">
              {headerTitle}
              <span className="text-xs font-normal text-tertiary">{weekDay}</span>
            </h1>
            <ChevronDown size={16} className="text-tertiary ml-1" />
          </div>
          <MobileUserMenu
            user={user}
            onLogout={onLogout}
            theme={theme}
            onSetTheme={onSetTheme}
            dailySummaryEnabled={dailySummaryEnabled}
            onSetDailySummaryEnabled={handleSetDailySummaryEnabled}
          />
        </header>

        {/* 移动端底部抽屉 */}
        {isMobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileDrawerOpen(false)} 
            />
            <div className="relative bg-surface w-full rounded-t-2xl p-5 pb-8 shadow-xl animate-in slide-in-from-bottom-full duration-200">
              <div className="w-10 h-1 bg-tertiary/30 rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-base font-medium text-primary">选择日期</h2>
                <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1 text-tertiary hover:text-primary transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="h-[400px]">
                {sidebarContentNode}
              </div>
            </div>
          </div>
        )}

        {/* PC端左侧边栏 */}
        <aside className="hidden md:flex w-[30%] lg:w-[280px] shrink-0 bg-surface-hover/50 border-r border-tertiary/10 p-6 lg:p-8 flex-col">
          {sidebarContentNode}
        </aside>

        {/* 右侧主内容区 */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface">
          {/* 日期栏与添加按钮 */}
          <div className="shrink-0 px-6 py-2.5 flex items-center justify-between border-b border-tertiary/10 bg-surface">
            <h2 className="text-lg font-semibold text-primary tracking-tight">
              {targetDate} <span className="font-bold ml-1">{weekDay}</span>
            </h2>
            <button 
              translate="no"
              onClick={() => { 
                setIsAdding(true); 
                setNewStartDate(targetDate); 
                setNewEndDate(targetDate); 
                setNewAutoRollover(true);
                setAddError('');
              }}
              className="bg-accent text-white p-1.5 rounded-[6px] hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* 上半区: 未完成 (占 50% 高度, 内部滚动) */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-tertiary/10">
            {/* 未完成标题行 */}
            <div className="shrink-0 flex items-center gap-2 px-6 h-12 bg-orange-500/10 border-b border-orange-500/10">
              <div className="w-1 h-3.5 bg-orange-500 rounded-[4px]" />
              <h2 className="text-[14px] font-normal text-primary tracking-wide">未完成</h2>
              <span className="text-[11px] bg-white/60 text-orange-600 font-medium px-1.5 py-0.5 rounded-[4px]">{unfinishedTasks.length}</span>
            </div>
            
            {/* 列表滚动区 */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-1">
                {isAdding && (
                  <div className="py-2.5 px-3 -mx-3 rounded-[4px] bg-[var(--color-task-editor-bg)] mb-2 flex flex-col gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newContent}
                      maxLength={200}
                      onChange={(e) => {
                        setNewContent(e.target.value);
                        setAddError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubmit();
                        }
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                          setShowDatePicker(false);
                          setAddError('');
                        }
                      }}
                      placeholder="输入待办事项，按回车保存..."
                      className="w-full bg-transparent outline-none text-[15px] text-primary"
                    />
                    {addError && <p className="text-xs text-red-600">{addError}</p>}
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 shrink-0 text-tertiary">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">计划日期:</span>
                            <button 
                              onClick={() => setShowDatePicker(!showDatePicker)}
                              className="text-xs bg-white text-primary px-2 py-1 rounded border border-tertiary/20 hover:border-accent/50 transition-colors"
                            >
                              {newStartDate} {newEndDate && newEndDate !== newStartDate ? `至 ${newEndDate}` : ''}
                            </button>
                          </div>
                          
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className="text-xs">顺延:</span>
                            <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${newAutoRollover ? 'bg-orange-500' : 'bg-tertiary/30'}`}
                                 onClick={() => setNewAutoRollover(!newAutoRollover)}>
                              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${newAutoRollover ? 'translate-x-3.5' : 'translate-x-0'}`} />
                            </div>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setIsAdding(false); setShowDatePicker(false); setAddError(''); }}
                            className="text-xs text-tertiary hover:text-primary transition-colors"
                          >
                            取消
                          </button>
                          <button 
                            onClick={handleAddSubmit}
                            className="text-xs bg-accent text-white px-3 py-1 rounded-[4px] hover:bg-accent/90 transition-colors shadow-sm"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                      
                      {showDatePicker && (
                        <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                          <DateRangePicker 
                            startDate={newStartDate}
                            endDate={newEndDate}
                            onChange={(start, end) => {
                              setNewStartDate(start);
                              setNewEndDate(end);
                              if (start === end) {
                                // If they double click or just want a single day, they can close it manually, 
                                // or we can let them keep picking.
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {unfinishedTasks.length === 0 && !isAdding ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-tertiary/40 mt-8">
                    <Coffee size={40} strokeWidth={1.5} className="mb-3 opacity-30" />
                    <p className="text-[13px] tracking-wide opacity-80">今日任务已清空，去喝杯咖啡吧</p>
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={unfinishedTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {unfinishedTasks.map(task => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          isCompleted={false}
                          onToggle={() => toggleTask(task.id)}
                          onDelete={() => deleteTask(task.id)}
                          onUpdate={(content, creationDate) => updateTask(task.id, content, creationDate)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>

          {/* 下半区: 已完成 (占 50% 高度, 内部滚动) */}
          <div className="flex-1 flex flex-col min-h-0 bg-surface/50">
            {/* 带有底色的标题行 */}
            <div className="shrink-0 flex items-center gap-2 px-6 h-12 bg-emerald-500/10 border-t border-emerald-500/10">
              <div className="w-1 h-3.5 bg-emerald-500 rounded-[4px]" />
              <h2 className="text-[14px] font-normal text-primary tracking-wide">已完成</h2>
              <span className="text-[11px] bg-white/60 text-emerald-600 font-medium px-1.5 py-0.5 rounded-[4px]">{finishedTasks.length}</span>
            </div>
            
            {/* 列表滚动区 */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
              {finishedTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-tertiary/40 mt-4">
                  <Archive size={40} strokeWidth={1.5} className="mb-3 opacity-30" />
                  <p className="text-[13px] tracking-wide opacity-80">暂无已完成任务</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {finishedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={true}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onUpdate={(content, creationDate) => updateTask(task.id, content, creationDate)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        {dailySummaryEnabled && <DailySummaryPanel key={targetDate} user={user} date={targetDate} />}
      </div>
    </div>
  );
}
