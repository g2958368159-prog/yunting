import { useState, useEffect } from 'react';
import { useTodoApp } from './hooks/useTodoApp';
import { TaskItem } from './components/TaskItem';
import { CalendarWidget } from './components/CalendarWidget';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { UserProfile } from './components/UserProfile';
import { MobileUserMenu } from './components/MobileUserMenu';
import type { Session, User } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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

  return <TodoAppContent onLogout={() => supabase.auth.signOut()} user={session.user} />;
}

function TodoAppContent({ onLogout, user }: { onLogout: () => void; user: User }) {
  const {
    targetDate,
    setTargetDate,
    physicalToday,
    unfinishedTasks,
    finishedTasks,
    canAddTask,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
  } = useTodoApp();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Date Titles
  const targetDateObj = parseISO(targetDate);
  const headerTitle = format(targetDateObj, 'MM月dd日');
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][targetDateObj.getDay()];

  const handleAddSubmit = () => {
    if (newContent.trim()) {
      addTask(newContent.trim());
      setNewContent('');
    }
  };

  const sidebarContentNode = (
    <div className="flex flex-col h-full">
      <div className="mb-6 px-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-primary flex items-baseline gap-1.5">
            {headerTitle}
          </h1>
          <span className="text-sm font-normal text-tertiary">{weekDay}</span>
        </div>
      </div>

      <div className="flex-1">
        <CalendarWidget 
          targetDate={targetDate} 
          onChangeDate={(date) => {
            setTargetDate(date);
            setIsMobileDrawerOpen(false);
          }} 
          physicalToday={physicalToday} 
        />
      </div>

      <div className="hidden md:block mt-auto pt-6 border-t border-tertiary/10">
        <UserProfile user={user} onLogout={onLogout} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-0 md:p-6 lg:p-8">
      
      {/* 桌面端居中主视窗 / 移动端全屏铺满 */}
      <div className="w-full max-w-[1000px] h-[100dvh] md:h-[85vh] min-h-[600px] bg-surface md:rounded-2xl md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row overflow-hidden border border-transparent md:border-tertiary/10">
        
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
          <MobileUserMenu user={user} onLogout={onLogout} />
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
          
          {/* 上半区: 未完成 (占 50% 高度, 内部滚动) */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-tertiary/10">
            {/* 浅绿色底色的标题行 */}
            <div className="shrink-0 flex items-center justify-between px-6 h-14 bg-accent/15">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-accent rounded-[4px]" />
                <h2 className="text-[16px] font-semibold text-primary tracking-wide">未完成</h2>
                <span className="text-[11px] bg-white/60 text-accent font-medium px-1.5 py-0.5 rounded-[4px]">{unfinishedTasks.length}</span>
              </div>
              {canAddTask && (
                <button 
                  translate="no"
                  onClick={() => setIsAdding(true)}
                  className="bg-accent text-white px-4 py-1.5 rounded-[8px] text-sm font-medium hover:bg-accent/90 transition-colors shadow-sm"
                >
                  新增待办
                </button>
              )}
            </div>
            
            {/* 列表滚动区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-1">
                {isAdding && (
                  <div className="py-2.5 px-3 -mx-3 rounded-[4px] bg-surface-hover mb-2 flex items-center">
                    <input
                      autoFocus
                      type="text"
                      value={newContent}
                      maxLength={200}
                      onChange={(e) => setNewContent(e.target.value)}
                      onBlur={() => {
                        handleAddSubmit();
                        setIsAdding(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubmit();
                          setIsAdding(false);
                        }
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                        }
                      }}
                      placeholder="输入待办事项，按回车保存..."
                      className="w-full bg-transparent outline-none text-[15px] text-primary"
                    />
                  </div>
                )}

                {unfinishedTasks.length === 0 && finishedTasks.length === 0 && !isAdding ? (
                  <div className="mt-16 text-center text-tertiary/60">
                    <p className="text-sm">今日暂无安排，尽情享受留白</p>
                  </div>
                ) : (
                  unfinishedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={false}
                      targetDate={targetDate}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onUpdate={(content) => updateTask(task.id, content)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 下半区: 已完成 (占 50% 高度, 内部滚动) */}
          <div className="flex-1 flex flex-col min-h-0 bg-surface/50">
            {/* 带有底色的标题行 */}
            <div className="shrink-0 flex items-center gap-2 px-6 h-14 bg-accent/15">
              <div className="w-1 h-4 bg-accent rounded-[4px]" />
              <h2 className="text-[16px] font-semibold text-primary tracking-wide">已完成</h2>
              <span className="text-[11px] bg-white/60 text-accent font-medium px-1.5 py-0.5 rounded-[4px]">{finishedTasks.length}</span>
            </div>
            
            {/* 列表滚动区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {finishedTasks.length === 0 ? (
                <div className="py-4 text-[14px] text-tertiary/50">
                  暂无已完成的任务
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {finishedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={true}
                      targetDate={targetDate}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onUpdate={(content) => updateTask(task.id, content)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

