import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function MobileUserMenu({ user, onLogout, onToggleTheme }: { user: User; onLogout: () => void; onToggleTheme: () => Promise<void> }) {
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
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-tertiary/10 py-1 z-50 overflow-hidden">
            <button 
              className="w-full text-left px-4 py-2.5 text-[14px] text-primary hover:bg-surface-hover transition-colors"
              onClick={() => { setIsOpen(false); fileInputRef.current?.click(); }}
            >
              更换头像
            </button>
            <button 
              className="w-full text-left px-4 py-2.5 text-[14px] text-primary hover:bg-surface-hover transition-colors"
              onClick={() => { setIsOpen(false); void onToggleTheme(); }}
            >
              切换主题
            </button>
            <button 
              className="w-full text-left px-4 py-2.5 text-[14px] text-danger hover:bg-danger/5 transition-colors"
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
