import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ThemeName } from '../hooks/useTheme';

interface MobileUserMenuProps {
  user: User;
  onLogout: () => void;
  theme: ThemeName;
  onSetTheme: (theme: ThemeName) => Promise<void>;
  dailySummaryEnabled: boolean;
  onSetDailySummaryEnabled: (enabled: boolean) => Promise<void>;
}

export function MobileUserMenu({ user, onLogout, theme, onSetTheme, dailySummaryEnabled, onSetDailySummaryEnabled }: MobileUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [avatar, setAvatar] = useState(user.user_metadata?.avatar_url || '');
  const name = user.user_metadata?.full_name || '探索者';
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="relative">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
      
      <div 
        className="w-8 h-8 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent font-medium text-sm cursor-pointer overflow-hidden ring-1 ring-tertiary/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="avatar" /> : name.charAt(0)}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-tertiary/10 p-3 z-50 overflow-hidden">
            <button 
              className="w-full text-left py-2 text-[14px] text-primary hover:bg-surface-hover transition-colors"
              onClick={() => { setIsOpen(false); fileInputRef.current?.click(); }}
            >
              更换头像
            </button>
            <div className="border-t border-tertiary/10 mt-2 pt-3">
              <p className="mb-2 text-xs font-medium text-primary">设置</p>
              <div className="flex gap-2 mb-3">
                {(['green', 'orange'] as ThemeName[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => void onSetTheme(option)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${theme === option ? 'border-accent bg-accent/10 text-primary' : 'border-tertiary/15 text-tertiary'}`}
                  >
                    {option === 'green' ? '绿色' : '白橙色'}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-primary">
                <span>每日总结</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dailySummaryEnabled}
                  onClick={() => void onSetDailySummaryEnabled(!dailySummaryEnabled)}
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors ${dailySummaryEnabled ? 'bg-accent' : 'bg-tertiary/30'}`}
                >
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dailySummaryEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <button 
              className="w-full text-left py-2 mt-2 text-[14px] text-danger hover:bg-danger/5 transition-colors"
              onClick={() => { setIsOpen(false); onLogout(); }}
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
