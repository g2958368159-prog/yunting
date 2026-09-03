import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailySummaryPanelProps {
  user: User;
  date: string;
}

interface SummaryCacheEntry {
  content: string;
  pendingSync: boolean;
}

const summaryCache = new Map<string, SummaryCacheEntry>();
const pendingSummarySaves = new Map<string, Promise<void>>();

const getSummaryCacheKey = (userId: string, date: string) => `${userId}:${date}`;

const queueSummarySave = (cacheKey: string, userId: string, date: string, content: string) => {
  const previousSave = pendingSummarySaves.get(cacheKey) ?? Promise.resolve();
  const save = previousSave
    .catch(() => undefined)
    .then(async () => {
      const { error } = await supabase
        .from('daily_summaries')
        .upsert(
          { user_id: userId, summary_date: date, content },
          { onConflict: 'user_id,summary_date' }
        );

      if (error) throw error;

      const cachedSummary = summaryCache.get(cacheKey);
      if (cachedSummary?.content === content) {
        summaryCache.set(cacheKey, { content, pendingSync: false });
      }
    });

  pendingSummarySaves.set(cacheKey, save);
  save.then(
    () => {
      if (pendingSummarySaves.get(cacheKey) === save) pendingSummarySaves.delete(cacheKey);
    },
    () => {
      if (pendingSummarySaves.get(cacheKey) === save) pendingSummarySaves.delete(cacheKey);
    }
  );

  return save;
};

export function DailySummaryPanel({ user, date }: DailySummaryPanelProps) {
  const cacheKey = getSummaryCacheKey(user.id, date);
  const cachedSummary = summaryCache.get(cacheKey);
  const [content, setContent] = useState(() => cachedSummary?.content ?? '');
  const [isLoading, setIsLoading] = useState(() => !cachedSummary);
  const [status, setStatus] = useState('');
  const contentRef = useRef(content);
  const hasUnsavedChangesRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    let isCurrent = true;

    const loadSummary = async () => {
      const cached = summaryCache.get(cacheKey);
      if (cached) {
        contentRef.current = cached.content;
        setContent(cached.content);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      const pendingSave = pendingSummarySaves.get(cacheKey);
      if (pendingSave) {
        try {
          await pendingSave;
        } catch (error) {
          console.error('Failed to save daily summary:', error);
          if (isCurrent) {
            setStatus('保存失败，本地内容待重试。');
            setIsLoading(false);
          }
          return;
        }
      }

      if (summaryCache.get(cacheKey)?.pendingSync) {
        if (isCurrent) {
          setStatus('保存失败，本地内容待重试。');
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('daily_summaries')
        .select('content')
        .eq('user_id', user.id)
        .eq('summary_date', date)
        .maybeSingle();

      if (!isCurrent) return;
      if (error) {
        console.error('Failed to load daily summary:', error);
        setStatus('加载失败，请稍后重试。');
      } else if (!hasUnsavedChangesRef.current) {
        const cloudContent = data?.content ?? '';
        summaryCache.set(cacheKey, { content: cloudContent, pendingSync: false });
        contentRef.current = cloudContent;
        setContent(cloudContent);
      }
      setIsLoading(false);
    };

    void loadSummary();

    return () => {
      isCurrent = false;
    };
  }, [cacheKey, date, user.id]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => () => {
    if (!hasUnsavedChangesRef.current) return;

    const unsavedContent = contentRef.current;
    hasUnsavedChangesRef.current = false;
    summaryCache.set(cacheKey, { content: unsavedContent, pendingSync: true });
    void queueSummarySave(cacheKey, user.id, date, unsavedContent);
  }, [cacheKey, date, user.id]);

  const saveSummary = async () => {
    const cached = summaryCache.get(cacheKey);
    if (!hasUnsavedChangesRef.current && !cached?.pendingSync) return;

    const contentToSave = contentRef.current;
    hasUnsavedChangesRef.current = false;
    summaryCache.set(cacheKey, { content: contentToSave, pendingSync: true });
    setStatus('保存中…');

    try {
      await queueSummarySave(cacheKey, user.id, date, contentToSave);
      if (isMountedRef.current) setStatus('已保存');
    } catch (error) {
      console.error('Failed to save daily summary:', error);
      if (isMountedRef.current) setStatus('保存失败，本地内容待重试。');
    }
  };

  return (
    <aside className="hidden md:flex w-[500px] shrink-0 bg-surface-hover/50 border-l border-tertiary/10 p-5 flex-col">
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
          const nextContent = event.target.value;
          contentRef.current = nextContent;
          hasUnsavedChangesRef.current = true;
          summaryCache.set(cacheKey, { content: nextContent, pendingSync: true });
          setContent(nextContent);
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
