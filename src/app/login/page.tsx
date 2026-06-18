'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const sb = getSupabaseBrowser();
      const { data, error: loginError } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Đăng nhập thành công -> check role
      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', data.user?.id)
        .single();

      // Redirect tuỳ thuộc vào phân quyền
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else if (profile?.role === 'seller') {
        router.push('/seller');
      } else {
        router.push('/gia-si');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập không xác định');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
        
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl select-none block mb-2">🌾</span>
          <h2 className="text-2xl font-black text-white">Chào mừng trở lại</h2>
          <p className="text-xs text-slate-400 mt-1">Đăng nhập tài khoản sỉ nông thủy sản Livedas</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@livedas.com"
              className="w-full px-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-700 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-700 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold">
            Đăng ký ngay
          </Link>
        </div>

        {/* Cung cấp tài khoản test nhanh */}
        <div className="mt-8 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Tài khoản quản trị demo:</p>
          <p>• Email: <span className="text-slate-300 font-mono">admin@livedas.com</span></p>
          <p>• Mật khẩu: <span className="text-slate-300 font-mono">123456</span></p>
          <p className="mt-1 text-slate-500">(Tài khoản này tự động được cấp quyền Admin khi đăng ký mới)</p>
        </div>

      </div>
    </div>
  );
}
