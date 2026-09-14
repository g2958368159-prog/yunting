import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { supabase } from '../lib/supabase';

type ReportType = 'week' | 'month' | 'custom';

interface AiSummaryPageProps {
  onClose: () => void;
}

const toDateString = (date: Date) => format(date, 'yyyy-MM-dd');

export function AiSummaryPage({ onClose }: AiSummaryPageProps) {
  const today = toDateString(new Date());
  const [reportType, setReportType] = useState<ReportType>('week');
  const [referenceDate, setReferenceDate] = useState(today);
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { startDate, endDate, label } = useMemo(() => {
    const reference = new Date(`${referenceDate}T00:00:00`);
    if (reportType === 'week') {
      const start = toDateString(startOfWeek(reference, { weekStartsOn: 1 }));
      const end = toDateString(endOfWeek(reference, { weekStartsOn: 1 }));
      return { startDate: start, endDate: end, label: `周报 · ${start} 至 ${end}` };
    }
    if (reportType === 'month') {
      const start = toDateString(startOfMonth(reference));
      const end = toDateString(endOfMonth(reference));
      return { startDate: start, endDate: end, label: `月报 · ${start} 至 ${end}` };
    }
    return {
      startDate: customStartDate,
      endDate: customEndDate,
      label: `自定义 · ${customStartDate} 至 ${customEndDate}`,
    };
  }, [customEndDate, customStartDate, referenceDate, reportType]);

  const generateReport = async () => {
    if (startDate > endDate) {
      setError('开始日期不能晚于结束日期。');
      return;
    }

    setError('');
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('登录已失效，请重新登录后再生成。');

      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ startDate, endDate, reportType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || '生成失败，请稍后重试。');

      setReport(payload.summary || '模型未返回可展示的总结。');
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      setError('复制失败，请手动选择文字复制。');
    }
  };

  return (
    <section className="flex-1 min-h-0 overflow-y-auto bg-surface px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-accent">
              <Sparkles size={18} />
              <span className="text-sm font-medium">智能总结</span>
            </div>
            <h2 className="text-2xl font-semibold text-primary">生成周报与月报</h2>
            <p className="mt-2 text-sm leading-6 text-tertiary">AI 仅参考所选日期内已完成待办与每日总结，不会修改任何原始内容。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-tertiary/15 px-3 py-2 text-sm text-tertiary transition-colors hover:border-accent/50 hover:text-primary"
          >
            <ArrowLeft size={16} /> 返回待办
          </button>
        </div>

        <div className="rounded-xl border border-tertiary/10 bg-surface-hover/40 p-4 md:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ['week', '周报'],
              ['month', '月报'],
              ['custom', '自定义区间'],
            ] as [ReportType, string][]).map(([type, text]) => (
              <button
                key={type}
                type="button"
                onClick={() => setReportType(type)}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${reportType === type ? 'border-accent bg-accent/10 text-primary' : 'border-tertiary/15 text-tertiary hover:border-accent/50'}`}
              >
                {text}
              </button>
            ))}
          </div>

          {reportType === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs text-tertiary">
                开始日期
                <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="rounded-md border border-tertiary/15 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent/50" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-tertiary">
                结束日期
                <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="rounded-md border border-tertiary/15 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent/50" />
              </label>
            </div>
          ) : (
            <label className="flex max-w-xs flex-col gap-1.5 text-xs text-tertiary">
              选择任意一天，系统会自动计算所属{reportType === 'week' ? '周' : '月'}
              <input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="rounded-md border border-tertiary/15 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent/50" />
            </label>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-3 py-3">
            <span className="flex items-center gap-2 text-sm text-primary"><CalendarDays size={16} className="text-accent" />{label}</span>
            <button
              type="button"
              onClick={() => void generateReport()}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? '生成中…' : '生成总结'}
            </button>
          </div>
        </div>

        {error && <p className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}

        <div className="min-h-[260px] rounded-xl border border-tertiary/10 bg-surface p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-primary">总结结果</h3>
            {report && (
              <button type="button" onClick={() => void copyReport()} className="flex items-center gap-1.5 text-sm text-tertiary transition-colors hover:text-primary">
                <Copy size={15} /> 复制
              </button>
            )}
          </div>
          {report ? (
            <article className="whitespace-pre-wrap text-sm leading-7 text-primary">{report}</article>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-center text-tertiary">
              <Sparkles size={32} className="mb-3 text-accent/50" />
              <p className="text-sm">选择周期后生成总结，结果会显示在这里。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
