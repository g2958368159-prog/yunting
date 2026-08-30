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
        .order('order_index', { ascending: true })
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
    return tasks.filter(t => {
      if (t.is_deleted) return false;
      const [start, endStr] = t.creation_date.split('_');
      const end = endStr || start;
      
      const belongsToDay = targetDate >= start && targetDate <= end;
      
      // 未完成的待办：在时间区间内，且绝对没有被完成过
      return belongsToDay && !t.completion_date;
    });
  }, [tasks, targetDate]);

  const finishedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.is_deleted || !t.completion_date) return false;
      const [start] = t.creation_date.split('_');
      
      // 已完成的待办：从开始时间，一直到完成时间，这段区间内的每一天都会显示
      return targetDate >= start && targetDate <= t.completion_date;
    });
  }, [tasks, targetDate]);

  const addTask = async (content: string, startDate: string, endDate: string) => {
    const finalCreationDate = endDate && endDate > startDate 
      ? `${startDate}_${endDate}` 
      : startDate;

    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order_index || 0)) : 0;
    
    const newTask = {
      id: crypto.randomUUID(),
      content,
      creation_date: finalCreationDate,
      completion_date: null,
      is_deleted: false,
      order_index: maxOrder + 1,
    };
    
    // 乐观更新 UI
    setTasks(prev => [...prev, newTask]);

    // 写入云端
    const { error } = await supabase.from('tasks').insert([newTask]);
    if (error) {
      console.error('Error adding task:', error);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const isCompleted = !!task.completion_date;
    const newCompletionDate = isCompleted ? null : targetDate;

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

  const updateTask = async (id: string, newContent: string, newCreationDate?: string) => {
    let newOrderIndex: number | undefined;
    
    setTasks(prev => {
      let updatedOrder = false;
      const targetTask = prev.find(t => t.id === id);
      
      if (targetTask && newCreationDate && newCreationDate !== targetTask.creation_date) {
        const [oldStart, oldEnd] = targetTask.creation_date.split('_');
        const [newStart, newEnd] = newCreationDate.split('_');
        const wasSingleDay = !oldEnd || oldEnd === oldStart;
        const isNowMultiDay = newEnd && newEnd !== newStart;
        
        // 如果是从单日改为了多日（长待办），则自动置底
        if (wasSingleDay && isNowMultiDay) {
          newOrderIndex = (prev.length > 0 ? Math.max(...prev.map(t => t.order_index || 0)) : 0) + 1;
          updatedOrder = true;
        }
      }

      return prev.map(t => {
        if (t.id === id) {
          return { 
            ...t, 
            content: newContent, 
            ...(newCreationDate ? { creation_date: newCreationDate } : {}),
            ...(updatedOrder && newOrderIndex !== undefined ? { order_index: newOrderIndex } : {})
          };
        }
        return t;
      });
    });

    const updates: any = { content: newContent };
    if (newCreationDate) updates.creation_date = newCreationDate;
    if (newOrderIndex !== undefined) updates.order_index = newOrderIndex;

    const { error } = await supabase
      .from('tasks')
      .update(updates)
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

  const reorderTasks = async (activeId: string, overId: string) => {
    setTasks(prev => {
      const oldIndex = prev.findIndex(t => t.id === activeId);
      const newIndex = prev.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newTasks = [...prev];
      const [moved] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, moved);
      
      const finalTasks = newTasks.map((t, i) => ({ ...t, order_index: i }));
      
      // 找出发生变化的
      const changedTasks = finalTasks.filter(t => {
        const oldTask = prev.find(p => p.id === t.id);
        return oldTask && oldTask.order_index !== t.order_index;
      });

      // 批量发送更新请求
      Promise.all(changedTasks.map(t => 
        supabase.from('tasks').update({ order_index: t.order_index }).eq('id', t.id)
      )).catch(err => console.error('Error reordering tasks:', err));
      
      return finalTasks;
    });
  };

  const canAddTask = true;

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
    reorderTasks,
    isLoading,
  };
}
