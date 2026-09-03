import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { Check, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ThemeName } from '../hooks/useTheme';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  theme: ThemeName;
  onSetTheme: (theme: ThemeName) => Promise<void>;
  dailySummaryEnabled: boolean;
  onSetDailySummaryEnabled: (enabled: boolean) => Promise<void>;
}

export function UserProfile({ user, onLogout, theme, onSetTheme, dailySummaryEnabled, onSetDailySummaryEnabled }: UserProfileProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [name, setName] = useState(user.user_metadata?.full_name || '探索者');
  const [avatar, setAvatar] = useState(user.user_metadata?.avatar_url || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = async (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if ('key' in e && e.key !== 'Enter') return;
    setIsEditingName(false);
    const newName = name.trim().slice(0, 6) || '探索者';
    setName(newName);
    await supabase.auth.updateUser({ data: { full_name: newName } });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, 100, 100);
          const base64 = canvas.toDataURL('image/webp', 0.8);
          setAvatar(base64);
          await supabase.auth.updateUser({ data: { avatar_url: base64 } });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveSetting = async (action: () => Promise<void>) => {
    setIsSavingSettings(true);
    try {
      await action();
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
      <div 
        className="w-9 h-9 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent font-medium text-sm shrink-0 cursor-pointer overflow-hidden relative hover:ring-2 hover:ring-accent/20 transition-all"
        onClick={() => fileInputRef.current?.click()}
        title="点击修改头像"
      >
        {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0" onDoubleClick={() => setIsEditingName(true)}>
        {isEditingName ? (
          <input 
            autoFocus
            type="text"
            value={name}
            maxLength={6}
            onChange={e => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameSave}
            className="w-full bg-transparent border-b border-primary/50 outline-none text-[14px] text-primary font-medium"
          />
        ) : (
          <div className="text-[14px] font-medium text-primary truncate cursor-pointer select-none" title="双击修改昵称">{name}</div>
        )}
      </div>
      <div className="relative shrink-0">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="设置"
          className="text-tertiary hover:text-accent transition-colors p-1.5 rounded-[4px] hover:bg-accent/5"
        >
          <Settings size={16} />
        </button>
        {isSettingsOpen && (
          <div className="absolute bottom-full right-[-0.75rem] mb-2 w-56 rounded-lg border border-tertiary/10 bg-surface p-3 shadow-lg z-20">
            <p className="mb-2 text-xs font-medium text-primary">主题</p>
            <div className="flex gap-2 mb-4">
              {(['green', 'orange'] as ThemeName[]).map((option) => (
                <button
                  key={option}
                  disabled={isSavingSettings}
                  onClick={() => void saveSetting(() => onSetTheme(option))}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${theme === option ? 'border-accent bg-accent/10 text-primary' : 'border-tertiary/15 text-tertiary hover:border-accent/50'}`}
                >
                  <span className={`mr-1 inline-block h-2 w-2 rounded-full ${option === 'green' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  {option === 'green' ? '绿色' : '白橙色'}
                  {theme === option && <Check size={12} className="inline ml-1" />}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-tertiary/10 pt-3">
              <div>
                <p className="text-xs font-medium text-primary">每日总结</p>
                <p className="text-[11px] text-tertiary">按账号同步</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dailySummaryEnabled}
                disabled={isSavingSettings}
                onClick={() => void saveSetting(() => onSetDailySummaryEnabled(!dailySummaryEnabled))}
                aria-label="切换每日总结"
                className={`h-5 w-9 min-w-9 shrink-0 rounded-full border p-0.5 shadow-inner transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${dailySummaryEnabled ? 'border-accent bg-accent' : 'border-slate-300 bg-slate-200'}`}
              >
                <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dailySummaryEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}
      </div>
      <button 
        onClick={onLogout}
        title="退出登录"
        className="text-tertiary hover:text-danger transition-colors p-1.5 rounded-[4px] hover:bg-danger/5 shrink-0"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
