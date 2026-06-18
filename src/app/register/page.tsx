'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const sb = getSupabaseBrowser();
      
      const { error: signUpError } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      
      // Tự động đăng nhập & chuyển hướng sau 1.5 giây
      setTimeout(() => {
        if (email === 'admin@livedas.com') {
          router.push('/admin');
        } else if (role === 'seller') {
          router.push('/seller');
        } else {
          router.push('/gia-si');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng ký tài khoản');
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
          <h2 className="text-2xl font-black text-white">Đăng ký tài khoản</h2>
          <p className="text-xs text-slate-400 mt-1">Gia nhập cộng đồng giao dịch sỉ Livedas</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-shake">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Họ và tên</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-700 transition-colors"
            />
          </div>

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
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-700 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Vai trò của bạn</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  role === 'buyer'
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                💼 Người mua sỉ
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  role === 'seller'
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                🚜 Nhà vườn / Vựa sỉ
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Tài Khoản'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold">
            Đăng nhập ngay
          </Link>
        </div>

      </div>
    </div>
  );
}
