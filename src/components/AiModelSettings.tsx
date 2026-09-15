import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AiModelSettingsProps { onClose: () => void; }
interface ModelConfig { configured: boolean; platformConfigured: boolean; baseUrl: string; model: string; }

const requestConfig = async (method: 'GET' | 'POST', body?: Record<string, string>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('登录已失效，请重新登录。');
  const response = await fetch('/api/ai-model-config', {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '模型配置请求失败。');
  return payload as ModelConfig;
};

export function AiModelSettings({ onClose }: AiModelSettingsProps) {
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isActive = true;
    void requestConfig('GET').then((config) => {
      if (!isActive) return;
      setConfigured(config.configured);
      setPlatformConfigured(config.platformConfigured);
      setBaseUrl(config.baseUrl || 'https://api.openai.com/v1');
      setModel(config.model || '');
    }).catch((loadError) => isActive && setError(loadError instanceof Error ? loadError.message : '读取模型配置失败。')).finally(() => isActive && setIsLoading(false));
    return () => { isActive = false; };
  }, []);

  const saveConfig = async () => {
    setError(''); setNotice('');
    if (!apiKey.trim()) { setError(configured ? '如需更换模型，请填写新的 API Key。' : '请输入 API Key。'); return; }
    setIsSaving(true);
    try {
      const config = await requestConfig('POST', { baseUrl, model, apiKey });
      setConfigured(config.configured); setPlatformConfigured(config.platformConfigured); setBaseUrl(config.baseUrl); setModel(config.model); setApiKey(''); setNotice('模型配置已加密保存。');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : '保存模型配置失败。'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" aria-labelledby="ai-model-settings-title">
      <div className="w-full max-w-lg rounded-2xl border border-tertiary/10 bg-surface p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-accent"><KeyRound size={18} /><span className="text-sm font-medium">AI 模型接入</span></div><h2 id="ai-model-settings-title" className="mt-2 text-lg font-semibold text-primary">模型服务</h2><p className="mt-1 text-xs leading-5 text-tertiary">平台模型对所有用户生效；也可选择配置个人模型进行覆盖。</p></div><button type="button" onClick={onClose} className="rounded-md p-1 text-tertiary transition-colors hover:bg-surface-hover hover:text-primary" aria-label="关闭模型设置"><X size={18} /></button></div>
        {isLoading ? <div className="flex min-h-52 items-center justify-center text-sm text-tertiary"><LoaderCircle size={18} className="mr-2 animate-spin" />读取配置中…</div> : <div className="mt-5 space-y-4">
          {platformConfigured && !configured && <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 size={15} />平台模型已启用，无需个人配置即可生成总结。</div>}
          {configured && <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 size={15} />当前使用个人模型。填写新的 Key 后可更新。</div>}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-primary">服务地址<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" autoComplete="url" className="rounded-md border border-tertiary/15 bg-surface px-3 py-2.5 text-sm font-normal text-primary outline-none focus:border-accent/60" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-primary">模型名称<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 gpt-4.1-mini" autoComplete="off" className="rounded-md border border-tertiary/15 bg-surface px-3 py-2.5 text-sm font-normal text-primary outline-none focus:border-accent/60" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-primary">API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configured ? '填写新的 Key 以更新' : '仅用于生成总结'} autoComplete="new-password" className="rounded-md border border-tertiary/15 bg-surface px-3 py-2.5 text-sm font-normal text-primary outline-none focus:border-accent/60" /></label>
          {error && <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}{notice && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
          <div className="flex items-center justify-between gap-3 border-t border-tertiary/10 pt-4"><p className="text-[11px] leading-4 text-tertiary">每日总结与待办数据不会被修改。</p><button type="button" onClick={() => void saveConfig()} disabled={isSaving} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? '保存中…' : '加密保存'}</button></div>
        </div>}
      </div>
    </div>
  );
}
