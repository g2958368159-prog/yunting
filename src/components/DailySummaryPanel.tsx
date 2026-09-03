import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailySummaryPanelProps {
  user: User;
  date: string;
}

export function DailySummaryPanel({ user, date }: DailySummaryPanelProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let isCurrent = true;

    void supabase
      .from('daily_summaries')
      .select('content')
      .eq('user_id', user.id)
      .eq('summary_date', date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isCurrent) return;
        if (error) {
          console.error('Failed to load daily summary:', error);
          setStatus('加载失败，请稍后重试。');
        } else {
          setContent(data?.content ?? '');
        }
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [date, user.id]);

  const saveSummary = async () => {
    const { error } = await supabase
      .from('daily_summaries')
      .upsert(
        { user_id: user.id, summary_date: date, content },
        { onConflict: 'user_id,summary_date' }
      );

    if (error) {
      console.error('Failed to save daily summary:', error);
      setStatus('保存失败，请稍后重试。');
      return;
    }

    setStatus('已保存');
  };

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 bg-surface-hover/50 border-l border-tertiary/10 p-5 flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-sm font-medium text-primary">每日总结</h2>
      </div>
      <p className="text-xs text-tertiary mb-3">{date}</p>
      <textarea
        value={content}
        maxLength={2000}
        disabled={isLoading}
        onChange={(event) => {
          setContent(event.target.value);
          setStatus('');
        }}
        onBlur={() => void saveSummary()}
        placeholder="记录今天的收获、进展或反思…"
        className="flex-1 min-h-[220px] resize-none rounded-lg border border-tertiary/15 bg-surface px-3 py-3 text-sm leading-6 text-primary outline-none placeholder:text-tertiary/60 focus:border-accent/50"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-tertiary">
        <span>{status}</span>
        <span>{content.length}/2000</span>
      </div>
    </aside>
  );
}
