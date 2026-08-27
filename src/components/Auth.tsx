import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Auth({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('注册成功！请直接登录');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-[#EEF2E9] p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-tertiary/10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-primary mb-2 flex items-center justify-center gap-2">
            <span className="tracking-widest">云汀向晚</span>
          </h1>
          <p className="text-sm text-tertiary">
            {isSignUp ? '创建一个新账号，开启跨设备同步' : '登录以访问你的云端数据'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={64}
              className="w-full px-4 py-2 bg-surface border border-tertiary/20 rounded-[8px] outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-primary transition-all [&:-webkit-autofill]:shadow-[0_0_0_30px_#EEF2E9_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#3C4139]"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">密码</label>
            <input
              type="password"
              minLength={6}
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-surface border border-tertiary/20 rounded-[8px] outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-primary transition-all [&:-webkit-autofill]:shadow-[0_0_0_30px_#EEF2E9_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#3C4139]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-[8px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? '处理中...' : (isSignUp ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-tertiary hover:text-accent transition-colors"
          >
            {isSignUp ? '已有账号？返回登录' : '没有账号？点击注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
