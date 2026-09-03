import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type ThemeName = 'green' | 'orange';

const isThemeName = (value: unknown): value is ThemeName => value === 'green' || value === 'orange';

export function useTheme(user?: User) {
  const [localTheme, setLocalTheme] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return isThemeName(savedTheme) ? savedTheme : 'green';
  });
  const [pendingTheme, setPendingTheme] = useState<{ userId: string; theme: ThemeName } | null>(null);
  const accountTheme = user?.user_metadata?.theme;
  const pendingThemeForCurrentUser = pendingTheme?.userId === user?.id ? pendingTheme : null;
  const theme = pendingThemeForCurrentUser?.theme
    ?? (isThemeName(accountTheme) ? accountTheme : localTheme);

  useEffect(() => {
    if (theme === 'orange') {
      document.documentElement.setAttribute('data-theme', 'orange');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setTheme = async (nextTheme: ThemeName) => {
    if (nextTheme === theme) return;
    setLocalTheme(nextTheme);

    if (!user) return;

    setPendingTheme({ userId: user.id, theme: nextTheme });

    const { error } = await supabase.auth.updateUser({ data: { theme: nextTheme } });
    if (error) {
      setPendingTheme(null);
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => setTheme(theme === 'green' ? 'orange' : 'green');

  return { theme, setTheme, toggleTheme };
}
