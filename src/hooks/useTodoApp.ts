import { useState, useMemo, useEffect } from 'react';
import type { Task, DateString } from '../types';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export function useTodoApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targetDate, setTargetDate] = useState<DateString>(format(new Date(), 'yyyy-MM-dd'));
  const [physicalToday, setPhysicalToday] = useState<DateString>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);

  // 监听现实时间的跨日
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const newToday = format(new Date(), 'yyyy-MM-dd');
        if (newToday !== physicalToday) {
          setPhysicalToday(newToday);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [physicalToday]);

  // 从云端拉取数据
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_deleted', false) // 过滤掉已删除的
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Fetch error:', error);
      } else if (data) {
        setTasks(data);
      }
      setIsLoading(false);
    };

    fetchTasks();
  }, []);

  const unfinishedTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.is_deleted && 
      (!t.completion_date || t.completion_date > targetDate) && 
      (
        (t.creation_date === targetDate) || 
        (t.creation_date < targetDate && targetDate <= physicalToday)
      )
    );
  }, [tasks, targetDate, physicalToday]);

  const finishedTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.is_deleted && 
      t.creation_date <= targetDate && 
      t.completion_date === targetDate
    );
  }, [tasks, targetDate]);

  const addTask = async (content: string) => {
    const newTask = {
      id: crypto.randomUUID(),
      content,
      creation_date: targetDate,
      completion_date: null,
      is_deleted: false,
    };
    
    // 乐观更新 UI
    setTasks(prev => [...prev, newTask]);

    // 写入云端
    const { error } = await supabase.from('tasks').insert([newTask]);
    if (error) {
      console.error('Error adding task:', error);
      // 如果出错可以回滚 UI，这里从简处理
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const isCompleted = !!task.completion_date;
    const newCompletionDate = isCompleted ? null : physicalToday;

    // 乐观更新 UI
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completion_date: newCompletionDate } : t
    ));

    // 同步云端
    const { error } = await supabase
      .from('tasks')
      .update({ completion_date: newCompletionDate })
      .eq('id', id);
    if (error) console.error('Error toggling task:', error);
  };

  const updateTask = async (id: string, newContent: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, content: newContent } : t
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ content: newContent })
      .eq('id', id);
    if (error) console.error('Error updating task:', error);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, is_deleted: true } : t
    ));

    // 软删除
    const { error } = await supabase
      .from('tasks')
      .update({ is_deleted: true })
      .eq('id', id);
    if (error) console.error('Error deleting task:', error);
  };

  const canAddTask = targetDate >= physicalToday;

  return {
    tasks,
    setTasks,
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
    isLoading,
  };
}
