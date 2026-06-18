import { createSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer();

  // 1. Đếm số lượng sản phẩm sỉ
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // 2. Đếm số lượng nhà vườn/vựa sỉ
  const { count: sellerCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  // 3. Đếm tổng số cuộc gọi liên hệ sỉ
  const { count: callCount } = await supabase
    .from('call_logs')
    .select('*', { count: 'exact', head: true });

  // 4. Đếm số nguồn cào dữ liệu
  const { count: sourceCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="font-extrabold text-lg text-white">Livedas Admin Portal</h1>
        </div>
        <div className="flex gap-3 text-xs">
          <Link href="/gia-si" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold transition-colors">
            🏠 Quay lại sàn sỉ
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 animate-fadeIn">
        <h2 className="text-xl font-black mb-6 text-white">Tổng quan hệ thống</h2>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '📦 Tổng sản phẩm sỉ', val: productCount || 0, color: 'text-emerald-400' },
            { label: '🚜 Vựa sỉ & Nhà vườn', val: sellerCount || 0, color: 'text-cyan-400' },
            { label: '📞 Liên hệ kết nối', val: callCount || 0, color: 'text-amber-400' },
            { label: '🔗 Nguồn cào giá sỉ', val: sourceCount || 0, color: 'text-indigo-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{stat.label}</span>
              <span className={`text-3xl font-black ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Admin Navigation sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section: Catalog Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white mb-2">📦 Danh mục sản phẩm sỉ</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Quản lý, thêm mới, sửa đổi thông tin 40 loại nông thủy sản sỉ của sàn. Thiết lập dải giá sỉ cơ bản cho từng vùng.
              </p>
            </div>
            <Link
              href="/admin/products"
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-center text-xs transition-colors shadow-lg shadow-emerald-950/20"
            >
              Quản lý Sản phẩm
            </Link>
          </div>

          {/* Section: Crawl Sources Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white mb-2">🔗 Nguồn cào liên kết bên ngoài</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Quản lý các trang thông tin giá, diễn đàn, group Facebook/Zalo mục tiêu để AI Agent tự động cào và trích xuất dữ liệu giá.
              </p>
            </div>
            <Link
              href="/admin/crawl-sources"
              className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-center text-xs transition-colors shadow-lg shadow-cyan-950/20"
            >
              Quản lý Nguồn Cào
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
}
