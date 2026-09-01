import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function UserProfile({ user, onLogout, onToggleTheme }: { user: User; onLogout: () => void; onToggleTheme: () => Promise<void> }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user.user_metadata?.full_name || '探索者');
  const [avatar, setAvatar] = useState(user.user_metadata?.avatar_url || '');
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
      <button 
        onClick={onToggleTheme}
        title="切换主题颜色"
        className="text-tertiary hover:text-accent transition-colors p-1.5 rounded-[4px] hover:bg-accent/5 shrink-0"
      >
        <Palette size={16} />
      </button>
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
