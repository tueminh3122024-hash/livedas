'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function Header() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('');

  const [isLocalHost, setIsLocalHost] = useState(true);

  // Kiểm tra kết nối tới Supabase Local API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      setIsLocalHost(host.includes('localhost') || host.includes('127.0.0.1'));
    }

    fetch('/api/prices')
      .then(res => {
        if (res.ok) setDbStatus('connected');
        else setDbStatus('error');
      })
      .catch(() => setDbStatus('error'));
  }, []);

  // Lắng nghe auth state và fetch role profile
  useEffect(() => {
    const sb = getSupabaseBrowser();
    
    const fetchUserRole = async (userId: string) => {
      try {
        const { data } = await sb
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (data) {
          setRole(data.role);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };

    sb.auth.getUser().then((res: { data: { user: { id: string; email?: string } | null } }) => {
      const u = res.data.user;
      if (u) {
        setUser(u as any);
        fetchUserRole(u.id);
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (event: string, session: { user?: { id: string } | null } | null) => {
        if (session?.user) {
          setUser(session.user as any);
          fetchUserRole(session.user.id);
        } else {
          setUser(null);
          setRole('');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const triggerSeed = async () => {
    setSeeding(true);
    setMessage('Đang nạp dữ liệu giá...');
    try {
      const res = await fetch('/api/mock/generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Đã nạp 20 nông sản thành công!');
        // Reload trang sau 1.5s
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage(`Lỗi: ${data.error || 'Không rõ lý do'}`);
      }
    } catch (err) {
      setMessage('Lỗi kết nối tới API nạp dữ liệu');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900 px-4 py-3 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0">
          <span className="text-2xl">🌾</span>
          <span className="font-extrabold text-xl tracking-tight text-white">
            Livedas<span className="text-emerald-500 text-sm font-semibold ml-1">SànSỉNôngSản</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <Link href="/gia-si" className="hover:text-white transition-colors">Bảng Giá Sỉ</Link>
          {user && (
            <>
              {role === 'admin' && (
                <Link href="/admin" className="hover:text-white transition-colors text-amber-500 font-extrabold">Kênh Quản Trị</Link>
              )}
              {(role === 'seller' || role === 'admin') && (
                <Link href="/seller" className="hover:text-white transition-colors text-emerald-400 font-extrabold">Kênh Người Bán</Link>
              )}
              <Link href="/buyer/orders" className="hover:text-white transition-colors">Đơn Mua Sỉ</Link>
            </>
          )}
        </nav>

        {/* Action Panel */}
        <div className="flex items-center gap-4 ml-auto">
          
          {/* Supabase Local DB Connection Status */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] sm:text-xs">
            <span className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
              dbStatus === 'error' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-amber-500 animate-pulse'
            }`} />
            <span className="text-slate-400 hidden lg:inline">
              {dbStatus === 'connected' ? (isLocalHost ? 'Supabase Local' : 'Supabase Cloud') : 
               dbStatus === 'error' ? 'Mất kết nối DB' : 'Đang kết nối...'}
            </span>
          </div>

          {/* User actions */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block max-w-[120px] truncate" title={user.email}>
                👤 {user.email.split('@')[0]}
              </span>
              <button
                onClick={async () => {
                  const sb = getSupabaseBrowser();
                  await sb.auth.signOut();
                  window.location.href = '/login';
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Đăng Xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-bold transition-all"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
              >
                Đăng Ký
              </Link>
            </div>
          )}

          {/* Quick Mock Seeder Button */}
          <button
            onClick={triggerSeed}
            disabled={seeding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚡ {seeding ? 'Đang nạp...' : 'Nạp Mock Data'}
          </button>
        </div>
      </div>
      
      {/* Toast Notification message */}
      {message && (
        <div className="absolute top-16 right-4 sm:right-6 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          {message}
        </div>
      )}
    </header>
  );
}
